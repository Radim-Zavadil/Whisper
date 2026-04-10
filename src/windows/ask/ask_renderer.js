const input = document.getElementById('question-input')
const submitBtn = document.getElementById('submit-btn')

window.addEventListener('focus', () => {
  input.focus()
})

function submitQuestion() {
  const text = input.value.trim()
  if (text) {
    window.electronAPI.submitQuestion(text)
    input.value = ''
  }
}

submitBtn.addEventListener('click', submitQuestion)

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    submitQuestion()
  } else if (e.key === 'Escape') {
    window.electronAPI.hideAsk()
  }
})
