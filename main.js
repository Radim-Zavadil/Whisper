require('dotenv').config()

const { app, BrowserWindow, ipcMain, globalShortcut, screen, desktopCapturer } = require('electron')
const path = require('path')
const db = require('./src/db')

let mainWindow
let barWindow
let notificationWindow
let responseWindow
let askWindow

function createWindows() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height, x, y } = primaryDisplay.workArea

  // 1. Main Window
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    frame: false,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  mainWindow.loadFile('src/windows/main/index.html')

  // 2. Bar Window
  barWindow = new BrowserWindow({
    width: 400,
    height: 60,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: false,
    icon: path.join(__dirname, 'icon.ico'),
    skipTaskbar: true,
    x: Math.floor(x + width / 2 - 200),
    y: Math.floor(y + height - 120),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  barWindow.loadFile('src/windows/bar/bar.html')

  // 3. Ask Window (Hidden initially)
  askWindow = new BrowserWindow({
    width: 700,
    height: 60,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: false,
    show: false,
    icon: path.join(__dirname, 'icon.ico'),
    skipTaskbar: true,
    x: Math.floor(x + width / 2 - 350),
    y: Math.floor(y + height - 50),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  askWindow.loadFile('src/windows/ask/ask.html')

  // 4. Notification Window (Hidden initially)
  notificationWindow = new BrowserWindow({
    width: 380,
    height: 110,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: false,
    show: false,
    icon: path.join(__dirname, 'icon.ico'),
    skipTaskbar: true,
    x: Math.floor(x + width - 390),
    y: Math.floor(y + 20),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  notificationWindow.loadFile('src/windows/notification/notification.html')

  // 5. Response Window (Hidden initially) — taller to fit answer text
  responseWindow = new BrowserWindow({
    width: 650,
    height: 500,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: false,
    show: false,
    icon: path.join(__dirname, 'icon.ico'),
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  responseWindow.loadFile('src/windows/response/response.html')
  responseWindow.center()

  // Register Global Shortcut
  globalShortcut.register('Alt+T', () => {
    if (barWindow.isVisible()) {
      barWindow.hide()
      notificationWindow.show()
      setTimeout(() => {
        if (notificationWindow && notificationWindow.isVisible()) {
          notificationWindow.hide()
        }
      }, 5000)
    } else {
      barWindow.show()
      notificationWindow.hide()
    }
  })
}

app.whenReady().then(() => {
  db.initDb()
  createWindows()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindows()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

// ─── Screen Capture ───────────────────────────────────────────────────────────
ipcMain.handle('capture-screen', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 1920, height: 1080 }
  })
  return sources[0].thumbnail.toPNG().toString('base64')
})

// ─── Gemini Vision API ────────────────────────────────────────────────────────
async function callGemini(base64Image, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
  const body = {
    contents: [{
      parts: [
        {
          inline_data: {
            mime_type: 'image/png',
            data: base64Image
          }
        },
        {
          text: 'Describe what is on this screen. If there is an error, extract the exact error text and which app it is from. If it is a cloud dashboard, design tool, or terminal, say so. Be concise, max 3 sentences.'
        }
      ]
    }]
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error?.message || `Gemini error ${res.status}`)
  }
  return data.candidates[0].content.parts[0].text
}

// ─── Groq Llama 4 API ─────────────────────────────────────────────────────────
async function callGroq(screenContext, userQuestion, apiKey) {
  const url = 'https://api.groq.com/openai/v1/chat/completions'
  const body = {
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    max_tokens: 1000,
    temperature: 0.3,
    messages: [
      {
        role: 'user',
        content: `Screen context: ${screenContext}\n\nUser question: ${userQuestion}\n\nYou are a developer assistant. Answer the user's question directly. The screen context is provided in case the question implies it (e.g. asking about a visible error), but if the question is general or unrelated to the screen, feel free to ignore the screen context. Give a precise, actionable answer. If a fix requires a terminal command or code, put it in a markdown code block. Be direct. Max 150 words.`
      }
    ]
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error?.message || `Groq error ${res.status}`)
  }
  return data.choices[0].message.content
}

// ─── Figma API Integration ──────────────────────────────────────────────────
function parseFigmaUrl(figmaLink) {
  try {
    const url = new URL(figmaLink)
    const pathParts = url.pathname.split('/')
    let fileKey = pathParts[2]
    // In case of /design/ URLs, pathParts[2] is still the key
    let nodeId = url.searchParams.get('node-id')
    if (nodeId) nodeId = nodeId.replace(/-/g, ':')

    if (!fileKey || !nodeId) {
      throw new Error('Link must point to a specific component, not just the file.')
    }

    return { fileKey, nodeId }
  } catch (err) {
    if (err.message.includes('Link must point')) throw err
    throw new Error('Invalid Figma link. Right-click a component in Figma and use Copy link.')
  }
}

async function fetchFigmaNode(fileKey, nodeId, apiKey) {
  const response = await fetch(
    `https://api.figma.com/v1/files/${fileKey}/nodes?ids=${nodeId}`,
    {
      headers: {
        'X-Figma-Token': apiKey
      }
    }
  )

  if (response.status === 403) {
    throw new Error('Figma token is invalid or expired. Update FIGMA_ACCESS_TOKEN in your .env file.')
  }
  if (response.status === 404) {
    throw new Error('Component not found. Make sure your token has access to this file.')
  }
  if (!response.ok) {
    throw new Error(`Figma API error: ${response.status}. Check your token.`)
  }

  const data = await response.json()
  if (!data.nodes || !data.nodes[nodeId]) {
    throw new Error('Component node not found in the file.')
  }
  return data.nodes[nodeId].document
}

function extractDesignData(node) {
  const result = {
    name: node.name,
    type: node.type,
    width: node.absoluteBoundingBox?.width,
    height: node.absoluteBoundingBox?.height,
    colors: [],
    fonts: [],
    borderRadius: node.cornerRadius || null,
    children: []
  }

  // Extract fill colors as hex
  if (node.fills) {
    node.fills.forEach(fill => {
      if (fill.type === 'SOLID' && fill.color) {
        const { r, g, b } = fill.color
        const hex = '#' + [r, g, b]
          .map(v => Math.round(v * 255).toString(16).padStart(2, '0'))
          .join('')
        result.colors.push(hex)
      }
    })
  }

  // Extract font info
  if (node.style) {
    result.fonts.push({
      family: node.style.fontFamily,
      size: node.style.fontSize,
      weight: node.style.fontWeight,
      lineHeight: node.style.lineHeightPx
    })
  }

  // Extract padding if it exists
  if (node.paddingTop !== undefined) {
    result.padding = {
      top: node.paddingTop,
      right: node.paddingRight,
      bottom: node.paddingBottom,
      left: node.paddingLeft
    }
  }

  // Extract gap between children
  if (node.itemSpacing !== undefined) {
    result.gap = node.itemSpacing
  }

  // Extract layout mode (flex direction)
  if (node.layoutMode) {
    result.layout = node.layoutMode // "HORIZONTAL" or "VERTICAL"
  }

  // Recurse into children
  if (node.children) {
    result.children = node.children.map(child => extractDesignData(child))
  }

  return result
}

async function callGroqForFigma(designData, apiKey) {
  const url = 'https://api.groq.com/openai/v1/chat/completions'
  const body = {
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    max_tokens: 1000,
    temperature: 0.3,
    messages: [
      {
        role: 'user',
        content: `Here is the exact design data extracted from a Figma component:\n\n${JSON.stringify(designData, null, 2)}\n\nGenerate a detailed, developer-ready prompt that describes how to implement this component in code. Include: layout structure, exact colors as hex values, typography details, spacing and padding values, border radius, and component hierarchy. The prompt should be precise enough that a developer could implement this component without ever seeing the original design. Format it clearly.`
      }
    ]
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error?.message || `Groq error ${res.status}`)
  }
  return data.choices[0].message.content
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────
ipcMain.on('hide-bar', () => {
  if (barWindow) barWindow.hide()
  if (notificationWindow) {
    notificationWindow.show()
    setTimeout(() => {
      if (notificationWindow && notificationWindow.isVisible()) {
        notificationWindow.hide()
      }
    }, 5000)
  }
})

ipcMain.on('show-bar', () => {
  if (barWindow) barWindow.show()
})

ipcMain.on('ask-question', () => {
  if (askWindow && barWindow) {
    const barBounds = barWindow.getBounds()
    askWindow.setBounds({
      x: Math.floor(barBounds.x + (barBounds.width / 2) - 350),
      y: barBounds.y + barBounds.height + 10,
      width: 700,
      height: 60
    })
    askWindow.show()
    askWindow.focus()
  }
})

ipcMain.on('submit-question', async (event, text) => {
  if (askWindow) askWindow.hide()

  if (responseWindow) {
    responseWindow.center()
    responseWindow.show()
  }

  const isFigma = text.includes('figma.com/file/') || text.includes('figma.com/design/')

  if (responseWindow) {
    responseWindow.webContents.send('answer-loading', isFigma ? 'Fetching Figma component...' : 'Analyzing screen...')
  }

  try {
    let answer = ''
    
    if (isFigma) {
      // Figma Flow
      const { fileKey, nodeId } = parseFigmaUrl(text)
      const node = await fetchFigmaNode(fileKey, nodeId, process.env.FIGMA_ACCESS_TOKEN)
      const designData = extractDesignData(node)
      answer = await callGroqForFigma(designData, process.env.GROQ_API_KEY)
    } else {
      // Standard Flow
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 }
      })
      const base64Screenshot = sources[0].thumbnail.toPNG().toString('base64')
      const geminiResponse = await callGemini(base64Screenshot, process.env.GEMINI_API_KEY)
      answer = await callGroq(geminiResponse, text, process.env.GROQ_API_KEY)
    }

    if (responseWindow) {
      responseWindow.webContents.send('answer', { text: answer, error: false })
    }

    // Save to database
    try {
      db.saveActivity(text, answer)
    } catch (saveErr) {
      console.error('Failed to save activity:', saveErr)
    }
  } catch (err) {
    const msg = err.message || 'Something went wrong. Please try again.'
    if (responseWindow) {
      responseWindow.webContents.send('answer', { text: msg, error: true })
    }
  } finally {
    if (askWindow) askWindow.webContents.send('answer-done')
  }
})

ipcMain.on('hide-ask', () => {
  if (askWindow) askWindow.hide()
})

ipcMain.on('hide-notification', () => {
  if (notificationWindow) notificationWindow.hide()
})

ipcMain.on('hide-response', () => {
  if (responseWindow) responseWindow.hide()
})

ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize()
})

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize()
    else mainWindow.maximize()
  }
})

ipcMain.on('window-close', () => {
  app.quit()
})

ipcMain.handle('get-activity', async () => {
  return db.getActivity()
})

ipcMain.handle('search-activity', async (event, query) => {
  return db.searchActivity(query)
})
