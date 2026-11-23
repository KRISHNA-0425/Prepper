/**
 * @file adaptiveQuestioningFrontend.test.js
 * Frontend Regression Test Suite for Module 3:
 * Dynamic Adaptive Questioning, Real-Time Difficulty Indicators & Trajectory Reporting.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Module 3: Adaptive Questioning & Steering Frontend Regression Suite', () => {

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(__dirname, '..');

  const step2Path = path.resolve(frontendRoot, 'src/pages/Step2Interview.jsx');
  const step3Path = path.resolve(frontendRoot, 'src/pages/Step3Report.jsx');

  const step2Code = fs.readFileSync(step2Path, 'utf8');
  const step3Code = fs.readFileSync(step3Path, 'utf8');

  // =========================================================================
  // 1. Step2Interview: Dynamic Difficulty Indicators & Transition Banners
  // =========================================================================
  describe('1. Step2Interview: Difficulty Indicators & Transition Banners', () => {

    it('should verify Step2Interview.jsx renders dynamic difficulty levels (Beginner, Intermediate, Advanced)', () => {
      assert.ok(
        step2Code.includes('Beginner') && step2Code.includes('Intermediate') && step2Code.includes('Advanced'),
        'Step2Interview must support Beginner, Intermediate, and Advanced difficulty badges'
      );
      assert.ok(
        step2Code.includes('currentQuestion?.difficulty') || step2Code.includes('qDiff'),
        'Step2Interview must derive badge from currentQuestion difficulty'
      );
    });

    it('should verify Step2Interview.jsx renders transition phrase banner when present', () => {
      assert.ok(
        step2Code.includes('currentQuestion?.transitionPhrase'),
        'Step2Interview must inspect currentQuestion.transitionPhrase'
      );
      assert.ok(
        step2Code.includes('Interviewer:'),
        'Step2Interview must label the transition phrase as Interviewer statement'
      );
    });

    it('should verify Step2Interview.jsx displays question progress bar', () => {
      assert.ok(
        step2Code.includes('currentIndex + 1') && step2Code.includes('targetQuestionCount'),
        'Step2Interview must compute progress percentage using currentIndex and targetQuestionCount'
      );
    });

    it('should verify Step2Interview.jsx preserves voice audio, timer, and auto-submit controls', () => {
      assert.ok(step2Code.includes('Timer'), 'Timer component must remain mounted');
      assert.ok(step2Code.includes('replayQuestion'), 'Voice replay must remain intact');
      assert.ok(step2Code.includes('isSubmittingRef.current'), 'Concurrency submission guard must be preserved');
    });
  });

  // =========================================================================
  // 2. Step3Report: Adaptive Trajectory & Topic Mastery Insights (Section F)
  // =========================================================================
  describe('2. Step3Report: Section F Adaptive Trajectory & Competency Insights', () => {

    it('should verify Step3Report.jsx renders Section F Adaptive Trajectory heading', () => {
      assert.ok(
        step3Code.includes('SECTION F: Real-Time Adaptive Trajectory') ||
        step3Code.includes('Adaptive Trajectory & Competency Steering'),
        'Step3Report must contain Section F Adaptive Trajectory'
      );
    });

    it('should verify Step3Report.jsx renders question-by-question difficulty progression', () => {
      assert.ok(
        step3Code.includes('Question-by-Question Difficulty Progression'),
        'Step3Report must display question difficulty progression cards'
      );
    });

    it('should verify Step3Report.jsx renders Topic Mastery & Knowledge Breakdown grid', () => {
      assert.ok(
        step3Code.includes('Topic Mastery & Knowledge Breakdown'),
        'Step3Report must render Topic Mastery grid'
      );
    });

    it('should verify Step3Report.jsx renders Interviewer Steering Decision Trail', () => {
      assert.ok(
        step3Code.includes('Interviewer Steering Decision Trail'),
        'Step3Report must render decision history log'
      );
    });

    it('should verify Step3Report.jsx preserves legacy badges for backward compatibility', () => {
      assert.ok(
        step3Code.includes("report.interviewMode === 'time_based' ? 'Time-Based Interview' : 'Question-Based Interview'"),
        'Must preserve interviewMode badge'
      );
      assert.ok(step3Code.includes('Credits Spent'), 'Must preserve Credits Spent badge');
      assert.ok(step3Code.includes('Questions'), 'Must preserve Questions badge');
      assert.ok(step3Code.includes('60s / Answer'), 'Must preserve 60s / Answer badge');
      assert.ok(step3Code.includes('Medium Difficulty'), 'Must preserve Medium Difficulty badge');
    });
  });

});
