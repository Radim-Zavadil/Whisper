document.getElementById('close-btn').addEventListener('click', () => {
  window.electronAPI.hideResponse()
})

document.getElementById('copy-btn').addEventListener('click', () => {
  const text = document.querySelector('.content').innerText
  navigator.clipboard.writeText(text)
})
