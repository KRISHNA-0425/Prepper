import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Interview from '../models/interview.model.js';
import { getMyInterviews, getInterviewReport } from '../controllers/interview.controller.js';

describe('Prepper AI — Separate Cross-Examination History from Normal Interview History Suite', () => {

    const userA = new mongoose.Types.ObjectId().toString();
    const userB = new mongoose.Types.ObjectId().toString();

    // ==========================================
    // 1. Classification & Exclusivity Invariants
    // ==========================================
    describe('1. Classification & Exclusivity Invariants', () => {
        const sampleRecords = [
            { _id: '1', userId: userA, role: 'Frontend Engineer', enableCrossQuestioning: false, status: 'Completed' },
            { _id: '2', userId: userA, role: 'Full Stack Dev', status: 'Completed' }, // legacy, field missing
            { _id: '3', userId: userA, role: 'Data Analyst', enableCrossQuestioning: null, status: 'Completed' }, // legacy, null
            { _id: '4', userId: userA, role: 'Backend Lead', enableCrossQuestioning: true, crossQuestioningType: 'Technical', status: 'Completed' },
            { _id: '5', userId: userA, role: 'Engineering Manager', enableCrossQuestioning: true, crossQuestioningType: 'Behavioral', status: 'Completed' },
            { _id: '6', userId: userB, role: 'Backend Engineer', enableCrossQuestioning: true, status: 'Completed' }, // other user
            { _id: '7', userId: userB, role: 'DevOps Engineer', enableCrossQuestioning: false, status: 'Completed' } // other user
        ];

        const matchesFilter = (doc, filter) => {
            if (filter.userId && doc.userId !== filter.userId) return false;
            if (filter.enableCrossQuestioning === true) {
                return doc.enableCrossQuestioning === true;
            }
            if (filter.$or) {
                return filter.$or.some(clause => {
                    if (clause.enableCrossQuestioning === false) return doc.enableCrossQuestioning === false;
                    if (clause.enableCrossQuestioning?.$exists === false) return doc.enableCrossQuestioning === undefined;
                    if (clause.enableCrossQuestioning === null) return doc.enableCrossQuestioning === null;
                    return false;
                });
            }
            return true;
        };

        it('should classify normal interviews and legacy records into Normal Interview History only', () => {
            const normalFilter = {
                userId: userA,
                $or: [
                    { enableCrossQuestioning: false },
                    { enableCrossQuestioning: { $exists: false } },
                    { enableCrossQuestioning: null }
                ]
            };

            const normalMatches = sampleRecords.filter(r => matchesFilter(r, normalFilter));
            assert.strictEqual(normalMatches.length, 3);
            assert.deepStrictEqual(normalMatches.map(r => r._id), ['1', '2', '3']);
        });

        it('should classify checkbox-enabled interviews into Cross-Examination History only', () => {
            const crossFilter = {
                userId: userA,
                enableCrossQuestioning: true
            };

            const crossMatches = sampleRecords.filter(r => matchesFilter(r, crossFilter));
            assert.strictEqual(crossMatches.length, 2);
            assert.deepStrictEqual(crossMatches.map(r => r._id), ['4', '5']);
            assert.strictEqual(crossMatches[0].crossQuestioningType, 'Technical');
            assert.strictEqual(crossMatches[1].crossQuestioningType, 'Behavioral');
        });

        it('should never duplicate any interview across both sections (strict disjointness)', () => {
            const normalFilter = {
                userId: userA,
                $or: [
                    { enableCrossQuestioning: false },
                    { enableCrossQuestioning: { $exists: false } },
                    { enableCrossQuestioning: null }
                ]
            };
            const crossFilter = {
                userId: userA,
                enableCrossQuestioning: true
            };

            const normalMatches = sampleRecords.filter(r => matchesFilter(r, normalFilter));
            const crossMatches = sampleRecords.filter(r => matchesFilter(r, crossFilter));

            const normalIds = new Set(normalMatches.map(r => r._id));
            const overlap = crossMatches.filter(r => normalIds.has(r._id));

            assert.strictEqual(overlap.length, 0, 'No interview should appear in both Normal and Cross-Examination history');
        });

        it('should preserve all user records across the partition without data loss (completeness)', () => {
            const userARecords = sampleRecords.filter(r => r.userId === userA);
            const normalFilter = {
                userId: userA,
                $or: [
                    { enableCrossQuestioning: false },
                    { enableCrossQuestioning: { $exists: false } },
                    { enableCrossQuestioning: null }
                ]
            };
            const crossFilter = {
                userId: userA,
                enableCrossQuestioning: true
            };

            const normalCount = sampleRecords.filter(r => matchesFilter(r, normalFilter)).length;
            const crossCount = sampleRecords.filter(r => matchesFilter(r, crossFilter)).length;

            assert.strictEqual(normalCount + crossCount, userARecords.length);
        });

        it('should never return another user records under any filter (strict user ownership)', () => {
            const normalFilter = {
                userId: userA,
                $or: [
                    { enableCrossQuestioning: false },
                    { enableCrossQuestioning: { $exists: false } },
                    { enableCrossQuestioning: null }
                ]
            };
            const crossFilter = {
                userId: userA,
                enableCrossQuestioning: true
            };

            const normalMatches = sampleRecords.filter(r => matchesFilter(r, normalFilter));
            const crossMatches = sampleRecords.filter(r => matchesFilter(r, crossFilter));

            assert.ok(normalMatches.every(r => r.userId === userA), 'Normal history must contain only userA records');
            assert.ok(crossMatches.every(r => r.userId === userA), 'Cross history must contain only userA records');
        });
    });

    // ==========================================
    // 2. getMyInterviews Controller Execution
    // ==========================================
    describe('2. getMyInterviews Controller Filter & Pagination', () => {

        it('should build correct MongoDB filter when type=cross', async () => {
            let capturedFilter = null;
            let capturedSort = null;
            let capturedSelect = null;

            const originalFind = Interview.find;
            Interview.find = (filter) => {
                capturedFilter = filter;
                return {
                    sort: (s) => {
                        capturedSort = s;
                        return {
                            select: (sel) => {
                                capturedSelect = sel;
                                return Promise.resolve([{ _id: 'cross-1', enableCrossQuestioning: true }]);
                            }
                        };
                    }
                };
            };

            const req = {
                userId: userA,
                query: { type: 'cross' }
            };
            let responseStatus = null;
            let responseData = null;
            const res = {
                status: (s) => {
                    responseStatus = s;
                    return {
                        json: (d) => { responseData = d; }
                    };
                }
            };

            try {
                await getMyInterviews(req, res);

                assert.strictEqual(responseStatus, 200);
                assert.deepStrictEqual(capturedFilter, { userId: userA, enableCrossQuestioning: true });
                assert.deepStrictEqual(capturedSort, { createdAt: -1 });
                assert.ok(capturedSelect.includes('crossQuestioningType'));
                assert.ok(capturedSelect.includes('questions'));
                assert.ok(capturedSelect.includes('enableCrossQuestioning'));
                assert.strictEqual(responseData.length, 1);
            } finally {
                Interview.find = originalFind;
            }
        });

        it('should build correct MongoDB filter defaulting to normal interviews', async () => {
            let capturedFilter = null;

            const originalFind = Interview.find;
            Interview.find = (filter) => {
                capturedFilter = filter;
                return {
                    sort: () => ({
                        select: () => Promise.resolve([])
                    })
                };
            };

            const req = {
                userId: userA,
                query: {}
            };
            const res = {
                status: () => ({ json: () => {} })
            };

            try {
                await getMyInterviews(req, res);

                assert.deepStrictEqual(capturedFilter, {
                    userId: userA,
                    $or: [
                        { enableCrossQuestioning: false },
                        { enableCrossQuestioning: { $exists: false } },
                        { enableCrossQuestioning: null }
                    ]
                });
            } finally {
                Interview.find = originalFind;
            }
        });

        it('should enforce pagination bounds (1 to 100) when limit parameter is provided', async () => {
            let capturedSkip = null;
            let capturedLimit = null;

            const originalFind = Interview.find;
            Interview.find = () => ({
                sort: () => ({
                    select: () => ({
                        skip: (sk) => ({
                            limit: (lim) => {
                                capturedSkip = sk;
                                capturedLimit = lim;
                                return Promise.resolve([]);
                            }
                        })
                    })
                })
            });

            const req = {
                userId: userA,
                query: { type: 'normal', page: '2', limit: '20' }
            };
            const res = {
                status: () => ({ json: () => {} })
            };

            try {
                await getMyInterviews(req, res);

                assert.strictEqual(capturedSkip, 20); // (page 2 - 1) * 20
                assert.strictEqual(capturedLimit, 20);
            } finally {
                Interview.find = originalFind;
            }
        });

        it('should clamp limit to max 100 and page to min 1', async () => {
            let capturedLimit = null;
            let capturedSkip = null;

            const originalFind = Interview.find;
            Interview.find = () => ({
                sort: () => ({
                    select: () => ({
                        skip: (sk) => ({
                            limit: (lim) => {
                                capturedSkip = sk;
                                capturedLimit = lim;
                                return Promise.resolve([]);
                            }
                        })
                    })
                })
            });

            const req = {
                userId: userA,
                query: { limit: '9999', page: '-5' }
            };
            const res = {
                status: () => ({ json: () => {} })
            };

            try {
                await getMyInterviews(req, res);

                assert.strictEqual(capturedLimit, 100);
                assert.strictEqual(capturedSkip, 0); // (page 1 - 1) * 100
            } finally {
                Interview.find = originalFind;
            }
        });

        it('should require authentication and return 401 if userId is missing', async () => {
            const req = { query: {} };
            let responseStatus = null;
            let responseData = null;
            const res = {
                status: (s) => {
                    responseStatus = s;
                    return { json: (d) => { responseData = d; } };
                }
            };

            await getMyInterviews(req, res);
            assert.strictEqual(responseStatus, 401);
            assert.ok(responseData.message.includes('Authentication required'));
        });
    });

    // ==========================================
    // 3. User Ownership & Report Access Guard
    // ==========================================
    describe('3. getInterviewReport User Ownership Guard', () => {

        it('should return 403 Forbidden when a user attempts to access another user report', async () => {
            const originalFindById = Interview.findById;
            Interview.findById = () => Promise.resolve({
                _id: 'interview-123',
                userId: userB, // Belongs to userB
                role: 'Staff Engineer',
                questions: []
            });

            const req = {
                userId: userA, // Requested by userA
                params: { id: 'interview-123' }
            };
            let responseStatus = null;
            let responseData = null;
            const res = {
                status: (s) => {
                    responseStatus = s;
                    return { json: (d) => { responseData = d; } };
                }
            };

            try {
                await getInterviewReport(req, res);

                assert.strictEqual(responseStatus, 403);
                assert.ok(responseData.message.includes('Forbidden'));
            } finally {
                Interview.findById = originalFindById;
            }
        });

        it('should allow report access when the interview belongs to the authenticated user and return cross-questioning metadata', async () => {
            const originalFindById = Interview.findById;
            Interview.findById = () => Promise.resolve({
                _id: 'interview-123',
                userId: userA, // Matches req.userId
                role: 'Staff Engineer',
                experience: '6 years',
                mode: 'Technical',
                finalScore: 85,
                enableCrossQuestioning: true,
                crossQuestioningType: 'Technical',
                questions: [
                    { score: 8, confidence: 80, correctness: 85, communication: 90 },
                    { score: 9, confidence: 90, correctness: 85, communication: 85 }
                ]
            });

            const req = {
                userId: userA,
                params: { id: 'interview-123' }
            };
            let responseStatus = null;
            let responseData = null;
            const res = {
                status: (s) => {
                    responseStatus = s;
                    return { json: (d) => { responseData = d; } };
                }
            };

            try {
                await getInterviewReport(req, res);

                assert.strictEqual(responseStatus, 200);
                assert.strictEqual(responseData.role, 'Staff Engineer');
                assert.strictEqual(responseData.enableCrossQuestioning, true);
                assert.strictEqual(responseData.crossQuestioningType, 'Technical');
                assert.strictEqual(responseData.finalScore, 85);
                assert.strictEqual(responseData.questions.length, 2);
            } finally {
                Interview.findById = originalFindById;
            }
        });

        it('should return 404 when interview is not found', async () => {
            const originalFindById = Interview.findById;
            Interview.findById = () => Promise.resolve(null);

            const req = {
                userId: userA,
                params: { id: 'non-existent' }
            };
            let responseStatus = null;
            const res = {
                status: (s) => {
                    responseStatus = s;
                    return { json: () => {} };
                }
            };

            try {
                await getInterviewReport(req, res);
                assert.strictEqual(responseStatus, 404);
            } finally {
                Interview.findById = originalFindById;
            }
        });
    });

    // ==========================================
    // 4. Routes Integration Verification
    // ==========================================
    describe('4. Routes Registration Verification', () => {

        it('should verify interview.routes.js defines /getInterview, /cross-history, and /report/:id', async () => {
            const fs = await import('node:fs');
            const path = await import('node:path');
            const routesContent = fs.readFileSync(path.resolve('routes/interview.routes.js'), 'utf8');

            assert.ok(routesContent.includes("interviewRouter.get('/getInterview', isAuth, getMyInterviews)"),
                'Routes must mount /getInterview protected with isAuth');
            assert.ok(routesContent.includes("interviewRouter.get('/cross-history'"),
                'Routes must mount /cross-history alias protected with isAuth');
            assert.ok(routesContent.includes("interviewRouter.get('/report/:id', isAuth, getInterviewReport)"),
                'Routes must mount /report/:id protected with isAuth');
        });
    });
});
