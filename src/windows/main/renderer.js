const notesList = document.getElementById('notes-list')
const searchInput = document.getElementById('search-input')
const noteModal = document.getElementById('note-modal')
const modalNoteTitle = document.getElementById('modal-note-title')
const modalNoteContent = document.getElementById('modal-note-content')
const closeModalBtn = document.getElementById('close-modal-btn')
const notesCountEl = document.getElementById('notes-count')
const greetingText = document.getElementById('greeting-text')
const toast = document.getElementById('toast')

let currentNotes = []
let isGridView = false

// Update greeting based on time
function updateGreeting() {
  const hour = new Date().getHours()
  let greeting = 'Good morning'
  if (hour >= 12 && hour < 17) greeting = 'Good afternoon'
  else if (hour >= 17) greeting = 'Good evening'
  greetingText.textContent = `${greeting}.`
}
updateGreeting()

// Window controls
document.getElementById('minimize-btn').addEventListener('click', () => window.electronAPI.windowMinimize())
document.getElementById('maximize-btn').addEventListener('click', () => window.electronAPI.windowMaximize())
document.getElementById('close-btn').addEventListener('click', () => window.electronAPI.windowClose())

// Start Cluely button
const startBtn = document.getElementById('start-btn')
startBtn.addEventListener('click', () => {
  const isActive = startBtn.classList.contains('active')
  if (isActive) {
    window.electronAPI.hideBar()
    startBtn.classList.remove('active')
    startBtn.textContent = 'Start Cluely'
  } else {
    window.electronAPI.showBar()
    startBtn.classList.add('active')
    startBtn.textContent = '● Session Active'
  }
})

if (window.electronAPI.onBarStateChanged) {
  window.electronAPI.onBarStateChanged((isActive) => {
    if (isActive) {
      startBtn.classList.add('active')
      startBtn.textContent = '● Session Active'
    } else {
      startBtn.classList.remove('active')
      startBtn.textContent = 'Start Cluely'
    }
  })
}

// Upload Notes
document.getElementById('upload-notes-btn').addEventListener('click', async () => {
  const result = await window.electronAPI.openNotesFile()
  if (!result) return

  try {
    await window.electronAPI.saveNote(result.title, result.content)
    showToast(`✓ "${result.title}" uploaded successfully`)
    await loadNotes()
  } catch (err) {
    showToast('Failed to save note. Please try again.')
  }
})

// View toggles
document.getElementById('view-list').addEventListener('click', () => {
  isGridView = false
  notesList.classList.remove('grid-view')
  document.getElementById('view-list').classList.add('active')
  document.getElementById('view-grid').classList.remove('active')
})

document.getElementById('view-grid').addEventListener('click', () => {
  isGridView = true
  notesList.classList.add('grid-view')
  document.getElementById('view-grid').classList.add('active')
  document.getElementById('view-list').classList.remove('active')
})

// Load notes from DB
async function loadNotes() {
  currentNotes = await window.electronAPI.getNotes()
  renderNotes(currentNotes)
  updateNotesCount(currentNotes.length)
}

function updateNotesCount(count) {
  notesCountEl.textContent = `${count} note${count !== 1 ? 's' : ''}`
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
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase()
}

function renderNotes(items) {
  notesList.innerHTML = ''

  if (items.length === 0) {
    notesList.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10 9 9 9 8 9"/>
        </svg>
        <h3>No notes yet</h3>
        <p>Upload a .txt file from your meeting notes to get started</p>
      </div>
    `
    return
  }

  let lastDate = ''

  items.forEach(item => {
    const itemDate = formatDate(item.created_at)

    if (itemDate !== lastDate && !isGridView) {
      const dateHeader = document.createElement('div')
      dateHeader.className = 'activity-date'
      if (lastDate !== '') dateHeader.style.marginTop = '20px'
      dateHeader.textContent = itemDate
      notesList.appendChild(dateHeader)
      lastDate = itemDate
    }

    const preview = item.content.replace(/\n/g, ' ').trim().slice(0, 100) + (item.content.length > 100 ? '…' : '')

    const itemEl = document.createElement('div')
    itemEl.className = 'activity-item'
    itemEl.innerHTML = `
      <div class="item-left">
        <div class="item-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
        <div class="item-info">
          <div class="item-title">${escapeHtml(item.title)}</div>
          <div class="item-preview">${escapeHtml(preview)}</div>
        </div>
      </div>
      <div class="item-meta">
        <span class="item-time">${formatTime(item.created_at)}</span>
        <button class="item-delete-btn" title="Delete note" data-id="${item.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
    `

    itemEl.addEventListener('click', (e) => {
      if (e.target.closest('.item-delete-btn')) return
      showNoteDetail(item)
    })

    itemEl.querySelector('.item-delete-btn').addEventListener('click', async (e) => {
      e.stopPropagation()
      await window.electronAPI.deleteNote(item.id)
      showToast(`"${item.title}" deleted`)
      await loadNotes()
    })

    notesList.appendChild(itemEl)
  })
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function showNoteDetail(item) {
  modalNoteTitle.textContent = item.title
  modalNoteContent.textContent = item.content
  noteModal.classList.add('show')
}

function hideNoteDetail() {
  noteModal.classList.remove('show')
}

// Search with debounce
let searchTimeout
searchInput.addEventListener('input', (e) => {
  clearTimeout(searchTimeout)
  const query = e.target.value.trim()

  searchTimeout = setTimeout(async () => {
    if (query) {
      const filtered = await window.electronAPI.searchNotes(query)
      renderNotes(filtered)
    } else {
      renderNotes(currentNotes)
    }
  }, 300)
})

closeModalBtn.addEventListener('click', hideNoteDetail)
window.addEventListener('click', (e) => {
  if (e.target === noteModal) hideNoteDetail()
})

// Focus search on Ctrl+K
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    searchInput.focus()
  }
  if (e.key === 'Escape') hideNoteDetail()
})

// Toast helper
let toastTimeout
function showToast(msg) {
  toast.textContent = msg
  toast.classList.add('show')
  clearTimeout(toastTimeout)
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 3000)
}

loadNotes()
