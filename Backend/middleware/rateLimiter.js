import { rateLimit, ipKeyGenerator } from 'express-rate-limit';

export const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 min
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.userId ? String(req.userId) : ipKeyGenerator(req)),
  skip: () => process.env.NODE_ENV === 'test',
  validate: { keyGeneratorIpFallback: false },
  message: { message: 'Too many requests, please try again later.' },
});

export const aiOperationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  limit: 50,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.userId ? String(req.userId) : ipKeyGenerator(req)),
  skip: () => process.env.NODE_ENV === 'test',
  validate: { keyGeneratorIpFallback: false },
  message: { message: 'Rate limit exceeded for AI generation operations. Please try again later.' },
});

export default limiter;