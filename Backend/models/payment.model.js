import mongoose from 'mongoose'

const paymentSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        planId: String,
        credits: Number,
        razorpayOrderId: String,
        razorpayPaymentId: String,
        status: {
            type: String,
            enum: ["Created", "Paid", "Failed"],
            default: "Created",
        }
    }
}, { timestamps: true })

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;