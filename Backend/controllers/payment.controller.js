import Payment from "../models/payment.model.js";
import User from "../models/user.model.js";
import razorpay from "../services/razorpay.service.js";
import crypto from 'crypto'
import dotenv from 'dotenv'
dotenv.config()

export const createOrder = async (req, res) => {
    try {

        const { planId, amount, credits } = req.body
        if (!amount || !credits) {
            return res.status(400).json({ message: "Invalid plan" });
        }

        const options = {
            amount: Math.round
                (amount * 100), // amount is in paisa
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
        }

        const order = await razorpay.orders.create(options)

        await Payment.create({
            userId: req.userId,
            planId,
            amount,
            credits,
            razorpayOrderId: order.id,
            status: "Created"
        })

        return res.json(order)

    } catch (error) {
        return res.status(500).json({ message: "error in the createOrder controller " })
    }
}

export const verifyPayment = async (req, res) => {
    try {

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto.
            createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex")

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ message: "invalid payment signature" });

        }

        const payment = await Payment.findOne({
            razorpayOrderId: razorpay_order_id,
        })

        if (!payment) {
            return res.status(404).json("Payment not found");
        }

        if (payment.status === "Paid") {
            return res.json({ message: "Already processed" })
        }

        // update payment record
        payment.status = "Paid"
        payment.razorpayPaymentId = razorpay_payment_id
        payment.razorpaySignature = razorpay_signature
        await payment.save()

        const updatedUser = await User.findByIdAndUpdate(payment.userId,
            { $inc: { credits: payment.credits } },
            { new: true }
        )

        res.json({
            success: true,
            message: "payment verified",
            user: updatedUser
        })

    } catch (error) {
        return res.status(500).json({ message: "error in the verifyPayment controller " })
    }
} 