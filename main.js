require('dotenv').config()

const { app, BrowserWindow, ipcMain, globalShortcut, screen, desktopCapturer, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const db = require('./src/db')

let mainWindow
let barWindow
let notificationWindow
let responseWindow
let askWindow
let ideasWindow

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

  // 2. Bar Window — hidden initially, shown via "Start Cluely"
  barWindow = new BrowserWindow({
    width: 430,
    height: 60,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: false,
    icon: path.join(__dirname, 'icon.ico'),
    skipTaskbar: true,
    show: false,
    x: Math.floor(x + width / 2 - 215),
    y: Math.floor(y + height - 120),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  barWindow.loadFile('src/windows/bar/bar.html')

  // 3. Ask Window (Hidden initially) — kept but unused in new flow
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

  // 5. Response Window (Hidden initially) — shows notes
  responseWindow = new BrowserWindow({
    width: 660,
    height: 280,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: true,
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

  // 6. Ideas & Listened Speech Window (Hidden initially) — positioned below notes
  ideasWindow = new BrowserWindow({
    width: 660,
    height: 330,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    hasShadow: false,
    resizable: true,
    show: false,
    icon: path.join(__dirname, 'icon.ico'),
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  ideasWindow.loadFile('src/windows/ideas/ideas.html')

  function positionIdeasWindow() {
    if (!ideasWindow || ideasWindow.isDestroyed()) return
    if (responseWindow && !responseWindow.isDestroyed() && responseWindow.isVisible()) {
      const rBounds = responseWindow.getBounds()
      ideasWindow.setBounds({
        x: rBounds.x,
        y: rBounds.y + rBounds.height + 12,
        width: rBounds.width,
        height: 330
      })
    } else {
      const primaryDisplay = screen.getPrimaryDisplay()
      const { width, height } = primaryDisplay.workArea
      ideasWindow.setBounds({
        x: Math.floor(width / 2 - 330),
        y: Math.floor(height / 2 - 165),
        width: 660,
        height: 330
      })
    }
  }

  responseWindow.on('move', () => {
    if (ideasWindow && !ideasWindow.isDestroyed() && ideasWindow.isVisible()) {
      positionIdeasWindow()
    }
  })

  // Register Global Shortcut
  globalShortcut.register('Alt+T', () => {
    if (barWindow.isVisible()) {
      barWindow.hide()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('bar-state-changed', false)
      }
    } else {
      barWindow.show()
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('bar-state-changed', true)
      }
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

// ─── Groq Vision API ──────────────────────────────────────────────────────────
async function callGroqVision(base64Image, apiKey) {
  const url = 'https://api.groq.com/openai/v1/chat/completions'
  const body = {
    model: 'meta-llama/llama-4-scout-17b-16e-instruct',
    max_tokens: 512,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${base64Image}`
            }
          },
          {
            type: 'text',
            text: 'Describe what is on this screen. If there is an error, extract the exact error text and which app it is from. If it is a cloud dashboard, design tool, or terminal, say so. Be concise, max 3 sentences.'
          }
        ]
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
    throw new Error(data.error?.message || `Groq Vision error ${res.status}`)
  }
  return data.choices[0].message.content
}

// ─── Groq Llama API ───────────────────────────────────────────────────────────
async function callGroq(screenContext, userQuestion, apiKey) {
  const url = 'https://api.groq.com/openai/v1/chat/completions'
  const body = {
    model: 'openai/gpt-oss-120b',
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

// ─── Generate Ideas from Meeting Transcript ────────────────────────────────────
async function callGroqForIdeas(transcript, notesContent, apiKey) {
  const url = 'https://api.groq.com/openai/v1/chat/completions'

  const systemPrompt = notesContent
    ? `You are a meeting assistant. The user has these notes from a meeting:\n\n${notesContent}\n\nBased on what was just said in the meeting and the notes, generate 2-3 concise, actionable ideas or insights. Be specific and helpful. Max 120 words.`
    : `You are a meeting assistant. Based on what was just said in the meeting, generate 2-3 concise, actionable ideas or insights. Be specific and helpful. Max 120 words.`

  const body = {
    model: 'openai/gpt-oss-120b',
    max_tokens: 300,
    temperature: 0.5,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Meeting conversation:\n${transcript}` }
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

// ─── Groq Whisper Transcription ───────────────────────────────────────────────
async function transcribeWithGroq(audioBase64, apiKey) {
  const url = 'https://api.groq.com/openai/v1/audio/transcriptions'
  const audioBuffer = Buffer.from(audioBase64, 'base64')

  // Build multipart/form-data manually (no extra deps needed)
  const boundary = '----FormBoundary' + Math.random().toString(36).slice(2)
  const CRLF = '\r\n'

  const preamble = Buffer.from(
    `--${boundary}${CRLF}` +
    `Content-Disposition: form-data; name="file"; filename="audio.webm"${CRLF}` +
    `Content-Type: audio/webm${CRLF}${CRLF}`
  )
  const modelPart = Buffer.from(
    `${CRLF}--${boundary}${CRLF}` +
    `Content-Disposition: form-data; name="model"${CRLF}${CRLF}` +
    `whisper-large-v3` +
    `${CRLF}--${boundary}${CRLF}` +
    `Content-Disposition: form-data; name="response_format"${CRLF}${CRLF}` +
    `json` +
    `${CRLF}--${boundary}--${CRLF}`
  )

  const body = Buffer.concat([preamble, audioBuffer, modelPart])

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': body.length
    },
    body
  })

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error?.message || `Groq Whisper error ${res.status}`)
  }
  return data.text
}


// ─── Figma API Integration ──────────────────────────────────────────────────
function parseFigmaUrl(figmaLink) {
  try {
    const url = new URL(figmaLink)
    const pathParts = url.pathname.split('/')
    let fileKey = pathParts[2]
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

  if (node.style) {
    result.fonts.push({
      family: node.style.fontFamily,
      size: node.style.fontSize,
      weight: node.style.fontWeight,
      lineHeight: node.style.lineHeightPx
    })
  }

  if (node.paddingTop !== undefined) {
    result.padding = {
      top: node.paddingTop,
      right: node.paddingRight,
      bottom: node.paddingBottom,
      left: node.paddingLeft
    }
  }

  if (node.itemSpacing !== undefined) {
    result.gap = node.itemSpacing
  }

  if (node.layoutMode) {
    result.layout = node.layoutMode
  }

  if (node.children) {
    result.children = node.children.map(child => extractDesignData(child))
  }

  return result
}

async function callGroqForFigma(designData, apiKey) {
  const url = 'https://api.groq.com/openai/v1/chat/completions'
  const body = {
    model: 'openai/gpt-oss-120b',
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
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('bar-state-changed', false)
  }
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
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('bar-state-changed', true)
  }
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

// Show notes in response window
ipcMain.on('show-notes', async () => {
  try {
    const notes = db.getNotes()

    if (responseWindow) {
      if (!responseWindow.isVisible()) {
        responseWindow.center()
        responseWindow.show()
      }
      responseWindow.webContents.send('display-notes', { notes })
      if (ideasWindow && ideasWindow.isVisible()) {
        const rBounds = responseWindow.getBounds()
        ideasWindow.setBounds({
          x: rBounds.x,
          y: rBounds.y + rBounds.height + 12,
          width: rBounds.width,
          height: 330
        })
      }
    }
  } catch (err) {
    console.error('Failed to load notes:', err)
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
      const { fileKey, nodeId } = parseFigmaUrl(text)
      const node = await fetchFigmaNode(fileKey, nodeId, process.env.FIGMA_ACCESS_TOKEN)
      const designData = extractDesignData(node)
      answer = await callGroqForFigma(designData, process.env.GROQ_API_KEY)
    } else {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 1920, height: 1080 }
      })
      const base64Screenshot = sources[0].thumbnail.toPNG().toString('base64')
      const screenContext = await callGroqVision(base64Screenshot, process.env.GROQ_API_KEY)
      answer = await callGroq(screenContext, text, process.env.GROQ_API_KEY)
    }

    if (responseWindow) {
      responseWindow.webContents.send('answer', { text: answer, error: false })
    }

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

// ─── Notes IPC ────────────────────────────────────────────────────────────────
ipcMain.handle('save-note', async (event, title, content) => {
  return db.saveNote(title, content)
})

ipcMain.handle('get-notes', async () => {
  return db.getNotes()
})

ipcMain.handle('search-notes', async (event, query) => {
  return db.searchNotes(query)
})

ipcMain.handle('delete-note', async (event, id) => {
  return db.deleteNote(id)
})

// ─── AI Answers IPC ───────────────────────────────────────────────────────────
ipcMain.handle('save-ai-answer', async (event, transcript, answer) => {
  return db.saveAiAnswer(transcript, answer)
})

ipcMain.handle('get-ai-answers', async () => {
  return db.getAiAnswers()
})

ipcMain.handle('delete-ai-answer', async (event, id) => {
  return db.deleteAiAnswer(id)
})

// ─── Audio Transcription via Groq Whisper ─────────────────────────────────────
ipcMain.handle('transcribe-audio', async (event, audioBase64) => {
  try {
    const transcript = await transcribeWithGroq(audioBase64, process.env.GROQ_API_KEY)
    // Broadcast transcript update to response window
    if (responseWindow) {
      responseWindow.webContents.send('transcript-update', transcript)
    }
    return { success: true, text: transcript }
  } catch (err) {
    console.error('Transcription error:', err)
    return { success: false, error: err.message }
  }
})

// ─── Generate Ideas from Transcript ───────────────────────────────────────────
ipcMain.handle('generate-ideas', async (event, transcript, notesContent) => {
  try {
    const ideas = await callGroqForIdeas(transcript, notesContent, process.env.GROQ_API_KEY)
    // Broadcast to response window
    if (responseWindow) {
      responseWindow.webContents.send('new-idea', { transcript, ideas })
    }
    return { success: true, ideas }
  } catch (err) {
    console.error('Ideas generation error:', err)
    return { success: false, error: err.message }
  }
})

// ─── Ideas Window IPC ─────────────────────────────────────────────────────────
ipcMain.on('show-ideas', () => {
  if (ideasWindow) {
    if (responseWindow && responseWindow.isVisible()) {
      const rBounds = responseWindow.getBounds()
      ideasWindow.setBounds({
        x: rBounds.x,
        y: rBounds.y + rBounds.height + 12,
        width: rBounds.width,
        height: 330
      })
    }
    ideasWindow.show()
  }
})

ipcMain.on('hide-ideas', () => {
  if (ideasWindow) ideasWindow.hide()
})

ipcMain.on('notify-listening-state', (event, isListening) => {
  if (ideasWindow && !ideasWindow.isDestroyed()) {
    ideasWindow.webContents.send('listening-state-change', isListening)
  }
})

ipcMain.on('send-transcript-chunk', (event, text) => {
  if (ideasWindow && !ideasWindow.isDestroyed()) {
    ideasWindow.webContents.send('new-transcript-chunk', text)
    if (!ideasWindow.isVisible()) {
      if (responseWindow && responseWindow.isVisible()) {
        const rBounds = responseWindow.getBounds()
        ideasWindow.setBounds({
          x: rBounds.x,
          y: rBounds.y + rBounds.height + 12,
          width: rBounds.width,
          height: 330
        })
      }
      ideasWindow.show()
    }
  }
})

async function callGroqForAction(systemPrompt, userPrompt, apiKey) {
  const url = 'https://api.groq.com/openai/v1/chat/completions'
  const body = {
    model: 'openai/gpt-oss-120b',
    max_tokens: 350,
    temperature: 0.4,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
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

ipcMain.handle('request-idea-action', async (event, action, transcript) => {
  try {
    const notes = db.getNotes()
    const notesContext = notes.map(n => `=== ${n.title} ===\n${n.content}`).join('\n\n')

    let systemPrompt = ''
    let userPrompt = ''

    if (action === 'what_to_say') {
      systemPrompt = `You are an AI meeting assistant. The user is in a Zoom meeting.
Based on the conversation and the user's meeting notes, provide 2-3 concise, high-impact bullet points of what the user can directly say right now. Speak in first person, ready to read out loud. Max 80 words.`
      userPrompt = `Meeting Notes:\n${notesContext || 'No notes provided'}\n\nWhat was just said:\n"${transcript}"`
    } else if (action === 'recap') {
      systemPrompt = `You are a meeting assistant. Summarize what was just said in 2 brief, clear bullet points. Max 60 words.`
      userPrompt = `Spoken conversation:\n"${transcript}"`
    } else if (action === 'followup') {
      systemPrompt = `You are an advisor. Based on what was said and the user's meeting notes, suggest 2-3 sharp, relevant follow-up questions the user can ask in the meeting. Max 80 words.`
      userPrompt = `Meeting Notes:\n${notesContext || 'No notes provided'}\n\nSpoken conversation:\n"${transcript}"`
    } else {
      // assist
      systemPrompt = `You are a meeting assistant. Provide 2 concise, valuable insights or recommendations based on the conversation and meeting notes. Max 80 words.`
      userPrompt = `Meeting Notes:\n${notesContext || 'No notes provided'}\n\nSpoken conversation:\n"${transcript}"`
    }

    const answer = await callGroqForAction(systemPrompt, userPrompt, process.env.GROQ_API_KEY)
    return { success: true, answer }
  } catch (err) {
    console.error('Error in request-idea-action:', err)
    return { success: false, error: err.message }
  }
})

// ─── Open File Dialog for Notes Upload ────────────────────────────────────────
ipcMain.handle('open-notes-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open Meeting Notes',
    filters: [{ name: 'Text Files', extensions: ['txt'] }],
    properties: ['openFile']
  })

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  const filePath = result.filePaths[0]
  const content = fs.readFileSync(filePath, 'utf-8')
  const title = path.basename(filePath, '.txt')

  return { title, content, filePath }
})
