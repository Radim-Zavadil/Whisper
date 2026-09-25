const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  hideBar: () => ipcRenderer.send('hide-bar'),
  showBar: () => ipcRenderer.send('show-bar'),
  askQuestion: () => ipcRenderer.send('ask-question'),
  submitQuestion: (text) => ipcRenderer.send('submit-question', text),
  hideAsk: () => ipcRenderer.send('hide-ask'),
  hideNotification: () => ipcRenderer.send('hide-notification'),
  hideResponse: () => ipcRenderer.send('hide-response'),
  showNotes: () => ipcRenderer.send('show-notes'),
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),

  // Notes
  saveNote: (title, content) => ipcRenderer.invoke('save-note', title, content),
  getNotes: () => ipcRenderer.invoke('get-notes'),
  searchNotes: (query) => ipcRenderer.invoke('search-notes', query),
  deleteNote: (id) => ipcRenderer.invoke('delete-note', id),

  // AI Answers (from listening)
  saveAiAnswer: (transcript, answer) => ipcRenderer.invoke('save-ai-answer', transcript, answer),
  getAiAnswers: () => ipcRenderer.invoke('get-ai-answers'),
  deleteAiAnswer: (id) => ipcRenderer.invoke('delete-ai-answer', id),

  // Listening / transcription
  startListening: () => ipcRenderer.send('start-listening'),
  stopListening: () => ipcRenderer.send('stop-listening'),
  transcribeAudio: (audioBase64) => ipcRenderer.invoke('transcribe-audio', audioBase64),
  generateIdeasFromTranscript: (transcript, notes) => ipcRenderer.invoke('generate-ideas', transcript, notes),

  onAnswerLoading: (callback) => ipcRenderer.on('answer-loading', (_event, message) => callback(message)),
  onAnswer: (callback) => ipcRenderer.on('answer', (_event, data) => callback(data)),
  onAnswerDone: (callback) => ipcRenderer.on('answer-done', () => callback()),

  // Response window events
  onShowNotes: (callback) => ipcRenderer.on('display-notes', (_event, notes) => callback(notes)),
  onNewIdea: (callback) => ipcRenderer.on('new-idea', (_event, data) => callback(data)),
  onTranscriptUpdate: (callback) => ipcRenderer.on('transcript-update', (_event, text) => callback(text)),

  // File dialog for notes upload
  openNotesFile: () => ipcRenderer.invoke('open-notes-file'),

  // Ideas Window IPC
  hideIdeas: () => ipcRenderer.send('hide-ideas'),
  showIdeas: () => ipcRenderer.send('show-ideas'),
  requestIdeaAction: (action, transcript) => ipcRenderer.invoke('request-idea-action', action, transcript),
  onNewTranscriptChunk: (callback) => ipcRenderer.on('new-transcript-chunk', (_event, text) => callback(text)),
  onListeningStateChange: (callback) => ipcRenderer.on('listening-state-change', (_event, isListening) => callback(isListening)),
  sendTranscriptChunk: (text) => ipcRenderer.send('send-transcript-chunk', text),
  notifyListeningState: (isListening) => ipcRenderer.send('notify-listening-state', isListening),

  // Bar state sync
  onBarStateChanged: (callback) => ipcRenderer.on('bar-state-changed', (_event, isActive) => callback(isActive)),

  getActivity: () => ipcRenderer.invoke('get-activity'),
  searchActivity: (query) => ipcRenderer.invoke('search-activity', query)
})
