/**
 * @file companyInterviewFrontend.test.js
 * Frontend Regression Test Suite for Module 6:
 * Company-Specific Interview Simulation, Role Readiness Scorecard,
 * and Cross-Module Integration.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Module 6: Company-Specific Interview Simulation Frontend Suite', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(__dirname, '..');

  const companySelectorPath = path.resolve(frontendRoot, 'src/components/company/CompanySelector.jsx');
  const intelligenceCardPath = path.resolve(frontendRoot, 'src/components/company/CompanyIntelligenceCard.jsx');
  const roundSelectorPath = path.resolve(frontendRoot, 'src/components/company/RoundSelector.jsx');
  const readinessCardPath = path.resolve(frontendRoot, 'src/components/company/CompanyReadinessCard.jsx');
  const companyBarrelPath = path.resolve(frontendRoot, 'src/components/company/index.js');
  const componentsRegistryPath = path.resolve(frontendRoot, 'src/components/index.js');

  const setupPagePath = path.resolve(frontendRoot, 'src/pages/CompanyInterviewSetup.jsx');
  const sessionPagePath = path.resolve(frontendRoot, 'src/pages/CompanyInterviewSession.jsx');
  const reportPagePath = path.resolve(frontendRoot, 'src/pages/CompanyInterviewReport.jsx');
  const historyPagePath = path.resolve(frontendRoot, 'src/pages/CompanyInterviewHistory.jsx');
  const pagesRegistryPath = path.resolve(frontendRoot, 'src/pages/index.js');

  const appPath = path.resolve(frontendRoot, 'src/App.jsx');
  const navbarPath = path.resolve(frontendRoot, 'src/components/Navbar.jsx');

  const selectorCode = fs.readFileSync(companySelectorPath, 'utf8');
  const intelCode = fs.readFileSync(intelligenceCardPath, 'utf8');
  const roundCode = fs.readFileSync(roundSelectorPath, 'utf8');
  const readinessCode = fs.readFileSync(readinessCardPath, 'utf8');
  const companyBarrelCode = fs.readFileSync(companyBarrelPath, 'utf8');
  const componentsRegCode = fs.readFileSync(componentsRegistryPath, 'utf8');

  const setupCode = fs.readFileSync(setupPagePath, 'utf8');
  const sessionCode = fs.readFileSync(sessionPagePath, 'utf8');
  const reportCode = fs.readFileSync(reportPagePath, 'utf8');
  const historyCode = fs.readFileSync(historyPagePath, 'utf8');
  const pagesRegCode = fs.readFileSync(pagesRegistryPath, 'utf8');

  const appCode = fs.readFileSync(appPath, 'utf8');
  const navbarCode = fs.readFileSync(navbarPath, 'utf8');

  // =========================================================================
  // 1. CompanySelector Component
  // =========================================================================
  describe('1. CompanySelector Component', () => {
    it('supports selecting from premier company grid and custom search', () => {
      assert.ok(selectorCode.includes('onSelectCompany'), 'Must support company selection');
      assert.ok(selectorCode.includes('onCustomCompanySearch'), 'Must support custom company search');
      assert.ok(selectorCode.includes('Analyze'), 'Must provide analysis trigger for custom company');
    });

    it('renders company metadata including rounds and tier', () => {
      assert.ok(selectorCode.includes('supportedRounds'), 'Must display rounds count');
      assert.ok(selectorCode.includes('industry'), 'Must display company industry');
    });
  });

  // =========================================================================
  // 2. CompanyIntelligenceCard Component
  // =========================================================================
  describe('2. CompanyIntelligenceCard Component', () => {
    it('renders company interview culture, core principles, and tech stack tags', () => {
      assert.ok(intelCode.includes('interviewCulture'), 'Must display interview culture');
      assert.ok(intelCode.includes('behavioralPrinciples'), 'Must display behavioral principles');
      assert.ok(intelCode.includes('techStackFocus'), 'Must display tech stack focus');
    });

    it('displays verification status and public preparation disclaimer', () => {
      assert.ok(intelCode.includes('isVerified'), 'Must display verification indicator');
      assert.ok(intelCode.includes('disclaimer'), 'Must display ethics / legal disclaimer');
    });
  });

  // =========================================================================
  // 3. RoundSelector Component
  // =========================================================================
  describe('3. RoundSelector Component', () => {
    it('renders round badges for coding, system design, behavioral, and conceptual formats', () => {
      assert.ok(roundCode.includes('coding'), 'Must support coding format');
      assert.ok(roundCode.includes('system_design'), 'Must support system design format');
      assert.ok(roundCode.includes('behavioral'), 'Must support behavioral format');
    });

    it('highlights recommended interview round based on role and seniority', () => {
      assert.ok(roundCode.includes('recommendedRoundId'), 'Must support recommended round prop');
      assert.ok(roundCode.includes('Recommended'), 'Must render Recommended badge');
    });
  });

  // =========================================================================
  // 4. CompanyReadinessCard Component
  // =========================================================================
  describe('4. CompanyReadinessCard Component', () => {
    it('renders readiness score gauge and hire verdict badge with distinct levels', () => {
      assert.ok(readinessCode.includes('readinessScore'), 'Must display readiness score');
      assert.ok(readinessCode.includes('Strong Hire'), 'Must support Strong Hire');
      assert.ok(readinessCode.includes('Hire'), 'Must support Hire');
      assert.ok(readinessCode.includes('Leaning Hire'), 'Must support Leaning Hire');
      assert.ok(readinessCode.includes('Leaning No Hire'), 'Must support Leaning No Hire');
      assert.ok(readinessCode.includes('No Hire'), 'Must support No Hire');
    });

    it('provides direct trigger to generate Module 5 Recovery Plan', () => {
      assert.ok(readinessCode.includes('onGenerateRecoveryPlan'), 'Must accept recovery plan trigger callback');
      assert.ok(readinessCode.includes('Generate Recovery Plan (Module 5)'), 'Must render recovery plan CTA');
    });
  });

  // =========================================================================
  // 5. Page Implementations and Workflows
  // =========================================================================
  describe('5. Page Implementations and Full Lifecycle', () => {
    it('CompanyInterviewSetup enforces 50 credit requirement and initializes session via API', () => {
      assert.ok(setupCode.includes('50'), 'Must communicate 50 credits requirement');
      assert.ok(setupCode.includes('/api/company-interview/create-session'), 'Must call create session endpoint');
      assert.ok(setupCode.includes('/company-interview/'), 'Must navigate to session workspace');
    });

    it('CompanyInterviewSession supports speech TTS, voice dictation, timer, and answer evaluation', () => {
      assert.ok(sessionCode.includes('speechSynthesis') || sessionCode.includes('SpeechSynthesisUtterance'), 'Must support text-to-speech');
      assert.ok(sessionCode.includes('SpeechRecognition') || sessionCode.includes('webkitSpeechRecognition'), 'Must support voice input');
      assert.ok(sessionCode.includes('/api/company-interview/submit-answer'), 'Must submit answers for evaluation');
      assert.ok(sessionCode.includes('/api/company-interview/finish'), 'Must support completing simulation');
    });

    it('CompanyInterviewReport renders readiness card and embeds RecoveryPlanSetupModal', () => {
      assert.ok(reportCode.includes('CompanyReadinessCard'), 'Must render readiness card');
      assert.ok(reportCode.includes('RecoveryPlanSetupModal'), 'Must integrate Module 5 recovery modal');
      assert.ok(reportCode.includes('interviewId={session._id}'), 'Must pass session ID to recovery modal');
    });

    it('CompanyInterviewHistory lists simulations with verdicts, filters, and recovery triggers', () => {
      assert.ok(historyCode.includes('/api/company-interview/history'), 'Must fetch history from backend');
      assert.ok(historyCode.includes('RecoveryPlanSetupModal'), 'Must allow generating recovery plans from history');
    });
  });

  // =========================================================================
  // 6. Navigation and Registry Integration
  // =========================================================================
  describe('6. Navigation and Registry Integration', () => {
    it('Navbar includes Company Prep navigation pill linking to /company-interview', () => {
      assert.ok(navbarCode.includes('/company-interview'), 'Navbar must link to /company-interview');
      assert.ok(navbarCode.includes('Company Prep') || navbarCode.includes('Company'), 'Navbar must have label');
    });

    it('App.jsx registers all 4 Company Interview routes', () => {
      assert.ok(appCode.includes("path='/company-interview'"), 'Must register setup route');
      assert.ok(appCode.includes("path='/company-interview/:sessionId'"), 'Must register session route');
      assert.ok(appCode.includes("path='/company-interview/report/:id'"), 'Must register report route');
      assert.ok(appCode.includes("path='/company-interview/history'"), 'Must register history route');
    });

    it('components and pages barrel registries export all company artifacts', () => {
      assert.ok(companyBarrelCode.includes('CompanySelector'));
      assert.ok(companyBarrelCode.includes('CompanyReadinessCard'));
      assert.ok(componentsRegCode.includes('CompanySelector'));
      assert.ok(componentsRegCode.includes('CompanyReadinessCard'));
      assert.ok(pagesRegCode.includes('CompanyInterviewSetup'));
      assert.ok(pagesRegCode.includes('CompanyInterviewReport'));
    });
  });
});
