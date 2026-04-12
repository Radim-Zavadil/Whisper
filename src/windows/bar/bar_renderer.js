document.getElementById('hide-btn').addEventListener('click', () => {
  window.electronAPI.hideBar()
})

document.getElementById('ask-btn').addEventListener('click', () => {
  window.electronAPI.askQuestion()
})

document.getElementById('listen-btn').addEventListener('click', () => {
  window.electronAPI.askQuestion()
})
