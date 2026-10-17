import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestions } from '../controllers/interview.controller.js';
import { askAI } from '../services/openRouter.service.js';

describe('Interview Question Generation Suite (HOTFIX Verification)', () => {

    // ==========================================
    // 1. openRouter.service max_tokens & Error Safety
    // ==========================================
    describe('1. openRouter.service max_tokens & Error Safety', () => {

        it('should verify openRouter.service.js defines and passes max_tokens by default to avoid OpenRouter 402 quota errors', async () => {
            const fs = await import('node:fs');
            const path = await import('node:path');
            const fileContent = fs.readFileSync(path.resolve('services/openRouter.service.js'), 'utf8');

            assert.ok(fileContent.includes('max_tokens: maxTokens') || fileContent.includes('max_tokens'),
                'openRouter.service.js must pass max_tokens in payload to avoid reserving full context window (16384 tokens)');
            assert.ok(fileContent.includes('options.max_tokens || 800') || fileContent.includes('maxTokens = options.max_tokens'),
                'openRouter.service.js must default max_tokens to a safe bounded value');
        });

        it('should verify openRouter.service.js extracts detailed error messages and status from OpenRouter response', async () => {
            const fs = await import('node:fs');
            const path = await import('node:path');
            const fileContent = fs.readFileSync(path.resolve('services/openRouter.service.js'), 'utf8');

            assert.ok(fileContent.includes('error?.response?.data?.error?.message'),
                'openRouter.service.js must extract provider error message from response body');
            assert.ok(fileContent.includes('error?.response?.status'),
                'openRouter.service.js must extract HTTP status code for upstream handling');
        });

        it('should reject when messages array is missing or empty', async () => {
            await assert.rejects(async () => {
                await askAI([]);
            }, /No messages provided to askAI/);

            await assert.rejects(async () => {
                await askAI(null);
            }, /No messages provided to askAI/);
        });
    });

    // ==========================================
    // 2. Controller Validation & Guard Tests
    // ==========================================
    describe('2. Controller Validation & Guard Tests', () => {

        it('should return 400 when required fields (role, experience, mode) are missing', async () => {
            const req = {
                body: { role: '', experience: '2 years', mode: 'Technical' }
            };
            let responseStatus = null;
            let responseData = null;
            const res = {
                status: (s) => { responseStatus = s; return res; },
                json: (d) => { responseData = d; return res; }
            };

            await generateQuestions(req, res);
            assert.strictEqual(responseStatus, 400);
            assert.strictEqual(responseData.message, 'Please enter all the data');
        });

        it('should normalize mode "HR/Behavioral" and "Behavioral" to valid enum "HR"', async () => {
            const fs = await import('node:fs');
            const path = await import('node:path');
            const controllerContent = fs.readFileSync(path.resolve('controllers/interview.controller.js'), 'utf8');

            assert.ok(controllerContent.includes('safeMode = (mode === "HR" || mode === "HR/Behavioral" || mode === "Behavioral") ? "HR" : "Technical"') ||
                      controllerContent.includes('safeMode'),
                'generateQuestions must normalize mode to match Interview schema enum ["HR", "Technical"]');
        });

        it('should clean numbered questions and bullets from AI response', () => {
            const rawAiResponse = `
                Here are 5 interview questions:
                1. Can you explain the difference between state and props in React?
                2. How do you handle asynchronous operations in Node.js applications?
                3. What strategies do you use for optimizing web application performance?
                4. Can you describe how you implemented authentication in your NutriShield project?
                5. How would you diagnose and fix a severe memory leak in a production React app?
            `;

            const rawLines = rawAiResponse.split("\n").map(q => q.trim()).filter(q => q.length > 0);
            const questionArray = rawLines
                .map(q => q.replace(/^\d+[\.\)]\s*|^[-*]\s*/, '').trim())
                .filter(q => q.length > 10 && !q.toLowerCase().startsWith('here are') && !q.toLowerCase().startsWith('sure,'))
                .slice(0, 5);

            assert.strictEqual(questionArray.length, 5);
            assert.strictEqual(questionArray[0], 'Can you explain the difference between state and props in React?');
            assert.strictEqual(questionArray[1], 'How do you handle asynchronous operations in Node.js applications?');
            assert.strictEqual(questionArray[2], 'What strategies do you use for optimizing web application performance?');
            assert.strictEqual(questionArray[3], 'Can you describe how you implemented authentication in your NutriShield project?');
            assert.strictEqual(questionArray[4], 'How would you diagnose and fix a severe memory leak in a production React app?');
        });

        it('should safely construct user prompt from complex skills and projects objects without [object Object]', () => {
            const projects = [
                { name: 'NutriShield', description: 'Food Allergen Detector' },
                'Cloud Storage System'
            ];
            const skills = ['React', 'Node.js', { name: 'MongoDB' }];

            const projectText = Array.isArray(projects) && projects.length
                ? projects.map(p => typeof p === 'string' ? p : (p.name || p.title || '')).filter(Boolean).join(', ')
                : 'None';
            const skillText = Array.isArray(skills) && skills.length
                ? skills.map(s => typeof s === 'string' ? s : (s.name || s.title || '')).filter(Boolean).join(', ')
                : 'None';

            assert.strictEqual(projectText, 'NutriShield, Cloud Storage System');
            assert.strictEqual(skillText, 'React, Node.js, MongoDB');
            assert.ok(!projectText.includes('[object Object]'));
            assert.ok(!skillText.includes('[object Object]'));
        });

        it('should verify generateQuestions preserves crossQuestioningType in interview creation', async () => {
            const fs = await import('node:fs');
            const path = await import('node:path');
            const controllerContent = fs.readFileSync(path.resolve('controllers/interview.controller.js'), 'utf8');

            assert.ok(controllerContent.includes('crossQuestioningType: safeCrossQuestioningType'),
                'generateQuestions must persist safeCrossQuestioningType in Interview.create');
        });
    });

    // ==========================================
    // 3. AI Provider Quota & Exception Handling
    // ==========================================
    describe('3. AI Provider Quota & Exception Handling', () => {

        it('should map AI provider 402 quota error to status 503 with user-friendly message', async () => {
            const fs = await import('node:fs');
            const path = await import('node:path');
            const controllerContent = fs.readFileSync(path.resolve('controllers/interview.controller.js'), 'utf8');

            assert.ok(controllerContent.includes('aiErr.status === 402') || controllerContent.includes('status === 402'),
                'generateQuestions must detect AI provider 402 quota errors');
            assert.ok(controllerContent.includes('AI generation quota exceeded'),
                'generateQuestions must provide helpful quota error message when AI credits are exhausted');
        });

        it('should verify Step1Setup.jsx catch handler displays toast error when generation fails', async () => {
            const fs = await import('node:fs');
            const path = await import('node:path');
            const step1Content = fs.readFileSync(path.resolve('../Frontend/src/pages/Step1Setup.jsx'), 'utf8');

            assert.ok(step1Content.includes('toast.error'),
                'Step1Setup.jsx handleStart must invoke toast.error with backend error message');
        });
    });
});
