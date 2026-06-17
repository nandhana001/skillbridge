document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html'; // Redirect if not logged in
        return;
    }

    // Elements
    const loadingSection = document.getElementById('loading');
    const assessmentSection = document.getElementById('assessment');
    const resultsSection = document.getElementById('results');
    const quizContainer = document.getElementById('quiz-container');
    const quizForm = document.getElementById('quiz-form');
    const loadingText = document.getElementById('loading-text');

    let currentQuestions = [];

    // 1. Verify Auth & Check Profile State
    async function initDashboard() {
        try {
            const userRes = await fetch('http://localhost:5000/api/auth/verify', {
                headers: { 'x-auth-token': token }
            });

            if (!userRes.ok) throw new Error('Auth failed');
            const user = await userRes.json();

            // If user already has assessment results, show dashboard, else show quiz
            if (user.assessmentResults && typeof user.assessmentResults.score === 'number') {
                loadingSection.classList.add('hidden');
                resultsSection.classList.remove('hidden');
                renderDashboard(user.assessmentResults);
            } else {
                fetchQuiz();
            }
        } catch (err) {
            console.error(err);
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        }
    }

    // 2. Fetch Quiz Questions dynamically
    async function fetchQuiz() {
        loadingText.textContent = "Generating your personalized assessment...";
        try {
            const res = await fetch('http://localhost:5000/api/assessment', {
                headers: { 'x-auth-token': token }
            });
            const data = await res.json();
            currentQuestions = data.questions;

            renderQuiz(currentQuestions);
            loadingSection.classList.add('hidden');
            assessmentSection.classList.remove('hidden');
        } catch (err) {
            console.error("Failed to load quiz", err);
            alert("Error loading assessment. Please refresh.");
        }
    }

    // 3. Render Quiz Form
    function renderQuiz(questions) {
        quizContainer.innerHTML = '';
        questions.forEach((q, index) => {
            let optionsHTML = q.options.map(opt => `
                <label style="display: block; margin-bottom: 0.5rem; padding: 0.8rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; cursor: pointer;">
                    <input type="radio" name="${q.id}" value="${opt}" required style="margin-right: 10px;">
                    ${opt}
                </label>
            `).join('');

            quizContainer.innerHTML += `
                <div class="input-group" style="margin-bottom: 2rem;">
                    <p style="font-weight: 500; margin-bottom: 1rem;">${index + 1}. ${q.question}</p>
                    ${optionsHTML}
                </div>
            `;
        });
    }

    // 4. Submit Quiz
    quizForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Gather answers
        const formData = new FormData(quizForm);
        const answers = {};
        for (let [key, value] of formData.entries()) {
            answers[key] = value;
        }

        assessmentSection.classList.add('hidden');
        loadingSection.classList.remove('hidden');
        loadingText.textContent = "Analyzing your responses...";

        try {
            const res = await fetch('http://localhost:5000/api/analyze-assessment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify({ answers })
            });

            const result = await res.json();

            if (result.success) {
                loadingSection.classList.add('hidden');
                resultsSection.classList.remove('hidden');
                renderDashboard(result.data);
            }
        } catch (err) {
            console.error(err);
            alert("Analysis failed.");
            location.reload();
        }
    });

    // 5. Render Results
    function renderDashboard(data) {
        const { score, gaps, courses } = data;

        // Final score animations
        let scoreCounter = 0;
        const counterTarget = document.getElementById('final-score');

        const counterInterval = setInterval(() => {
            if (scoreCounter >= score) {
                clearInterval(counterInterval);
                document.querySelector('.score-circle').style.setProperty('--score', score);
                counterTarget.textContent = score;
            } else {
                scoreCounter += 2;
                if (scoreCounter > score) scoreCounter = score;
                counterTarget.textContent = scoreCounter;
                document.querySelector('.score-circle').style.setProperty('--score', scoreCounter);
            }
        }, 30);

        // Render Gaps
        const gapList = document.getElementById('gap-list');
        gapList.innerHTML = '';
        gaps.forEach((gap, i) => {
            const li = document.createElement('li');
            li.textContent = gap;
            li.style.animationDelay = `${i * 0.15}s`;
            li.style.animation = `fadeIn 0.5s ease forwards`;
            li.style.opacity = '0';
            gapList.appendChild(li);
        });

        // Render Courses
        const coursesList = document.getElementById('courses-list');
        coursesList.innerHTML = '';
        courses.forEach((course, i) => {
            coursesList.innerHTML += `
                <div class="course-card" style="animation: slideUp 0.5s ease forwards; opacity: 0; animation-delay: ${i * 0.15}s; cursor: default;">
                    <a href="${course.url}" target="_blank" style="text-decoration: none; color: inherit; flex: 1; display: flex; align-items: center; gap: 1rem;">
                        <div class="course-info">
                            <h4>${course.title}</h4>
                            <p>${course.provider}</p>
                        </div>
                    </a>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="course-badge" style="background: rgba(255, 255, 255, 0.1); color: #ffffff;">${course.price}</span>
                        <span class="course-badge">${course.type}</span>
                        <button class="btn-primary" style="padding: 0.4rem 0.8rem; font-size: 0.8rem; margin-left: 10px;" onclick="window.openCourseTest('${course.title}')">Take Test</button>
                    </div>
                </div>
            `;
        });
    }

    // --- Course Test Modal Logic ---
    let currentCourseContext = "";

    window.openCourseTest = async function (courseName) {
        currentCourseContext = courseName;
        document.getElementById('modal-course-title').textContent = "Course Test: " + courseName;
        document.getElementById('course-test-error').classList.add('hidden');
        document.getElementById('course-modal').classList.remove('hidden');

        const container = document.getElementById('course-test-container');
        container.innerHTML = '<div style="text-align:center;"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>';

        try {
            const res = await fetch(`http://localhost:5000/api/course-test/${encodeURIComponent(courseName)}`, {
                headers: { 'x-auth-token': token }
            });
            const data = await res.json();

            container.innerHTML = '';
            data.questions.forEach((q, index) => {
                let optionsHTML = q.options.map(opt => `
                    <label style="display: block; margin-bottom: 0.5rem; padding: 0.8rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; cursor: pointer;">
                        <input type="radio" name="${q.id}" value="${opt}" required style="margin-right: 10px;">
                        ${opt}
                    </label>
                `).join('');

                container.innerHTML += `
                    <div class="input-group" style="margin-bottom: 1.5rem;">
                        <p style="font-weight: 500; margin-bottom: 0.5rem;">${index + 1}. ${q.question}</p>
                        ${optionsHTML}
                    </div>
                `;
            });
        } catch (err) {
            container.innerHTML = '<p class="text-warning">Failed to load test.</p>';
        }
    };

    window.closeCourseModal = function () {
        document.getElementById('course-modal').classList.add('hidden');
    };

    document.getElementById('course-test-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(e.target);
        const answers = {};
        for (let [key, value] of formData.entries()) {
            answers[key] = value;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        const errorMsg = document.getElementById('course-test-error');
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
        errorMsg.classList.add('hidden');

        try {
            const res = await fetch('http://localhost:5000/api/submit-course-test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-auth-token': token
                },
                body: JSON.stringify({ courseName: currentCourseContext, answers })
            });

            const data = await res.json();

            if (data.passed) {
                alert("Passed! Your Readiness Score has increased.");
                closeCourseModal();
                // Re-render dashboard with new data
                renderDashboard(data.data);
            } else {
                errorMsg.textContent = data.msg;
                errorMsg.classList.remove('hidden');
            }
        } catch (err) {
            errorMsg.textContent = "Submission failed.";
            errorMsg.classList.remove('hidden');
        } finally {
            submitBtn.innerHTML = 'Submit Test <i class="fa-solid fa-check"></i>';
        }
    });

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        localStorage.removeItem('token');
        window.location.href = 'login.html';
    });

    // Boot the system
    initDashboard();
});
