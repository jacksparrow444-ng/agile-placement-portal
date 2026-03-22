const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

const realNames = [
    'Aarav Sharma', 'Vivaan Singh', 'Aditya Patel', 'Vihaan Gupta', 'Arjun Kumar', 
    'Ananya Verma', 'Diya Reddy', 'Isha Desai', 'Riya Mishra', 'Neha Joshi', 
    'Rahul Yadav', 'Karan Malhotra', 'Pooja Agarwal', 'Sneha Nair', 'Rohan Mehta', 
    'Vikram Singh', 'Kavya Kapoor', 'Priya Bhatia', 'Amit Tiwari', 'Vansh Rajput'
];
const depts = ['CSE', 'IT', 'ECE', 'EE', 'ME', 'CSE', 'CSE', 'IT'];

db.serialize(() => {
    // 1. Delete old mock students
    db.run("DELETE FROM students WHERE studentName LIKE 'Mock Student%'", function(err) {
        if (err) console.error("Error deleting mock students:", err.message);
        else console.log(`✅ Deleted ${this.changes} mock students.`);
    });

    // 2. Insert new real students
    const stmtStudent = db.prepare(`
        INSERT INTO students 
        (studentName, rollNumber, department, email, contact, password, cgpa, passoutYear, skills, github, activeBacklogs, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let startRollNo = 11242401;

    for (let i = 0; i < realNames.length; i++) {
        const rollStr = (startRollNo + i).toString();
        const firstName = realNames[i].split(' ')[0].toLowerCase();
        
        stmtStudent.run(
            realNames[i],
            rollStr, // MMDU Roll Number series
            depts[i % depts.length],
            `${firstName}${rollStr.slice(-2)}@mmumullana.org`, // Realistic mmdu email domain
            `98765432${String(i).padStart(2, '0')}`,
            `password123`,
            parseFloat((Math.random() * 3 + 6.5).toFixed(1)), // 6.5 to 9.5
            2026,
            'React, Java, Python, SQL',
            `https://github.com/${firstName}${rollStr.slice(-3)}`,
            Math.floor(Math.random() * 2), // 0 or 1
            'verified'
        );
    }
    stmtStudent.finalize(() => {
        console.log(`✅ Added ${realNames.length} real students with MMDU roll number series starting from ${startRollNo}.`);
    });
});
db.close();
