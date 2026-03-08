document.addEventListener("DOMContentLoaded", function() {
    
    // --- USER STORY #11: ELIGIBILITY DATA (Mock Data) ---
    const studentData = {
        cgpa: 7.5,
        backlogs: 0,
        branch: "CSE"
    };

    // --- 1. FILTER & ELIGIBILITY LOGIC ---
    const searchInput = document.getElementById("searchInput");
    const typeFilters = document.querySelectorAll(".filter-type");
    const locationFilter = document.getElementById("locationFilter");
    const jobCards = document.querySelectorAll(".job-card");

    function filterAndCheckJobs() {
        const searchTerm = searchInput.value.toLowerCase();
        const activeTypes = Array.from(typeFilters).filter(cb => cb.checked).map(cb => cb.value);
        const selectedLoc = locationFilter.value;

        jobCards.forEach(card => {
            const title = card.querySelector(".job-title").innerText.toLowerCase();
            const company = card.querySelector(".company-name").innerText.toLowerCase();
            const cardType = card.getAttribute("data-type");
            const cardLoc = card.getAttribute("data-location");
            
            // Eligibility Criteria from Data Attributes
            const minCGPA = parseFloat(card.getAttribute("data-min-cgpa")) || 0;
            const reqBranch = card.getAttribute("data-branch") || "All";
            const applyBtn = card.querySelector(".apply-btn");

            // Logic 1: Filter Matching
            const matchesSearch = title.includes(searchTerm) || company.includes(searchTerm);
            const matchesType = activeTypes.length === 0 || activeTypes.includes(cardType);
            const matchesLoc = selectedLoc === "all" || cardLoc === selectedLoc;

            // Logic 2: Eligibility Check (#11)
            let isEligible = true;
            let reason = "";
            if (studentData.cgpa < minCGPA) {
                isEligible = false;
                reason = `Min ${minCGPA} CGPA Required`;
            } else if (reqBranch !== "All" && reqBranch !== studentData.branch) {
                isEligible = false;
                reason = `Only for ${reqBranch}`;
            }

            // Apply Display & Eligibility
            if (matchesSearch && matchesType && matchesLoc) {
                card.style.display = "flex";
                if (!isEligible && !applyBtn.classList.contains('applied')) {
                    applyBtn.innerHTML = `<i class="fas fa-lock"></i> ${reason}`;
                    applyBtn.disabled = true;
                    applyBtn.style.opacity = "0.6";
                    applyBtn.style.cursor = "not-allowed";
                }
            } else {
                card.style.display = "none";
            }
        });
    }

    // Event Listeners
    if(searchInput) searchInput.addEventListener("keyup", filterAndCheckJobs);
    if(locationFilter) locationFilter.addEventListener("change", filterAndCheckJobs);
    typeFilters.forEach(cb => cb.addEventListener("change", filterAndCheckJobs));

    // --- 2. APPLY MODAL LOGIC ---
    const applyModal = document.getElementById("applyModal");
    const applyForm = document.getElementById("applyJobForm");
    let currentBtn = null;

    document.querySelectorAll(".apply-btn").forEach(btn => {
        btn.addEventListener("click", function() {
            if(this.disabled || this.classList.contains('applied')) return;
            currentBtn = this;
            document.getElementById("modalJobTitle").innerText = this.getAttribute("data-job");
            applyModal.style.display = "flex";
        });
    });

    if(applyForm) {
        applyForm.addEventListener("submit", (e) => {
            e.preventDefault();
            applyModal.style.display = "none";
            currentBtn.innerHTML = '<i class="fas fa-check"></i> Applied';
            currentBtn.classList.add("applied");
            showToast("Application Sent Successfully!");
        });
    }

    function showToast(msg) {
        const toast = document.getElementById("toast");
        document.getElementById("toastMsg").innerText = msg;
        toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 3000);
    }

    filterAndCheckJobs(); // Initial Run
});