/**
 * @file recoveryPlanFrontend.test.js
 * Frontend Regression Test Suite for Module 5:
 * Personalized Interview Recovery Plan, Adaptive Scheduling, Task Tracking, and Reassessment.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Module 5: Personalized Interview Recovery Plan Frontend Suite', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(__dirname, '..');

  const setupModalPath = path.resolve(frontendRoot, 'src/components/recovery/RecoveryPlanSetupModal.jsx');
  const overviewPath = path.resolve(frontendRoot, 'src/components/recovery/RecoveryPlanOverview.jsx');
  const taskListPath = path.resolve(frontendRoot, 'src/components/recovery/DailyTaskList.jsx');
  const taskModalPath = path.resolve(frontendRoot, 'src/components/recovery/TaskDetailModal.jsx');
  const reassessModalPath = path.resolve(frontendRoot, 'src/components/recovery/ReassessmentModal.jsx');
  const dashboardPagePath = path.resolve(frontendRoot, 'src/pages/RecoveryPlanDashboard.jsx');
  const listPagePath = path.resolve(frontendRoot, 'src/pages/RecoveryPlansListPage.jsx');
  const appPath = path.resolve(frontendRoot, 'src/App.jsx');
  const navbarPath = path.resolve(frontendRoot, 'src/components/Navbar.jsx');
  const step3Path = path.resolve(frontendRoot, 'src/pages/Step3Report.jsx');

  const setupCode = fs.readFileSync(setupModalPath, 'utf8');
  const overviewCode = fs.readFileSync(overviewPath, 'utf8');
  const taskListCode = fs.readFileSync(taskListPath, 'utf8');
  const taskModalCode = fs.readFileSync(taskModalPath, 'utf8');
  const reassessCode = fs.readFileSync(reassessModalPath, 'utf8');
  const dashboardCode = fs.readFileSync(dashboardPagePath, 'utf8');
  const listPageCode = fs.readFileSync(listPagePath, 'utf8');
  const appCode = fs.readFileSync(appPath, 'utf8');
  const navbarCode = fs.readFileSync(navbarPath, 'utf8');
  const step3Code = fs.readFileSync(step3Path, 'utf8');

  // =========================================================================
  // 1. Recovery Plan Setup Modal
  // =========================================================================
  describe('1. RecoveryPlanSetupModal Component', () => {
    it('supports 7, 14, and 30 day schedule durations', () => {
      assert.ok(setupCode.includes('7-Day Sprint'), 'Must support 7-day sprint');
      assert.ok(setupCode.includes('14-Day Balanced'), 'Must support 14-day balanced');
      assert.ok(setupCode.includes('30-Day Mastery'), 'Must support 30-day mastery');
    });

    it('supports daily study commitment selection', () => {
      assert.ok(setupCode.includes('30 mins/day') || setupCode.includes('minutes: 30'));
      assert.ok(setupCode.includes('45 mins/day') || setupCode.includes('minutes: 45'));
      assert.ok(setupCode.includes('60 mins/day') || setupCode.includes('minutes: 60'));
    });

    it('submits generation payload to /api/recovery-plans/generate and handles navigation', () => {
      assert.ok(setupCode.includes('/api/recovery-plans/generate'));
      assert.ok(setupCode.includes('scheduleDurationDays: duration'));
      assert.ok(setupCode.includes('dailyStudyMinutes: dailyMinutes'));
      assert.ok(setupCode.includes('/recovery-plans/'));
    });
  });

  // =========================================================================
  // 2. Recovery Plan Overview Component
  // =========================================================================
  describe('2. RecoveryPlanOverview Component', () => {
    it('renders baseline score, daily minutes, and completion percentage', () => {
      assert.ok(overviewCode.includes('Baseline Score'));
      assert.ok(overviewCode.includes('Daily Commitment'));
      assert.ok(overviewCode.includes('Overall Completion'));
      assert.ok(overviewCode.includes('completionPercentage'));
    });

    it('renders fallback notice badge if plan was generated deterministically', () => {
      assert.ok(overviewCode.includes('plan.isFallbackGenerated'));
      assert.ok(overviewCode.includes('Deterministic Recovery Roadmap'));
    });

    it('renders dual cards for Demonstrated Strengths and Targeted Weaknesses with evidence source badges', () => {
      assert.ok(overviewCode.includes('Demonstrated Strengths'));
      assert.ok(overviewCode.includes('Targeted Weaknesses & Gaps'));
      assert.ok(overviewCode.includes('getSourceBadge'));
      assert.ok(overviewCode.includes('getSeverityBadge'));
    });
  });

  // =========================================================================
  // 3. DailyTaskList Component
  // =========================================================================
  describe('3. DailyTaskList Component', () => {
    it('provides day filters, status filters, and category badges', () => {
      assert.ok(taskListCode.includes('All Days'));
      assert.ok(taskListCode.includes('pending') && taskListCode.includes('completed'));
      assert.ok(taskListCode.includes('getCategoryIcon'));
      assert.ok(taskListCode.includes('getPriorityBadge'));
    });

    it('supports interactive task completion status toggling', () => {
      assert.ok(taskListCode.includes('onToggleStatus'));
      assert.ok(taskListCode.includes('Mark Done') || taskListCode.includes('Done'));
    });
  });

  // =========================================================================
  // 4. TaskDetailModal Component
  // =========================================================================
  describe('4. TaskDetailModal Component', () => {
    it('renders expected outcome, completion criteria, and candidate study notes', () => {
      assert.ok(taskModalCode.includes('Expected Outcome'));
      assert.ok(taskModalCode.includes('Completion Criteria'));
      assert.ok(taskModalCode.includes('candidateNotes') || taskModalCode.includes('Study Notes'));
      assert.ok(taskModalCode.includes('onSaveTask'));
    });
  });

  // =========================================================================
  // 5. ReassessmentModal Component
  // =========================================================================
  describe('5. ReassessmentModal Component', () => {
    it('manages 3-phase reassessment lifecycle (initiation, answer submission, score delta comparison)', () => {
      assert.ok(reassessCode.includes('/reassess/start'));
      assert.ok(reassessCode.includes('/reassess/submit'));
      assert.ok(reassessCode.includes('Score Delta'));
      assert.ok(reassessCode.includes('Verified Improvements'));
    });
  });

  // =========================================================================
  // 6. Router and Navbar Integration
  // =========================================================================
  describe('6. Router, Navbar, and Report Integrations', () => {
    it('registers /recovery-plans and /recovery-plans/:planId in App.jsx', () => {
      assert.ok(appCode.includes("path='/recovery-plans'"));
      assert.ok(appCode.includes("path='/recovery-plans/:planId'"));
    });

    it('adds Recovery Plan link in Navbar.jsx with active state indicator', () => {
      assert.ok(navbarCode.includes('/recovery-plans'));
      assert.ok(navbarCode.includes('Recovery Plan'));
      assert.ok(navbarCode.includes('isRecoveryPlanActive'));
    });

    it('embeds Module 5 Recovery Plan CTA Banner and modal trigger in Step3Report.jsx', () => {
      assert.ok(step3Code.includes('Personalized Recovery Plan'));
      assert.ok(step3Code.includes('Generate Recovery Plan'));
      assert.ok(step3Code.includes('RecoveryPlanSetupModal'));
    });
  });
});
