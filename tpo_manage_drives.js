document.addEventListener("DOMContentLoaded", function() {
    
    // Toggle Drive Status (Pause/Resume) - User Story #25
    window.toggleDriveStatus = function(btn, driveId) {
        const row = document.getElementById(driveId);
        const statusPill = row.querySelector('.status-pill');
        const icon = btn.querySelector('i');

        if (statusPill.innerText !== "PAUSED") {
            // Pause the drive
            statusPill.innerText = "PAUSED";
            statusPill.className = "status-pill paused";
            icon.className = "fas fa-play";
            btn.style.color = "#10b981";
            btn.style.background = "#d1fae5";
            btn.title = "Resume Drive";
            showToast("Drive has been paused.", true);
        } else {
            // Resume (back to ongoing as an example)
            statusPill.innerText = "ONGOING";
            statusPill.className = "status-pill ongoing";
            icon.className = "fas fa-pause";
            btn.style.color = "#ef4444";
            btn.style.background = "#fff1f2";
            btn.title = "Pause Drive";
            showToast("Drive is back online!");
        }
    };

    function openEditDrive(btn, rowId) {
    const row = document.getElementById(rowId);
    const modal = document.getElementById('editDriveModal');
    
    // Table se data uthao
    const compName = row.cells[0].innerText;
    const role = row.cells[1].innerText;
    const currentStatus = row.querySelector('.status-pill').innerText;

    // Form mein bharo
    document.getElementById('editRowId').value = rowId;
    document.getElementById('editCompName').value = compName;
    document.getElementById('editRole').value = role;
    document.getElementById('editStatus').value = currentStatus;

    modal.style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editDriveModal').style.display = 'none';
}

document.getElementById('editDriveForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const rowId = document.getElementById('editRowId').value;
    const row = document.getElementById(rowId);
    const newStatus = document.getElementById('editStatus').value;
    
    const statusCell = row.querySelector('.status-pill');
    
    // Logic for Status Colors
    statusCell.innerText = newStatus;
    statusCell.className = 'status-pill'; // Reset classes
    
    if(newStatus === 'Active') {
        statusCell.style.color = '#10b981';
        statusCell.style.background = '#dcfce3';
    } else if(newStatus === 'Paused') {
        statusCell.style.color = '#f59e0b';
        statusCell.style.background = '#fef3c7';
    } else if(newStatus === 'Stopped') {
        statusCell.style.color = '#ef4444';
        statusCell.style.background = '#fee2e2';
    }

    closeEditModal();
    showToast(`Drive status updated to ${newStatus}`);
});

window.openEditDrive = function(btn, rowId) {
    const row = document.getElementById(rowId);
    const modal = document.getElementById('editDriveModal');
    
    // Fill Modal
    document.getElementById('editRowId').value = rowId;
    document.getElementById('editCompName').value = row.cells[0].innerText;
    document.getElementById('editRole').value = row.cells[1].innerText;
    
    modal.style.display = 'flex';
}

window.closeEditModal = function() {
    document.getElementById('editDriveModal').style.display = 'none';
}

    function showToast(msg, isWarning = false) {
        const toast = document.getElementById('toast');
        const toastMsg = document.getElementById('toastMsg');
        toastMsg.innerText = msg;
        toast.style.borderLeftColor = isWarning ? "#ef4444" : "#10b981";
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // Search Filtering logic
    document.getElementById('driveSearch').addEventListener('keyup', function() {
        let filter = this.value.toLowerCase();
        let rows = document.querySelectorAll('#drivesTableBody tr');
        rows.forEach(row => {
            let text = row.innerText.toLowerCase();
            row.style.display = text.includes(filter) ? "" : "none";
        });
    });
});