const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const bcrypt = require('bcrypt');

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
        db.run('PRAGMA journal_mode = WAL;');
        db.run('PRAGMA busy_timeout = 5000;');
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
    db.run("ALTER TABLE jobs ADD COLUMN jobType TEXT", (err) => {});
    db.run("ALTER TABLE jobs ADD COLUMN workMode TEXT", (err) => {});

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

    // 4.6 Announcements Table
    db.run(`CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        title TEXT, 
        message TEXT, 
        audience TEXT DEFAULT 'all', 
        date DATE DEFAULT CURRENT_DATE
    )`);

    // 4.7 Phase 3 Tables (Interviews, Offers, Notifications)
    db.run(`CREATE TABLE IF NOT EXISTS interviews (id INTEGER PRIMARY KEY AUTOINCREMENT, applicationId INTEGER, date TEXT, time TEXT, link TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS offers (id INTEGER PRIMARY KEY AUTOINCREMENT, applicationId INTEGER, offerUrl TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS student_notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, studentId INTEGER, message TEXT, date DATE DEFAULT CURRENT_DATE)`);

    // 4.8 Phase 4 Tables (Super Admin, Logs, Inquiries, Settings, FAQs)
    db.run(`CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS system_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, userId TEXT, role TEXT, action TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    db.run(`CREATE TABLE IF NOT EXISTS portal_settings (id INTEGER PRIMARY KEY AUTOINCREMENT, settingKey TEXT UNIQUE, settingValue TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS inquiries (id INTEGER PRIMARY KEY AUTOINCREMENT, studentId INTEGER, subject TEXT, message TEXT, status TEXT DEFAULT 'pending', date DATE DEFAULT CURRENT_DATE)`);
    db.run(`CREATE TABLE IF NOT EXISTS faqs (id INTEGER PRIMARY KEY AUTOINCREMENT, question TEXT, answer TEXT)`);
});

// ==========================================
// 5. AUTHENTICATION APIs
// ==========================================

// Register (Dynamic for Student, Company, TPO)
app.post('/api/:role/register', async (req, res) => {
    const { role } = req.params;
    const userData = req.body;
    let table = role === 'tpo' ? 'tpo' : (role === 'student' ? 'students' : 'companies');
    
    // STRICT BACKEND VALIDATION FOR REGISTRATION
    if (!userData.password || userData.password.length < 8 || /['"=<>;\\]/.test(userData.password)) {
        return res.status(400).json({ success: false, message: "Password must be at least 8 characters and contain no SQL injection symbols." });
    }

    // Hash the password
    try {
        userData.password = await bcrypt.hash(userData.password, 10);
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error securing password." });
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
        db.get(`SELECT * FROM students WHERE email = ?`, [email], async (err, row) => {
            if (err || !row) return res.status(401).json({ success: false, message: "Invalid Credentials" });
            const match = await bcrypt.compare(password, row.password);
            if (!match) return res.status(401).json({ success: false, message: "Invalid Credentials" });
            delete row.password;
            res.json({ success: true, user: row, role: role });
        });
    } else if (role === 'company') {
        // Professional email format explicitly checked
        if (!email || !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
            return res.status(400).json({ success: false, message: "Use a valid professional email (e.g., name@company.com)." });
        }
        db.get(`SELECT * FROM companies WHERE email = ?`, [email], async (err, row) => {
            if (err || !row) return res.status(401).json({ success: false, message: "Invalid Credentials" });
            const match = await bcrypt.compare(password, row.password);
            if (!match) return res.status(401).json({ success: false, message: "Invalid Credentials" });
            delete row.password;
            res.json({ success: true, user: row, role: role });
        });
    } else if (role === 'tpo') {
        // TPO strictly uses Placement Cell ID which maps to staffID in db
        // Frontend will send staffID during login instead of email
        if (!staffID || !/^[A-Za-z0-9]{10,15}$/.test(staffID)) {
            return res.status(400).json({ success: false, message: "Placement Cell ID must be strictly alphanumeric (10-15 chars). No spaces or specials." });
        }
        db.get(`SELECT * FROM tpo WHERE staffID = ?`, [staffID], async (err, row) => {
            if (err || !row) return res.status(401).json({ success: false, message: "Invalid Credentials" });
            const match = await bcrypt.compare(password, row.password);
            if (!match) return res.status(401).json({ success: false, message: "Invalid Credentials" });
            delete row.password;
            res.json({ success: true, user: row, role: role });
        });
    } else {
        return res.status(400).json({ success: false, message: "Invalid role specified." });
    }
});

// Admin Login
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM admins WHERE username = ?`, [username], async (err, row) => {
        if (err || !row) {
            // Check default admin fallback before rejecting
            if(username === 'nirmalgupta.vx' && password === 'Nexusgen@786') {
                return res.json({ success: true, user: { username: 'nirmalgupta.vx' } });
            }
            return res.status(401).json({ success: false, message: "Invalid Admin Credentials" });
        }
        const match = await bcrypt.compare(password, row.password);
        if (!match) return res.status(401).json({ success: false, message: "Invalid Admin Credentials" });
        res.json({ success: true, user: { username: row.username } });
    });
});


// ==========================================
// 5.5 RESET PASSWORD API
// ==========================================
// --- PUBLIC API (LANDING PAGE STATS) ---
app.get('/api/public/stats', (req, res) => {
    const stats = {};
    db.serialize(() => {
        // Fetch accurate real data for the portal statistics
        db.get("SELECT COUNT(*) as count FROM companies", (err, row) => { 
            stats.companiesOnboard = row ? row.count : 0; 
        });
        db.get("SELECT COUNT(DISTINCT studentId) as count FROM applications WHERE status='hired'", (err, row) => { 
            stats.studentsPlaced = row ? row.count : 0; 
        });
        db.get("SELECT COUNT(*) as count FROM jobs", (err, row) => { 
            stats.activeInternships = row ? row.count : 0; 
        });
        db.get("SELECT COUNT(*) as total_apps FROM applications", (err, totalRow) => {
            db.get("SELECT COUNT(*) as successful_apps FROM applications WHERE status='hired'", (err, successRow) => {
                const total = totalRow ? totalRow.total_apps : 0;
                const successful = successRow ? successRow.successful_apps : 0;
                stats.placementRate = total > 0 ? Math.round((successful / total) * 100) : 0;
                res.json({ success: true, ...stats }); 
            });
        });
    });
});

// --- PUBLIC API (LATEST JOBS) ---
app.get('/api/public/latest-jobs', (req, res) => {
    const query = `
        SELECT jobs.id, jobs.jobTitle as title, jobs.location, jobs.salary as compensation, jobs.jobType, jobs.workMode, companies.companyName 
        FROM jobs 
        JOIN companies ON jobs.companyId = companies.id 
        WHERE jobs.status = 'active' OR jobs.status = 'open'
        ORDER BY jobs.id DESC 
        LIMIT 3
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error("Error fetching latest jobs:", err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, jobs: rows });
    });
});

// ==========================================
// --- PASSWORD RESET ---
app.post('/api/reset-password', async (req, res) => {
    const { role, identity, newPassword } = req.body;
    
    // Strict Password Validation
    if (!newPassword || newPassword.length < 8 || /['"=<>;\\]/.test(newPassword)) {
        return res.status(400).json({ success: false, message: "Invalid password format." });
    }

    let hashedPassword;
    try {
        hashedPassword = await bcrypt.hash(newPassword, 10);
    } catch (err) {
        return res.status(500).json({ success: false, message: "Error securing new password." });
    }

    let sql = "";
    let values = [];

    if (role === 'student') {
        sql = "UPDATE students SET password = ? WHERE email = ?";
        values = [hashedPassword, identity];
    } else if (role === 'company') {
        sql = "UPDATE companies SET password = ? WHERE email = ?";
        values = [hashedPassword, identity];
    } else if (role === 'tpo') {
        sql = "UPDATE tpo SET password = ? WHERE staffID = ?";
        values = [hashedPassword, identity];
    } else {
        return res.status(400).json({ success: false, message: "Invalid role specified." });
    }

    db.run(sql, values, function(err) {
        if (err) return res.status(500).json({ success: false, message: "Database error." });
        if (this.changes === 0) return res.status(404).json({ success: false, message: "Account not found in our database!" });
        res.json({ success: true, message: "Password reset successful!" });
    });
});

// ==========================================
// --- DEBUGGING & ADMIN API ---
// Expose the database directly for debugging purposes (Admin Viewer)
app.get('/api/debug/database', (req, res) => {
    const dbData = {};
    db.serialize(() => {
        db.all("SELECT * FROM students", (err, rows) => { dbData.students = rows; });
        db.all("SELECT * FROM companies", (err, rows) => { dbData.companies = rows; });
        db.all("SELECT * FROM tpo_staff", (err, rows) => { dbData.tpo_staff = rows; });
        db.all("SELECT * FROM jobs", (err, rows) => { dbData.jobs = rows; });
        db.all("SELECT * FROM applications", (err, rows) => { 
            dbData.applications = rows;
            res.json({ success: true, data: dbData });
        });
    });
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

    db.get(`SELECT s.cgpa, s.activeBacklogs, s.status, j.eligibility, j.maxBacklogs FROM students s, jobs j WHERE s.id = ? AND j.id = ?`, 
    [studentId, jobId], (err, row) => {
        if (err) {
            console.log("❌ DATABASE ERROR:", err.message);
            return res.status(500).json({ success: false, message: "DB Error" });
        }
        
        if (!row) {
            console.log(`❌ ERROR: Data mismatch! Either Student ID (${studentId}) is invalid, or Job ID (${jobId}) is deleted.`);
            return res.status(500).json({ success: false, message: "Student or Job not found in DB" });
        }

        console.log("✅ Matching Data Found:", row);

        if (row.status !== 'verified') {
            console.log(`⚠️ REJECTED: Unverified student attempting to apply.`);
            return res.status(403).json({ success: false, message: "Your account is pending TPO verification. You cannot apply to jobs yet." });
        }

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
            console.log("✅ SUCCESS: Application saved in Database! ID:", this.lastID);
            console.log("=========================================");
            res.json({ success: true, message: "Applied Successfully!" });
        });
    });
});
// Get My Applications (LEFT JOIN FIX)
app.get('/api/student/my-applications/:id', (req, res) => {
    const sql = `
        SELECT a.id as applicationId, a.appliedDate, a.status, j.jobTitle, c.companyName, o.offerUrl 
        FROM applications a
        LEFT JOIN jobs j ON a.jobId = j.id
        LEFT JOIN companies c ON j.companyId = c.id
        LEFT JOIN offers o ON a.id = o.applicationId
        WHERE a.studentId = ? ORDER BY a.id DESC
    `;
    db.all(sql, [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: "Error fetching applications" });
        res.json({ success: true, applications: rows || [] });
    });
});

// Withdraw Application
app.delete('/api/student/withdraw-application/:id', (req, res) => {
    db.run(`DELETE FROM applications WHERE id = ? AND status = 'pending'`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ success: false, message: "Server error." });
        if (this.changes === 0) return res.status(400).json({ success: false, message: "Can only withdraw pending apps." });
        res.json({ success: true, message: "Application withdrawn successfully!" });
    });
});

// ==========================================
// 7. COMPANY APIs
// ==========================================

// Post a New Job
app.post('/api/company/post-job', (req, res) => {
    const { companyId, jobTitle, jobDescription, salary, location, jobType, workMode, eligibility, maxBacklogs, deadline } = req.body;

    // Verify company status first
    db.get(`SELECT status FROM companies WHERE id = ?`, [companyId], (err, row) => {
        if (err || !row) return res.status(500).json({ success: false, message: "DB Error" });
        if (row.status !== 'verified') {
            return res.status(403).json({ success: false, message: "Your company is unverified. TPO Approval required." });
        }

        db.run(`INSERT INTO jobs (companyId, jobTitle, jobDescription, salary, location, jobType, workMode, eligibility, maxBacklogs, deadline) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, 
        [companyId, jobTitle, jobDescription, salary, location, jobType, workMode, eligibility, maxBacklogs, deadline], function(err) {
            if (err) return res.status(500).json({ success: false });

        // Phase 3: Auto-notify students
        const jobMsg = `New Job Posted: ${jobTitle}. Check your Job Feed!`;
        db.run(`INSERT INTO student_notifications (studentId, message) SELECT id, ? FROM students WHERE status='verified'`, [jobMsg]);

        res.json({ success: true, message: "Job posted successfully!" });
        });
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

// Edit a Job
app.post('/api/company/edit-job/:id', (req, res) => {
    const { companyId, jobTitle, jobDescription, salary, location, eligibility, maxBacklogs, skills, lastDate, jobType, workMode } = req.body;
    const sql = `UPDATE jobs SET jobTitle=?, jobDescription=?, salary=?, location=?, eligibility=?, maxBacklogs=?, skills=?, lastDate=?, jobType=?, workMode=? WHERE id=? AND companyId=?`;
    
    db.run(sql, [jobTitle, jobDescription, salary, location, eligibility, parseInt(maxBacklogs) || 0, skills, lastDate, jobType, workMode, req.params.id, companyId], function(err) {
        if (err) return res.status(500).json({ success: false, message: "Failed to update job." });
        res.json({ success: true, message: "Job Updated Successfully!" });
    });
});

// Close a Job
app.post('/api/company/close-job/:id', (req, res) => {
    const { companyId } = req.body;
    db.run(`UPDATE jobs SET status = 'closed' WHERE id = ? AND companyId = ?`, [req.params.id, companyId], function(err) {
        if (err) return res.status(500).json({ success: false, message: "Failed to close job." });
        res.json({ success: true, message: "Job closed successfully." });
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
        
        db.get(`SELECT studentId FROM applications WHERE id = ?`, [applicationId], (dbErr, row) => {
            if(row) {
                const msg = `Your application status has been updated to: ${status.toUpperCase()}`;
                db.run(`INSERT INTO student_notifications (studentId, message) VALUES (?, ?)`, [row.studentId, msg]);
            }
        });
        
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

// Get Unplaced Students (Verified but not hired)
app.get('/api/tpo/unplaced-students', (req, res) => {
    const sql = `
        SELECT s.id, s.studentName, s.email, s.department, s.cgpa, s.skills
        FROM students s 
        WHERE s.status = 'verified' 
        AND s.id NOT IN (SELECT studentId FROM applications WHERE status = 'hired')
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, students: rows || [] });
    });
});

// Post Announcement
app.post('/api/tpo/announcements', (req, res) => {
    const { title, message, audience } = req.body;
    db.run(`INSERT INTO announcements (title, message, audience) VALUES (?, ?, ?)`, 
    [title, message, audience || 'all'], function(err) {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, message: "Announcement published successfully." });
    });
});

// Get Latest Announcements
app.get('/api/public/announcements', (req, res) => {
    db.all(`SELECT * FROM announcements ORDER BY id DESC`, [], (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        res.json({ success: true, announcements: rows || [] });
    });
});

// ==========================================
// 9. PHASE 3 APIs (Interviews, Offers, Notifications)
// ==========================================

app.post('/api/company/schedule-interview', (req, res) => {
    const { applicationId, date, time, link } = req.body;
    db.run(`INSERT INTO interviews (applicationId, date, time, link) VALUES (?, ?, ?, ?)`, [applicationId, date, time, link], err => {
        if(err) return res.json({success: false});
        
        db.get(`SELECT studentId FROM applications WHERE id = ?`, [applicationId], (dbErr, row) => {
            if(row) {
                const msg = `You have a new Interview scheduled on ${date} at ${time}.`;
                db.run(`INSERT INTO student_notifications (studentId, message) VALUES (?, ?)`, [row.studentId, msg]);
            }
        });

        res.json({success: true, message: "Interview scheduled!"});
    });
});

app.post('/api/company/upload-offer', (req, res) => {
    const { applicationId, offerUrl } = req.body;
    db.run(`INSERT INTO offers (applicationId, offerUrl) VALUES (?, ?)`, [applicationId, offerUrl], err => {
        if(err) return res.json({success: false});
        
        db.get(`SELECT studentId FROM applications WHERE id = ?`, [applicationId], (dbErr, row) => {
            if(row) {
                const msg = `Congratulations! You have received an Offer Letter. Check your Applications tab.`;
                db.run(`INSERT INTO student_notifications (studentId, message) VALUES (?, ?)`, [row.studentId, msg]);
            }
        });

        res.json({success: true, message: "Offer uploaded!"});
    });
});

app.get('/api/student/interviews/:studentId', (req, res) => {
    const sql = `
        SELECT i.*, j.jobTitle, c.companyName 
        FROM interviews i
        JOIN applications a ON i.applicationId = a.id
        JOIN jobs j ON a.jobId = j.id
        JOIN companies c ON j.companyId = c.id
        WHERE a.studentId = ? ORDER BY i.id DESC
    `;
    db.all(sql, [req.params.studentId], (err, rows) => {
        res.json({success: !err, interviews: rows || []});
    });
});

app.get('/api/student/notifications/:studentId', (req, res) => {
    db.all(`SELECT * FROM student_notifications WHERE studentId = ? ORDER BY id DESC`, [req.params.studentId], (err, rows) => {
        res.json({success: !err, notifications: rows || []});
    });
});

// Export Placement Report (CSV)
app.get('/api/tpo/export-report', (req, res) => {
    const csvRows = [];
    csvRows.push("Placement Overview Report");
    csvRows.push("Metric,Value");
    
    db.get(`SELECT COUNT(*) as s FROM students`, (err, r1) => {
        db.get(`SELECT COUNT(*) as c FROM companies WHERE status='verified'`, (err, r2) => {
            db.get(`SELECT COUNT(*) as a FROM applications WHERE status='hired'`, (err, r3) => {
                csvRows.push(`Total Registered Students,${r1 ? r1.s : 0}`);
                csvRows.push(`Verified Companies,${r2 ? r2.c : 0}`);
                csvRows.push(`Total Students Placed,${r3 ? r3.a : 0}`);
                csvRows.push("");
                
                csvRows.push("Drive Analytics");
                csvRows.push("Company Name,Job Title,Total Applications,Shortlisted,Hired");
                
                const sql = `
                    SELECT j.jobTitle, c.companyName,
                           (SELECT COUNT(*) FROM applications WHERE jobId = j.id) as totalApps,
                           (SELECT COUNT(*) FROM applications WHERE jobId = j.id AND status = 'shortlisted') as shortlistedApps,
                           (SELECT COUNT(*) FROM applications WHERE jobId = j.id AND status = 'hired') as hiredApps
                    FROM jobs j
                    JOIN companies c ON j.companyId = c.id
                    ORDER BY j.id DESC
                `;
                db.all(sql, [], (err, rows) => {
                    if (rows) {
                        rows.forEach(row => {
                            const company = `"${row.companyName.replace(/"/g, '""')}"`;
                            const job = `"${row.jobTitle.replace(/"/g, '""')}"`;
                            csvRows.push(`${company},${job},${row.totalApps},${row.shortlistedApps},${row.hiredApps}`);
                        });
                    }
                    
                    const csvContent = csvRows.join("\n");
                    res.setHeader('Content-Type', 'text/csv');
                    res.setHeader('Content-Disposition', 'attachment; filename="placement_report.csv"');
                    res.send(csvContent);
                });
            });
        });
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
// 10. SPRINT 4 APIs (Admin & Student Hub)
// ==========================================

// Dashboard Admin Stats
app.get('/api/admin/stats', (req, res) => {
    db.serialize(() => {
        const stats = {};
        db.get("SELECT COUNT(*) as c FROM students", (err, r) => stats.students = r ? r.c : 0);
        db.get("SELECT COUNT(*) as c FROM companies", (err, r) => stats.companies = r ? r.c : 0);
        db.get("SELECT COUNT(*) as c FROM inquiries WHERE status='pending'", (err, r) => {
            stats.pendingInquiries = r ? r.c : 0;
            res.json({ success: true, ...stats });
        });
    });
});

// Fetch All Users for Admin
app.get('/api/admin/users', (req, res) => {
    const data = { students: [], companies: [], tpos: [] };
    db.serialize(() => {
        db.all("SELECT id, studentName as name, email, 'Student' as role, status FROM students", (err, rows) => data.students = rows || []);
        db.all("SELECT id, companyName as name, email, 'Company' as role, status FROM companies", (err, rows) => data.companies = rows || []);
        db.all("SELECT id, staffName as name, email, 'TPO' as role, 'active' as status FROM tpo", (err, rows) => {
            data.tpos = rows || [];
            res.json({ success: true, users: [...data.students, ...data.companies, ...data.tpos] });
        });
    });
});

// Delete or Deactivate User
app.post('/api/admin/delete-user', (req, res) => {
    const { role, id } = req.body;
    let table = role === 'Student' ? 'students' : (role === 'Company' ? 'companies' : 'tpo');
    db.run(`DELETE FROM ${table} WHERE id=?`, [id], function(err) {
        if(err) return res.json({success: false, message: "Error deleting user"});
        db.run(`INSERT INTO system_logs (userId, role, action) VALUES ('Admin', 'Admin', 'Deleted ${role} ID: ${id}')`);
        res.json({success: true, message: "User deleted successfully!"});
    });
});

// Download DB Backup
app.get('/api/admin/backup', (req, res) => {
    db.run(`INSERT INTO system_logs (userId, role, action) VALUES ('Admin', 'Admin', 'Downloaded Database Backup')`);
    res.download('./database.db', `backup-${Date.now()}.db`);
});

// Get System Logs
app.get('/api/admin/logs', (req, res) => {
    db.all("SELECT * FROM system_logs ORDER BY id DESC LIMIT 50", [], (err, rows) => {
        res.json({ success: true, logs: rows || [] });
    });
});

// Get Inquiries
app.get('/api/admin/inquiries', (req, res) => {
    db.all("SELECT i.*, s.studentName FROM inquiries i LEFT JOIN students s ON i.studentId = s.id ORDER BY i.id DESC", [], (err, rows) => {
        res.json({ success: true, inquiries: rows || [] });
    });
});

// Admin Reply to Inquiry
app.post('/api/admin/reply-inquiry', (req, res) => {
    db.run(`UPDATE inquiries SET status = 'resolved' WHERE id = ?`, [req.body.id], err => res.json({success: !err}));
});

// Submit Inquiry (Student)
app.post('/api/student/inquiry', (req, res) => {
    const { studentId, subject, message } = req.body;
    db.run(`INSERT INTO inquiries (studentId, subject, message) VALUES (?, ?, ?)`, [studentId, subject, message], err => {
        if(err) return res.json({success: false, message: "Failed to submit"});
        res.json({success: true, message: "Message sent to TPO/Admin!"});
    });
});

// Student Hub Data
app.get('/api/public/hub-data', (req, res) => {
    const data = { faqs: [], settings: {}, recruiters: [] };
    db.serialize(() => {
        db.all("SELECT * FROM faqs", (err, rows) => data.faqs = rows || []);
        db.all("SELECT * FROM portal_settings", (err, rows) => {
            if(rows) rows.forEach(r => data.settings[r.settingKey] = r.settingValue);
        });
        db.all("SELECT companyName FROM companies WHERE status='verified'", (err, rows) => {
            data.recruiters = rows || [];
            res.json({ success: true, ...data });
        });
    });
});

// ==========================================
// WOW APIs (Sprint 4)
// ==========================================
app.get('/api/admin/export-logs', (req, res) => {
    db.all("SELECT * FROM system_logs ORDER BY timestamp DESC", (err, rows) => {
        if(err) return res.status(500).send("DB Error");
        let csv = "ID,Action,Admin,Target,Timestamp\n";
        rows.forEach(r => csv += `${r.id},"${r.action}","${r.adminUser}","${r.targetUser}","${r.timestamp}"\n`);
        fs.writeFileSync('logs_export.csv', csv);
        res.download('logs_export.csv');
    });
});

app.post('/api/admin/clear-logs', (req, res) => {
    db.run("DELETE FROM system_logs", [], err => {
        if(err) return res.json({success: false});
        res.json({success: true});
    });
});

const uploadDB = multer({ dest: 'uploads/' });
app.post('/api/admin/restore-db', uploadDB.single('dbfile'), (req, res) => {
    if(!req.file) return res.json({success: false, message: "No file uploaded"});
    try {
        fs.copyFileSync(req.file.path, 'database.db');
        res.json({success: true, message: "Database restored successfully! Please restart server manually."});
    } catch(err) {
        res.json({success: false, message: "Error restoring database."});
    }
});

app.post('/api/admin/settings/broadcast', (req, res) => {
    const { text } = req.body;
    db.run(`INSERT OR REPLACE INTO portal_settings (settingKey, settingValue) VALUES ('broadcast_msg', ?)`, [text], err => {
        if(err) return res.json({success: false, message: "Error saving broadcast"});
        res.json({success: true, message: "Broadcast Updated"});
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