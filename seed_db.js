const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const db = new sqlite3.Database('./database.db');

const DEFAULT_PASSWORD = bcrypt.hashSync('password123', 10);

const locations = ['Noida', 'Delhi', 'Bengaluru', 'Chandigarh', 'Panchkula', 'Mohali'];
const depts = ['CSE', 'IT', 'ECE', 'EE', 'ME'];
const jobTypes = ['internship', 'full-time'];
const workModes = ['office', 'remote', 'office'];

const companyNames = [
    'TechNova Solutions', 'InnoSys India', 'DataCore Analytics', 'CloudNet Tech', 'ByteWorks',
    'SoftSolutions', 'CodeCrafters', 'AppVanguard', 'WebMinds', 'AI Dynamics',
    'Quantum Logic', 'CyberSphere Security', 'Nexus Tech', 'InfoStream', 'LogicGate',
    'Global Soft', 'Apex Systems', 'Visionary IT', 'Pioneer Tech', 'FutureWorks Ltd',
    'SmartGrid Innovations', 'Elite Coders', 'NextGen IT', 'Prime Logic', 'Spark Systems'
];

db.serialize(() => {
    // 1. Insert 15 Students
    const stmtStudent = db.prepare(`
        INSERT INTO students 
        (studentName, rollNumber, department, email, contact, password, cgpa, passoutYear, skills, github, activeBacklogs, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 1; i <= 15; i++) {
        const id = Date.now() + i; // unique roll Number base
        stmtStudent.run(
            `Mock Student ${i}`,
            `2026CS${id.toString().slice(-5)}`,
            depts[i % depts.length],
            `mockstudent${i}@college.edu`,
            `98765432${i.toString().padStart(2, '0')}`,
            DEFAULT_PASSWORD,
            parseFloat((Math.random() * 3 + 6.5).toFixed(1)), // 6.5 to 9.5
            2026,
            'React, Node.js, Python, SQL',
            `https://github.com/mockstudent${i}`,
            Math.floor(Math.random() * 2), // 0 or 1
            'verified'
        );
    }
    stmtStudent.finalize();

    // 2. Insert 25 Companies and their Jobs
    const stmtCompany = db.prepare(`
        INSERT INTO companies (companyName, hrName, email, contact, password, status) 
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    const stmtJob = db.prepare(`
        INSERT INTO jobs 
        (companyId, jobTitle, jobDescription, salary, location, eligibility, maxBacklogs, skills, lastDate, jobType, workMode, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `);

    let companiesInserted = 0;
    companyNames.forEach((cName, idx) => {
        stmtCompany.run(
            cName,
            `HR ${cName.split(' ')[0]}`,
            `hr@${cName.split(' ')[0].toLowerCase().replace(/[^a-z]/ig,'')}${Date.now() % 1000}.com`, // ensure unique
            `88888888${idx.toString().padStart(2, '0')}`,
            DEFAULT_PASSWORD,
            'verified',
            function(err) {
                if (err) {
                    console.error("Error inserting company:", err.message);
                } else {
                    const companyId = this.lastID;
                    const numJobs = Math.floor(Math.random() * 3) + 2; // 2 to 4 jobs per company
                    
                    for (let j = 0; j < numJobs; j++) {
                        const loc = locations[Math.floor(Math.random() * locations.length)];
                        const isIT = Math.random() > 0.4;
                        let title = isIT ? 'Software Development Engineer' : 'Data Analyst';
                        const jType = jobTypes[Math.floor(Math.random() * jobTypes.length)];
                        const wMode = workModes[Math.floor(Math.random() * workModes.length)];
                        
                        if (jType === 'internship') title += ' Intern';
                        
                        const sal = jType === 'internship' ? (Math.floor(Math.random() * 15 + 15) + '000/month') : (Math.floor(Math.random() * 10) + 5) + ' LPA';
                        const elig = (Math.random() * 2 + 6).toFixed(1);
                        const desc = `We are looking for motivated individuals to join our team in ${loc}. You will work on cutting-edge technologies.`;

                        stmtJob.run(
                            companyId,
                            title,
                            desc,
                            sal,
                            loc,
                            parseFloat(elig),
                            Math.floor(Math.random() * 2),
                            isIT ? 'JavaScript, React, Node.js' : 'Python, SQL, Excel',
                            '2026-12-31',
                            jType,
                            wMode
                        );
                    }
                }
                companiesInserted++;
                if (companiesInserted === companyNames.length) {
                    stmtJob.finalize();
                    console.log("✅ Custom Data Seeding Completed Successfully!");
                    console.log(`➡️ Added 15 Students`);
                    console.log(`➡️ Added 25 Companies in specified locations`);
                    console.log(`➡️ Added ~70 Internship and Placement Jobs`);
                }
            }
        );
    });
    stmtCompany.finalize();
});
