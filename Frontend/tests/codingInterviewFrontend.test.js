import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Prepper AI — Module 4: Live Coding Interview Frontend Test Suite', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const frontendRoot = path.resolve(__dirname, '..');

  const step1Path = path.resolve(frontendRoot, 'src/pages/Step1Setup.jsx');
  const step2Path = path.resolve(frontendRoot, 'src/pages/Step2Interview.jsx');
  const step3Path = path.resolve(frontendRoot, 'src/pages/Step3Report.jsx');
  const workspacePath = path.resolve(frontendRoot, 'src/components/coding/CodingWorkspace.jsx');
  const reportSectionPath = path.resolve(frontendRoot, 'src/components/coding/CodingReportSection.jsx');

  const step1Code = fs.readFileSync(step1Path, 'utf8');
  const step2Code = fs.readFileSync(step2Path, 'utf8');
  const step3Code = fs.readFileSync(step3Path, 'utf8');
  const workspaceCode = fs.readFileSync(workspacePath, 'utf8');
  const reportSectionCode = fs.readFileSync(reportSectionPath, 'utf8');

  // =========================================================================
  // 1. Setup Phase & Configuration Options
  // =========================================================================
  describe('1. Setup Phase & Coding Mode Configuration', () => {
    it('should include Live Coding Interview in mode dropdown', () => {
      assert.ok(
        step1Code.includes('<option value="Coding">Live Coding Interview</option>'),
        'Step1Setup must provide Live Coding Interview mode option'
      );
    });

    it('should expose language, category, and difficulty selectors when Coding mode is selected', () => {
      assert.ok(step1Code.includes('mode === \'Coding\''), 'Must conditionally render coding configuration');
      assert.ok(step1Code.includes('codingLanguage'), 'Must store selected coding language in state');
      assert.ok(step1Code.includes('codingCategory'), 'Must store selected category in state');
      assert.ok(step1Code.includes('codingDifficulty'), 'Must store selected difficulty in state');
    });

    it('should dispatch interviewType = coding in generateQuestions payload', () => {
      assert.ok(
        step1Code.includes('interviewType: mode === \'Coding\' ? \'coding\' : \'conceptual\''),
        'Must specify interviewType in generateQuestions request payload'
      );
    });
  });

  // =========================================================================
  // 2. Interactive Coding Workspace & Monaco Editor
  // =========================================================================
  describe('2. Interactive Coding Workspace & Monaco Editor', () => {
    it('should import and embed @monaco-editor/react Editor', () => {
      assert.ok(workspaceCode.includes('from \'@monaco-editor/react\''), 'Must import Editor from @monaco-editor/react');
      assert.ok(workspaceCode.includes('<Editor'), 'Must render Monaco Editor component');
      assert.ok(workspaceCode.includes('theme="vs-dark"'), 'Must configure vs-dark theme for consistent design');
    });

    it('should support core languages: JavaScript, Python, C++, Java, TypeScript, Go', () => {
      assert.ok(workspaceCode.includes('javascript'), 'Must support JavaScript');
      assert.ok(workspaceCode.includes('python'), 'Must support Python');
      assert.ok(workspaceCode.includes('cpp'), 'Must support C++');
      assert.ok(workspaceCode.includes('java'), 'Must support Java');
      assert.ok(workspaceCode.includes('typescript'), 'Must support TypeScript');
      assert.ok(workspaceCode.includes('go'), 'Must support Go');
    });

    it('should provide Run Code and Submit Solution execution triggers', () => {
      assert.ok(workspaceCode.includes('handleRunCode'), 'Must implement handleRunCode handler');
      assert.ok(workspaceCode.includes('handleFinalSubmit'), 'Must implement handleFinalSubmit handler');
      assert.ok(workspaceCode.includes('/api/coding/run'), 'Must call /api/coding/run endpoint');
      assert.ok(workspaceCode.includes('/api/coding/submit'), 'Must call /api/coding/submit endpoint');
    });

    it('should provide custom input toggle for standard input debugging', () => {
      assert.ok(workspaceCode.includes('useCustomInput'), 'Must track custom input state');
      assert.ok(workspaceCode.includes('Custom Input'), 'Must render custom input checkbox label');
    });

    it('should render test case tabs, console output, and AI evaluation drawer', () => {
      assert.ok(workspaceCode.includes('activeTab === \'tests\''), 'Must render test cases tab');
      assert.ok(workspaceCode.includes('activeTab === \'console\''), 'Must render console output tab');
      assert.ok(workspaceCode.includes('activeTab === \'ai\''), 'Must render AI evaluation tab');
    });
  });

  // =========================================================================
  // 3. Interview Session & Routing Progression
  // =========================================================================
  describe('3. Interview Session & Progression', () => {
    it('should render CodingWorkspace when interviewType is coding', () => {
      assert.ok(
        step2Code.includes('isCodingMode'),
        'Step2Interview must determine whether current session is a coding interview'
      );
      assert.ok(
        step2Code.includes('<CodingWorkspace'),
        'Step2Interview must mount CodingWorkspace for coding interviews'
      );
    });

    it('should preserve standard conceptual interview when interviewType is not coding', () => {
      assert.ok(step2Code.includes('useQuestionSpeech'), 'Must preserve speech controller for conceptual interviews');
      assert.ok(step2Code.includes('useSpeechRecognition'), 'Must preserve speech recognition');
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
});
