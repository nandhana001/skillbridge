const token = ""; // We will dynamically set this
const url = "http://localhost:5000";

async function runTest() {
    console.log("=== Starting Phase 4 Integration Tests ===");

    // 1. Register
    const email = `test_${Date.now()}@example.com`;
    let res = await fetch(`${url}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email,
            password: "password123",
            profile: {
                name: "Test User",
                profession: "Software Engineer",
                skills: ["javascript", "react", "node"] // Doesn't have AI yet
            }
        })
    });

    let data = await res.json();
    if (!data.token) return console.error("Failed to register");
    const jwt = data.token;
    console.log("1. Registration successful. JWT Acquired.");

    // 2. Fetch Quiz
    res = await fetch(`${url}/api/assessment`, {
        headers: { 'x-auth-token': jwt }
    });
    data = await res.json();
    if (!data.questions || data.questions.length !== 10) {
        return console.error("Failed to get 10 questions. Got: ", data.questions?.length);
    }
    console.log("2. 10-Question Dynamic Quiz fetched successfully.");

    // 3. Submit Quiz Answers (Get Base Score)
    // Simulating getting 7 out of 10 right to test the weight calculation
    const answers = {
        "s1": data.questions[0].options[1],
        "s2": data.questions[1].options[1],
        "s3": data.questions[2].options[1], // fetch()
        "s4": data.questions[3].options[0],
        "s5": data.questions[4].options[1],
        "s6": data.questions[5].options[1],
        "s7": data.questions[6].options[1],
        "s8": "Wrong Answer",
        "s9": "Wrong Answer",
        "s10": "Wrong Answer"
    };

    res = await fetch(`${url}/api/analyze-assessment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': jwt },
        body: JSON.stringify({ answers })
    });
    data = await res.json();
    const initialScore = data.data.score;
    const courses = data.data.courses;
    console.log(`3. Assessment graded. Initial Readiness Score: ${initialScore}`);
    console.log(`   Gaps Identified: ${data.data.gaps.length}`);
    console.log(`   Courses Recommended: ${courses.map(c => c.title).join(", ")}`);

    // 4. Test Course Re-evaluation
    if (courses.length > 0) {
        const targetCourse = courses[0].title;
        console.log(`4. Fetching test for: ${targetCourse}`);

        res = await fetch(`${url}/api/course-test/${encodeURIComponent(targetCourse)}`, {
            headers: { 'x-auth-token': jwt }
        });
        const courseTest = await res.json();
        console.log(`   Test fetched: ${courseTest.questions.length} questions`);

        // Submit correct answers to course test
        let courseAnswers = {};
        if (targetCourse === "ChatGPT Prompt Engineering for Developers") {
            courseAnswers = {
                "c_0": "Clear and specific instructions using delimiters",
                "c_1": "Few-shot prompting"
            };
        } else {
            courseAnswers = {
                "c_0": courseTest.questions[0].options[0],
                "c_1": courseTest.questions[1].options[0]
            };
        }

        res = await fetch(`${url}/api/submit-course-test`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-auth-token': jwt },
            body: JSON.stringify({ courseName: targetCourse, answers: courseAnswers })
        });
        const testData = await res.json();

        if (testData.passed && testData.newScore > initialScore) {
            console.log(`5. SUCCESS: Course test passed. Score mathematically increased from ${initialScore} to ${testData.newScore}.`);
        } else {
            console.error("5. FAILED: Score did not increase or test failed.", testData);
        }

    } else {
        console.error("No courses recommended, can't test course quiz flow.");
    }
}

runTest();
