import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Module 2: Frontend Evidence-Based Evaluation & Report Engine Suite', () => {
  const step3Path = path.resolve('src/pages/Step3Report.jsx');
  const step3Content = fs.readFileSync(step3Path, 'utf8');

  // ==========================================
  // 1. Core Section Architectures in Step3Report
  // ==========================================
  describe('1. Core Section Architectures in Step3Report', () => {
    it('should verify Step3Report.jsx renders Section A: Overall Performance Summary', () => {
      assert.ok(
        step3Content.includes('Overall Performance'),
        'Step3Report must contain an Overall Performance section'
      );
      assert.ok(
        step3Content.includes('overallPercent') || step3Content.includes('overallScore'),
        'Step3Report must compute and display aggregate score percentage'
      );
      assert.ok(
        step3Content.includes('Demonstrated Strengths'),
        'Step3Report must display demonstrated strengths snapshot'
      );
      assert.ok(
        step3Content.includes('Observed Technical Gaps'),
        'Step3Report must display observed technical gaps'
      );
    });

    it('should verify Step3Report.jsx renders Section B: Six-Criterion Evaluation Breakdown', () => {
      assert.ok(
        step3Content.includes('Six-Criterion Evaluation Breakdown'),
        'Step3Report must contain Section B: Six-Criterion Evaluation Breakdown'
      );
      assert.ok(
        step3Content.includes('Technical Accuracy') &&
          step3Content.includes('Conceptual Understanding') &&
          step3Content.includes('Practical Knowledge') &&
          step3Content.includes('Depth of Explanation') &&
          step3Content.includes('Problem-Solving Ability') &&
          step3Content.includes('Communication Clarity'),
        'Step3Report must define the standard six criteria'
      );
      assert.ok(
        step3Content.includes('crit.score') && step3Content.includes('/ 10'),
        'Step3Report must display score out of 10 for each criterion'
      );
    });

    it('should verify Step3Report.jsx renders Section C: Global Evidence Explorer', () => {
      assert.ok(
        step3Content.includes('Evidence Explorer'),
        'Step3Report must contain Section C: Evidence Explorer'
      );
      assert.ok(
        step3Content.includes('evidenceFilter') && step3Content.includes('setEvidenceFilter'),
        'Step3Report must support interactive evidence classification filtering'
      );
      assert.ok(
        step3Content.includes('classification'),
        'Step3Report must render evidence classification badges'
      );
    });

    it('should verify Step3Report.jsx renders Section D: Actionable Study Recommendations', () => {
      assert.ok(
        step3Content.includes('Actionable Study Recommendations'),
        'Step3Report must contain Section D: Actionable Study Recommendations'
      );
      assert.ok(
        step3Content.includes('studyRecommendations'),
        'Step3Report must display study recommendations list'
      );
    });

    it('should verify Step3Report.jsx renders Section E: Question-Wise Deep Dive with Expandable Evidence Inspector', () => {
      assert.ok(
        step3Content.includes('Question-Wise Analysis'),
        'Step3Report must contain Section E: Question-Wise Analysis'
      );
      assert.ok(
        step3Content.includes('Candidate Transcript'),
        'Step3Report must display candidate transcript for each question'
      );
      assert.ok(
        step3Content.includes('toggleQuestion') && step3Content.includes('expandedQuestions'),
        'Step3Report must support expanding evidence breakdown per question'
      );
      assert.ok(
        step3Content.includes('Criterion Evidence & Citations'),
        'Step3Report must display criterion evidence and citations in accordion'
      );
    });
  });

  // ==========================================
  // 2. Backward Compatibility & Specification Badges
  // ==========================================
  describe('2. Backward Compatibility & Specification Badges', () => {
    it('should verify Step3Report.jsx handles legacy reports without analytics cleanly', () => {
      assert.ok(
        step3Content.includes('report.analytics') && step3Content.includes('Array.isArray'),
        'Step3Report must check for analytics presence and fall back dynamically'
      );
      assert.ok(
        step3Content.includes('avgCorrectness') && step3Content.includes('avgComms'),
        'Step3Report must dynamically derive criterion metrics from legacy correctness/communication scores'
      );
    });

    it('should verify Step3Report.jsx preserves all session specification badges', () => {
      assert.ok(
        step3Content.includes("report.interviewMode === 'time_based' ? 'Time-Based Interview' : 'Question-Based Interview'"),
        'Step3Report must preserve the Time-Based vs Question-Based badge'
      );
      assert.ok(step3Content.includes('Credits Spent'), 'Must preserve Credits Spent badge');
      assert.ok(step3Content.includes('Questions'), 'Must preserve Questions badge');
      assert.ok(step3Content.includes('60s / Answer'), 'Must preserve 60s / Answer badge');
      assert.ok(step3Content.includes('Medium Difficulty'), 'Must preserve Medium Difficulty badge');
    });
  });
});
