document.addEventListener("DOMContentLoaded", function() {
    
    // Navbar Scroll Effect
    const navbar = document.querySelector('.navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

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

    // --- Dynamic Latest Jobs Fetching ---
    const fetchLatestJobs = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/public/latest-jobs');
            const data = await res.json();
            const container = document.getElementById('latestJobsContainer');
            
            if(data.success && data.jobs.length > 0) {
                container.innerHTML = ''; // clear loading state
                data.jobs.forEach(job => {
                    const compInitial = job.companyName.charAt(0).toUpperCase();
                    container.innerHTML += `
                        <div class="job-item">
                            <div class="job-main-info">
                                <div class="company-logo" style="background:#f1f5f9; color: var(--primary);">${compInitial}</div>
                                <div class="job-info">
                                    <h4>${job.title}</h4>
                                    <p>
                                        <span><i class="fas fa-building"></i> ${job.companyName}</span>
                                        <span><i class="fas fa-map-marker-alt"></i> ${job.location}</span>
                                        <span><i class="fas fa-rupee-sign"></i> ${job.compensation}</span>
                                    </p>
                                </div>
                            </div>
                            <a href="student_interface.html" class="apply-small-btn">Apply Now</a>
                        </div>
                    `;
                });
            } else {
                container.innerHTML = `<p style="text-align:center; color: var(--text-muted);">No current openings. Check back soon!</p>`;
            }
        } catch (error) {
            console.error("Error fetching latest jobs:", error);
        }
    };

    // --- Dark/Light Mode Theme Toggle ---
    const themeBtn = document.getElementById('themeToggle');
    const themeIcon = themeBtn.querySelector('i');
    
    if(localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        themeIcon.classList.replace('fa-moon', 'fa-sun');
    }

    themeBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        if(document.body.classList.contains('dark-mode')) {
            localStorage.setItem('theme', 'dark');
            themeIcon.classList.replace('fa-moon', 'fa-sun');
        } else {
            localStorage.setItem('theme', 'light');
            themeIcon.classList.replace('fa-sun', 'fa-moon');
        }
    });

    // --- Live Broadcast Fetching (Sprint 4 WOW) ---
    const fetchBroadcast = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/public/hub-data');
            const data = await res.json();
            if(data.success && data.settings && data.settings.broadcast_msg) {
                const banner = document.getElementById('broadcastBanner');
                const marquee = document.getElementById('broadcastMarqueeText');
                if(data.settings.broadcast_msg.trim() !== '') {
                    marquee.innerHTML = `<i class="fas fa-exclamation-triangle"></i> &nbsp; ${data.settings.broadcast_msg} &nbsp; <i class="fas fa-exclamation-triangle"></i>`;
                    banner.style.display = 'block';
                }
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Execute API pulls on load
    fetchStats();
    fetchLatestJobs();
    fetchBroadcast();
});