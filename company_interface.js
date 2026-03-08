document.addEventListener("DOMContentLoaded", function() {

    // Toggle Variables
    const form = document.getElementById("companyForm");
    const toggleBtn = document.getElementById("toggleLogin");
    const formTitle = document.getElementById("formTitle");
    const submitBtn = form.querySelector(".btn-primary");
    
    // Inputs to hide/show
    const companyNameInput = document.getElementById("companyName");
    const hrNameInput = document.getElementById("hrName");
    const contactInput = document.getElementById("contact");
    const termsRow = document.getElementById("termsRow");
    const termsInput = document.getElementById("terms");
    
    let isLoginMode = false;

    // Modal Variables
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

    // --- Toggle Logic ---
    toggleBtn.addEventListener("click", function(e) {
        e.preventDefault();
        isLoginMode = !isLoginMode;

        if (isLoginMode) {
            // Switch to Login UI
            formTitle.innerText = "Company Login";
            submitBtn.innerText = "Login to Dashboard";
            toggleBtn.innerHTML = "Create new account";
            
            // Hide registration fields
            companyNameInput.style.display = "none";
            hrNameInput.style.display = "none";
            contactInput.style.display = "none";
            termsRow.style.display = "none";
            
            // Remove required
            companyNameInput.removeAttribute("required");
            hrNameInput.removeAttribute("required");
            contactInput.removeAttribute("required");
            termsInput.removeAttribute("required");
        } else {
            // Switch to Register UI
            formTitle.innerText = "Company Registration";
            submitBtn.innerText = "Register Company";
            toggleBtn.innerHTML = "Login here";
            
            // Show fields
            companyNameInput.style.display = "block";
            hrNameInput.style.display = "block";
            contactInput.style.display = "block";
            termsRow.style.display = "flex";
            
            // Add required
            companyNameInput.setAttribute("required", "true");
            hrNameInput.setAttribute("required", "true");
            contactInput.setAttribute("required", "true");
            termsInput.setAttribute("required", "true");
        }
    });

    // --- Form Submit ---
    form.addEventListener("submit", function(e) {
        e.preventDefault();

        if(!form.checkValidity()) {
            alert("Please fill all required fields.");
            return;
        }

        generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
        otpExpired = false;

        otpModal.style.display = "flex";
        otpInput.value = "";
        otpError.innerText = "";
        resendBtn.disabled = true;

        startTimer();
        alert("Demo OTP: " + generatedOtp);
    });

    // --- Timer Logic ---
    function startTimer() {
        timeLeft = 30;
        timerText.innerText = "Time left: " + timeLeft + " seconds";

        if(timer) clearInterval(timer);

        timer = setInterval(function() {
            timeLeft--;
            timerText.innerText = "Time left: " + timeLeft + " seconds";

            if(timeLeft <= 0) {
                clearInterval(timer);
                timerText.innerText = "OTP Expired";
                resendBtn.disabled = false;
                otpExpired = true;
            }
        }, 1000);
    }

    // --- Verify Logic ---
    verifyBtn.addEventListener("click", function() {
        const enteredOtp = otpInput.value.trim();
        otpError.innerText = "";

        if(enteredOtp === "") { otpError.innerText = "Please enter OTP."; return; }
        if(otpExpired) { otpError.innerText = "OTP Expired. Please resend OTP."; return; }
        if(enteredOtp !== generatedOtp) { otpError.innerText = "Invalid OTP."; return; }

        clearInterval(timer);
        otpModal.style.display = "none";
        successModal.style.display = "flex";

        if(isLoginMode) {
            successTitle.innerText = "Login Successful";
            successMsg.innerText = "Redirecting to Company Dashboard...";
        } else {
            successTitle.innerText = "Registration Successful";
            successMsg.innerText = "Your email has been verified successfully.";
        }
    });

    // --- Resend Logic ---
    resendBtn.addEventListener("click", function() {
        if(!otpExpired) return;
        generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
        otpExpired = false;
        resendBtn.disabled = true;
        startTimer();
        alert("New Demo OTP: " + generatedOtp);
    });

    // --- Close & Redirect Logic ---
    closeSuccessBtn.addEventListener("click", function() {
        successModal.style.display = "none";
        
        if(isLoginMode) {
            window.location.href = "company_dashboard.html"; // Redirect to dashboard
        } else {
            form.reset();
            toggleBtn.click(); // Switch to login mode after successful registration
        }
    });
});