document.addEventListener("DOMContentLoaded", function () {

    // --- Form & Toggle Variables ---
    const form = document.getElementById("studentForm");
    const toggleBtn = document.getElementById("toggleLogin");
    const formTitle = document.getElementById("formTitle");
    const submitBtn = document.getElementById("submitBtn");
    
    // Rows to hide during login
    const nameRow = document.getElementById("nameRow");
    const rollRow = document.getElementById("rollRow");
    const deptRow = document.getElementById("deptRow");
    const contactRow = document.getElementById("contactRow");
    const termsRow = document.getElementById("termsRow");
    
    // Inputs inside those rows
    const studentName = document.getElementById("studentName");
    const rollNumber = document.getElementById("rollNumber");
    const department = document.getElementById("department");
    const contact = document.getElementById("contact");
    const terms = document.getElementById("terms");

    let isLoginMode = false;

    // --- Modal Variables ---
    const otpModal = document.getElementById("otpModal");
    const successModal = document.getElementById("successModal");
    const otpInput = document.getElementById("otpInput");
    const verifyBtn = document.getElementById("verifyOtpBtn");
    const resendBtn = document.getElementById("resendOtpBtn");
    const timerText = document.getElementById("timerText");
    const otpError = document.getElementById("otpError");
    
    const closeSuccessBtn = document.getElementById("closeSuccessBtn");
    const successTitle = document.getElementById("successTitle");
    const successMsg = document.getElementById("successMsg");

    let generatedOtp = "";
    let timer = null;
    let timeLeft = 30;
    let otpExpired = false;

    // --- 1. Toggle Login / Register Mode ---
    toggleBtn.addEventListener("click", function(e) {
        e.preventDefault();
        isLoginMode = !isLoginMode;

        if (isLoginMode) {
            // Switch to Login UI
            formTitle.innerText = "Student Login";
            submitBtn.innerText = "Login to Portal";
            toggleBtn.innerHTML = "Create new account";
            
            // Hide registration fields
            nameRow.style.display = "none";
            rollRow.style.display = "none";
            deptRow.style.display = "none";
            contactRow.style.display = "none";
            termsRow.style.display = "none";
            
            // Remove required attribute
            studentName.removeAttribute("required");
            rollNumber.removeAttribute("required");
            department.removeAttribute("required");
            contact.removeAttribute("required");
            terms.removeAttribute("required");
        } else {
            // Switch to Register UI
            formTitle.innerText = "Student Registration";
            submitBtn.innerText = "Register Student";
            toggleBtn.innerHTML = "Login here";
            
            // Show registration fields
            nameRow.style.display = "block";
            rollRow.style.display = "block";
            deptRow.style.display = "block";
            contactRow.style.display = "block";
            termsRow.style.display = "flex";
            
            // Add required attribute
            studentName.setAttribute("required", "true");
            rollNumber.setAttribute("required", "true");
            department.setAttribute("required", "true");
            contact.setAttribute("required", "true");
            terms.setAttribute("required", "true");
        }
    });

    // --- 2. Form Submit & OTP Trigger ---
    form.addEventListener("submit", function (e) {
        e.preventDefault();

        if (!form.checkValidity()) {
            alert("Please fill all required fields.");
            return;
        }

        // Demo OTP Flow
        generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
        otpExpired = false;

        otpModal.style.display = "flex";
        otpInput.value = "";
        otpError.innerText = "";
        resendBtn.disabled = true;

        startTimer();
        alert("Demo OTP: " + generatedOtp);
    });

    // --- 3. OTP Timer ---
    function startTimer() {
        timeLeft = 30;
        timerText.innerText = "Time left: " + timeLeft + " seconds";

        if (timer) clearInterval(timer);

        timer = setInterval(function () {
            timeLeft--;
            timerText.innerText = "Time left: " + timeLeft + " seconds";

            if (timeLeft <= 0) {
                clearInterval(timer);
                timerText.innerText = "OTP Expired";
                resendBtn.disabled = false;
                otpExpired = true;
            }
        }, 1000);
    }

    // --- 4. Verify OTP ---
    verifyBtn.addEventListener("click", function () {
        const enteredOtp = otpInput.value.trim();
        otpError.innerText = "";

        if (enteredOtp === "") { otpError.innerText = "Please enter OTP."; return; }
        if (otpExpired) { otpError.innerText = "OTP Expired. Please resend OTP."; return; }
        if (enteredOtp !== generatedOtp) { otpError.innerText = "Invalid OTP."; return; }

        clearInterval(timer);
        
        // As you are developing frontend, I'm hiding Nirmal's fetch API call temporarily
        // so you don't get 'localhost:3000' errors while testing the UI flow.
        
        otpModal.style.display = "none";
        successModal.style.display = "flex";
        
        if (isLoginMode) {
            successTitle.innerText = "Login Successful";
            successMsg.innerText = "Taking you to your dashboard...";
        } else {
            successTitle.innerText = "Registration Successful";
            successMsg.innerText = "Your student account is created.";
        }
    });

    // --- 5. Resend OTP ---
    resendBtn.addEventListener("click", function () {
        if (!otpExpired) return;
        generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
        otpExpired = false;
        resendBtn.disabled = true;
        startTimer();
        alert("New Demo OTP: " + generatedOtp);
    });

    // --- 6. Close Modal & Redirect ---
    closeSuccessBtn.addEventListener("click", function () {
        successModal.style.display = "none";
        
        if (isLoginMode) {
            // Redirect to Student Profile Page (Sprint 2 task)
            window.location.href = "student_profile.html";
        } else {
            form.reset();
            toggleBtn.click(); // Switch to login view after registration
        }
    });

});