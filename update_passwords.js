const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db');

const newPassword = '12345678';

db.serialize(() => {
    // Update students
    db.run("UPDATE students SET password = ?", [newPassword], function(err) {
        if (err) console.error("Error updating students:", err.message);
        else console.log(`✅ Updated passwords for ${this.changes} students.`);
    });
    
    // Update companies
    db.run("UPDATE companies SET password = ?", [newPassword], function(err) {
        if (err) console.error("Error updating companies:", err.message);
        else console.log(`✅ Updated passwords for ${this.changes} companies.`);
    });
    
    // Update tpo
    db.run("UPDATE tpo SET password = ?", [newPassword], function(err) {
        if (err) console.error("Error updating tpo:", err.message);
        else console.log(`✅ Updated passwords for ${this.changes} TPO staff.`);
    });
});

// Close database safely
db.close((err) => {
    if (err) console.error(err.message);
    else console.log("Database connection closed.");
});
