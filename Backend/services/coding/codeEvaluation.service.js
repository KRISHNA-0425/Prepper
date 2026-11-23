/**
 * @file codeEvaluation.service.js
 * AI-Powered Code Evaluation Engine.
 * Integrates with existing OpenRouter AI provider to generate evidence-based,
 * structured feedback on code correctness, algorithmic complexity, readability, and optimizations.
 */

import { askAI } from '../openRouter.service.js';

export class CodeEvaluationService {
  /**
   * Generates deterministic fallback evaluation when AI is unavailable or fails.
   */
  generateFallbackEvaluation({
    passedTestCases = 0,
    totalTestCases = 0,
    sourceCode = '',
    language = 'javascript',
    problem = {},
  }) {
    const passRate = totalTestCases > 0 ? (passedTestCases / totalTestCases) : 1;
    const correctnessScore = Math.round(passRate * 100);

    // Heuristic complexity analysis
    const hasNestedLoops = /(for|while|foreach)[\s\S]*?(for|while|foreach)/i.test(sourceCode);
    const hasSingleLoop = /(for|while|foreach|\.map|\.filter|\.reduce)/i.test(sourceCode);
    const estimatedTime = hasNestedLoops ? 'O(n²)' : hasSingleLoop ? 'O(n)' : 'O(1)';
    const estimatedSpace = sourceCode.includes('new Array') || sourceCode.includes('[]') || sourceCode.includes('{}') ? 'O(n)' : 'O(1)';

    const efficiencyScore = hasNestedLoops ? 65 : 85;
    const readabilityScore = sourceCode.length > 50 ? 80 : 70;
    const overallScore = Math.round((correctnessScore * 0.5) + (efficiencyScore * 0.3) + (readabilityScore * 0.2));

    const strengths = [];
    const weaknesses = [];
    const suggestions = [];

    if (passedTestCases > 0) {
      strengths.push(`Successfully passed ${passedTestCases} out of ${totalTestCases} test cases.`);
    }
    if (!hasNestedLoops) {
      strengths.push('Avoided quadratic nested iterations, maintaining linear or sub-linear operational bounds.');
    }

    if (passedTestCases < totalTestCases) {
      weaknesses.push(`Failed ${totalTestCases - passedTestCases} test cases, indicating possible unhandled edge cases or boundary conditions.`);
      suggestions.push('Review edge cases such as empty input structures, boundary indices, and extreme values.');
    } else {
      suggestions.push('Explore alternative data structures or standard library utilities to write more concise, idiomatic code.');
    }

    return {
      score: overallScore,
      correctness: correctnessScore,
      efficiency: efficiencyScore,
      readability: readabilityScore,
      approach: `Implementation using ${language} with an estimated time complexity of ${estimatedTime}.`,
      timeComplexity: estimatedTime,
      spaceComplexity: estimatedSpace,
      strengths: strengths.length > 0 ? strengths : ['Code successfully executed in the sandbox environment.'],
      weaknesses: weaknesses.length > 0 ? weaknesses : ['No critical defects identified.'],
      suggestions,
      overallFeedback: `The solution achieved a ${correctnessScore}% test case pass rate with an estimated ${estimatedTime} runtime complexity.`,
      status: 'completed',
    };
  }

  /**
   * Evaluates code using AI provider with structured JSON output and rigorous evidence alignment.
   */
  async evaluateSubmission({
    problem,
    sourceCode,
    language,
    passedTestCases,
    totalTestCases,
    testResults = [],
    candidateExplanation = '',
  }) {
    // 1. Prepare deterministic execution metrics for grounding
    const passRatePercent = totalTestCases > 0 ? Math.round((passedTestCases / totalTestCases) * 100) : 100;
    const hasFailures = passedTestCases < totalTestCases;
    const failureSummary = testResults
      .filter((r) => !r.passed)
      .slice(0, 3)
      .map((r) => `Test ${r.testCaseIndex}: ${r.statusDescription || 'Wrong Answer'} ${r.error ? `(${r.error})` : ''}`)
      .join('; ');

    const prompt = `You are a Principal Software Engineer and Algorithm Interviewer at a premier tech company.
Evaluate the candidate's coding interview solution based on deterministic sandbox execution metrics and the submitted code.

PROBLEM:
Title: ${problem?.title || 'Coding Challenge'}
Difficulty: ${problem?.difficulty || 'Medium'}
Category: ${problem?.category || 'Problem Solving'}
Description: ${problem?.description || ''}
Constraints: ${(problem?.constraints || []).join(', ')}
Optimal Expected Time: ${problem?.optimalTimeComplexity || 'O(n)'}
Optimal Expected Space: ${problem?.optimalSpaceComplexity || 'O(1)'}

CANDIDATE SUBMISSION:
Language: ${language}
Source Code:
\`\`\`${language}
${sourceCode}
\`\`\`

CANDIDATE EXPLANATION:
${candidateExplanation || 'No written explanation provided.'}

EXECUTION RESULTS (DETERMINISTIC GROUND TRUTH):
- Total Test Cases: ${totalTestCases}
- Passed: ${passedTestCases}
- Failed: ${totalTestCases - passedTestCases}
- Pass Rate: ${passRatePercent}%
${hasFailures ? `- Failures: ${failureSummary}` : '- All test cases passed!'}

INSTRUCTIONS:
1. Ground your correctness evaluation STRICTLY in the execution results. Never claim code passed if tests failed.
2. Analyze the actual time complexity (Big-O) and space complexity of the candidate's code.
3. Assess code readability, structure, variable naming, and idiomatic conventions for ${language}.
4. Provide constructive strengths, weaknesses, and concrete optimization advice.
5. You MUST return ONLY a valid JSON object matching the schema below. No markdown fences around the JSON, no intro text.

{
  "score": <number 0-100 overall score>,
  "correctness": <number 0-100, must correlate with ${passRatePercent}% pass rate>,
  "efficiency": <number 0-100 algorithmic efficiency>,
  "readability": <number 0-100 code quality and style>,
  "approach": "<1-2 sentence description of candidate's algorithmic approach>",
  "timeComplexity": "<Big-O notation, e.g. O(n) or O(n log n)>",
  "spaceComplexity": "<Big-O notation, e.g. O(1) or O(n)>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "suggestions": ["<actionable optimization 1>", "<actionable optimization 2>"],
  "overallFeedback": "<2-3 sentence balanced summary of the solution>"
}`;

    try {
      const messages = [
        { role: 'system', content: 'You are an expert technical interviewer. Output valid JSON only.' },
        { role: 'user', content: prompt },
      ];

      const rawAiResponse = await askAI(messages, { max_tokens: 1000, timeout: 35000 });
      let cleaned = (rawAiResponse || '').trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(cleaned);

      return {
        score: Math.max(0, Math.min(100, Number(parsed.score) || passRatePercent)),
        correctness: Math.max(0, Math.min(100, Number(parsed.correctness) || passRatePercent)),
        efficiency: Math.max(0, Math.min(100, Number(parsed.efficiency) || 75)),
        readability: Math.max(0, Math.min(100, Number(parsed.readability) || 75)),
        approach: String(parsed.approach || 'Algorithmic implementation').trim(),
        timeComplexity: String(parsed.timeComplexity || 'O(n)').trim(),
        spaceComplexity: String(parsed.spaceComplexity || 'O(1)').trim(),
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [],
        weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.map(String) : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.map(String) : [],
        overallFeedback: String(parsed.overallFeedback || '').trim(),
        status: 'completed',
      };
    } catch {
      // In case AI provider is rate limited, times out, or returns non-JSON, fallback cleanly
      return this.generateFallbackEvaluation({
        passedTestCases,
        totalTestCases,
        sourceCode,
        language,
        problem,
      });
    }
  }
}

export default new CodeEvaluationService();
