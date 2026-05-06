import Payment from "../models/payment.model.js";
import razorpay from "../services/razorpay.service.js";

export const createOrder = async (req, res) => {
    try {

        const { planId, amount, credits } = req.body
        if (!amount || !credits) {
            return res.status(400).json({ message: "Invalid plan" });
        }

        const options = {
            amount: Math.round(amount * 100), // amount is in paisa
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