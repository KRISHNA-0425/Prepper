/**
 * @file credit.service.js
 * Authoritative Application Credit Management Service for Prepper AI.
 * Enforces unified pricing parity across normal interviews and Cross-Examination sessions,
 * atomic deduction to prevent race conditions, and automatic refund on persistence failure.
 */

import User from '../models/user.model.js';

/**
 * Authoritative credit cost for an interview session across Prepper AI.
 * Both normal interviews and Cross-Examination sessions consume this exact amount.
 */
export const INTERVIEW_CREDIT_COST = 50;

export const INSUFFICIENT_CREDITS_MESSAGE = 'Free limit reached please purchase more credits';
export const USER_NOT_FOUND_MESSAGE = 'user not found';

/**
 * Checks if the user has sufficient credits to start an interview session.
 * @param {string} userId
 * @param {object} [UserModel=User]
 * @returns {Promise<{ hasCredits: boolean, user: object | null, statusCode?: number, message?: string }>}
 */
export const checkUserCredits = async (userId, UserModel = User) => {
  if (!userId) {
    return { hasCredits: false, user: null, statusCode: 401, message: 'Authentication required' };
  }

  const user = await UserModel.findById(userId);
  if (!user) {
    return { hasCredits: false, user: null, statusCode: 404, message: USER_NOT_FOUND_MESSAGE };
  }

  if (typeof user.credits !== 'number' || user.credits < INTERVIEW_CREDIT_COST) {
    return { hasCredits: false, user, statusCode: 400, message: INSUFFICIENT_CREDITS_MESSAGE };
  }

  return { hasCredits: true, user };
};

/**
 * Atomically deducts interview credits from user balance.
 * Prevents race conditions, double-spending, and negative balances.
 * @param {string} userId
 * @param {object} [UserModel=User]
 * @returns {Promise<{ success: boolean, creditsLeft?: number, statusCode?: number, message?: string }>}
 */
export const deductInterviewCredits = async (userId, UserModel = User) => {
  if (!userId) {
    return { success: false, statusCode: 401, message: 'Authentication required' };
  }

  // 1. Atomic update if findOneAndUpdate is available (Mongoose and atomic mocks)
  if (typeof UserModel.findOneAndUpdate === 'function') {
    const updatedUser = await UserModel.findOneAndUpdate(
      { _id: userId, credits: { $gte: INTERVIEW_CREDIT_COST } },
      { $inc: { credits: -INTERVIEW_CREDIT_COST } },
      { new: true }
    );

    if (updatedUser) {
      return { success: true, creditsLeft: updatedUser.credits };
    }

    // Distinguish user not found from insufficient credits
    const exists = await UserModel.findById(userId);
    if (!exists) {
      return { success: false, statusCode: 404, message: USER_NOT_FOUND_MESSAGE };
    }
    return { success: false, statusCode: 400, message: INSUFFICIENT_CREDITS_MESSAGE };
  }

  // 2. Fallback for non-atomic mocks that only provide findById and save()
  const user = await UserModel.findById(userId);
  if (!user) {
    return { success: false, statusCode: 404, message: USER_NOT_FOUND_MESSAGE };
  }

  if (typeof user.credits !== 'number' || user.credits < INTERVIEW_CREDIT_COST) {
    return { success: false, statusCode: 400, message: INSUFFICIENT_CREDITS_MESSAGE };
  }

  user.credits -= INTERVIEW_CREDIT_COST;
  if (typeof user.save === 'function') {
    await user.save();
  }
  return { success: true, creditsLeft: user.credits };
};

/**
 * Safely refunds interview credits in case session persistence fails after deduction.
 * @param {string} userId
 * @param {object} [UserModel=User]
 */
export const refundInterviewCredits = async (userId, UserModel = User) => {
  if (!userId) return null;

  if (typeof UserModel.findByIdAndUpdate === 'function') {
    return UserModel.findByIdAndUpdate(
      userId,
      { $inc: { credits: INTERVIEW_CREDIT_COST } },
      { new: true }
    );
  }

  const user = await UserModel.findById(userId);
  if (user) {
    user.credits = (user.credits || 0) + INTERVIEW_CREDIT_COST;
    if (typeof user.save === 'function') {
      await user.save();
    }
    return user;
  }
  return null;
};
