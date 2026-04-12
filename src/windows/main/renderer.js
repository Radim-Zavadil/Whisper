const activityList = document.getElementById('activity-list')
const searchInput = document.getElementById('search-input')
const historyModal = document.getElementById('history-modal')
const modalQuestion = document.getElementById('modal-question')
const modalAnswer = document.getElementById('modal-answer')
const closeModalBtn = document.getElementById('close-modal-btn')

let currentActivity = []

// Window controls
document.getElementById('minimize-btn').addEventListener('click', () => {
  window.electronAPI.windowMinimize()
})

document.getElementById('maximize-btn').addEventListener('click', () => {
  window.electronAPI.windowMaximize()
})

document.getElementById('close-btn').addEventListener('click', () => {
  window.electronAPI.windowClose()
})

// Initialize
async function loadActivity() {
  currentActivity = await window.electronAPI.getActivity()
  renderActivity(currentActivity)
}

function formatDate(dateStr) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatTime(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
}

function renderActivity(items) {
  activityList.innerHTML = ''
  
  if (items.length === 0) {
    activityList.innerHTML = '<div class="activity-date">No activity found</div>'
    return
  }

  let lastDate = ''
  
  items.forEach(item => {
    const itemDate = formatDate(item.created_at)
    if (itemDate !== lastDate) {
      const dateHeader = document.createElement('div')
      dateHeader.className = 'activity-date'
      if (lastDate !== '') dateHeader.style.marginTop = '24px'
      dateHeader.textContent = itemDate
      activityList.appendChild(dateHeader)
      lastDate = itemDate
    }

    const itemEl = document.createElement('div')
    itemEl.className = 'activity-item'
    itemEl.innerHTML = `
      <div class="item-title">${escapeHtml(item.question)}</div>
      <div class="item-meta">
        <span class="uses-badge">1 use</span>
      </div>
      <div class="item-time">${formatTime(item.created_at)}</div>
    `
    itemEl.addEventListener('click', () => showDetail(item))
    activityList.appendChild(itemEl)
  })
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function showDetail(item) {
  modalQuestion.textContent = item.question
  modalAnswer.textContent = item.answer
  historyModal.classList.add('show')
}

function hideDetail() {
  historyModal.classList.remove('show')
}

// Search with debounce
let searchTimeout
searchInput.addEventListener('input', (e) => {
  clearTimeout(searchTimeout)
  const query = e.target.value.trim()
  
  searchTimeout = setTimeout(async () => {
    if (query) {
      const filtered = await window.electronAPI.searchActivity(query)
      renderActivity(filtered)
    } else {
      renderActivity(currentActivity)
    }
  }, 300)
})

closeModalBtn.addEventListener('click', hideDetail)
window.addEventListener('click', (e) => {
  if (e.target === historyModal) hideDetail()
})

// Focus search on Ctrl+K
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    searchInput.focus()
  }
})

loadActivity()
