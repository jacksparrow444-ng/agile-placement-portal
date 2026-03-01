const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
// Serve static files to easily test the UI
app.use(express.static(__dirname));

// Initialize SQLite database
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');

        // Create Company table
        db.run(`CREATE TABLE IF NOT EXISTS companies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            companyName TEXT NOT NULL,
            hrName TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            contact TEXT NOT NULL,
            password TEXT NOT NULL
        )`);

        // Create Student table
        db.run(`CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            studentName TEXT NOT NULL,
            rollNumber TEXT NOT NULL UNIQUE,
            department TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            contact TEXT NOT NULL,
            password TEXT NOT NULL
        )`);
    }
});

// Company Registration API
app.post('/api/company/register', (req, res) => {
    const { companyName, hrName, email, contact, password } = req.body;

    const query = `INSERT INTO companies (companyName, hrName, email, contact, password) VALUES (?, ?, ?, ?, ?)`;

    db.run(query, [companyName, hrName, email, contact, password], function (err) {
        if (err) {
            console.error(err);
            return res.status(400).json({ success: false, message: 'Registration failed. Email might already exist.' });
        }
        res.json({ success: true, message: 'Company registered successfully!', id: this.lastID });
    });
});

// Student Registration API
app.post('/api/student/register', (req, res) => {
    const { studentName, rollNumber, department, email, contact, password } = req.body;

    const query = `INSERT INTO students (studentName, rollNumber, department, email, contact, password) VALUES (?, ?, ?, ?, ?, ?)`;

    db.run(query, [studentName, rollNumber, department, email, contact, password], function (err) {
        if (err) {
            console.error(err);
            return res.status(400).json({ success: false, message: 'Registration failed. Email or Roll Number might already exist.' });
        }
        res.json({ success: true, message: 'Student registered successfully!', id: this.lastID });
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
