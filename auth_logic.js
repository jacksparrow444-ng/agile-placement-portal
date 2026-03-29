// registration_page.html ke form submit par ye function call karna
async function handleRegistration(event, role) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    const endpoint = role === 'student' ? '/api/student/register' : '/api/company/register';

    try {
        const response = await fetch(`http://localhost:3000${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (result.success) {
            alert("Registration Successful! Now you can Login.");
            window.location.href = 'login.html'; // Redirect to login page
        } else {
            alert("Error: " + result.message);
        }
    } catch (error) {
        console.error("Connection Error:", error);
    }
}