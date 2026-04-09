document.getElementById('minimize-btn').addEventListener('click', () => {
  window.electronAPI.windowMinimize()
})

document.getElementById('maximize-btn').addEventListener('click', () => {
  window.electronAPI.windowMaximize()
})

document.getElementById('close-btn').addEventListener('click', () => {
  window.electronAPI.windowClose()
})
