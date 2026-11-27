import Payment from "../models/payment.model.js";
import User from "../models/user.model.js";
import razorpay from "../services/razorpay.service.js";
import crypto from 'crypto'
import dotenv from 'dotenv'
dotenv.config()

export const createOrder = async (req, res) => {
    try {
        if (!req.userId) {
            return res.status(401).json({ message: "Authentication required to create an order" });
        }

        const { planId, amount, credits } = req.body;
        const numericAmount = Number(amount);
        const numericCredits = Number(credits);

        if (!Number.isFinite(numericAmount) || numericAmount <= 0 || !Number.isFinite(numericCredits) || numericCredits <= 0) {
            return res.status(400).json({ message: "Invalid plan" });
        }

        const options = {
            amount: Math.round(numericAmount * 100), // amount is in paisa
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
        };

        const order = await razorpay.orders.create(options);

        await Payment.create({
            userId: req.userId,
            planId,
            amount: numericAmount,
            credits: numericCredits,
            razorpayOrderId: order.id,
            status: "Created"
        });

        return res.json(order);

    } catch (error) {
        console.error("createOrder error:", error);
        const detail = error?.error?.description || error?.message || "Unknown error";
        return res.status(500).json({ message: `Payment order could not be created: ${detail}` });
    }
}

export const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ message: "Missing payment verification details" });
        }

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ message: "Invalid payment signature" });
        }

        const payment = await Payment.findOne({
            razorpayOrderId: razorpay_order_id,
        });

        if (!payment) {
            return res.status(404).json({ message: "Payment record not found" });
        }

        if (payment.status === "Paid") {
            const existingUser = await User.findById(payment.userId);
            return res.json({ success: true, message: "Already processed", user: existingUser });
        }

        // update payment record
        payment.status = "Paid";
        payment.razorpayPaymentId = razorpay_payment_id;
        payment.razorpaySignature = razorpay_signature;
        await payment.save();

        const updatedUser = await User.findByIdAndUpdate(
            payment.userId,
            { $inc: { credits: payment.credits } },
            { new: true }
        );

        return res.json({
            success: true,
            message: "payment verified",
            user: updatedUser
        });

    } catch (error) {
        console.error("verifyPayment error:", error);
        return res.status(500).json({ message: "Error in the verifyPayment controller" });
    }
}