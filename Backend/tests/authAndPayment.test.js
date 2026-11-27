import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import isAuth from '../middleware/isAuth.js';
import { verifyPayment, createOrder } from '../controllers/payment.controller.js';

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

describe('isAuth middleware', () => {
  const secret = process.env.JWT_SECRET || 'test-secret';
  process.env.JWT_SECRET = secret;

  it('authenticates via req.cookies.token', async () => {
    const token = jwt.sign({ userId: 'user-cookie-1' }, secret, { expiresIn: '1h' });
    const req = { cookies: { token }, headers: {} };
    const res = createMockRes();
    let nextCalled = false;

    await isAuth(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, true);
    assert.equal(req.userId, 'user-cookie-1');
  });

  it('authenticates via Authorization Bearer header when cookies are blocked', async () => {
    const token = jwt.sign({ userId: 'user-bearer-2' }, secret, { expiresIn: '1h' });
    const req = { cookies: {}, headers: { authorization: `Bearer ${token}` } };
    const res = createMockRes();
    let nextCalled = false;

    await isAuth(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, true);
    assert.equal(req.userId, 'user-bearer-2');
  });

  it('returns 401 Token not found when neither cookie nor Bearer header is present', async () => {
    const req = { cookies: {}, headers: {} };
    const res = createMockRes();
    let nextCalled = false;

    await isAuth(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.message, 'Token not found');
  });

  it('returns 401 Token not found when Bearer token is literal string "undefined"', async () => {
    const req = { cookies: {}, headers: { authorization: 'Bearer undefined' } };
    const res = createMockRes();
    let nextCalled = false;

    await isAuth(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.message, 'Token not found');
  });

  it('returns 401 Invalid token when token signature is invalid', async () => {
    const req = { cookies: {}, headers: { authorization: 'Bearer invalid.jwt.token' } };
    const res = createMockRes();
    let nextCalled = false;

    await isAuth(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, false);
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.message, 'Invalid token');
  });
});

describe('payment controller validation', () => {
  it('createOrder returns 401 when req.userId is missing', async () => {
    const req = { body: { planId: 'refill', amount: 399, credits: 150 } };
    const res = createMockRes();

    await createOrder(req, res);

    assert.equal(res.statusCode, 401);
    assert.match(res.body.message, /Authentication required/i);
  });

  it('createOrder returns 400 when amount or credits are invalid', async () => {
    const req = { userId: 'u1', body: { planId: 'refill', amount: 0, credits: 150 } };
    const res = createMockRes();

    await createOrder(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'Invalid plan');
  });

  it('verifyPayment returns 400 when verification fields are missing', async () => {
    const req = { body: { razorpay_order_id: 'ord_1' } };
    const res = createMockRes();

    await verifyPayment(req, res);

    assert.equal(res.statusCode, 400);
    assert.match(res.body.message, /Missing payment verification details/i);
  });

  it('verifyPayment returns 400 on signature mismatch', async () => {
    process.env.RAZORPAY_KEY_SECRET = 'test_secret_key';
    const req = {
      body: {
        razorpay_order_id: 'ord_123',
        razorpay_payment_id: 'pay_456',
        razorpay_signature: 'wrong_signature',
      },
    };
    const res = createMockRes();

    await verifyPayment(req, res);

    assert.equal(res.statusCode, 400);
    assert.equal(res.body.message, 'Invalid payment signature');
  });

  it('verifyPayment accepts valid HMAC signature format', () => {
    const secret = 'test_secret_key';
    const orderId = 'ord_123';
    const paymentId = 'pay_456';
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    assert.equal(expected.length, 64);
  });
});
