const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  hideBar: () => ipcRenderer.send('hide-bar'),
  showBar: () => ipcRenderer.send('show-bar'),
  askQuestion: () => ipcRenderer.send('ask-question'),
  submitQuestion: (text) => ipcRenderer.send('submit-question', text),
  hideAsk: () => ipcRenderer.send('hide-ask'),
  hideNotification: () => ipcRenderer.send('hide-notification'),
  hideResponse: () => ipcRenderer.send('hide-response'),
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close')
})
