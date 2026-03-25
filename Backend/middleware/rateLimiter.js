import { rateLimit } from 'express-rate-limit'
// import rateLimit from 'express/rateLimiter'

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 min
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.userId || req.headers['x-forwarded-for'] || req.ip,
    message: { message: 'Too many requests, please try again later.' }
})
loss, accuracy = model.evaluate(X_test, y_test)
print("Test Accuracy:", accuracy)
export default limiter