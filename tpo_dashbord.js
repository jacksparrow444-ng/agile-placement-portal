function handleRequest(rowId, company, action) {
    const row = document.getElementById(rowId);
    const count = document.getElementById('pendingCount');
    const toast = document.getElementById('toast');

    // Action start
    row.style.opacity = '0.5';
    row.style.pointerEvents = 'none';

    setTimeout(() => {
        if (action === 'approve') {
            localStorage.setItem(company.toLowerCase() + '_verified', 'true');
            toast.innerText = company + " Approved Successfully!";
            toast.style.borderLeft = "5px solid #10b981";
        } else {
            toast.innerText = company + " Request Rejected.";
            toast.style.borderLeft = "5px solid #ef4444";
        }

        // Animation Out
        row.style.transform = 'translateX(20px)';
        row.style.opacity = '0';
        
        setTimeout(() => {
            row.remove();
            count.innerText = parseInt(count.innerText) - 1;
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
            
            // Empty State
            if(document.getElementById('requestList').children.length === 0) {
                document.getElementById('requestList').innerHTML = '<tr><td colspan="4" style="text-align:center; padding:30px; color:#94a3b8;">No pending requests.</td></tr>';
            }
        }, 300);
    }, 600);
}