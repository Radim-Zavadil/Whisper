// ── State ─────────────────────────────────────────────────────────────────────
let cardCounter = 0

// ── DOM Elements ──────────────────────────────────────────────────────────────
const container = document.getElementById('cards-container')
const emptyState = document.getElementById('empty-state')
const liveDot = document.getElementById('live-dot')
const headerStatus = document.getElementById('header-status')
const closeBtn = document.getElementById('close-btn')
const clearBtn = document.getElementById('clear-btn')

closeBtn.addEventListener('click', () => {
  window.electronAPI.hideIdeas()
})

clearBtn.addEventListener('click', () => {
  container.innerHTML = ''
  container.appendChild(emptyState)
  emptyState.style.display = 'flex'
})

function escapeHtml(unsafe) {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// ── Add New Listened Speech Card ──────────────────────────────────────────────
function addTranscriptCard(transcriptText) {
  if (!transcriptText || !transcriptText.trim()) return

  if (emptyState) {
    emptyState.style.display = 'none'
  }

  cardCounter++
  const cardId = `speech-card-${cardCounter}`
  const card = document.createElement('div')
  card.className = 'speech-card'
  card.id = cardId

  card.innerHTML = `
    <div class="card-label">Listened speech</div>
    <div class="card-text">${escapeHtml(transcriptText)}</div>
    <div class="actions-row">
      <button class="action-item" data-action="assist" title="Get key assistance and insights">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
        </svg>
        Assist
      </button>
      <span class="dot-sep">·</span>
      <button class="action-item" data-action="what_to_say" title="What should I say next?">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
          <path d="M15 4V2m0 16v-2M8 9h2m10 0h2m-4.2 4.2l1.4 1.4M6.8 6.8l1.4 1.4M3 21l9-9"/>
        </svg>
        What should I say?
      </button>
      <span class="dot-sep">·</span>
      <button class="action-item" data-action="followup" title="Suggested follow-up questions">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
        Follow-up questions
      </button>
      <span class="dot-sep">·</span>
      <button class="action-item" data-action="recap" title="Recap this part of the conversation">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13">
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
        </svg>
        Recap
      </button>
    </div>
    <div class="answer-container" id="ans-${cardId}"></div>
  `

  // Attach button events
  const buttons = card.querySelectorAll('.action-item')
  buttons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const action = btn.dataset.action
      await triggerAction(action, transcriptText, cardId, btn)
    })
  })

  // Insert newest speech card at the top
  container.insertBefore(card, container.firstChild)
}

// ── Trigger Action via Groq ───────────────────────────────────────────────────
async function triggerAction(action, transcriptText, cardId, buttonEl) {
  const ansContainer = document.getElementById(`ans-${cardId}`)
  if (!ansContainer) return

  // Show loading in answer container
  const actionLabels = {
    assist: 'Assist',
    what_to_say: 'What should I say?',
    followup: 'Follow-up questions',
    recap: 'Recap'
  }
  const label = actionLabels[action] || 'AI Answer'

  buttonEl.classList.add('loading')
  ansContainer.innerHTML = `
    <div class="answer-box">
      <div class="answer-header">
        <span class="answer-badge"><span class="answer-spinner"></span> Generating ${label}…</span>
      </div>
    </div>
  `

  try {
    const result = await window.electronAPI.requestIdeaAction(action, transcriptText)
    buttonEl.classList.remove('loading')

    if (result && result.success && result.answer) {
      ansContainer.innerHTML = `
        <div class="answer-box">
          <div class="answer-header">
            <span class="answer-badge">${escapeHtml(label)}</span>
            <button class="answer-close" title="Dismiss">✕</button>
          </div>
          <div class="answer-content">${escapeHtml(result.answer)}</div>
        </div>
      `
      const closeBtnAns = ansContainer.querySelector('.answer-close')
      if (closeBtnAns) {
        closeBtnAns.addEventListener('click', () => {
          ansContainer.innerHTML = ''
        })
      }
    } else {
      ansContainer.innerHTML = `
        <div class="answer-box">
          <div class="answer-header">
            <span class="answer-badge" style="color: #9ca3af;">Notice</span>
            <button class="answer-close" title="Dismiss">✕</button>
          </div>
          <div class="answer-content" style="color: #9ca3af; font-size: 12px;">${escapeHtml(result?.error || 'Failed to generate answer.')}</div>
        </div>
      `
      const closeBtnAns = ansContainer.querySelector('.answer-close')
      if (closeBtnAns) {
        closeBtnAns.addEventListener('click', () => {
          ansContainer.innerHTML = ''
        })
      }
    }
  } catch (err) {
    buttonEl.classList.remove('loading')
    ansContainer.innerHTML = `
      <div class="answer-box">
        <div class="answer-content" style="color: #9ca3af; font-size: 12px;">Error: ${escapeHtml(err.message)}</div>
      </div>
    `
  }
}

// ── IPC Listeners ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (window.electronAPI.onNewTranscriptChunk) {
    window.electronAPI.onNewTranscriptChunk((transcript) => {
      addTranscriptCard(transcript)
    })
  }

  if (window.electronAPI.onListeningStateChange) {
    window.electronAPI.onListeningStateChange((isListening) => {
      if (isListening) {
        liveDot.classList.add('listening')
        headerStatus.textContent = 'Listening live — pauses will appear below'
      } else {
        liveDot.classList.remove('listening')
        headerStatus.textContent = 'Listened conversation'
      }
    })
  }
})
