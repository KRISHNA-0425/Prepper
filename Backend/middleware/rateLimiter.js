import { rateLimit } from 'express-rate-limit';

export const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 min
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.userId || req.ip || 'anonymous'),
  skip: () => process.env.NODE_ENV === 'test',
  message: { message: 'Too many requests, please try again later.' },
});

export const aiOperationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.userId || req.ip || 'anonymous'),
  skip: () => process.env.NODE_ENV === 'test',
  message: { message: 'Rate limit exceeded for AI generation operations. Please try again later.' },
});

export default limiter;