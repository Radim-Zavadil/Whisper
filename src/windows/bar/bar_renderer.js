document.getElementById('hide-btn').addEventListener('click', () => {
  window.electronAPI.hideBar()
})

document.getElementById('ask-btn').addEventListener('click', () => {
  window.electronAPI.askQuestion()
})
