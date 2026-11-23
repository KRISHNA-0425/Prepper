/**
 * @file Backend/services/index.js
 * Domain-Driven Service Registry for Prepper AI.
 * Organizes backend domain logic into modular, domain-specific service groupings.
 */

// 1. AI Intelligence Services
export * as aiServices from './openRouter.service.js';
export { askAI } from './openRouter.service.js';

// 2. Module 1 & 3: Interview, Adaptive Steering & Evaluation Services
export * as adaptiveDifficultyService from './adaptiveDifficulty.service.js';
export * as adaptiveSteeringService from './adaptiveSteering.service.js';
export * as knowledgeGapService from './knowledgeGap.service.js';
export * as evidenceEvaluationService from './evidenceEvaluation.service.js';
export * as reportGenerationService from './reportGeneration.service.js';

// 3. Module 2: Dedicated Cross-Examination & Project Probing Services
export * as answerAnalysisService from './answerAnalysis.service.js';
export * as projectClaimAnalysisService from './projectClaimAnalysis.service.js';
export * as questionEngineService from './questionEngine.service.js';
export * as resumeIntelligenceService from './resumeIntelligence.service.js';

// 4. Module 4: Live Coding Execution Engine Services
export { default as codeExecutionService } from './codeExecution/execution.service.js';
export { default as languageRegistry } from './codeExecution/languageRegistry.js';
export { default as TestCaseRunner } from './codeExecution/testCaseRunner.js';
export { ExecutionValidator } from './codeExecution/executionValidator.js';
export { EXECUTION_LIMITS, getSanitizedEnv } from './codeExecution/executionLimits.js';
export { default as executionAdapter } from './coding/executionAdapter.service.js';
export { default as codingExecutionService } from './coding/codingExecution.service.js';
export { default as testCaseService } from './coding/testCase.service.js';

// 5. Payment, Credit Economics & Pricing Services
export * as creditService from './credit.service.js';
export * as interviewPricingService from './interviewPricing.service.js';
export * as razorpayService from './razorpay.service.js';

// 6. Module 5: Personalized Interview Recovery Plan Services
export * as recoveryPlanService from './recoveryPlan/recoveryPlan.service.js';
export * as evidenceHarvesterService from './recoveryPlan/evidenceHarvester.service.js';
export * as recoveryPlanValidator from './recoveryPlan/recoveryPlanValidator.js';
export * as recoveryPlanFallback from './recoveryPlan/recoveryPlanFallback.js';
export * as reassessmentService from './recoveryPlan/reassessment.service.js';

