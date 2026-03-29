document.addEventListener("DOMContentLoaded", () => {
    checkStatus(); // Check status on page load
});

function checkStatus() {
    // LocalStorage se status check kar rahe hain (Simulation of Database)
    const status = localStorage.getItem('google_status') || 'unverified';
    
    if (status === 'verified') {
        unlockDashboard();
    } else if (status === 'pending') {
        showPending();
    }
}

function requestAccess() {
    const btn = document.getElementById('sendReqBtn');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    
    setTimeout(() => {
        localStorage.setItem('google_status', 'pending'); // Request bheji
        showPending();
        showToast("Access Request Sent to TPO!");
    }, 1200);
}

function showPending() {
    document.getElementById('sendReqBtn').classList.add('hidden');
    document.getElementById('pendingMsg').classList.remove('hidden');
    const badge = document.getElementById('statusBadge');
    badge.innerText = "Pending Approval";
    badge.className = "status-pill pending";
}

function unlockDashboard() {
    document.getElementById('verificationSection').classList.add('hidden');
    document.getElementById('dashboardSection').classList.remove('hidden');
    
    const badge = document.getElementById('statusBadge');
    badge.innerText = "Verified";
    badge.className = "status-pill verified";

    // Unlock Sidebar
    document.querySelectorAll('.locked').forEach(link => {
        link.classList.remove('locked');
        link.querySelector('.fa-lock').remove();
    });
}

// Job Form Handling
const modal = document.getElementById('jobModal');
window.openModal = () => modal.style.display = 'flex';
window.closeModal = () => modal.style.display = 'none';

document.getElementById('detailedJobForm').onsubmit = function(e) {
    e.preventDefault();
    const title = document.getElementById('jTitle').value;
    const pack = document.getElementById('jPack').value;
    const branch = document.getElementById('jBranch').value;
    const date = document.getElementById('jDate').value;
    
    const row = `<tr>
        <td><strong>${title}</strong></td>
        <td>${branch}</td>
        <td>${pack} LPA</td>
        <td>${date}</td>
        <td><span class="status-pill verified">Active</span></td>
        <td><button class="btn-close" onclick="this.closest('tr').remove()">Delete</button></td>
    </tr>`;

    document.getElementById('jobList').innerHTML += row;
    document.getElementById('jobCount').innerText = parseInt(document.getElementById('jobCount').innerText) + 1;
    
    closeModal();
    this.reset();
    showToast("Job Drive Published!");
};

function showToast(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}