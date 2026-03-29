document.addEventListener("DOMContentLoaded", function() {
    
    const form = document.getElementById("studentProfileForm");
    const resumeInput = document.getElementById("resume");
    const editBtn = document.getElementById("editProfileBtn");
    const actionBar = document.getElementById("actionBar");
    const allInputs = form.querySelectorAll("input, select");
    const dropzone = document.getElementById("dropzone");
    
    let isEditMode = false;

    // --- 1. Edit Profile Toggle Logic ---
    editBtn.addEventListener("click", function(e) {
        e.preventDefault();
        isEditMode = !isEditMode;
        
        if (isEditMode) {
            // Unlock all fields
            allInputs.forEach(input => input.removeAttribute("disabled"));
            
            // Transform Button
            editBtn.innerHTML = '<i class="fas fa-times"></i> Cancel Edit';
            editBtn.style.color = "#ef4444";
            editBtn.style.borderColor = "#ef4444";
            
            // Show Action Bar smoothly
            actionBar.style.display = "flex";
            dropzone.style.borderColor = "#cbd5e1"; // Make dropzone look active
        } else {
            // Lock fields again (Cancel)
            allInputs.forEach(input => input.setAttribute("disabled", "true"));
            
            // Reset Button
            editBtn.innerHTML = '<i class="fas fa-pen"></i> Edit Profile';
            editBtn.style.color = "#334155";
            editBtn.style.borderColor = "#e2e8f0";
            
            // Hide Action Bar
            actionBar.style.display = "none";
        }
    });

    // --- 2. Custom Premium Toast Notification ---
    function showToast(message, isError = false) {
        const toast = document.getElementById("toast");
        const toastMsg = document.getElementById("toastMsg");
        const toastIcon = toast.querySelector(".toast-icon");
        
        toastMsg.innerText = message;
        
        if(isError) {
            toast.style.borderLeftColor = "#ef4444";
            toastIcon.className = "fas fa-exclamation-circle toast-icon";
            toastIcon.style.color = "#ef4444";
        } else {
            toast.style.borderLeftColor = "#10b981";
            toastIcon.className = "fas fa-check-circle toast-icon";
            toastIcon.style.color = "#10b981";
        }

        toast.classList.add("show");
        
        // Hide after 3 seconds
        setTimeout(() => {
            toast.classList.remove("show");
        }, 3000);
    }

    // --- 3. Drag and Drop Visuals ---
    resumeInput.addEventListener("dragenter", () => {
        if(!isEditMode) return;
        dropzone.classList.add("dragover");
    });
    resumeInput.addEventListener("dragleave", () => {
        dropzone.classList.remove("dragover");
    });
    resumeInput.addEventListener("drop", () => {
        dropzone.classList.remove("dragover");
    });

    // File name display on select
    resumeInput.addEventListener("change", function() {
        if(this.files && this.files.length > 0) {
            const fileName = this.files[0].name;
            dropzone.querySelector("p").innerText = "Selected: " + fileName;
            dropzone.querySelector(".upload-icon").className = "fas fa-file-pdf upload-icon";
            dropzone.querySelector(".upload-icon").style.color = "#0ea5e9";
        }
    });

    // --- 4. Form Submit & Validation ---
    form.addEventListener("submit", function(e) {
        e.preventDefault();

        if (resumeInput.files.length > 0) {
            const file = resumeInput.files[0];
            const allowedExtensions = /(\.pdf)$/i;
            
            if (!allowedExtensions.exec(file.name)) {
                showToast("Invalid File! PDF only.", true);
                return;
            }

            if (file.size > 2 * 1024 * 1024) {
                showToast("File is too large! Max 2MB.", true);
                return;
            }
        }

        // Success Simulation
        showToast("Profile details updated successfully!");
        
        // Auto-click edit button to lock fields back
        setTimeout(() => {
            editBtn.click(); 
        }, 800);
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const photoInput = document.getElementById('photoInput');
    const userPhoto = document.getElementById('userPhoto');

    // 1. Check previously saved photo
    const savedImg = localStorage.getItem('student_pfp');
    if (savedImg) {
        userPhoto.src = savedImg;
    }

    // 2. Change upon photo selection
    photoInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                // Photo preview dikhao
                userPhoto.src = e.target.result;
                // Save in LocalStorage
                localStorage.setItem('student_pfp', e.target.result);
            };
            reader.readAsDataURL(file);
        }
    });
});