const { app, BrowserWindow, ipcMain, globalShortcut, screen } = require('electron')
const path = require('path')

let mainWindow
let barWindow
let notificationWindow
let responseWindow

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

  // 3. Notification Window (Hidden initially)
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

  // 4. Response Window (Hidden initially)
  responseWindow = new BrowserWindow({
    width: 650,
    height: 140,
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
      // Auto hide notification after 5 seconds
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

// IPC Handlers
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
  if (responseWindow) {
    // Show center screen
    responseWindow.center()
    responseWindow.show()
  }
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
