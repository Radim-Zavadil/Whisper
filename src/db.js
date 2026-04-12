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

module.exports = {
    initDb,
    saveActivity,
    getActivity,
    searchActivity
};
