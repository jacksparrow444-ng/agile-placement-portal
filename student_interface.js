document.addEventListener("DOMContentLoaded", function () {

    let generatedOtp = "";
    let timer = null;
    let timeLeft = 30;
    let otpExpired = false;

    const form = document.getElementById("studentForm");
    const otpModal = document.getElementById("otpModal");
    const successModal = document.getElementById("successModal");
    const otpInput = document.getElementById("otpInput");
    const verifyBtn = document.getElementById("verifyOtpBtn");
    const resendBtn = document.getElementById("resendOtpBtn");
    const timerText = document.getElementById("timerText");
    const otpError = document.getElementById("otpError");
    const closeSuccessBtn = document.getElementById("closeSuccessBtn");

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        if (!form.checkValidity()) {
            alert("Please fill all required fields.");
            return;
        }

        // For now we just simulate OTP since we are working on the frontend
        generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
        otpExpired = false;

        otpModal.style.display = "flex";
        otpInput.value = "";
        otpError.innerText = "";
        resendBtn.disabled = true;

        startTimer();

        alert("Demo OTP: " + generatedOtp);
    });

    function startTimer() {
        timeLeft = 30;
        timerText.innerText = "Time left: " + timeLeft + " seconds";

        if (timer) {
            clearInterval(timer);
        }

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

    verifyBtn.addEventListener("click", function () {

        const enteredOtp = otpInput.value.trim();
        otpError.innerText = "";

        if (enteredOtp === "") {
            otpError.innerText = "Please enter OTP.";
            return;
        }

        if (otpExpired) {
            otpError.innerText = "OTP Expired. Please resend OTP.";
            return;
        }

        if (enteredOtp !== generatedOtp) {
            otpError.innerText = "Invalid OTP.";
            return;
        }

        clearInterval(timer);

        const payload = {
            studentName: document.getElementById("studentName").value,
            rollNumber: document.getElementById("rollNumber").value,
            department: document.getElementById("department").value,
            email: document.getElementById("email").value,
            contact: document.getElementById("contact").value,
            password: document.getElementById("password").value
        };

        fetch('http://localhost:3000/api/student/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    otpModal.style.display = "none";
                    successModal.style.display = "flex";
                    form.reset();
                } else {
                    otpError.innerText = data.message;
                }
            })
            .catch(err => {
                console.error(err);
                otpError.innerText = "Registration failed. Try again.";
            });
    });

    resendBtn.addEventListener("click", function () {

        if (!otpExpired) return;

        generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
        otpExpired = false;
        resendBtn.disabled = true;

        startTimer();

        alert("New Demo OTP: " + generatedOtp);
    });

    closeSuccessBtn.addEventListener("click", function () {
        successModal.style.display = "none";
        form.reset();
    });

});
