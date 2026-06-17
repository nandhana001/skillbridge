const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true
    },
    profile: {
        name: String,
        status: String,
        profession: String,
        year: Number,
        skills: [String]
    },
    assessmentResults: {
        score: Number,
        gaps: [String],
        courses: [{
            title: String,
            provider: String,
            type: { type: String }, // e.g., 'Course', 'Tutorial'
            url: String,
            price: String // 'Free', '$', '$$', '$$$'
        }]
    },
    readinessScore: {
        type: Number,
        default: 0
    },
    completedCourses: [{
        type: String // Course URLs or IDs to track completion
    }]
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
