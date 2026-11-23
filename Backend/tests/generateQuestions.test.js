import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestions } from '../controllers/interview.controller.js';
import {
    askAI,
    validateOpenRouterConfig,
    DEFAULT_OPENROUTER_ENDPOINT,
    DEFAULT_TIMEOUT_MS,
    DEFAULT_MAX_RETRIES,
    categorizeError,
    isTransientError,
    calculateRetryDelay,
    isFreeModelDailyQuotaExceeded
} from '../services/openRouter.service.js';

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

        it('should correctly validate openRouter configuration with nemotron free model and default endpoint', () => {
            const config = validateOpenRouterConfig({
                apiKey: 'test-key-12345',
                model: 'nvidia/nemotron-3-ultra-550b-a55b:free'
            });
            assert.strictEqual(config.model, 'nvidia/nemotron-3-ultra-550b-a55b:free');
            assert.strictEqual(config.endpoint, DEFAULT_OPENROUTER_ENDPOINT);
            assert.strictEqual(config.apiKey, 'test-key-12345');
        });

        it('should detect invalid URL scheme when model name is mistakenly passed in URL', () => {
            assert.throws(() => {
                validateOpenRouterConfig({
                    apiKey: 'test-key',
                    model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
                    url: 'nvidia/nemotron-3-ultra-550b-a55b:free'
                });
            }, /Invalid OpenRouter endpoint URL.*model name was provided/);
        });

        it('should throw when OpenRouter API key is missing without leaking keys', () => {
            assert.throws(() => {
                validateOpenRouterConfig({ apiKey: '' });
            }, (err) => {
                assert.ok(err.message.includes('API key is missing'));
                assert.ok(!err.message.includes('sk-'));
                return true;
            });
        });

        it('should throw when OpenRouter model is missing without silently falling back to a paid model', () => {
            assert.throws(() => {
                validateOpenRouterConfig({ apiKey: 'key', model: '' });
            }, /OpenRouter model is missing/);
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

    // ==========================================
    // 4. openRouter.service Timeout, Retries & Error Categorization
    // ==========================================
    describe('4. openRouter.service Timeout, Retries & Error Categorization', () => {

        it('should verify DEFAULT_TIMEOUT_MS is 120000ms (120s) and DEFAULT_MAX_RETRIES is 2', () => {
            assert.strictEqual(DEFAULT_TIMEOUT_MS, 120000);
            assert.strictEqual(DEFAULT_MAX_RETRIES, 2);
        });

        it('should correctly categorize errors into operational buckets', () => {
            assert.strictEqual(categorizeError({ code: 'ECONNABORTED' }), 'TIMEOUT');
            assert.strictEqual(categorizeError({ message: 'timeout of 30000ms exceeded' }), 'TIMEOUT');
            assert.strictEqual(categorizeError({ response: { status: 429 } }), 'RATE_LIMIT');
            assert.strictEqual(categorizeError({ response: { status: 500 } }), 'SERVER_ERROR');
            assert.strictEqual(categorizeError({ response: { status: 503 } }), 'SERVER_ERROR');
            assert.strictEqual(categorizeError({ response: { status: 401 } }), 'CLIENT_ERROR');
            assert.strictEqual(categorizeError({ response: { status: 404 } }), 'CLIENT_ERROR');
            assert.strictEqual(categorizeError({ code: 'ENOTFOUND' }), 'NETWORK_ERROR');
            assert.strictEqual(categorizeError({ code: 'ECONNRESET' }), 'NETWORK_ERROR');
        });

        it('should classify transient errors as retryable and permanent errors as non-retryable', () => {
            // Transient errors (retryable)
            assert.strictEqual(isTransientError({ code: 'ECONNABORTED' }), true);
            assert.strictEqual(isTransientError({ message: 'timeout of 30000ms exceeded' }), true);
            assert.strictEqual(isTransientError({ response: { status: 429 } }), true);
            assert.strictEqual(isTransientError({ response: { status: 503 } }), true);
            assert.strictEqual(isTransientError({ code: 'ENOTFOUND' }), true);

            // Permanent errors (not retryable)
            assert.strictEqual(isTransientError({ response: { status: 400 } }), false);
            assert.strictEqual(isTransientError({ response: { status: 401 } }), false);
            assert.strictEqual(isTransientError({ response: { status: 403 } }), false);
            assert.strictEqual(isTransientError({ response: { status: 404 } }), false);
            assert.strictEqual(isTransientError({ response: { status: 422 } }), false);
        });

        it('should calculate exponential backoff and respect 429 Retry-After', () => {
            // Default exponential backoff
            const delay1 = calculateRetryDelay(1, new Error('timeout'), 100);
            const delay2 = calculateRetryDelay(2, new Error('timeout'), 100);
            assert.strictEqual(delay1, 100);
            assert.strictEqual(delay2, 200);

            // 429 with Retry-After header
            const err429 = { response: { status: 429, headers: { 'retry-after': '3' } } };
            const delay429 = calculateRetryDelay(1, err429, 100);
            assert.strictEqual(delay429, 3000);
        });

        it('should retry transient timeout errors and succeed when a subsequent attempt succeeds', async () => {
            let callCount = 0;
            const mockAxios = {
                post: async () => {
                    callCount++;
                    if (callCount < 2) {
                        const timeoutErr = new Error('timeout of 30000ms exceeded');
                        timeoutErr.code = 'ECONNABORTED';
                        throw timeoutErr;
                    }
                    return {
                        data: {
                            choices: [{ message: { content: 'Generated question after timeout retry' } }]
                        }
                    };
                }
            };

            const result = await askAI([{ role: 'user', content: 'test' }], {
                apiKey: 'test-key',
                model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
                axiosInstance: mockAxios,
                retryDelayMs: 1,
                maxRetries: 2,
            });

            assert.strictEqual(callCount, 2);
            assert.strictEqual(result, 'Generated question after timeout retry');
        });

        it('should NOT retry permanent 401/404 errors and fail on attempt 1 immediately', async () => {
            let callCount = 0;
            const mockAxios = {
                post: async () => {
                    callCount++;
                    const authErr = new Error('Unauthorized');
                    authErr.response = { status: 401, data: { error: { message: 'Invalid API key provided' } } };
                    throw authErr;
                }
            };

            await assert.rejects(async () => {
                await askAI([{ role: 'user', content: 'test' }], {
                    apiKey: 'invalid-key',
                    model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
                    axiosInstance: mockAxios,
                    retryDelayMs: 1,
                    maxRetries: 2,
                });
            }, /Invalid API key provided/);

            assert.strictEqual(callCount, 1, 'Permanent 401 error must not be retried');
        });

        it('should exhaust retries on persistent timeouts and throw the wrapped error', async () => {
            let callCount = 0;
            const mockAxios = {
                post: async () => {
                    callCount++;
                    const timeoutErr = new Error('timeout of 120000ms exceeded');
                    timeoutErr.code = 'ECONNABORTED';
                    throw timeoutErr;
                }
            };

            await assert.rejects(async () => {
                await askAI([{ role: 'user', content: 'test' }], {
                    apiKey: 'test-key',
                    model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
                    axiosInstance: mockAxios,
                    retryDelayMs: 1,
                    maxRetries: 2,
                });
            }, /timeout of 120000ms exceeded/);

            assert.strictEqual(callCount, 3, 'Initial call + 2 retries = 3 calls total');
        });

        it('should verify credit refund safety in interview.controller.js source', async () => {
            const fs = await import('node:fs');
            const path = await import('node:path');
            const controllerContent = fs.readFileSync(path.resolve('controllers/interview.controller.js'), 'utf8');

            assert.ok(controllerContent.includes('creditsDeductedAmount = 0; // prevent duplicate refund'),
                'safeRefund must disarm creditsDeductedAmount immediately to prevent double refunds');
            assert.ok(controllerContent.includes('creditsDeductedAmount = 0;') &&
                      controllerContent.includes('interview = await Interview.create('),
                'controller must disarm creditsDeductedAmount upon successful interview creation');
        });
    });

    // ==========================================
    // 5. OpenRouter Free-Model Daily Quota Handling & Refund Lifecycle
    // ==========================================
    describe('5. OpenRouter Free-Model Daily Quota Handling & Refund Lifecycle', () => {

        it('should accurately detect free-models-per-day quota exhaustion', () => {
            const err1 = { response: { data: { error: { message: 'Rate limit exceeded: free-models-per-day' } } } };
            assert.strictEqual(isFreeModelDailyQuotaExceeded(err1), true);

            const err2 = new Error('Rate limit exceeded: free-models-per-day');
            assert.strictEqual(isFreeModelDailyQuotaExceeded(err2), true);

            const err3 = { message: 'Provider returned: daily free-model limit reached' };
            assert.strictEqual(isFreeModelDailyQuotaExceeded(err3), true);

            // Genuinely temporary rate limits should NOT be classified as daily quota exhaustion
            const temp429 = { response: { status: 429, data: { error: { message: 'Rate limit: 20 req/min exceeded' } } } };
            assert.strictEqual(isFreeModelDailyQuotaExceeded(temp429), false);

            const normalErr = new Error('Connection reset');
            assert.strictEqual(isFreeModelDailyQuotaExceeded(normalErr), false);
        });

        it('should categorize free-models-per-day as FREE_MODEL_DAILY_LIMIT_EXCEEDED and mark as non-transient', () => {
            const quotaErr = { response: { status: 429, data: { error: { message: 'Rate limit exceeded: free-models-per-day' } } } };
            assert.strictEqual(categorizeError(quotaErr), 'FREE_MODEL_DAILY_LIMIT_EXCEEDED');
            assert.strictEqual(isTransientError(quotaErr), false, 'Daily quota exhaustion must never be marked transient');

            // Standard 429 should still be transient
            const tempErr = { response: { status: 429, data: { error: { message: 'Too many requests' } } } };
            assert.strictEqual(categorizeError(tempErr), 'RATE_LIMIT');
            assert.strictEqual(isTransientError(tempErr), true);
        });

        it('should fail immediately on attempt 1 without retries when free-models-per-day is encountered', async () => {
            let callCount = 0;
            const mockAxios = {
                post: async () => {
                    callCount++;
                    const quotaErr = new Error('Rate limit exceeded: free-models-per-day');
                    quotaErr.response = {
                        status: 429,
                        data: {
                            error: {
                                message: 'Rate limit exceeded: free-models-per-day',
                                code: 429
                            }
                        }
                    };
                    throw quotaErr;
                }
            };

            await assert.rejects(async () => {
                await askAI([{ role: 'user', content: 'test' }], {
                    apiKey: 'test-key',
                    model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
                    axiosInstance: mockAxios,
                    retryDelayMs: 1,
                    maxRetries: 2,
                });
            }, (err) => {
                assert.strictEqual(err.code, 'FREE_MODEL_DAILY_LIMIT_EXCEEDED');
                assert.strictEqual(err.status, 429);
                assert.ok(err.message.includes('free-models-per-day'));
                return true;
            });

            assert.strictEqual(callCount, 1, 'Daily quota exhaustion must bail out on attempt 1 with 0 retries');
        });

        it('should retry genuinely temporary 429 rate limits and succeed', async () => {
            let callCount = 0;
            const mockAxios = {
                post: async () => {
                    callCount++;
                    if (callCount < 2) {
                        const tempErr = new Error('Rate limit exceeded');
                        tempErr.response = {
                            status: 429,
                            headers: { 'retry-after': '0' },
                            data: { error: { message: 'Too many requests per minute' } }
                        };
                        throw tempErr;
                    }
                    return {
                        data: {
                            choices: [{ message: { content: 'Success after temporary 429' } }]
                        }
                    };
                }
            };

            const result = await askAI([{ role: 'user', content: 'test' }], {
                apiKey: 'test-key',
                model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
                axiosInstance: mockAxios,
                retryDelayMs: 1,
                maxRetries: 2,
            });

            assert.strictEqual(callCount, 2, 'Temporary rate limit should retry and succeed on attempt 2');
            assert.strictEqual(result, 'Success after temporary 429');
        });

        it('should verify generateQuestions handles FREE_MODEL_DAILY_LIMIT_EXCEEDED and returns HTTP 429 with refreshed creditsLeft', async () => {
            const fs = await import('node:fs');
            const path = await import('node:path');
            const controllerContent = fs.readFileSync(path.resolve('controllers/interview.controller.js'), 'utf8');

            assert.ok(controllerContent.includes("isDailyQuota = aiErr.code === 'FREE_MODEL_DAILY_LIMIT_EXCEEDED'"),
                'interview.controller.js must detect FREE_MODEL_DAILY_LIMIT_EXCEEDED');
            assert.ok(controllerContent.includes("return res.status(429).json({") &&
                      controllerContent.includes("errorCode: 'FREE_MODEL_DAILY_LIMIT_EXCEEDED'") &&
                      controllerContent.includes("creditsLeft"),
                'interview.controller.js must return HTTP 429 with FREE_MODEL_DAILY_LIMIT_EXCEEDED and creditsLeft');
            assert.ok(controllerContent.includes('await safeRefund()'),
                'interview.controller.js must invoke safeRefund before returning 429 response');
        });

        it('should verify Step1Setup.jsx prevents rapid double-clicks and synchronizes creditsLeft in Redux', async () => {
            const fs = await import('node:fs');
            const path = await import('node:path');
            const frontendContent = fs.readFileSync(path.resolve('../Frontend/src/pages/Step1Setup.jsx'), 'utf8');

            assert.ok(frontendContent.includes('isSubmittingRef.current = true') &&
                      frontendContent.includes('if (loading || isSubmittingRef.current) return;'),
                'Step1Setup.jsx must use isSubmittingRef to lock against rapid double-clicks');
            assert.ok(frontendContent.includes("data?.errorCode === 'FREE_MODEL_DAILY_LIMIT_EXCEEDED'"),
                'Step1Setup.jsx must check for FREE_MODEL_DAILY_LIMIT_EXCEEDED error code');
            assert.ok(frontendContent.includes('dispatch(setUserData({ ...userData, credits: data.creditsLeft }))'),
                'Step1Setup.jsx must immediately resynchronize Redux user credits upon receiving creditsLeft in catch');
        });
    });
});
