import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Prepper AI — Module 4: Live Coding Interview Frontend Test Suite', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(__dirname, '..');

  const navbarPath = path.resolve(frontendRoot, 'src/components/Navbar.jsx');
  const appPath = path.resolve(frontendRoot, 'src/App.jsx');
  const codingSetupPath = path.resolve(frontendRoot, 'src/pages/CodingSetup.jsx');
  const codingSessionPath = path.resolve(frontendRoot, 'src/pages/CodingSessionPage.jsx');
  const step1Path = path.resolve(frontendRoot, 'src/pages/Step1Setup.jsx');
  const step2Path = path.resolve(frontendRoot, 'src/pages/Step2Interview.jsx');
  const step3Path = path.resolve(frontendRoot, 'src/pages/Step3Report.jsx');
  const workspacePath = path.resolve(frontendRoot, 'src/components/coding/CodingWorkspace.jsx');
  const reportSectionPath = path.resolve(frontendRoot, 'src/components/coding/CodingReportSection.jsx');

  const navbarCode = fs.readFileSync(navbarPath, 'utf8');
  const appCode = fs.readFileSync(appPath, 'utf8');
  const codingSetupCode = fs.readFileSync(codingSetupPath, 'utf8');
  const codingSessionCode = fs.readFileSync(codingSessionPath, 'utf8');
  const step1Code = fs.readFileSync(step1Path, 'utf8');
  const step2Code = fs.readFileSync(step2Path, 'utf8');
  const step3Code = fs.readFileSync(step3Path, 'utf8');
  const workspaceCode = fs.readFileSync(workspacePath, 'utf8');
  const reportSectionCode = fs.readFileSync(reportSectionPath, 'utf8');

  // =========================================================================
  // 1. Navigation & Route Architecture Separation
  // =========================================================================
  describe('1. Navigation & Route Architecture Separation', () => {
    it('should include dedicated Live Coding navigation pill in Navbar (similar to Cross-Exam)', () => {
      assert.ok(
        navbarCode.includes('to="/coding"'),
        'Navbar must provide a dedicated navigation link to /coding'
      );
      assert.ok(
        navbarCode.includes('Live Coding'),
        'Navbar must render Live Coding navigation title'
      );
    });

    it('should register /coding and /coding/:sessionId routes in App.jsx', () => {
      assert.ok(appCode.includes('path=\'/coding\'') || appCode.includes('path="/coding"'), 'App.jsx must register /coding route');
      assert.ok(appCode.includes('/coding/:sessionId'), 'App.jsx must register /coding/:sessionId route');
    });

    it('should keep standard /interview page clean for conceptual interviews', () => {
      assert.ok(!step1Code.includes('<option value="Coding">'), 'Step1Setup should not offer coding in standard dropdown');
      assert.ok(step2Code.includes('useQuestionSpeech'), 'Step2Interview must preserve speech controller for conceptual interviews');
    });
  });

  // =========================================================================
  // 2. Dedicated Coding Setup Page (Question Count, Time Limit, Credit System)
  // =========================================================================
  describe('2. Dedicated Coding Setup Page Features', () => {
    it('should support choosing how many questions candidate wants (1 to 5)', () => {
      assert.ok(codingSetupCode.includes('questionCount'), 'CodingSetup must manage question count state');
      assert.ok(codingSetupCode.includes('Number of Coding Problems'), 'Must display question count selector');
    });

    it('should support session duration / time limit selector', () => {
      assert.ok(codingSetupCode.includes('durationMinutes'), 'CodingSetup must manage durationMinutes state');
      assert.ok(codingSetupCode.includes('Session Time Limit'), 'Must provide session duration selector');
    });

    it('should implement dynamic credit calculation and balance verification', () => {
      assert.ok(codingSetupCode.includes('requiredCredits'), 'Must calculate required credits dynamically');
      assert.ok(codingSetupCode.includes('hasSufficientCredits'), 'Must verify candidate credit balance');
      assert.ok(codingSetupCode.includes('/pricing'), 'Must link to /pricing if credits are insufficient');
    });

    it('should dispatch interviewType = coding to generateQuestions endpoint', () => {
      assert.ok(
        codingSetupCode.includes('interviewType: \'coding\'') || codingSetupCode.includes('interviewType: "coding"'),
        'Must specify interviewType: coding in API payload'
      );
      assert.ok(codingSetupCode.includes('/api/interview/generateQuestions'), 'Must call generateQuestions endpoint');
    });
  });

  // =========================================================================
  // 3. Interactive Coding Workspace & Monaco Editor
  // =========================================================================
  describe('3. Interactive Coding Workspace & Monaco Editor', () => {
    it('should import and embed @monaco-editor/react Editor', () => {
      assert.ok(workspaceCode.includes('from \'@monaco-editor/react\''), 'Must import Editor from @monaco-editor/react');
      assert.ok(workspaceCode.includes('<Editor'), 'Must render Monaco Editor component');
      assert.ok(workspaceCode.includes('theme="vs-dark"'), 'Must configure vs-dark theme for consistent design');
    });

    it('should support core languages: C, C++, Python, Java, JavaScript, TypeScript, Go', () => {
      assert.ok(workspaceCode.includes('javascript'), 'Must support JavaScript');
      assert.ok(workspaceCode.includes('python'), 'Must support Python');
      assert.ok(workspaceCode.includes('cpp'), 'Must support C++');
      assert.ok(workspaceCode.includes('java'), 'Must support Java');
      assert.ok(workspaceCode.includes('c'), 'Must support C');
      assert.ok(workspaceCode.includes('typescript'), 'Must support TypeScript');
      assert.ok(workspaceCode.includes('go'), 'Must support Go');
    });

    it('should support live session timer in top bar when time limit is configured', () => {
      assert.ok(workspaceCode.includes('timeLeft'), 'Must manage session countdown timer');
      assert.ok(workspaceCode.includes('formatMMSS'), 'Must format time in MM:SS display');
    });

    it('should provide Run Code, Run Sample Tests, and Submit Solution execution triggers', () => {
      assert.ok(workspaceCode.includes('handleRunCode'), 'Must implement handleRunCode handler');
      assert.ok(workspaceCode.includes('handleFinalSubmit'), 'Must implement handleFinalSubmit handler');
      assert.ok(workspaceCode.includes('/api/coding/run'), 'Must call /api/coding/run endpoint');
      assert.ok(workspaceCode.includes('/api/coding/submit'), 'Must call /api/coding/submit endpoint');
    });

    it('should provide custom input toggle for standard input debugging', () => {
      assert.ok(workspaceCode.includes('useCustomInput'), 'Must track custom input state');
      assert.ok(workspaceCode.includes('Custom Input'), 'Must render custom input checkbox label');
    });

    it('should mount CodingWorkspace in CodingSessionPage.jsx', () => {
      assert.ok(codingSessionCode.includes('<CodingWorkspace'), 'CodingSessionPage must render CodingWorkspace');
      assert.ok(codingSessionCode.includes('/api/interview/finish'), 'Must support finishing coding session');
    });
  });

  // =========================================================================
  // 4. Report Integration & Security Masking
  // =========================================================================
  describe('4. Final Report Integration & Security Masking', () => {
    it('should embed CodingReportSection in Step3Report.jsx', () => {
      assert.ok(step3Code.includes('CodingReportSection'), 'Step3Report must import and render CodingReportSection');
    });

    it('should display aggregate coding metrics: pass rate, execution time, and memory overhead', () => {
      assert.ok(reportSectionCode.includes('Test Pass Rate'), 'Must show Test Pass Rate metric');
      assert.ok(reportSectionCode.includes('Peak Execution Time'), 'Must show Peak Execution Time metric');
      assert.ok(reportSectionCode.includes('Memory Overhead'), 'Must show Memory Overhead metric');
      assert.ok(reportSectionCode.includes('Security Isolation'), 'Must show Security Isolation badge');
    });

    it('should display submitted code with copy functionality', () => {
      assert.ok(reportSectionCode.includes('handleCopy'), 'Must provide copy button for submitted source code');
    });

    it('should mask hidden test case details in test verification tab', () => {
      assert.ok(
        reportSectionCode.includes('Hidden Test Case') || reportSectionCode.includes('test.isHidden'),
        'Must handle hidden test cases distinctly from visible cases'
      );
      assert.ok(
        reportSectionCode.includes('masked to preserve evaluation security integrity'),
        'Must display security masking notice for hidden test cases'
      );
    });

    it('should display AI code evaluation: time complexity, space complexity, and suggestions', () => {
      assert.ok(reportSectionCode.includes('Time Big-O'), 'Must display time complexity analysis');
      assert.ok(reportSectionCode.includes('Space Big-O'), 'Must display space complexity analysis');
      assert.ok(reportSectionCode.includes('Optimization Suggestions'), 'Must display actionable optimization suggestions');
    });
  });

  // =========================================================================
  // 5. Resilient Production Error & 503 Handling
  // =========================================================================
  describe('5. Resilient Production Error & 503 Handling', () => {
    it('should handle HTTP 503 execution unavailable state gracefully without crashing', () => {
      assert.ok(
        workspaceCode.includes('err.response?.status === 503') || workspaceCode.includes('isUnavailable'),
        'CodingWorkspace must explicitly inspect HTTP 503 status'
      );
      assert.ok(
        workspaceCode.includes('Code execution is temporarily unavailable') ||
        workspaceCode.includes('Code Execution Temporarily Unavailable'),
        'Must display user-facing message that code execution is temporarily unavailable'
      );
    });

    it('should preserve Monaco Editor functionality when execution engine is unavailable', () => {
      assert.ok(
        workspaceCode.includes('<Editor') && workspaceCode.includes('onChange={handleCodeChange}'),
        'Monaco Editor must remain active and editable during execution outage'
      );
      assert.ok(
        workspaceCode.includes('unavailableMessage') || workspaceCode.includes('Execution Unavailable (503)'),
        'Must render structured unavailable status in test results tab rather than false success'
      );
    });
  });

  // =========================================================================
  // 6. Fully Resizable Workspace Panels & Splitters
  // =========================================================================
  describe('6. Fully Resizable Workspace Panels & Splitters', () => {
    it('should provide horizontal draggable splitter to resize problem and editor panels', () => {
      assert.ok(
        workspaceCode.includes('cursor-col-resize') && workspaceCode.includes('leftPanelPercent'),
        'CodingWorkspace must provide horizontal draggable splitter with cursor-col-resize and leftPanelPercent state'
      );
      assert.ok(
        workspaceCode.includes('prepper_coding_left_panel_width'),
        'Must persist candidate custom left panel width to localStorage'
      );
    });

    it('should provide vertical draggable splitter to resize Monaco editor and console drawer', () => {
      assert.ok(
        workspaceCode.includes('cursor-row-resize') && workspaceCode.includes('drawerHeight'),
        'CodingWorkspace must provide vertical draggable splitter with cursor-row-resize and drawerHeight state'
      );
      assert.ok(
        workspaceCode.includes('prepper_coding_drawer_height'),
        'Must persist candidate custom console drawer height to localStorage'
      );
    });

    it('should support double-click to reset panels and drawer collapse toggle', () => {
      assert.ok(
        workspaceCode.includes('onDoubleClick') && workspaceCode.includes('setLeftPanelPercent(42)'),
        'Must support double-click to reset panel split to default 42%'
      );
      assert.ok(
        workspaceCode.includes('isDrawerCollapsed'),
        'Must support collapsing and expanding the bottom console drawer'
      );
    });
  });
});
