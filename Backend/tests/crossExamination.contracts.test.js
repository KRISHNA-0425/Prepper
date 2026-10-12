import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CLAIM_CATEGORIES,
  PROVENANCE_TYPES,
  CONFIDENCE_LEVELS,
  VERIFICATION_STATUSES,
  SESSION_STATUSES,
  INQUIRY_TYPES,
  generateDomainId,
  hashSourceText,
  validateClaimContract,
  validateProjectProfileContract,
  isValidStateTransition,
} from '../contracts/crossExamination.contracts.js';

describe('Cross-Examination Domain Contracts', () => {
  it('should export frozen enum constants', () => {
    assert.strictEqual(typeof CLAIM_CATEGORIES.TECHNICAL_SKILL, 'string');
    assert.strictEqual(typeof PROVENANCE_TYPES.EXPLICIT_SOURCE_STATEMENT, 'string');
    assert.strictEqual(typeof CONFIDENCE_LEVELS.HIGH, 'string');
    assert.strictEqual(typeof VERIFICATION_STATUSES.UNVERIFIED, 'string');
    assert.strictEqual(typeof SESSION_STATUSES.DRAFT, 'string');
    assert.strictEqual(typeof INQUIRY_TYPES.CLAIM_VERIFICATION, 'string');

    assert.throws(() => {
      CLAIM_CATEGORIES.NEW_KEY = 'TEST';
    }, TypeError);
  });

  it('should generate domain IDs with appropriate prefixes', () => {
    const claimId = generateDomainId('clm');
    const questionId = generateDomainId('ceq');
    const answerId = generateDomainId('ans');

    assert.ok(claimId.startsWith('clm_'));
    assert.ok(questionId.startsWith('ceq_'));
    assert.ok(answerId.startsWith('ans_'));
    assert.strictEqual(claimId.length, 20); // 'clm_' + 16 hex chars
  });

  it('should generate consistent SHA-256 hash for source text', () => {
    const text = 'Architected microservices using Node.js and MongoDB';
    const hash1 = hashSourceText(text);
    const hash2 = hashSourceText(text);
    const emptyHash = hashSourceText('');

    assert.strictEqual(hash1, hash2);
    assert.strictEqual(hash1.length, 64);
    assert.strictEqual(emptyHash, '');
  });

  describe('validateClaimContract', () => {
    it('should approve valid explicit source claim', () => {
      const claim = {
        statement: 'Built real-time messaging pipeline using Socket.io and Redis pub/sub',
        category: CLAIM_CATEGORIES.ARCHITECTURE_DECISION,
        sourceExcerpt: 'Implemented Socket.io and Redis for low-latency messaging',
        provenanceType: PROVENANCE_TYPES.EXPLICIT_SOURCE_STATEMENT,
        confidence: CONFIDENCE_LEVELS.HIGH,
      };

      const result = validateClaimContract(claim);
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.errors.length, 0);
    });

    it('should approve valid AI inferred category without source excerpt', () => {
      const claim = {
        statement: 'Demonstrates distributed systems systems design knowledge',
        category: CLAIM_CATEGORIES.TECHNICAL_SKILL,
        provenanceType: PROVENANCE_TYPES.AI_INFERRED_CATEGORY,
        confidence: CONFIDENCE_LEVELS.MEDIUM,
      };

      const result = validateClaimContract(claim);
      assert.strictEqual(result.isValid, true);
    });

    it('should reject explicit source claim missing sourceExcerpt', () => {
      const claim = {
        statement: 'Increased database throughput by 40%',
        category: CLAIM_CATEGORIES.SCALE_METRIC,
        provenanceType: PROVENANCE_TYPES.EXPLICIT_SOURCE_STATEMENT,
        sourceExcerpt: '', // missing
      };

      const result = validateClaimContract(claim);
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.some((err) => err.includes('sourceExcerpt')));
    });

    it('should reject invalid category or empty statement', () => {
      const claim = {
        statement: '   ',
        category: 'INVALID_CATEGORY',
        provenanceType: PROVENANCE_TYPES.AI_INFERRED_CATEGORY,
      };

      const result = validateClaimContract(claim);
      assert.strictEqual(result.isValid, false);
      assert.strictEqual(result.errors.length, 2);
    });
  });

  describe('validateProjectProfileContract', () => {
    it('should approve valid project profile with nested claims', () => {
      const project = {
        title: 'Distributed Payment Gateway',
        description: 'Payment reconciliation and settlement engine',
        claims: [
          {
            statement: 'Handled idempotency with Redis lock keys',
            category: CLAIM_CATEGORIES.ARCHITECTURE_DECISION,
            sourceExcerpt: 'Redis distributed locks for idempotent API transactions',
            provenanceType: PROVENANCE_TYPES.EXPLICIT_SOURCE_STATEMENT,
          },
        ],
      };

      const result = validateProjectProfileContract(project);
      assert.strictEqual(result.isValid, true);
    });

    it('should reject project without title', () => {
      const project = {
        title: '',
        claims: [],
      };

      const result = validateProjectProfileContract(project);
      assert.strictEqual(result.isValid, false);
      assert.ok(result.errors.some((err) => err.includes('Project title is required')));
    });
  });

  describe('State Machine Transitions', () => {
    it('should allow valid lifecycle transitions', () => {
      assert.strictEqual(isValidStateTransition(SESSION_STATUSES.DRAFT, SESSION_STATUSES.ACTIVE), true);
      assert.strictEqual(isValidStateTransition(SESSION_STATUSES.ACTIVE, SESSION_STATUSES.AWAITING_ANSWER), true);
      assert.strictEqual(isValidStateTransition(SESSION_STATUSES.AWAITING_ANSWER, SESSION_STATUSES.ACTIVE), true);
      assert.strictEqual(isValidStateTransition(SESSION_STATUSES.AWAITING_ANSWER, SESSION_STATUSES.COMPLETED), true);
      assert.strictEqual(isValidStateTransition(SESSION_STATUSES.ACTIVE, SESSION_STATUSES.COMPLETED), true);
      assert.strictEqual(isValidStateTransition(SESSION_STATUSES.ACTIVE, SESSION_STATUSES.FAILED), true);
    });

    it('should reject invalid or backward lifecycle transitions', () => {
      assert.strictEqual(isValidStateTransition(SESSION_STATUSES.DRAFT, SESSION_STATUSES.COMPLETED), false);
      assert.strictEqual(isValidStateTransition(SESSION_STATUSES.COMPLETED, SESSION_STATUSES.ACTIVE), false);
      assert.strictEqual(isValidStateTransition(SESSION_STATUSES.COMPLETED, SESSION_STATUSES.DRAFT), false);
      assert.strictEqual(isValidStateTransition(SESSION_STATUSES.FAILED, SESSION_STATUSES.ACTIVE), false);
      assert.strictEqual(isValidStateTransition('unknown_status', SESSION_STATUSES.ACTIVE), false);
    });
  });
});
