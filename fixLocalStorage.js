const fs = require('fs');
const sFiles = ['student_profile.html', 'student_notifications.html', 'student_job_feed.html', 'student_interviews.html', 'student_interface.html', 'student_applications.html'];
const cFiles = ['company_interface.html', 'company_dashboard.html', 'post_job.html', 'manage_jobs.html', 'view_applicants.html'];
const tFiles = ['tpo_auth.html', 'tpo_dashboard.html', 'tpo_unplaced.html'];

function replaceInFiles(files, newKey) {
    for (let f of files) {
        if(fs.existsSync(f)) {
            let content = fs.readFileSync(f, 'utf8');
            content = content.replace(/'currentUser'/g, "'" + newKey + "'");
            content = content.replace(/"currentUser"/g, '"' + newKey + '"');
            fs.writeFileSync(f, content);
            console.log("Updated", f);
        }
    }
}

replaceInFiles(sFiles, 'currentStudent');
replaceInFiles(cFiles, 'currentCompany');
replaceInFiles(tFiles, 'currentTpo');
console.log('Replaced successfully');
