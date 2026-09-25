const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

let db;

function initDb() {
    const dbPath = path.join(app.getPath('userData'), 'cluely_activity.db');
    db = new Database(dbPath);

    db.exec(`
        CREATE TABLE IF NOT EXISTS activity (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            uses INTEGER DEFAULT 1
        )
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    db.exec(`
        CREATE TABLE IF NOT EXISTS ai_answers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            transcript TEXT,
            answer TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

function saveActivity(question, answer) {
    if (!db) initDb();
    const stmt = db.prepare('INSERT INTO activity (question, answer) VALUES (?, ?)');
    return stmt.run(question, answer);
}

function getActivity() {
    if (!db) initDb();
    const stmt = db.prepare('SELECT * FROM activity ORDER BY created_at DESC');
    return stmt.all();
}

function searchActivity(query) {
    if (!db) initDb();
    const stmt = db.prepare('SELECT * FROM activity WHERE question LIKE ? OR answer LIKE ? ORDER BY created_at DESC');
    const likeQuery = `%${query}%`;
    return stmt.all(likeQuery, likeQuery);
}

// Notes
function saveNote(title, content) {
    if (!db) initDb();
    const stmt = db.prepare('INSERT INTO notes (title, content) VALUES (?, ?)');
    return stmt.run(title, content);
}

function getNotes() {
    if (!db) initDb();
    const stmt = db.prepare('SELECT * FROM notes ORDER BY created_at DESC');
    return stmt.all();
}

function searchNotes(query) {
    if (!db) initDb();
    const likeQuery = `%${query}%`;
    const stmt = db.prepare('SELECT * FROM notes WHERE title LIKE ? OR content LIKE ? ORDER BY created_at DESC');
    return stmt.all(likeQuery, likeQuery);
}

function deleteNote(id) {
    if (!db) initDb();
    const stmt = db.prepare('DELETE FROM notes WHERE id = ?');
    return stmt.run(id);
}

// AI Answers (from listening)
function saveAiAnswer(transcript, answer) {
    if (!db) initDb();
    const stmt = db.prepare('INSERT INTO ai_answers (transcript, answer) VALUES (?, ?)');
    return stmt.run(transcript, answer);
}

function getAiAnswers() {
    if (!db) initDb();
    const stmt = db.prepare('SELECT * FROM ai_answers ORDER BY created_at DESC');
    return stmt.all();
}

function deleteAiAnswer(id) {
    if (!db) initDb();
    const stmt = db.prepare('DELETE FROM ai_answers WHERE id = ?');
    return stmt.run(id);
}

module.exports = {
    initDb,
    saveActivity,
    getActivity,
    searchActivity,
    saveNote,
    getNotes,
    searchNotes,
    deleteNote,
    saveAiAnswer,
    getAiAnswers,
    deleteAiAnswer
};
