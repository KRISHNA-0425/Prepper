import express from 'express'
import isAuth from '../middleware/isAuth.js'
import { createOrder, verifyPayment } from '../controllers/payment.controller.js';

const paymentRouter = express.Router();

paymentRouter.get('/test-ping', (req, res) => res.send("Payment Router is working!"));
paymentRouter.post('/order', isAuth, createOrder)
paymentRouter.post('/verify', isAuth, verifyPayment)

export default paymentRouter
