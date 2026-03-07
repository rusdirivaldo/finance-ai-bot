import sqlite3 from "sqlite3"

const db = new sqlite3.Database("./finance.db")

db.serialize(() => {

db.run(`
CREATE TABLE IF NOT EXISTS transactions(
id INTEGER PRIMARY KEY AUTOINCREMENT,
date TEXT,
type TEXT,
category TEXT,
description TEXT,
amount INTEGER
)
`)

})

export default db