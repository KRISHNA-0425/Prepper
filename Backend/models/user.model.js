import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        require: true,
    },
    email: {
        type: String,
        require: true,
        unique: true,
        lowercase: true,
    },
    credits: {
        type: Number,
        default: 100,
    },
    password: {
        type: String,
        // require: true,
    }


}, { timestamps: true })


const User = mongoose.model("User", userSchema);

export default User