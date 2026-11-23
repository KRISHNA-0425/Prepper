/**
 * @file atsIntelligenceFrontend.test.js
 * Frontend Regression & Integration Test Suite for Module 7:
 * AI Resume-to-Job ATS & Application Intelligence.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Module 7: AI Resume-to-Job ATS & Application Intelligence Frontend Suite', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(__dirname, '..');

  const dropzonePath = path.resolve(frontendRoot, 'src/components/ats/ResumeUploadDropzone.jsx');
  const scoreGaugePath = path.resolve(frontendRoot, 'src/components/ats/AtsScoreGauge.jsx');
  const dimensionBreakdownPath = path.resolve(frontendRoot, 'src/components/ats/AtsDimensionBreakdown.jsx');
  const skillGapTablePath = path.resolve(frontendRoot, 'src/components/ats/SkillGapTable.jsx');
  const improvementWorkspacePath = path.resolve(frontendRoot, 'src/components/ats/ResumeImprovementWorkspace.jsx');
  const bridgeBarPath = path.resolve(frontendRoot, 'src/components/ats/CrossModuleBridgeBar.jsx');
  const atsBarrelPath = path.resolve(frontendRoot, 'src/components/ats/index.js');
  const componentsRegistryPath = path.resolve(frontendRoot, 'src/components/index.js');

  const dashboardPagePath = path.resolve(frontendRoot, 'src/pages/AtsDashboard.jsx');
  const setupPagePath = path.resolve(frontendRoot, 'src/pages/AtsSetupPage.jsx');
  const reportPagePath = path.resolve(frontendRoot, 'src/pages/AtsAnalysisReport.jsx');
  const historyPagePath = path.resolve(frontendRoot, 'src/pages/AtsHistoryPage.jsx');
  const pagesRegistryPath = path.resolve(frontendRoot, 'src/pages/index.js');

  const appPath = path.resolve(frontendRoot, 'src/App.jsx');
  const navbarPath = path.resolve(frontendRoot, 'src/components/Navbar.jsx');

  const dropzoneCode = fs.readFileSync(dropzonePath, 'utf8');
  const scoreGaugeCode = fs.readFileSync(scoreGaugePath, 'utf8');
  const breakdownCode = fs.readFileSync(dimensionBreakdownPath, 'utf8');
  const gapTableCode = fs.readFileSync(skillGapTablePath, 'utf8');
  const improvementCode = fs.readFileSync(improvementWorkspacePath, 'utf8');
  const bridgeBarCode = fs.readFileSync(bridgeBarPath, 'utf8');
  const atsBarrelCode = fs.readFileSync(atsBarrelPath, 'utf8');
  const componentsRegCode = fs.readFileSync(componentsRegistryPath, 'utf8');

  const dashboardCode = fs.readFileSync(dashboardPagePath, 'utf8');
  const setupCode = fs.readFileSync(setupPagePath, 'utf8');
  const reportCode = fs.readFileSync(reportPagePath, 'utf8');
  const historyCode = fs.readFileSync(historyPagePath, 'utf8');
  const pagesRegCode = fs.readFileSync(pagesRegistryPath, 'utf8');

  const appCode = fs.readFileSync(appPath, 'utf8');
  const navbarCode = fs.readFileSync(navbarPath, 'utf8');

  const step1SetupCode = fs.readFileSync(path.resolve(frontendRoot, 'src/pages/Step1Setup.jsx'), 'utf8');
  const companySetupCode = fs.readFileSync(path.resolve(frontendRoot, 'src/pages/CompanyInterviewSetup.jsx'), 'utf8');
  const codingSetupCode = fs.readFileSync(path.resolve(frontendRoot, 'src/pages/CodingSetup.jsx'), 'utf8');
  const recoveryListCode = fs.readFileSync(path.resolve(frontendRoot, 'src/pages/RecoveryPlansListPage.jsx'), 'utf8');

  // =========================================================================
  // 1. ResumeUploadDropzone Component
  // =========================================================================
  describe('1. ResumeUploadDropzone Component', () => {
    it('supports PDF, DOCX, and TXT file extensions and validates 10MB limits', () => {
      assert.ok(dropzoneCode.includes('.pdf'), 'Must accept PDF');
      assert.ok(dropzoneCode.includes('.docx'), 'Must accept DOCX');
      assert.ok(dropzoneCode.includes('.txt'), 'Must accept TXT');
      assert.ok(dropzoneCode.includes('10 * 1024 * 1024') || dropzoneCode.includes('10MB'), 'Must enforce 10MB limit');
    });

    it('implements drag-and-drop event handlers and file removal', () => {
      assert.ok(dropzoneCode.includes('onDragOver'));
      assert.ok(dropzoneCode.includes('onDrop'));
      assert.ok(dropzoneCode.includes('handleRemoveFile'));
    });
  });

  // =========================================================================
  // 2. AtsScoreGauge & AtsDimensionBreakdown Components
  // =========================================================================
  describe('2. Score Gauge & 7-Dimension Breakdown Components', () => {
    it('renders CircularProgressbar with color thresholds and match category', () => {
      assert.ok(scoreGaugeCode.includes('CircularProgressbar'));
      assert.ok(scoreGaugeCode.includes('matchCategory'));
      assert.ok(scoreGaugeCode.includes('Excellent Match'));
      assert.ok(scoreGaugeCode.includes('Strong Match'));
      assert.ok(scoreGaugeCode.includes('Moderate Match'));
      assert.ok(scoreGaugeCode.includes('Does not guarantee interview shortlisting'));
    });

    it('renders all 7 explainable scoring dimensions with exact weights', () => {
      assert.ok(breakdownCode.includes('Required Technical Skills'));
      assert.ok(breakdownCode.includes('30%'));
      assert.ok(breakdownCode.includes('Experience & Seniority Alignment'));
      assert.ok(breakdownCode.includes('20%'));
      assert.ok(breakdownCode.includes('Project Relevance & Practical Application'));
      assert.ok(breakdownCode.includes('15%'));
      assert.ok(breakdownCode.includes('Preferred & Nice-to-Have Skills'));
      assert.ok(breakdownCode.includes('10%'));
      assert.ok(breakdownCode.includes('Responsibilities & Domain Alignment'));
      assert.ok(breakdownCode.includes('10%'));
      assert.ok(breakdownCode.includes('ATS Keyword Coverage'));
      assert.ok(breakdownCode.includes('10%'));
      assert.ok(breakdownCode.includes('Education & Certifications'));
      assert.ok(breakdownCode.includes('5%'));
    });
  });

  // =========================================================================
  // 3. SkillGapTable & ResumeImprovementWorkspace Components
  // =========================================================================
  describe('3. Skill Gaps & Resume Improvement Workspace', () => {
    it('displays prioritized skill gaps with mandatory/preferred badges and practical activities', () => {
      assert.ok(gapTableCode.includes('mandatory'));
      assert.ok(gapTableCode.includes('preferred'));
      assert.ok(gapTableCode.includes('whyItMatters'));
      assert.ok(gapTableCode.includes('suggestedActivity'));
    });

    it('provides multi-tab workspace with original vs suggested diffs and copy to clipboard', () => {
      assert.ok(improvementCode.includes('summary'));
      assert.ok(improvementCode.includes('bullets'));
      assert.ok(improvementCode.includes('projects'));
      assert.ok(improvementCode.includes('keywords'));
      assert.ok(improvementCode.includes('copyToClipboard'));
      assert.ok(improvementCode.includes('actionVerb'));
      assert.ok(improvementCode.includes('status'));
    });
  });

  // =========================================================================
  // 4. CrossModuleBridgeBar Component
  // =========================================================================
  describe('4. CrossModuleBridgeBar Component', () => {
    it('provides direct bridges into Modules 1, 4, 5, and 6', () => {
      assert.ok(bridgeBarCode.includes('/interview'), 'Must bridge to Module 1 Interview');
      assert.ok(bridgeBarCode.includes('/coding'), 'Must bridge to Module 4 Live Coding');
      assert.ok(bridgeBarCode.includes('/recovery-plans'), 'Must bridge to Module 5 Recovery Plan');
      assert.ok(bridgeBarCode.includes('/company-interview'), 'Must bridge to Module 6 Company Simulation');
    });

    it('verifies receiving setup pages ingest location.state prefill payloads from ATS bridge', () => {
      assert.ok(step1SetupCode.includes('location.state?.prefillRole'), 'Step1Setup must prefill role from ATS');
      assert.ok(step1SetupCode.includes('location.state?.prefillSkills'), 'Step1Setup must prefill skills from ATS');
      assert.ok(companySetupCode.includes('location.state?.prefillRole'), 'CompanyInterviewSetup must prefill role from ATS');
      assert.ok(companySetupCode.includes('location.state?.prefillCompany'), 'CompanyInterviewSetup must prefill company from ATS');
      assert.ok(codingSetupCode.includes('location.state?.prefillCategory'), 'CodingSetup must prefill category from ATS');
      assert.ok(recoveryListCode.includes('atsBridgeData'), 'RecoveryPlansListPage must display active ATS bridge banner');
    });
  });

  // =========================================================================
  // 5. Pages, Routing & Barrel Registries
  // =========================================================================
  describe('5. Pages, Routing & Barrel Registries', () => {
    it('registers all ATS components in component barrel registry', () => {
      assert.ok(atsBarrelCode.includes('ResumeUploadDropzone'));
      assert.ok(atsBarrelCode.includes('AtsScoreGauge'));
      assert.ok(atsBarrelCode.includes('AtsDimensionBreakdown'));
      assert.ok(atsBarrelCode.includes('SkillGapTable'));
      assert.ok(atsBarrelCode.includes('ResumeImprovementWorkspace'));
      assert.ok(atsBarrelCode.includes('CrossModuleBridgeBar'));

      assert.ok(componentsRegCode.includes('ResumeUploadDropzone'));
      assert.ok(componentsRegCode.includes('AtsScoreGauge'));
    });

    it('registers all ATS pages in page barrel registry', () => {
      assert.ok(pagesRegCode.includes('AtsDashboard'));
      assert.ok(pagesRegCode.includes('AtsSetupPage'));
      assert.ok(pagesRegCode.includes('AtsAnalysisReport'));
      assert.ok(pagesRegCode.includes('AtsHistoryPage'));
    });

    it('registers /ats routes in App.jsx', () => {
      assert.ok(appCode.includes("path='/ats'"));
      assert.ok(appCode.includes("path='/ats/new'"));
      assert.ok(appCode.includes("path='/ats/analysis/:id'"));
      assert.ok(appCode.includes("path='/ats/history'"));
    });

    it('adds ATS Intelligence navigation pill and user dropdown link in Navbar.jsx', () => {
      assert.ok(navbarCode.includes('/ats'));
      assert.ok(navbarCode.includes('isAtsActive'));
      assert.ok(navbarCode.includes('ATS Intelligence'));
      assert.ok(navbarCode.includes('/ats/new'));
      assert.ok(navbarCode.includes('New ATS Match'));
      assert.ok(navbarCode.includes('/ats/history'));
      assert.ok(navbarCode.includes('ATS Analyses'));
    });
  });
});
