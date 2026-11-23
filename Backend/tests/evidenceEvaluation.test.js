import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  EVALUATION_CRITERIA,
  ALL_CRITERIA_NAMES,
  QUESTION_CATEGORIES,
  EVIDENCE_CLASSIFICATIONS,
  CRITERIA_WEIGHTS_BY_CATEGORY,
  detectQuestionCategory,
  getCriteriaWeights,
} from '../contracts/evaluationRubrics.js';
import {
  normalizeTextForSearch,
  verifyExcerptInAnswer,
  createEmptyAnswerEvaluation,
  calculateAuthoritativeScore,
  validateAndSanitizeEvidenceEvaluation,
  buildSafeFallbackEvaluation,
  evaluateAnswerWithEvidence,
  aggregateInterviewAnalytics,
} from '../services/evidenceEvaluation.service.js';

describe('Module 2: Evidence-Based Interview Evaluation Engine Suite', () => {

  // ==========================================
  // 1. Rubric Matrix & Question Categorization
  // ==========================================
  describe('1. Rubric Weights & Question Categorization', () => {
    it('should verify all 6 criteria are present in ALL_CRITERIA_NAMES', () => {
      assert.strictEqual(ALL_CRITERIA_NAMES.length, 6);
      assert.ok(ALL_CRITERIA_NAMES.includes('Technical Accuracy'));
      assert.ok(ALL_CRITERIA_NAMES.includes('Conceptual Understanding'));
      assert.ok(ALL_CRITERIA_NAMES.includes('Practical Knowledge'));
      assert.ok(ALL_CRITERIA_NAMES.includes('Depth of Explanation'));
      assert.ok(ALL_CRITERIA_NAMES.includes('Problem-Solving Ability'));
      assert.ok(ALL_CRITERIA_NAMES.includes('Communication Clarity'));
    });

    it('should verify rubric weights for all categories sum strictly to 1.00', () => {
      Object.entries(CRITERIA_WEIGHTS_BY_CATEGORY).forEach(([cat, weights]) => {
        const sum = Object.values(weights).reduce((a, b) => a + b, 0);
        assert.ok(
          Math.abs(sum - 1.0) < 0.0001,
          `Category ${cat} weights sum to ${sum}, must sum to 1.00`
        );
        assert.strictEqual(Object.keys(weights).length, 6, `Category ${cat} must specify all 6 criteria`);
      });
    });

    it('should correctly detect question categories based on prompt context and mode', () => {
      // Behavioral / HR
      assert.strictEqual(detectQuestionCategory('Tell me about a time you handled conflict', 'Technical'), 'behavioral');
      assert.strictEqual(detectQuestionCategory('What are your strengths?', 'HR'), 'behavioral');
      assert.strictEqual(detectQuestionCategory('How do you prioritize competing deadlines?', 'Technical'), 'behavioral');

      // System Design
      assert.strictEqual(detectQuestionCategory('Design a scalable URL shortener like bit.ly', 'Technical'), 'system_design');
      assert.strictEqual(detectQuestionCategory('How would you architect database sharding and caching?', 'Technical'), 'system_design');

      // Coding / Algorithmic
      assert.strictEqual(detectQuestionCategory('Write a function to detect cycles in a linked list', 'Technical'), 'coding');
      assert.strictEqual(detectQuestionCategory('What is the time complexity and space complexity of merge sort?', 'Technical'), 'coding');

      // Conceptual
      assert.strictEqual(detectQuestionCategory('What is the difference between TCP and UDP?', 'Technical'), 'conceptual');
      assert.strictEqual(detectQuestionCategory('Explain the concept of optimistic concurrency control', 'Technical'), 'conceptual');

      // General Technical default
      assert.strictEqual(detectQuestionCategory('How does Node.js event loop process I/O events?', 'Technical'), 'conceptual');
      assert.strictEqual(detectQuestionCategory('Configure Docker container networking', 'Technical'), 'technical');
    });
  });

  // ==========================================
  // 2. Evidence Grounding & Substring Verification
  // ==========================================
  describe('2. Evidence Grounding & Substring Verification', () => {
    const candidateAnswer =
      'In our microservices architecture, we implemented Redis as a write-through cache to reduce PostgreSQL load. We achieved a 99th percentile latency of 15ms by setting proper TTLs and cache invalidation listeners.';

    it('should verify exact excerpt in candidate answer', () => {
      const excerpt = 'Redis as a write-through cache to reduce PostgreSQL load';
      assert.strictEqual(verifyExcerptInAnswer(excerpt, candidateAnswer), true);
    });

    it('should verify normalized excerpt with minor punctuation and whitespace differences', () => {
      const excerpt = 'we achieved a 99th percentile latency of 15ms';
      assert.strictEqual(verifyExcerptInAnswer(excerpt, candidateAnswer), true);
    });

    it('should detect fabricated excerpt not spoken by candidate', () => {
      const fabricated = 'We used Kafka streams with Avro serialization to batch events';
      assert.strictEqual(verifyExcerptInAnswer(fabricated, candidateAnswer), false);
    });

    it('should handle empty or whitespace-only inputs safely', () => {
      assert.strictEqual(verifyExcerptInAnswer('', candidateAnswer), false);
      assert.strictEqual(verifyExcerptInAnswer('abc', ''), false);
      assert.strictEqual(verifyExcerptInAnswer(null, undefined), false);
    });
  });

  // ==========================================
  // 3. Mathematical Consistency & Authoritative Scoring
  // ==========================================
  describe('3. Mathematical Consistency & Authoritative Scoring', () => {
    it('should compute authoritative weighted overall score strictly from criteria and weights', () => {
      const criteria = [
        { name: 'Technical Accuracy', score: 9 }, // weight: 0.25 -> 2.25
        { name: 'Conceptual Understanding', score: 8 }, // weight: 0.20 -> 1.60
        { name: 'Practical Knowledge', score: 7 }, // weight: 0.15 -> 1.05
        { name: 'Depth of Explanation', score: 8 }, // weight: 0.15 -> 1.20
        { name: 'Problem-Solving Ability', score: 7 }, // weight: 0.15 -> 1.05
        { name: 'Communication Clarity', score: 9 }, // weight: 0.10 -> 0.90
      ];
      // Total = 2.25 + 1.60 + 1.05 + 1.20 + 1.05 + 0.90 = 8.05 -> rounded to 8.1
      const score = calculateAuthoritativeScore(criteria, QUESTION_CATEGORIES.TECHNICAL);
      assert.strictEqual(score, 8.1);
    });

    it('should enforce score bounds strictly within [0, 10]', () => {
      const criteriaOver = ALL_CRITERIA_NAMES.map((name) => ({ name, score: 15 }));
      const scoreOver = calculateAuthoritativeScore(criteriaOver, QUESTION_CATEGORIES.TECHNICAL);
      assert.strictEqual(scoreOver, 10.0);

      const criteriaUnder = ALL_CRITERIA_NAMES.map((name) => ({ name, score: -5 }));
      const scoreUnder = calculateAuthoritativeScore(criteriaUnder, QUESTION_CATEGORIES.TECHNICAL);
      assert.strictEqual(scoreUnder, 0.0);
    });

    it('should override diverged reported overallScore with authoritatively computed score', () => {
      const rawAi = {
        overallScore: 2.0, // AI incorrectly claims 2.0 despite high criteria scores
        criteria: ALL_CRITERIA_NAMES.map((name) => ({
          name,
          score: 8,
          reasoning: 'Good answer',
          evidence: [],
        })),
        strengths: ['Solid understanding'],
      };

      const { sanitized, warnings } = validateAndSanitizeEvidenceEvaluation(rawAi, 'test answer', QUESTION_CATEGORIES.TECHNICAL);
      assert.strictEqual(sanitized.overallScore, 8.0);
      assert.ok(warnings.some((w) => w.includes('diverged from computed')));
    });
  });

  // ==========================================
  // 4. Deterministic Handling of Empty & Timed-Out Answers
  // ==========================================
  describe('4. Deterministic Handling of Empty & Timed-Out Answers', () => {
    it('should generate zero-score evaluation for empty answer without calling AI', () => {
      const evalResult = createEmptyAnswerEvaluation({
        questionText: 'What is database normalization?',
        category: QUESTION_CATEGORIES.CONCEPTUAL,
        isTimedOut: false,
      });

      assert.strictEqual(evalResult.overallScore, 0);
      assert.strictEqual(evalResult.criteria.length, 6);
      evalResult.criteria.forEach((c) => {
        assert.strictEqual(c.score, 0);
        assert.strictEqual(c.evidence[0].classification, EVIDENCE_CLASSIFICATIONS.MISSING);
      });
      assert.strictEqual(evalResult.evaluationConfidence, 1.0);
      assert.ok(evalResult.summaryFeedback.includes('Unanswered question'));
    });

    it('should generate timed-out evaluation clearly indicating time expiry', () => {
      const evalResult = createEmptyAnswerEvaluation({
        questionText: 'Explain microservices communication',
        category: QUESTION_CATEGORIES.SYSTEM_DESIGN,
        isTimedOut: true,
      });

      assert.strictEqual(evalResult.overallScore, 0);
      assert.ok(evalResult.summaryFeedback.includes('Time expired'));
    });
  });

  // ==========================================
  // 5. Evaluation with Mocked AI Responses & Retries
  // ==========================================
  describe('5. Evaluation with Mocked AI Responses & Retries', () => {
    it('should successfully evaluate strong answer with grounded evidence citations', async () => {
      const mockAi = async () => {
        return JSON.stringify({
          overallScore: 8.5,
          maxScore: 10,
          criteria: [
            {
              name: 'Technical Accuracy',
              score: 9,
              reasoning: 'Accurately explains event-driven architecture and idempotency keys.',
              evidence: [
                {
                  text: 'we generate an idempotency key at the API gateway',
                  classification: 'correct',
                  explanation: 'Demonstrates understanding of exactly-once delivery guarantees.',
                },
              ],
            },
            {
              name: 'Conceptual Understanding',
              score: 9,
              reasoning: 'Understands trade-offs between sync and async event processing.',
              evidence: [],
            },
            {
              name: 'Practical Knowledge',
              score: 8,
              reasoning: 'Cites practical deployment experience with Kafka consumer groups.',
              evidence: [],
            },
            {
              name: 'Depth of Explanation',
              score: 8,
              reasoning: 'Explains error handling and dead letter queues in detail.',
              evidence: [],
            },
            {
              name: 'Problem-Solving Ability',
              score: 8,
              reasoning: 'Proposes sound recovery strategy for broker outages.',
              evidence: [],
            },
            {
              name: 'Communication Clarity',
              score: 9,
              reasoning: 'Structured, concise, and articulate.',
              evidence: [],
            },
          ],
          strengths: ['Strong grasp of distributed idempotency and consumer group rebalancing'],
          weaknesses: ['Could discuss out-of-order message handling'],
          missingConcepts: ['Partition rebalance storms'],
          improvements: ['Study Kafka cooperative sticky assignors to minimize rebalance latency'],
          summaryFeedback: 'Exceptional, practical explanation of event-driven idempotency.',
          evaluationConfidence: 0.95,
        });
      };

      const result = await evaluateAnswerWithEvidence({
        question: 'How do you prevent duplicate message processing in distributed message queues?',
        answer: 'In our system, we generate an idempotency key at the API gateway and persist it in Redis before acknowledging.',
        role: 'Senior Backend Engineer',
        experience: '5 years',
        mode: 'Technical',
        askAIFn: mockAi,
      });

      assert.ok(result.overallScore >= 8.0);
      assert.strictEqual(result.criteria.length, 6);
      const techAcc = result.criteria.find((c) => c.name === 'Technical Accuracy');
      assert.strictEqual(techAcc.score, 9);
      assert.strictEqual(techAcc.evidence[0].isGrounded, true);
      assert.ok(result.strengths.length > 0);
    });

    it('should recover from malformed JSON response via corrective retry', async () => {
      let callCount = 0;
      const mockAi = async () => {
        callCount++;
        if (callCount === 1) {
          return 'Here is the evaluation: { invalid_json_without_closing';
        }
        return JSON.stringify({
          overallScore: 7.0,
          criteria: ALL_CRITERIA_NAMES.map((name) => ({
            name,
            score: 7,
            reasoning: 'Sound response',
            evidence: [],
          })),
          summaryFeedback: 'Corrective retry succeeded.',
          evaluationConfidence: 0.88,
        });
      };

      const result = await evaluateAnswerWithEvidence({
        question: 'Explain optimistic locking',
        answer: 'We use a version column in PostgreSQL and check version in the WHERE clause.',
        role: 'Backend Engineer',
        askAIFn: mockAi,
      });

      assert.strictEqual(callCount, 2, 'Must perform exactly 1 corrective retry upon malformed JSON');
      assert.strictEqual(result.overallScore, 7.0);
    });

    it('should fall back gracefully to deterministic evaluation if AI fails completely', async () => {
      const failingAi = async () => {
        throw new Error('AI Provider network timeout of 120000ms exceeded');
      };

      const result = await evaluateAnswerWithEvidence({
        question: 'Explain the difference between clustered and non-clustered index',
        answer: 'A clustered index determines the physical order of data in the table, while a non-clustered index contains pointers.',
        role: 'Database Engineer',
        askAIFn: failingAi,
      });

      assert.ok(result.overallScore > 0, 'Fallback evaluation must provide a reasonable baseline score');
      assert.strictEqual(result.criteria.length, 6);
      assert.strictEqual(result.evaluationConfidence, 0.5, 'Fallback confidence must reflect fallback nature');
    });
  });

  // ==========================================
  // 6. Interview-Level Analytics Aggregation
  // ==========================================
  describe('6. Interview-Level Analytics Aggregation', () => {
    it('should aggregate multi-question interview session into unified analytics', () => {
      const questions = [
        {
          question: 'Question 1: Explain React virtual DOM',
          answer: 'React creates an in-memory virtual DOM and uses reconciliation to diff it with actual DOM.',
          score: 8,
          correctness: 8,
          communication: 8,
          confidence: 8,
          evidenceEvaluation: {
            overallScore: 8.2,
            criteria: [
              { name: 'Technical Accuracy', score: 9 },
              { name: 'Conceptual Understanding', score: 9 },
              { name: 'Practical Knowledge', score: 8 },
              { name: 'Depth of Explanation', score: 7 },
              { name: 'Problem-Solving Ability', score: 8 },
              { name: 'Communication Clarity', score: 8 },
            ],
            strengths: ['Clear explanation of fiber reconciler diffing algorithm'],
            weaknesses: ['Did not mention key prop importance'],
            missingConcepts: ['Keys in list rendering'],
            improvements: ['Deepen understanding of React Fiber priority scheduler'],
          },
        },
        {
          question: 'Question 2: How do you optimize web bundle size?',
          answer: 'We use code splitting with dynamic import(), tree shaking, and compress assets with gzip and Brotli.',
          score: 9,
          correctness: 9,
          communication: 9,
          confidence: 9,
          evidenceEvaluation: {
            overallScore: 9.0,
            criteria: [
              { name: 'Technical Accuracy', score: 9 },
              { name: 'Conceptual Understanding', score: 9 },
              { name: 'Practical Knowledge', score: 9 },
              { name: 'Depth of Explanation', score: 9 },
              { name: 'Problem-Solving Ability', score: 9 },
              { name: 'Communication Clarity', score: 9 },
            ],
            strengths: ['Practical knowledge of dynamic code splitting and asset compression'],
            weaknesses: [],
            missingConcepts: [],
            improvements: ['Explore image next-gen formats WebP/AVIF'],
          },
        },
      ];

      const analytics = aggregateInterviewAnalytics(questions);

      assert.strictEqual(analytics.totalQuestions, 2);
      assert.strictEqual(analytics.answeredCount, 2);
      assert.strictEqual(analytics.overallScore, 8.6);
      assert.strictEqual(analytics.percentageScore, 86);
      assert.strictEqual(analytics.criterionScores.length, 6);

      // Strongest and weakest competencies
      assert.ok(analytics.strongestCompetencies.includes('Technical Accuracy'));
      assert.ok(analytics.keyStrengths.length > 0);
      assert.ok(analytics.studyRecommendations.length > 0);
    });

    it('should maintain backward compatibility for legacy interviews lacking evidenceEvaluation', () => {
      const legacyQuestions = [
        {
          question: 'Legacy Question 1',
          answer: 'Legacy answer text',
          score: 7,
          correctness: 7,
          communication: 8,
          confidence: 7,
          feedback: 'Solid performance',
        },
        {
          question: 'Legacy Question 2',
          answer: 'Second legacy answer',
          score: 8,
          correctness: 8,
          communication: 9,
          confidence: 8,
          feedback: 'Great communication',
        },
      ];

      const analytics = aggregateInterviewAnalytics(legacyQuestions);

      assert.strictEqual(analytics.totalQuestions, 2);
      assert.strictEqual(analytics.overallScore, 7.5);
      assert.strictEqual(analytics.percentageScore, 75);
      assert.strictEqual(analytics.criterionScores.length, 6);
      const techAcc = analytics.criterionScores.find((c) => c.name === 'Technical Accuracy');
      assert.strictEqual(techAcc.score, 7.5);
    });

    it('should handle empty questions array gracefully without crashing', () => {
      const emptyAnalytics = aggregateInterviewAnalytics([]);
      assert.strictEqual(emptyAnalytics.totalQuestions, 0);
      assert.strictEqual(emptyAnalytics.overallScore, 0);
      assert.strictEqual(emptyAnalytics.criterionScores.length, 6);
    });
  });
});
