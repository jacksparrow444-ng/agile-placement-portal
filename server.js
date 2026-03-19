const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();

// ==========================================
// 1. MIDDLEWARE CONFIGURATION
// ==========================================
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use('/uploads', express.static('uploads'));

// ==========================================
// 2. DATABASE CONNECTION & SETUP
// ==========================================
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error("❌ Database Connection Error: " + err.message);
    } else {
        console.log('✅ Connected to SQLite. FULL MASTER SERVER IS RUNNING.');
    }
});

// ==========================================
// 3. MULTER SETUP (FOR RESUME UPLOADS)
// ==========================================
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const studentId = req.body.studentId || 'unknown';
        cb(null, `resume-${studentId}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed!'), false);
        }
    }
});

// ==========================================
// 4. DATABASE SCHEMA (ALL TABLES)
// ==========================================
db.serialize(() => {
    // 4.1 Students Table
    db.run(`CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        studentName TEXT, rollNumber TEXT UNIQUE, department TEXT,
        email TEXT UNIQUE, contact TEXT, password TEXT,
        cgpa REAL, passoutYear INTEGER, skills TEXT, github TEXT, resumePath TEXT,
        activeBacklogs INTEGER DEFAULT 0, status TEXT DEFAULT 'unverified'
    )`);

    // 4.2 Companies Table
    db.run(`CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        companyName TEXT, hrName TEXT, email TEXT UNIQUE,
        contact TEXT, password TEXT, status TEXT DEFAULT 'unverified'
    )`);

    // 4.3 TPO Table
    db.run(`CREATE TABLE IF NOT EXISTS tpo (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        staffName TEXT, staffID TEXT UNIQUE, email TEXT UNIQUE,
        contact TEXT, password TEXT
    )`);

    // 4.4 Jobs Table (With Eligibility & Skills)
    db.run(`CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        companyId INTEGER,
        jobTitle TEXT, jobDescription TEXT, salary TEXT, location TEXT, 
        eligibility TEXT, skills TEXT, lastDate TEXT, maxBacklogs INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active', postedDate DATE DEFAULT CURRENT_DATE
    )`);

    // 4.5 Applications Table (With Unique Constraint to prevent double apply)
    db.run(`CREATE TABLE IF NOT EXISTS applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        studentId INTEGER, 
        jobId INTEGER,
        coverLetter TEXT, 
        status TEXT DEFAULT 'pending', 
        appliedDate DATE DEFAULT CURRENT_DATE,
        UNIQUE(studentId, jobId)
    )`);
});

// ==========================================
// 5. AUTHENTICATION APIs
// ==========================================

// Register (Dynamic for Student, Company, TPO)
app.post('/api/:role/register', (req, res) => {
    const { role } = req.params;
    const userData = req.body;
    let table = role === 'tpo' ? 'tpo' : (role === 'student' ? 'students' : 'companies');
    
    // STRICT BACKEND VALIDATION FOR REGISTRATION
    if (!userData.password || userData.password.length < 8 || /['"=<>;\\]/.test(userData.password)) {
        return res.status(400).json({ success: false, message: "Password must be at least 8 characters and contain no SQL injection symbols." });
    }

    // Contact Number Validation (Starts with 6-9 and exactly 10 digits)
    if (userData.contact && !/^[6-9]\d{9}$/.test(userData.contact)) {
        return res.status(400).json({ success: false, message: "Contact number must be exactly 10 digits and start with 6-9." });
    }

    // Companies need TPO verification
    if(role === 'company') userData.status = 'unverified';

    const columns = Object.keys(userData).join(', ');
    const placeholders = Object.keys(userData).map(() => '?').join(', ');
    const values = Object.values(userData);

    const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;

    db.run(sql, values, function(err) {
        if (err) {
            console.error("❌ SQL INSERT ERROR:", err.message);
            console.error("Table:", table, "Data:", userData);
            if (err.message.includes("SQLITE_BUSY")) {
                return res.status(500).json({ success: false, message: "Database is locked by DB Browser. Please click 'Write Changes' and close it." });
            }
            return res.status(400).json({ success: false, message: "Email/ID already exists! Try another." });
        }
        res.json({ success: true, message: "Registered Successfully!" });
    });
});

// Login (Role Based) with Strict Backend Validation
app.post('/api/login', (req, res) => {
    const { email, staffID, password, role } = req.body;
    
    // Strict Password Validation (preventing SQL injection payloads)
    if (!password || /['"=<>;\\]/.test(password)) {
        return res.status(400).json({ success: false, message: "Invalid password format. Special injection characters not allowed." });
    }

    if (role === 'student') {
        // Must be a valid email
        if (!email || !/^[\w\.-]+@[\w\.-]+\.\w{2,}$/.test(email)) {
            return res.status(400).json({ success: false, message: "Invalid College Email format." });
        }
        if (password.length < 8) {
            return res.status(400).json({ success: false, message: "Student password must be at least 8 characters." });
        }
        db.get(`SELECT * FROM students WHERE email = ? AND password = ?`, [email, password], (err, row) => {
            if (err || !row) return res.status(401).json({ success: false, message: "Invalid Credentials" });
            delete row.password;
            res.json({ success: true, user: row, role: role });
        });
    } else if (role === 'company') {
        // Professional email format explicitly checked
        if (!email || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
            return res.status(400).json({ success: false, message: "Use a valid professional email (e.g., name@company.com)." });
        }
        db.get(`SELECT * FROM companies WHERE email = ? AND password = ?`, [email, password], (err, row) => {
            if (err || !row) return res.status(401).json({ success: false, message: "Invalid Credentials" });
            delete row.password;
            res.json({ success: true, user: row, role: role });
        });
    } else if (role === 'tpo') {
        // TPO strictly uses Placement Cell ID which maps to staffID in db
        // Frontend will send staffID during login instead of email
        if (!staffID || !/^[A-Za-z0-9]{10,15}$/.test(staffID)) {
            return res.status(400).json({ success: false, message: "Placement Cell ID must be strictly alphanumeric (10-15 chars). No spaces or specials." });
        }
        db.get(`SELECT * FROM tpo WHERE staffID = ? AND password = ?`, [staffID, password], (err, row) => {
            if (err || !row) return res.status(401).json({ success: false, message: "Invalid Credentials" });
            delete row.password;
            res.json({ success: true, user: row, role: role });
        });
    } else {
        return res.status(400).json({ success: false, message: "Invalid role specified." });
    }
});

// ==========================================
// 6. STUDENT APIs
// ==========================================

// Upload Resume & Update Profile
app.post('/api/student/upload-resume', upload.single('resume'), (req, res) => {
    const { studentId, department, cgpa, passoutYear, skills, github, activeBacklogs } = req.body;
    let resumePath = req.file ? req.file.path : null;

    let sql = `UPDATE students SET department=?, cgpa=?, passoutYear=?, skills=?, github=?, activeBacklogs=?, resumePath=COALESCE(?, resumePath) WHERE id=?`;
    db.run(sql, [department, parseFloat(cgpa), passoutYear, skills, github, parseInt(activeBacklogs) || 0, resumePath, studentId], function(err) {
        if (err) {
            console.error("❌ Profile Update DB Error:", err.message);
            if (err.message.includes("SQLITE_BUSY")) {
                return res.status(500).json({ success: false, message: "Database is locked by DB Browser! Please open DB Browser, click 'Write Changes', and close it." });
            }
            return res.status(500).json({ success: false, message: "Failed to update profile: " + err.message });
        }
        res.json({ success: true, message: "Profile & Resume updated successfully!" });
    });
});

// Get Student Profile
app.get('/api/student/get-profile/:id', (req, res) => {
    db.get(`SELECT * FROM students WHERE id = ?`, [req.params.id], (err, row) => {
        if (err || !row) return res.status(404).json({ success: false, message: "Student not found" });
        res.json({ success: true, student: row });
    });
});

// Get Available Jobs (Job Feed)
app.get('/api/student/available-jobs', (req, res) => {
    const sql = `SELECT jobs.*, companies.companyName FROM jobs JOIN companies ON jobs.companyId = companies.id WHERE jobs.status = 'active' ORDER BY jobs.id DESC`;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: "Error fetching jobs" });
        res.json({ success: true, jobs: rows || [] });
    });
});

// Apply for Job (STRICT CGPA CHECK)
app.post('/api/student/apply', (req, res) => {
    console.log("=========================================");
    console.log("👉 APPLY BUTTON CLICKED!");
    console.log("📦 Data Received from Frontend:", req.body);

    const { studentId, jobId, coverLetter } = req.body;

    if (!studentId || !jobId) {
        console.log("❌ ERROR: studentId ya jobId missing hai!");
        return res.status(400).json({ success: false, message: "IDs are missing!" });
    }

    db.get(`SELECT s.cgpa, s.activeBacklogs, j.eligibility, j.maxBacklogs FROM students s, jobs j WHERE s.id = ? AND j.id = ?`, 
    [studentId, jobId], (err, row) => {
        if (err) {
            console.log("❌ DATABASE ERROR:", err.message);
            return res.status(500).json({ success: false, message: "DB Error" });
        }
        
        if (!row) {
            console.log(`❌ ERROR: Data match nahi hua! Ya toh Student ID (${studentId}) galat hai, ya Job ID (${jobId}) delete ho chuki hai.`);
            return res.status(500).json({ success: false, message: "Student or Job not found in DB" });
        }

        console.log("✅ Matching Data Found:", row);

        const studentCGPA = parseFloat(row.cgpa) || 0;
        const requiredCGPA = parseFloat(row.eligibility) || 0;
        const studentBacklogs = parseInt(row.activeBacklogs) || 0;
        const allowedBacklogs = parseInt(row.maxBacklogs) || 0;

        if (studentCGPA < requiredCGPA) {
            console.log(`⚠️ REJECTED: Student CGPA (${studentCGPA}) < Required (${requiredCGPA})`);
            return res.status(400).json({ success: false, message: `Need ${requiredCGPA} CGPA, you have ${studentCGPA}.` });
        }

        if (studentBacklogs > allowedBacklogs) {
            console.log(`⚠️ REJECTED: Student Backlogs (${studentBacklogs}) > Allowed (${allowedBacklogs})`);
            return res.status(400).json({ success: false, message: `Maximum ${allowedBacklogs} active backlogs allowed, you have ${studentBacklogs}.` });
        }

        db.run(`INSERT INTO applications (studentId, jobId, coverLetter) VALUES (?, ?, ?)`, 
        [studentId, jobId, coverLetter], function(err) {
            if (err) {
                console.log("❌ INSERT ERROR (Pehle hi apply kar chuka hai kya?):", err.message);
                return res.status(400).json({ success: false, message: "You have already applied!" });
            }
            console.log("✅ SUCCESS: Application Database mein SAVE ho gayi! ID:", this.lastID);
            console.log("=========================================");
            res.json({ success: true, message: "Applied Successfully!" });
        });
    });
});
// Get My Applications (LEFT JOIN FIX)
app.get('/api/student/my-applications/:id', (req, res) => {
    const sql = `
        SELECT a.appliedDate, a.status, j.jobTitle, c.companyName 
        FROM applications a
        LEFT JOIN jobs j ON a.jobId = j.id
        LEFT JOIN companies c ON j.companyId = c.id
        WHERE a.studentId = ? ORDER BY a.id DESC
    `;
    db.all(sql, [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: "Error fetching applications" });
        res.json({ success: true, applications: rows || [] });
    });
});

// ==========================================
// 7. COMPANY APIs
// ==========================================

// Post a New Job
app.post('/api/company/post-job', (req, res) => {
    const { companyId, jobTitle, jobDescription, salary, location, eligibility, maxBacklogs, skills, lastDate } = req.body;
    const sql = `INSERT INTO jobs (companyId, jobTitle, jobDescription, salary, location, eligibility, maxBacklogs, skills, lastDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [companyId, jobTitle, jobDescription, salary, location, eligibility, parseInt(maxBacklogs) || 0, skills, lastDate], function(err) {
        if (err) return res.status(500).json({ success: false, message: "Failed to post job." });
        res.json({ success: true, message: "Job Posted Successfully!" });
    });
});

// Get Jobs Posted by Specific Company
app.get('/api/company/my-jobs/:id', (req, res) => {
    db.all(`SELECT * FROM jobs WHERE companyId = ? ORDER BY id DESC`, [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, jobs: rows || [] });
    });
});

// Delete a Job
app.delete('/api/company/delete-job/:id', (req, res) => {
    db.run(`DELETE FROM jobs WHERE id = ?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ success: false, message: "Failed to delete job." });
        res.json({ success: true, message: "Job deleted successfully." });
    });
});

// View Applicants for a Job (For Company Dashboard)
app.get('/api/company/view-applicants/:jobId', (req, res) => {
    const sql = `
        SELECT a.id as applicationId, a.coverLetter, a.status, a.appliedDate, 
               s.studentName, s.email, s.cgpa, s.skills, s.resumePath, s.activeBacklogs 
        FROM applications a 
        JOIN students s ON a.studentId = s.id 
        WHERE a.jobId = ?
    `;
    db.all(sql, [req.params.jobId], (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, applicants: rows || [] });
    });
});

// Update Application Status (Approve/Reject)
app.post('/api/company/update-application-status', (req, res) => {
    const { applicationId, status } = req.body;
    db.run(`UPDATE applications SET status = ? WHERE id = ?`, [status, applicationId], function(err) {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, message: "Application status updated!" });
    });
});

// Company Dashboard Stats
app.get('/api/company/stats/:id', (req, res) => {
    const companyId = req.params.id;
    db.get(`SELECT COUNT(*) as j FROM jobs WHERE companyId = ?`, [companyId], (err, r1) => {
        db.get(`SELECT COUNT(*) as a FROM applications a JOIN jobs j ON a.jobId = j.id WHERE j.companyId = ?`, [companyId], (err, r2) => {
            res.json({ success: true, jobCount: r1 ? r1.j : 0, applicantCount: r2 ? r2.a : 0 });
        });
    });
});

// ==========================================
// 8. TPO APIs
// ==========================================

// Get Pending Companies for Verification
app.get('/api/tpo/pending-companies', (req, res) => {
    db.all(`SELECT * FROM companies WHERE status = 'unverified'`, (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, companies: rows || [] });
    });
});

// Get Pending Students for Verification
app.get('/api/tpo/pending-students', (req, res) => {
    db.all(`SELECT * FROM students WHERE status = 'unverified'`, (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, students: rows || [] });
    });
});

// Verify Student (Approve/Reject)
app.post('/api/tpo/verify-student', (req, res) => {
    const { studentId, action } = req.body;
    db.run(`UPDATE students SET status = ? WHERE id = ?`, [action, studentId], function(err) {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, message: "Student status updated." });
    });
});

// Verify Company (Approve/Reject)
app.post('/api/tpo/verify-company', (req, res) => {
    const { companyId, action } = req.body;
    db.run(`UPDATE companies SET status = ? WHERE id = ?`, [action, companyId], function(err) {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, message: "Company status updated." });
    });
});

// Get All Drives
app.get('/api/tpo/get-drives', (req, res) => {
    db.all(`SELECT j.*, c.companyName FROM jobs j JOIN companies c ON j.companyId = c.id ORDER BY j.id DESC`, (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, drives: rows || [] });
    });
});

// Update Drive Status (Active/Stop)
app.post('/api/tpo/update-drive-status', (req, res) => {
    const { jobId, status } = req.body;
    db.run(`UPDATE jobs SET status = ? WHERE id = ?`, [status, jobId], function(err) {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true });
    });
});

// TPO Dashboard Stats
app.get('/api/tpo/stats', (req, res) => {
    db.get(`SELECT COUNT(*) as s FROM students`, (err, r1) => {
        db.get(`SELECT COUNT(*) as c FROM companies WHERE status='verified'`, (err, r2) => {
            db.get(`SELECT COUNT(*) as a FROM applications WHERE status='hired'`, (err, r3) => {
                res.json({ 
                    success: true, 
                    totalStudents: r1 ? r1.s : 0, 
                    companyCount: r2 ? r2.c : 0, 
                    placedCount: r3 ? r3.a : 0 
                });
            });
        });
    });
});

// Drive Analytics
app.get('/api/tpo/drive-analytics', (req, res) => {
    const sql = `
        SELECT j.id, j.jobTitle, c.companyName,
               (SELECT COUNT(*) FROM applications WHERE jobId = j.id) as totalApps,
               (SELECT COUNT(*) FROM applications WHERE jobId = j.id AND status = 'shortlisted') as shortlistedApps,
               (SELECT COUNT(*) FROM applications WHERE jobId = j.id AND status = 'hired') as hiredApps
        FROM jobs j
        JOIN companies c ON j.companyId = c.id
        ORDER BY j.id DESC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, analytics: rows || [] });
    });
});

// ==========================================
// 8.5 PUBLIC APIs (Landing Page)
// ==========================================

// Public Dashboard Stats for Landing Page (index.html)
app.get('/api/public/stats', (req, res) => {
    // 1. Get total verified companies
    db.get(`SELECT COUNT(*) as c FROM companies WHERE status='verified'`, (err, r1) => {
        // 2. Get total placed students (distinct students hired)
        db.get(`SELECT COUNT(DISTINCT studentId) as s FROM applications WHERE status='hired'`, (err, r2) => {
            // 3. Get total active internships
            db.get(`SELECT COUNT(*) as j FROM jobs WHERE status='active'`, (err, r3) => {
                // 4. Get total students for placement rate computation
                db.get(`SELECT COUNT(*) as total FROM students`, (err, r4) => {
                    let total = r4 ? r4.total : 0;
                    let placed = r2 ? r2.s : 0;
                    let rate = total > 0 ? Math.round((placed / total) * 100) : 0;
                    // Provide defaults so the page never looks broken, even on an empty DB
                    res.json({ 
                        success: true, 
                        companiesOnboard: r1 && r1.c > 0 ? r1.c : 0, 
                        studentsPlaced: placed > 0 ? placed : 0, 
                        activeInternships: r3 && r3.j > 0 ? r3.j : 0, 
                        placementRate: rate > 0 ? rate : 0
                    });
                });
            });
        });
    });
});

// ==========================================
// 9. SERVER START
// ==========================================
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 MASTER SERVER RUNNING: http://localhost:${PORT}`);
    console.log(`🛡️  ALL APIs RESTORED (AUTH, STUDENT, COMPANY, TPO)`);
    console.log(`=======================================================`);
});