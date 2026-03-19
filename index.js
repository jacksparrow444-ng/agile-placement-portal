document.addEventListener("DOMContentLoaded", function() {
    
    // Animate on Scroll Function
    const reveal = () => {
        const reveals = document.querySelectorAll(".scroll-reveal");
        reveals.forEach(el => {
            const windowHeight = window.innerHeight;
            const revealTop = el.getBoundingClientRect().top;
            const revealPoint = 100;

            if (revealTop < windowHeight - revealPoint) {
                el.classList.add("active");
            }
        });
    };

    window.addEventListener("scroll", reveal);
    reveal(); // Initial check

    // Smooth scroll for nav links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // --- Dynamic Stats Fetching (User Story #47 Landing Page API) ---
    const fetchStats = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/public/stats');
            const data = await response.json();
            
            if(data.success) {
                // Animate counts smoothly
                animateValue("companiesOnboardCount", 0, data.companiesOnboard, 2000, "+");
                animateValue("studentsPlacedCount", 0, data.studentsPlaced, 2000, "+");
                animateValue("activeInternshipsCount", 0, data.activeInternships, 2000, "+");
                animateValue("placementRateCount", 0, data.placementRate, 2000, "%");
            }
        } catch (error) {
            console.error("Error fetching stats:", error);
        }
    };

    const animateValue = (id, start, end, duration, suffix="") => {
        const obj = document.getElementById(id);
        if (!obj) return;
        if (end === 0) {
            obj.innerHTML = "0" + suffix;
            return;
        }
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            obj.innerHTML = Math.floor(progress * (end - start) + start) + suffix;
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    };

    // Execute API pull on load
    fetchStats();
});