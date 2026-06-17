require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('./models/User');
const authMiddleware = require('./middlewares/auth');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected via Mongoose'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// ==========================================
// AUTHENTICATION & SECURITY (CIA Triad: Confidentiality, Integrity, Authorization)
// ==========================================

// Register Route
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name, status, profession, year, skills } = req.body;

        // Check if user exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        user = new User({
            email,
            password, // Will get hashed by the pre-save hook in User model
            profile: { name, status, profession, year, skills }
        });

        await user.save();

        // Create JWT Payload
        const payload = { user: { id: user.id } };

        // Sign Token
        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' },
            (err, token) => {
                if (err) throw err;
                return res.json({ token, msg: 'Registration successful' });
            }
        );
    } catch (err) {
        console.error("Register Error:", err.message);
        return res.status(500).json({ msg: 'Server error' });
    }
});

// Login Route
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        // Check password (Integrity verification)
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const payload = { user: { id: user.id } };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' },
            (err, token) => {
                if (err) throw err;
                return res.json({ token, msg: 'Login successful' });
            }
        );
    } catch (err) {
        console.error("Login Error:", err.message);
        return res.status(500).json({ msg: 'Server error' });
    }
});

// Protected Route Example (Get Current User Profile)
app.get('/api/auth/verify', authMiddleware, async (req, res) => {
    try {
        // Find user by ID but exclude the password field
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        return res.json(user);
    } catch (err) {
        console.error("Verify Error:", err.message);
        return res.status(500).json({ msg: 'Server Error' });
    }
});

// Mock Database of Courses (Faster for Hackathon Demos than external APIs)
// Advanced Course Database with strict direct linking and price grading
const courseDatabase = {
    software: [
        { title: "ChatGPT Prompt Engineering for Developers", provider: "DeepLearning.AI", type: "Course", url: "https://www.deeplearning.ai/short-courses/chatgpt-prompt-engineering-for-developers/", price: "Free" },
        { title: "Building Applications with Vector Databases", provider: "Coursera", type: "Course", url: "https://www.coursera.org/learn/vector-databases-pinecone", price: "$" },
        { title: "Advanced System Design with AI", provider: "Educative", type: "Path", url: "https://www.educative.io/path/advanced-system-design", price: "$$$" },
        { title: "GitHub Copilot Mastery", provider: "Udemy", type: "Tutorial", url: "https://www.udemy.com/course/github-copilot/", price: "$$" },
        { title: "AI-Assisted Programming Bootcamp", provider: "Stanford Online", type: "Tutorial", url: "https://online.stanford.edu/courses", price: "Free" }
    ],
    marketing: [
        { title: "Generative AI for Content Marketing", provider: "HubSpot Academy", type: "Certification", url: "https://academy.hubspot.com/courses/content-marketing", price: "Free" },
        { title: "AI in Marketing Strategy", provider: "Cornell Certificate", type: "Course", url: "https://ecornell.cornell.edu/certificates/marketing/data-driven-marketing/", price: "$$$" },
        { title: "Mastering Midjourney for Advertisements", provider: "YouTube", type: "Tutorial", url: "https://www.youtube.com/watch?v=midjourney-ads-tutorial", price: "Free" },
        { title: "Data-Driven Marketing in the AI Era", provider: "Coursera", type: "Specialization", url: "https://www.coursera.org/specializations/data-driven-marketing", price: "$$" }
    ],
    design: [
        { title: "Figma AI Plugins Masterclass", provider: "YouTube", type: "Tutorial", url: "https://www.youtube.com/watch?v=figma-ai-tutorial", price: "Free" },
        { title: "Midjourney & ChatGPT for UI/UX", provider: "Udemy", type: "Course", url: "https://www.udemy.com/course/midjourney-chatgpt-ui-ux/", price: "$" },
        { title: "Future of Design with Generative AI", provider: "Coursera", type: "Course", url: "https://www.coursera.org/learn/generative-ai-design", price: "$$" }
    ]
};

// ==========================================
// AI SKILL GAP ANALYSIS ENGINE
// ==========================================

function analyzeProfile(profile) {
    const { profession, year, skills } = profile;
    let score = 50; // Base score
    let gaps = [];

    // Year-based analysis
    const currentYear = new Date().getFullYear();
    const yearsSinceGrad = currentYear - year;
    if (yearsSinceGrad > 10) {
        score += 20;
        gaps.push("Significant technology evolution missed since graduation");
    } else if (yearsSinceGrad > 5) {
        score += 10;
        gaps.push("Outdated foundational knowledge in emerging technologies");
    }

    // Profession-based analysis
    const profLower = profession.toLowerCase();
    const skillsLower = skills.map(s => s.toLowerCase());

    if (profLower.includes('software') || profLower.includes('developer') || profLower.includes('engineer')) {
        if (!skillsLower.some(s => s.includes('ai') || s.includes('machine learning') || s.includes('ml'))) {
            score += 15;
            gaps.push("AI and machine learning skills for modern development workflows");
        }
        if (!skillsLower.some(s => s.includes('prompt') || s.includes('copilot') || s.includes('chatgpt'))) {
            gaps.push("AI-assisted coding tools and prompt engineering");
        }
    } else if (profLower.includes('marketing') || profLower.includes('seo') || profLower.includes('sales')) {
        if (!skillsLower.some(s => s.includes('generative ai') || s.includes('chatgpt') || s.includes('midjourney'))) {
            score += 15;
            gaps.push("Generative AI tools for content creation and marketing automation");
        }
        if (!skillsLower.some(s => s.includes('data') || s.includes('analytics'))) {
            gaps.push("Data-driven marketing and predictive analytics");
        }
    } else if (profLower.includes('design') || profLower.includes('ui') || profLower.includes('ux')) {
        if (!skillsLower.some(s => s.includes('midjourney') || s.includes('dall') || s.includes('ai design'))) {
            score += 15;
            gaps.push("AI-powered design tools and generative art techniques");
        }
        if (!skillsLower.some(s => s.includes('figma') && s.includes('ai'))) {
            gaps.push("AI plugins for design software like Figma");
        }
    } else {
        // General
        if (!skillsLower.some(s => s.includes('ai') || s.includes('automation'))) {
            score += 10;
            gaps.push("Basic AI literacy and automation skills");
        }
    }

    // Clamp score between 0 and 100
    score = Math.max(0, Math.min(100, score));

    // Determine courses
    let targetCourses;
    if (profLower.match(/software|developer|engineer|computer/)) {
        targetCourses = courseDatabase.software;
    } else if (profLower.match(/marketing|seo|sales/)) {
        targetCourses = courseDatabase.marketing;
    } else if (profLower.match(/design|ui|ux|art/)) {
        targetCourses = courseDatabase.design;
    } else {
        targetCourses = courseDatabase.software; // fallback
    }

    // Sort by price
    const priceOrder = { "Free": 0, "$": 1, "$$": 2, "$$$": 3 };
    let recommendedCourses = [...targetCourses];
    recommendedCourses.sort((a, b) => priceOrder[a.price] - priceOrder[b.price]);
    recommendedCourses = recommendedCourses.slice(0, 4);

    return { score, gaps, courses: recommendedCourses };
}

// ==========================================
// ASSESSMENT ENDPOINTS
// ==========================================

// Assessment questions database (Basic -> Advanced, 10 Questions each)
const assessmentBank = {
    software: [
        { id: "s1", level: "basic", question: "Which of the following describes 'version control'?", options: ["A way to compile code", "A system that records changes to a file or set of files over time", "A tool for designing UI", "A database management system"], answer: "A system that records changes to a file or set of files over time" },
        { id: "s2", level: "basic", question: "What does an API primarily do?", options: ["Styles web pages", "Allows different software applications to communicate", "Stores user passwords securely", "Detects hardware failures"], answer: "Allows different software applications to communicate" },
        { id: "s3", level: "basic", question: "Which of the following is commonly used to send data from a frontend to an API?", options: ["setInterval", "fetch()", "localStorage", "document.write()"], answer: "fetch()" },
        { id: "s4", level: "intermediate", question: "What is continuous integration (CI)?", options: ["Merging code changes into a central repository frequently", "Writing code without stopping", "Deploying directly to production manually", "Reviewing peer code once a year"], answer: "Merging code changes into a central repository frequently" },
        { id: "s5", level: "intermediate", question: "What is a major benefit of containerization (e.g., Docker)?", options: ["It makes code run slower but safer", "It guarantees consistency across multiple development and release cycles", "It removes the need for databases", "It automatically writes unit tests"], answer: "It guarantees consistency across multiple development and release cycles" },
        { id: "s6", level: "intermediate", question: "What is the primary role of an LLM in a modern coding workflow?", options: ["Database management", "Code generation and error analysis", "CSS styling automatically", "DNS resolution"], answer: "Code generation and error analysis" },
        { id: "s7", level: "advanced", question: "How does a microservices architecture differ from a monolithic one?", options: ["It combines all functions into a single codebase", "It structures an application as a collection of loosely coupled services", "It only allows one programming language", "It cannot be deployed to the cloud"], answer: "It structures an application as a collection of loosely coupled services" },
        { id: "s8", level: "advanced", question: "What is the principle behind 'infrastructure as code'?", options: ["Writing code that automatically writes more code", "Managing computing infrastructure through machine-readable definition files", "Never using hardware servers", "Only writing code in the cloud"], answer: "Managing computing infrastructure through machine-readable definition files" },
        { id: "s9", level: "advanced", question: "In a RAG (Retrieval-Augmented Generation) architecture, what is stored in the Vector Database?", options: ["SQL Tables", "User Passwords", "Text Embeddings", "Raw HTML files"], answer: "Text Embeddings" },
        { id: "s10", level: "expert", question: "Which strategy best mitigates 'hallucinations' in enterprise AI agents?", options: ["Deleting the AI", "System prompting combined with strict RAG and semantic routing", "Turning off the server at night", "Using only basic ChatGPT accounts"], answer: "System prompting combined with strict RAG and semantic routing" }
    ],
    marketing: [
        { id: "m1", level: "basic", question: "What does SEO stand for?", options: ["Search Engine Optimization", "Social Engagement Output", "Site Efficiency Operations", "Sales Engagement Order"], answer: "Search Engine Optimization" },
        { id: "m2", level: "basic", question: "What is the primary goal of content marketing?", options: ["Clickbait views", "Creating and distributing valuable, relevant content to attract a defined audience", "Hacking competitor websites", "Selling customer data"], answer: "Creating and distributing valuable, relevant content to attract a defined audience" },
        { id: "m3", level: "basic", question: "What defines a 'conversion rate'?", options: ["The percentage of users who take a desired action", "The speed at which a website loads", "The number of followers on social media", "The cost of an advertisement"], answer: "The percentage of users who take a desired action" },
        { id: "m4", level: "intermediate", question: "What is A/B testing?", options: ["Testing two software bugs", "Comparing two versions of a webpage or app against each other to determine which performs better", "Running ads only on days ending in 'A' or 'B'", "Asking users what they prefer without showing them"], answer: "Comparing two versions of a webpage or app against each other to determine which performs better" },
        { id: "m5", level: "intermediate", question: "How can Generative AI improve email marketing at scale?", options: ["By automatically sending emails manually", "By generating personalized copy variations for A/B testing", "By preventing emails from going to spam forever", "It cannot improve email marketing"], answer: "By generating personalized copy variations for A/B testing" },
        { id: "m6", level: "intermediate", question: "What is a KPI in marketing?", options: ["Key Performance Indicator", "Known Public Interest", "Kept Private Information", "Knowledge Processing Interface"], answer: "Key Performance Indicator" },
        { id: "m7", level: "advanced", question: "What does 'omnichannel marketing' refer to?", options: ["Marketing entirely offline", "A multi-channel approach that provides a seamless shopping experience", "Using only one advertising platform", "Selling products through telemarketing only"], answer: "A multi-channel approach that provides a seamless shopping experience" },
        { id: "m8", level: "advanced", question: "Which algorithm is most commonly used for Predictive Analytics in customer churn modeling?", options: ["K-Means Clustering", "Logistic Regression / Random Forests", "Bubble Sort", "Dijkstra's Algorithm"], answer: "Logistic Regression / Random Forests" },
        { id: "m9", level: "advanced", question: "How does programmatic advertising purchase media?", options: ["Through manual negotiations via email", "By using algorithmic software to buy and sell online display space automatically", "By renting billboards", "Through radio ads exclusively"], answer: "By using algorithmic software to buy and sell online display space automatically" },
        { id: "m10", level: "expert", question: "What is the role of an LLM in dynamic sentiment analysis architectures?", options: ["Replacing graphical designers", "Real-time parsing of unstructured customer feedback at scale with high contextual nuance", "Hosting websites", "Writing basic HTML forms"], answer: "Real-time parsing of unstructured customer feedback at scale with high contextual nuance" }
    ],
    design: [
        { id: "d1", level: "basic", question: "What does 'UI' stand for?", options: ["User Information", "User Interface", "Universal Identity", "Unified Imagery"], answer: "User Interface" },
        { id: "d2", level: "basic", question: "What does 'UX' stand for?", options: ["User Experience", "User Expansion", "Universal Exchange", "Undefined Extension"], answer: "User Experience" },
        { id: "d3", level: "basic", question: "What is wireframing?", options: ["A low-fidelity visual representation of a layout", "Adding colors to a UI", "Writing HTML/CSS code", "Setting up a database structure"], answer: "A low-fidelity visual representation of a layout" },
        { id: "d4", level: "intermediate", question: "What is the purpose of a design system?", options: ["To store user passwords", "To provide a collection of reusable components guided by clear standards", "To prevent users from exiting an app", "To write backend algorithms"], answer: "To provide a collection of reusable components guided by clear standards" },
        { id: "d5", level: "intermediate", question: "How are prompting techniques in tools like Midjourney best optimized for specific UX assets?", options: ["By using single word prompts", "By specifying art style, lighting, and aspect ratio", "By asking it to 'make it pretty'", "By writing Python code in the prompt box"], answer: "By specifying art style, lighting, and aspect ratio" },
        { id: "d6", level: "intermediate", question: "What defines accessibility (a11y) in web design?", options: ["How fast the site is", "Designing products that can be used by everyone, including those with disabilities", "How much the website costs to host", "The ability to access the site without internet"], answer: "Designing products that can be used by everyone, including those with disabilities" },
        { id: "d7", level: "advanced", question: "What is heuristic evaluation?", options: ["An automated code test", "A usability inspection method where experts judge a design against accepted principles", "A type of color blindness", "A database query"], answer: "A usability inspection method where experts judge a design against accepted principles" },
        { id: "d8", level: "advanced", question: "Which AI technique allows for checking the contrast accessibility of a design iteratively?", options: ["LLM Text Generation", "Computer Vision / Image Analysis Models", "Natural Language Processing", "Blockchain validation"], answer: "Computer Vision / Image Analysis Models" },
        { id: "d9", level: "advanced", question: "How do vector graphics differ from raster graphics?", options: ["Rasters are infinitely scalable, vectors pixelate", "Vectors use mathematical formulas to draw shapes, rasters use grids of pixels", "Vectors contain viruses", "Rasters are only for 3D modeling"], answer: "Vectors use mathematical formulas to draw shapes, rasters use grids of pixels" },
        { id: "d10", level: "expert", question: "What is the primary advantage of integrating generative AI component-generation directly into a Figma-to-React pipeline?", options: ["It uses more CPU power", "It bridges the handoff gap by converting high-fidelity designs directly into functional, styled code components", "It encrypts the design file", "It automatically translates text into another language"], answer: "It bridges the handoff gap by converting high-fidelity designs directly into functional, styled code components" }
    ],
    general: [
        { id: "g1", level: "basic", question: "What does AI stand for?", options: ["Automated Intelligence", "Artificial Intelligence", "Advanced Integration", "Array Interface"], answer: "Artificial Intelligence" },
        // Filling generic fallback questions for stability
        { id: "g2", level: "basic", question: "What is the internet primarily made of?", options: ["Magic", "Connected computer networks globally", "Static encyclopedias", "A single large server in California"], answer: "Connected computer networks globally" },
        { id: "g3", level: "basic", question: "What is a web browser used for?", options: ["Typing word documents", "Accessing and navigating websites on the internet", "Burning CDs", "Only downloading games"], answer: "Accessing and navigating websites on the internet" },
        { id: "g4", level: "intermediate", question: "What is a 'prompt' in the context of ChatGPT?", options: ["An error message", "The input text instructions given by the user", "The speed at which it replies", "A notification sound"], answer: "The input text instructions given by the user" },
        { id: "g5", level: "intermediate", question: "What is Cloud Computing?", options: ["Working on an airplane", "Delivery of computing services over the Internet", "Storing data inside a monitor", "A weather application"], answer: "Delivery of computing services over the Internet" },
        { id: "g6", level: "intermediate", question: "What does VPN stand for?", options: ["Virtual Private Network", "Variable Protected Node", "Visual Pattern Navigation", "Verified Public Name"], answer: "Virtual Private Network" },
        { id: "g7", level: "advanced", question: "Which of these is a major ethical concern regarding AI model training?", options: ["They use too much CSS", "They learn instantly", "They can ingest copyrighted data without permission or reflect societal biases", "They don't know how to play chess"], answer: "They can ingest copyrighted data without permission or reflect societal biases" },
        { id: "g8", level: "advanced", question: "What is Machine Learning fundamentally based on?", options: ["Algorithms that improve automatically through experience and data", "Hardcoded if/else statements governing every action", "Writing novels", "Quantum physics"], answer: "Algorithms that improve automatically through experience and data" },
        { id: "g9", level: "advanced", question: "What role does Big Data play in AI?", options: ["It confuses AI systems", "It provides the vast amounts of information necessary to train complex neural networks effectively", "It is only used for data compression", "It makes computers physically larger"], answer: "It provides the vast amounts of information necessary to train complex neural networks effectively" },
        { id: "g10", level: "expert", question: "How does differential privacy protect user data in AI training datasets?", options: ["By deleting all data", "By adding statistical noise to the data, masking individual records while maintaining overall patterns", "By turning off the internet", "By requiring 4 passwords"], answer: "By adding statistical noise to the data, masking individual records while maintaining overall patterns" }
    ]
};

// Course Test Bank
const courseTestBank = {
    // Mini quizzes that map to the URL or Title of the recommended courses
    "ChatGPT Prompt Engineering for Developers": [
        { question: "What defines an effective prompt?", options: ["Being as vague as possible", "Clear and specific instructions using delimiters", "Using only single words", "Typing in all caps"], answer: "Clear and specific instructions using delimiters" },
        { question: "Which capability helps mitigate hallucinations?", options: ["Few-shot prompting", "Telling it to hurry up", "Ignoring the output", "Using older models"], answer: "Few-shot prompting" }
    ],
    "Building Applications with Vector Databases": [
        { question: "What kind of data do vector databases primarily store?", options: ["SQL tables", "Embeddings representing semantic meaning", "Plain text only", "User passwords"], answer: "Embeddings representing semantic meaning" },
        { question: "Which search algorithm is commonly associated with Vector DBs?", options: ["Binary Search", "Approximate Nearest Neighbor (ANN)", "Linear Search", "Bubble Sort"], answer: "Approximate Nearest Neighbor (ANN)" }
    ],
    "Generative AI for Content Marketing": [
        { question: "What is a key benefit of Gen AI in content marketing?", options: ["It scales personalized content generation", "It manually reviews legal documents", "It prevents users from unsubscribing", "It guarantees viral videos"], answer: "It scales personalized content generation" },
        { question: "How should AI-generated content be handled before publishing?", options: ["Published instantly", "Human-in-the-loop review for accuracy and brand voice", "Encrypted", "Deleted"], answer: "Human-in-the-loop review for accuracy and brand voice" }
    ],
    "default": [
        { question: "Did you complete this course material thoroughly?", options: ["Yes, and I applied the concepts", "No"], answer: "Yes, and I applied the concepts" },
        { question: "Do you feel confident in this new skill?", options: ["Yes", "Not yet"], answer: "Yes" }
    ]
};

// 1. Get Assessment Route
app.get('/api/assessment', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        const professionLower = (user.profile.profession || "").toLowerCase();

        let questions = [];
        if (professionLower.match(/software|developer|engineer|computer/)) {
            questions = assessmentBank.software;
        } else if (professionLower.match(/marketing|seo|sales/)) {
            questions = assessmentBank.marketing;
        } else if (professionLower.match(/design|ui|ux|art/)) {
            questions = assessmentBank.design;
        } else {
            questions = assessmentBank.general;
        }

        // Limit to 10 questions max, randomize briefly if needed, though they are already 10.
        // Remove answers from JSON payload before sending to client
        const secureQuestions = questions.slice(0, 10).map(q => ({
            id: q.id,
            level: q.level,
            question: q.question,
            options: q.options
        }));

        res.json({ questions: secureQuestions });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// 2. Submit Assessment & Analyze Route
app.post('/api/analyze-assessment', authMiddleware, async (req, res) => {
    try {
        const { answers } = req.body;
        const user = await User.findById(req.user.id);
        const professionLower = (user.profile.profession || "").toLowerCase();

        // 1. Determine which bank was used
        let targetBank, targetCourses;
        if (professionLower.match(/software|developer|engineer|computer/)) {
            targetBank = assessmentBank.software;
            targetCourses = courseDatabase.software;
        } else if (professionLower.match(/marketing|seo|sales/)) {
            targetBank = assessmentBank.marketing;
            targetCourses = courseDatabase.marketing;
        } else if (professionLower.match(/design|ui|ux|art/)) {
            targetBank = assessmentBank.design;
            targetCourses = courseDatabase.design;
        } else {
            targetBank = assessmentBank.general;
            targetCourses = courseDatabase.software; // fallback
        }

        targetBank = targetBank.slice(0, 10);

        // 2. Grade Quiz
        let correctCount = 0;
        let gaps = [];
        let lowestMissedLevel = "expert"; // Track the lowest level failed to recommend right courses

        targetBank.forEach(q => {
            if (answers[q.id] === q.answer) {
                correctCount++;
            } else {
                if (q.level === "basic" && lowestMissedLevel !== "basic") lowestMissedLevel = "basic";
                if (q.level === "intermediate" && !["basic"].includes(lowestMissedLevel)) lowestMissedLevel = "intermediate";
                if (q.level === "advanced" && !["basic", "intermediate"].includes(lowestMissedLevel)) lowestMissedLevel = "advanced";

                // Add specific gap based on question
                gaps.push(`Needs review on: ${q.question.split(" ").slice(0, 5).join(" ")}...`);
            }
        });

        // 3. Calculate Comprehensive Readiness Score
        // Base profile analysis gives a starting baseline (-20 to +20)
        let profileBaseScore = 50;
        const skillsLower = (user.profile.skills || []).map(s => s.toLowerCase());
        if (skillsLower.some(s => s.includes('ai') || s.includes('generative'))) profileBaseScore += 15;
        if (skillsLower.length > 5) profileBaseScore += 5;

        // Quiz score is out of 100, weighted 70% Quiz, 30% Profile
        let quizScore = (correctCount / targetBank.length) * 100;
        let finalReadinessScore = Math.floor((quizScore * 0.7) + (profileBaseScore * 0.3));
        finalReadinessScore = Math.max(0, Math.min(100, finalReadinessScore)); // clamp 0-100

        // Clean up gaps context
        if (gaps.length === 0) {
            gaps = ["Expert Level Verified! Consider leadership and strategy to scale your impact."];
        } else {
            gaps = gaps.slice(0, 4); // Show only top 4 priority gaps
        }

        // 4. Sort and Recommend Courses
        const priceOrder = { "Free": 0, "$": 1, "$$": 2, "$$$": 3 };
        let recommendedCourses = [...targetCourses];

        // Exclude courses user already completed
        recommendedCourses = recommendedCourses.filter(c => !(user.completedCourses || []).includes(c.title));

        recommendedCourses.sort((a, b) => priceOrder[a.price] - priceOrder[b.price]);
        recommendedCourses = recommendedCourses.slice(0, 4);

        // Update User Profile with results and new score
        user.readinessScore = finalReadinessScore;
        user.assessmentResults = {
            score: finalReadinessScore,
            gaps: gaps,
            courses: recommendedCourses
        };
        await user.save();

        res.json({
            success: true,
            data: user.assessmentResults
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// 3. Automatic Profile Analysis Route (Existing fallback)
app.post('/api/assessment/analyze', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const analysis = analyzeProfile(user.profile);

        // Save to user
        user.assessmentResults = analysis;
        await user.save();

        res.json({
            success: true,
            data: analysis
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// 4. Get Course Specific Test
app.get('/api/course-test/:courseName', authMiddleware, async (req, res) => {
    try {
        const courseName = req.params.courseName;
        // Look up questions or use default fallback
        const questions = courseTestBank[courseName] || courseTestBank["default"];

        // Remove answers
        const secureQuestions = questions.map((q, i) => ({
            id: `c_${i}`,
            question: q.question,
            options: q.options
        }));

        res.json({ questions: secureQuestions });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// 5. Submit Course Test
app.post('/api/submit-course-test', authMiddleware, async (req, res) => {
    try {
        const { courseName, answers } = req.body;
        const user = await User.findById(req.user.id);

        const targetBank = courseTestBank[courseName] || courseTestBank["default"];

        let isPass = true;
        // Require 100% pass rate for mini quizzes (usually 2 questions)
        targetBank.forEach((q, i) => {
            if (answers[`c_${i}`] !== q.answer) {
                isPass = false;
            }
        });

        if (isPass) {
            // Add to completed courses if not already there
            if (!user.completedCourses) user.completedCourses = [];
            if (!user.completedCourses.includes(courseName)) {
                user.completedCourses.push(courseName);

                // Increase Readiness Score mathematically (Bump by 5-10 points per course)
                user.readinessScore = Math.min(100, (user.readinessScore || 0) + 8);

                // Refresh recommended courses to remove the completed one
                if (user.assessmentResults && user.assessmentResults.courses) {
                    user.assessmentResults.courses = user.assessmentResults.courses.filter(c => c.title !== courseName);
                    // Also update the score in the result payload for UI
                    user.assessmentResults.score = user.readinessScore;
                }

                await user.save();
            }
            res.json({ success: true, passed: true, newScore: user.readinessScore, data: user.assessmentResults });
        } else {
            res.json({ success: true, passed: false, msg: "You didn't pass this time! Review the material and try again." });
        }

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Backend API running on http://localhost:${PORT}`);
});
