let isListening = false
let mediaStream = null
let mediaRecorder = null
let audioChunks = []
let audioContext = null
let analyser = null
let vadInterval = null
let hasSpeechInChunk = false
let lastSpeechTime = 0
let chunkStartTime = 0

// ── Listen button ──────────────────────────────────────────────────────────────
document.getElementById('listen-btn').addEventListener('click', async () => {
  if (isListening) {
    stopListening()
  } else {
    await startListening()
  }
})

async function startListening() {
  try {
    // Open ideas window and set live listening status
    window.electronAPI.showIdeas()
    window.electronAPI.notifyListeningState(true)

    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    })

    // Setup Web Audio API for Voice Activity & Silence Detection
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 512
    const source = audioContext.createMediaStreamSource(mediaStream)
    source.connect(analyser)

    setupMediaRecorder()

    isListening = true
    setListenState(true)

    // Monitor for speech and pauses every 100ms
    startVadMonitor()
  } catch (err) {
    console.error('Microphone access denied:', err)
    setListenState(false)
    window.electronAPI.notifyListeningState(false)
  }
}

function setupMediaRecorder() {
  mediaRecorder = new MediaRecorder(mediaStream, { mimeType: 'audio/webm' })
  audioChunks = []
  hasSpeechInChunk = false
  lastSpeechTime = 0
  chunkStartTime = Date.now()

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) audioChunks.push(e.data)
  }

  mediaRecorder.onstop = async () => {
    const chunksToSend = [...audioChunks]
    audioChunks = []

    // If still listening, immediately restart for continuous recording
    if (isListening && mediaStream && mediaStream.active) {
      try {
        hasSpeechInChunk = false
        lastSpeechTime = 0
        chunkStartTime = Date.now()
        mediaRecorder.start()
      } catch (e) {
        console.warn('Error restarting recorder:', e)
      }
    }

    if (chunksToSend.length === 0) return

    const blob = new Blob(chunksToSend, { type: 'audio/webm' })
    const reader = new FileReader()
    reader.onloadend = async () => {
      try {
        const base64 = reader.result.split(',')[1]
        const result = await window.electronAPI.transcribeAudio(base64)
        if (result && result.success && result.text && result.text.trim().length > 2) {
          window.electronAPI.sendTranscriptChunk(result.text.trim())
        }
      } catch (err) {
        console.error('Transcription error:', err)
      }
    }
    reader.readAsDataURL(blob)
  }

  mediaRecorder.start()
}

// ── Voice Activity & Pause Detection ──────────────────────────────────────────
function startVadMonitor() {
  clearInterval(vadInterval)
  const bufferLength = analyser.frequencyBinCount
  const dataArray = new Uint8Array(bufferLength)

  vadInterval = setInterval(() => {
    if (!isListening || !analyser || !mediaRecorder) return

    analyser.getByteFrequencyData(dataArray)
    let sum = 0
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i]
    }
    const average = sum / bufferLength

    // Volume threshold for active speech
    const SPEECH_THRESHOLD = 14
    const now = Date.now()

    if (average > SPEECH_THRESHOLD) {
      hasSpeechInChunk = true
      lastSpeechTime = now
    }

    // Condition 1: Pause detected (at least 1.2s of silence after speech, and chunk is at least 1.5s long)
    const isPauseAfterSpeech = hasSpeechInChunk && lastSpeechTime > 0 && (now - lastSpeechTime >= 1200) && (now - chunkStartTime >= 1500)

    // Condition 2: Max chunk safety timeout (continuous talking reached 10s)
    const isMaxChunkReached = hasSpeechInChunk && (now - chunkStartTime >= 10000)

    if (isPauseAfterSpeech || isMaxChunkReached) {
      if (mediaRecorder.state === 'recording') {
        mediaRecorder.stop()
      }
    }
  }, 100)
}

function stopListening() {
  isListening = false
  clearInterval(vadInterval)
  vadInterval = null

  window.electronAPI.notifyListeningState(false)

  if (mediaRecorder) {
    if (mediaRecorder.state !== 'inactive') {
      try { mediaRecorder.stop() } catch (e) {}
    }
    mediaRecorder = null
  }

  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop())
    mediaStream = null
  }

  if (audioContext) {
    try { audioContext.close() } catch (e) {}
    audioContext = null
    analyser = null
  }

  audioChunks = []
  setListenState(false)
}

function setListenState(active) {
  const btn = document.getElementById('listen-btn')
  const label = document.getElementById('listen-label')
  const icon = document.getElementById('listen-icon')
  if (active) {
    btn.classList.add('listening')
    label.textContent = 'Listening…'
    icon.innerHTML = `
      <rect x="6" y="10" width="2" height="4" rx="1"/>
      <rect x="10" y="7" width="2" height="10" rx="1"/>
      <rect x="14" y="9" width="2" height="6" rx="1"/>
      <rect x="18" y="11" width="2" height="2" rx="1"/>
      <rect x="2" y="11" width="2" height="2" rx="1"/>
    `
  } else {
    btn.classList.remove('listening')
    label.textContent = 'Listen'
    icon.innerHTML = `
      <rect x="5" y="9" width="3" height="6" rx="1"/>
      <rect x="10.5" y="5" width="3" height="14" rx="1"/>
      <rect x="16" y="9" width="3" height="6" rx="1"/>
    `
  }
}

// ── Show Notes button ──────────────────────────────────────────────────────────
document.getElementById('notes-btn').addEventListener('click', () => {
  window.electronAPI.showNotes()
})

// ── Hide (eye) button ──────────────────────────────────────────────────────────
document.getElementById('hide-btn').addEventListener('click', () => {
  stopListening()
  window.electronAPI.hideBar()
})
