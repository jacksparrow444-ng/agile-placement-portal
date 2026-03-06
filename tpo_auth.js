document.addEventListener("DOMContentLoaded", function() {
    
    // --- Form & Toggle Variables ---
    const form = document.getElementById("tpoForm");
    const toggleBtn = document.getElementById("toggleLogin");
    const formTitle = document.getElementById("formTitle");
    const submitBtn = form.querySelector(".btn-primary");
    
    const nameInput = document.getElementById("tpoName");
    const staffIdInput = document.getElementById("staffId");
    const contactInput = document.getElementById("tpoContact");
    let isLoginMode = false;

    // --- OTP Modal Variables ---
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
            formTitle.innerText = "TPO Staff Login";
            submitBtn.innerText = "Login to Dashboard";
            toggleBtn.innerHTML = "Create new account";
            
            // Hide registration only fields
            nameInput.style.display = "none";
            staffIdInput.style.display = "none";
            contactInput.style.display = "none";
            
            // Remove required attribute
            nameInput.removeAttribute("required");
            staffIdInput.removeAttribute("required");
            contactInput.removeAttribute("required");
        } else {
            // Switch to Register UI
            formTitle.innerText = "TPO Staff Registration";
            submitBtn.innerText = "Register as TPO";
            toggleBtn.innerHTML = "Login here";
            
            // Show registration fields
            nameInput.style.display = "block";
            staffIdInput.style.display = "block";
            contactInput.style.display = "block";
            
            // Add required attribute
            nameInput.setAttribute("required", "true");
            staffIdInput.setAttribute("required", "true");
            contactInput.setAttribute("required", "true");
        }
    });

    // --- 2. Form Submit & Trigger OTP ---
    form.addEventListener("submit", function(e) {
        e.preventDefault();
        
        if(!form.checkValidity()){
            alert("Please fill all required fields.");
            return;
        }

        // Generate Demo OTP
        generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
        otpExpired = false;

        // Show Modal
        otpModal.style.display = "flex";
        otpInput.value = "";
        otpError.innerText = "";
        resendBtn.disabled = true;

        startTimer();
        alert("Demo OTP Sent: " + generatedOtp); // For testing purposes
    });

    // --- 3. OTP Timer Logic ---
    function startTimer() {
        timeLeft = 30;
        timerText.innerText = "Time left: " + timeLeft + "s";
        
        if(timer) clearInterval(timer);

        timer = setInterval(function() {
            timeLeft--;
            timerText.innerText = "Time left: " + timeLeft + "s";
            
            if(timeLeft <= 0){
                clearInterval(timer);
                timerText.innerText = "OTP Expired";
                resendBtn.disabled = false;
                otpExpired = true;
            }
        }, 1000);
    }

    // --- 4. Verify OTP ---
    verifyBtn.addEventListener("click", function() {
        const enteredOtp = otpInput.value.trim();
        otpError.innerText = "";

        if(enteredOtp === "") { 
            otpError.innerText = "Please enter OTP."; 
            return; 
        }
        if(otpExpired) { 
            otpError.innerText = "OTP Expired. Please resend."; 
            return; 
        }
        if(enteredOtp !== generatedOtp) { 
            otpError.innerText = "Invalid OTP."; 
            return; 
        }

        // Success condition
        clearInterval(timer);
        otpModal.style.display = "none";
        successModal.style.display = "flex";
        
        if (isLoginMode) {
            successTitle.innerText = "Login Successful";
            successMsg.innerText = "Redirecting to your dashboard...";
        } else {
            successTitle.innerText = "Registration Successful";
            successMsg.innerText = "Your account has been verified and created.";
        }
    });

    // --- 5. Resend OTP ---
    resendBtn.addEventListener("click", function() {
        if(!otpExpired) return; // Only allow resend if expired
        
        generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
        otpExpired = false;
        resendBtn.disabled = true;
        
        startTimer();
        alert("New Demo OTP Sent: " + generatedOtp);
    });

    // --- 6. Close Success Modal & Redirect ---
    closeSuccessBtn.addEventListener("click", function() {
        successModal.style.display = "none";
        
        if (isLoginMode) {
            // Asli project me yahan dashboard link aayega
            window.location.href = "tpo_dashboard.html"; 
        } else {
            // Registration ke baad clear form and switch to login
            form.reset();
            toggleBtn.click(); 
        }
    });
});