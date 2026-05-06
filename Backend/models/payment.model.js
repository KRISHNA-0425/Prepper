import mongoose from 'mongoose'

const paymentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    }, // <--- The brace must close here
    planId: {
        type: String,
    },
    amount: {
        type: Number,
    },
    credits: {
        type: Number,
    },
    razorpayOrderId: {
        type: String,
    },
    razorpayPaymentId: {
        type: String,
    },
    razorpaySignature: {
        type: String,
    },
    status: {
        type: String,
        enum: ["Created", "Paid", "Failed"],
        default: "Created",
    }
}, { timestamps: true })

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;