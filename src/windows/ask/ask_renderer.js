const input = document.getElementById('question-input')
const submitBtn = document.getElementById('submit-btn')

let isSubmitting = false;

window.addEventListener('focus', () => {
  input.focus()
})

function submitQuestion() {
  if (isSubmitting) return;
  const text = input.value.trim()
  if (text) {
    isSubmitting = true;
    submitBtn.disabled = true;
    submitBtn.style.opacity = '0.5';
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

window.electronAPI.onAnswerDone && window.electronAPI.onAnswerDone(() => {
  isSubmitting = false;
  submitBtn.disabled = false;
  submitBtn.style.opacity = '1';
})
