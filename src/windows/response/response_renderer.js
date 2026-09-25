// ── State ─────────────────────────────────────────────────────────────────────
let expandedNoteId = null

// ── Close button ──────────────────────────────────────────────────────────────
document.getElementById('close-btn').addEventListener('click', () => {
  window.electronAPI.hideResponse()
})

// ── Helper ────────────────────────────────────────────────────────────────────
function escapeHtml(unsafe) {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// ── Render notes ──────────────────────────────────────────────────────────────
function renderNotes(notes) {
  const list = document.getElementById('notes-list')
  const badge = document.getElementById('notes-count-badge')
  badge.textContent = notes.length

  if (notes.length === 0) {
    list.innerHTML = '<div class="empty-msg">No notes uploaded yet. Upload .txt files from the main window.</div>'
    return
  }

  list.innerHTML = ''
  notes.forEach(note => {
    const item = document.createElement('div')
    item.className = 'note-item'
    item.dataset.id = note.id
    item.innerHTML = `
      <div class="note-item-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      </div>
      <div class="note-item-body">
        <div class="note-item-title">${escapeHtml(note.title)}</div>
        <div class="note-item-preview">${escapeHtml(note.content.replace(/\n/g, ' ').trim().slice(0, 90))}</div>
      </div>
    `

    // Expanded content below the item
    const expanded = document.createElement('div')
    expanded.className = 'note-expanded'
    expanded.id = `note-exp-${note.id}`
    expanded.innerHTML = `
      <div class="note-expanded-header">
        <button class="note-back-btn" title="Back to notes list">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back to notes
        </button>
      </div>
      <div class="note-expanded-text">${escapeHtml(note.content)}</div>
    `

    item.addEventListener('click', () => {
      // Close any other open notes first
      document.querySelectorAll('.note-expanded.open').forEach(el => el.classList.remove('open'))
      document.querySelectorAll('.note-item').forEach(el => el.style.display = 'flex')

      // Hide this title rectangle and show the content
      item.style.display = 'none'
      expanded.classList.add('open')
      expandedNoteId = note.id
    })

    const backBtn = expanded.querySelector('.note-back-btn')
    if (backBtn) {
      backBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        expanded.classList.remove('open')
        item.style.display = 'flex'
        expandedNoteId = null
      })
    }

    list.appendChild(item)
    list.appendChild(expanded)
  })
}

// ── IPC Events ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Show notes triggered by bar "Show Notes" button
  if (window.electronAPI.onShowNotes) {
    window.electronAPI.onShowNotes(({ notes }) => {
      renderNotes(notes || [])
    })
  }

  // Initial load
  if (window.electronAPI.getNotes) {
    try {
      const notes = await window.electronAPI.getNotes()
      renderNotes(notes || [])
    } catch (e) {}
  }
})
