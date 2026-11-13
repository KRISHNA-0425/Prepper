import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import {
    getMyInterviews,
    normalizeStandardInterview,
    normalizeDedicatedSession
} from '../controllers/interview.controller.js';

describe('Prepper AI — Unified Interview History Regression Suite', () => {

    const userA = new mongoose.Types.ObjectId().toString();
    const userB = new mongoose.Types.ObjectId().toString();

    // Sample database records across both models
    const sampleStandardInterviews = [
        {
            _id: 'std_normal_1',
            userId: userA,
            role: 'Frontend Engineer',
            experience: '2 years',
            mode: 'Technical',
            finalScore: 82,
            status: 'Completed',
            enableCrossQuestioning: false,
            crossQuestioningType: null,
            questions: [{ question: 'Q1', score: 8 }],
            createdAt: new Date('2026-10-10T10:00:00Z'),
            updatedAt: new Date('2026-10-10T10:30:00Z'),
        },
        {
            _id: 'std_legacy_2',
            userId: userA,
            role: 'Full Stack Developer',
            experience: '3 years',
            mode: 'Technical',
            finalScore: 78,
            status: 'Completed',
            // legacy: enableCrossQuestioning is undefined
            questions: [{ question: 'Q1', score: 7 }],
            createdAt: new Date('2026-10-11T10:00:00Z'),
            updatedAt: new Date('2026-10-11T10:30:00Z'),
        },
        {
            _id: 'std_cross_3',
            userId: userA,
            role: 'Senior Backend Engineer',
            experience: '5 years',
            mode: 'Technical',
            finalScore: 90,
            status: 'Completed',
            enableCrossQuestioning: true,
            crossQuestioningType: 'Technical',
            questions: [{ question: 'Q1', score: 9 }, { question: 'Q1-Followup', score: 9, isFollowUp: true }],
            createdAt: new Date('2026-10-12T14:00:00Z'),
            updatedAt: new Date('2026-10-12T14:45:00Z'),
        },
        {
            _id: 'std_userB_4',
            userId: userB,
            role: 'DevOps Engineer',
            experience: '4 years',
            mode: 'Technical',
            finalScore: 85,
            status: 'Completed',
            enableCrossQuestioning: true,
            crossQuestioningType: 'Technical',
            questions: [{ question: 'Q1' }],
            createdAt: new Date('2026-10-13T10:00:00Z'),
        },
    ];

    const sampleDedicatedSessions = [
        {
            _id: 'ded_cross_1',
            sessionId: 'ces_ded_1',
            userId: userA,
            sessionTitle: 'Staff Architect Probing',
            targetRole: 'Staff Systems Architect',
            targetDomain: 'Distributed Storage',
            status: 'completed',
            questions: [{ questionId: 'q1' }, { questionId: 'q2' }],
            answers: [{ answerId: 'a1' }, { answerId: 'a2' }],
            report: {
                dimensionScores: [
                    { dimension: 'ARCHITECTURE_BOUNDARIES', demonstratedLevel: 'STRONG' },
                    { dimension: 'SCALE_AND_CONCURRENCY', demonstratedLevel: 'MODERATE' },
                ],
            },
            createdAt: new Date('2026-10-14T09:00:00Z'),
            updatedAt: new Date('2026-10-14T09:40:00Z'),
        },
        {
            _id: 'ded_cross_2',
            sessionId: 'ces_ded_2',
            userId: userA,
            sessionTitle: 'Core Platform Lead',
            targetRole: 'Core Platform Lead',
            targetDomain: 'High Throughput Pipelines',
            status: 'awaiting_answer',
            questions: [{ questionId: 'q1' }],
            answers: [],
            createdAt: new Date('2026-10-15T11:00:00Z'),
            updatedAt: new Date('2026-10-15T11:10:00Z'),
        },
        {
            _id: 'ded_userB_3',
            sessionId: 'ces_ded_userB',
            userId: userB,
            sessionTitle: 'Other User Session',
            targetRole: 'Security Engineer',
            targetDomain: 'Infra Security',
            status: 'completed',
            questions: [{ questionId: 'q1' }],
            answers: [{ answerId: 'a1' }],
            createdAt: new Date('2026-10-16T12:00:00Z'),
        },
    ];

    // Mock query builders
    const createMockInterviewModel = (records = sampleStandardInterviews) => ({
        find: (filter) => {
            let matched = records.filter((r) => {
                if (filter.userId && r.userId !== filter.userId) return false;
                if (filter.enableCrossQuestioning === true) {
                    return r.enableCrossQuestioning === true;
                }
                if (filter.$or) {
                    return filter.$or.some((clause) => {
                        if (clause.enableCrossQuestioning === false) return r.enableCrossQuestioning === false;
                        if (clause.enableCrossQuestioning?.$exists === false) return r.enableCrossQuestioning === undefined;
                        if (clause.enableCrossQuestioning === null) return r.enableCrossQuestioning === null;
                        return false;
                    });
                }
                return true;
            });

            return {
                sort: () => ({
                    select: () => ({
                        skip: (sk) => ({
                            limit: (lim) => Promise.resolve(matched.slice(sk, sk + lim)),
                        }),
                        limit: (lim) => Promise.resolve(matched.slice(0, lim)),
                        then: (resolve) => resolve(matched),
                    }),
                }),
            };
        },
    });

    const createMockSessionModel = (records = sampleDedicatedSessions) => ({
        find: (filter) => {
            let matched = records.filter((s) => {
                if (filter.userId && s.userId !== filter.userId) return false;
                return true;
            });

            return {
                sort: () => ({
                    select: () => ({
                        limit: (lim) => Promise.resolve(matched.slice(0, lim)),
                        then: (resolve) => resolve(matched),
                    }),
                }),
            };
        },
    });

    const executeGetMyInterviews = async (req, deps = {}) => {
        let statusCode = 200;
        let body = null;
        const res = {
            status: (code) => {
                statusCode = code;
                return {
                    json: (data) => {
                        body = data;
                        return { statusCode, body };
                    },
                };
            },
            json: (data) => {
                body = data;
                return { statusCode, body };
            },
        };

        await getMyInterviews(req, res, deps);
        return { statusCode, body };
    };

    // ==========================================
    // Requirement 1: Normal interviews appear only in Standard History
    // ==========================================
    it('1. should return ONLY normal interviews and legacy records in Standard History (type=normal)', async () => {
        const req = {
            userId: userA,
            query: { type: 'normal' },
        };
        const deps = {
            InterviewModel: createMockInterviewModel(),
            SessionModel: createMockSessionModel(),
        };

        const { statusCode, body } = await executeGetMyInterviews(req, deps);

        assert.strictEqual(statusCode, 200);
        assert.ok(Array.isArray(body));
        assert.strictEqual(body.length, 2);

        // Contains only normal and legacy
        const ids = body.map((r) => r._id);
        assert.ok(ids.includes('std_normal_1'));
        assert.ok(ids.includes('std_legacy_2'));

        // Does NOT contain standard cross-questioning interview
        assert.strictEqual(ids.includes('std_cross_3'), false);

        // Does NOT contain dedicated sessions
        assert.strictEqual(ids.includes('ded_cross_1'), false);
        assert.strictEqual(ids.includes('ded_cross_2'), false);

        // All records have enableCrossQuestioning === false
        assert.ok(body.every((r) => r.enableCrossQuestioning === false));
        assert.ok(body.every((r) => r.sessionType === 'standard_interview'));
        assert.ok(body.every((r) => r.isDedicatedCrossExam === false));
    });

    // ==========================================
    // Requirement 2: Standard cross-interviews appear in Cross-Examination History
    // ==========================================
    it('2. should include standard interviews with cross-questioning enabled in Cross-Examination History (type=cross)', async () => {
        const req = {
            userId: userA,
            query: { type: 'cross' },
        };
        const deps = {
            InterviewModel: createMockInterviewModel(),
            SessionModel: createMockSessionModel(),
        };

        const { statusCode, body } = await executeGetMyInterviews(req, deps);

        assert.strictEqual(statusCode, 200);
        assert.ok(Array.isArray(body));

        const standardCross = body.find((r) => r._id === 'std_cross_3');
        assert.ok(standardCross, 'Standard interview with cross-questioning must be present in Cross-Exam history');
        assert.strictEqual(standardCross.sessionType, 'standard_cross_interview');
        assert.strictEqual(standardCross.enableCrossQuestioning, true);
        assert.strictEqual(standardCross.crossQuestioningType, 'Technical');
        assert.strictEqual(standardCross.isDedicatedCrossExam, false);

        // Normal interview must NOT be in cross history
        const normalInterview = body.find((r) => r._id === 'std_normal_1');
        assert.strictEqual(normalInterview, undefined, 'Normal interview must NOT appear in Cross-Exam history');
    });

    // ==========================================
    // Requirement 3: Dedicated Cross-Examination sessions appear in Cross-Examination History
    // ==========================================
    it('3. should include dedicated Cross-Examination sessions in Cross-Examination History (type=cross)', async () => {
        const req = {
            userId: userA,
            query: { type: 'cross' },
        };
        const deps = {
            InterviewModel: createMockInterviewModel(),
            SessionModel: createMockSessionModel(),
        };

        const { statusCode, body } = await executeGetMyInterviews(req, deps);

        assert.strictEqual(statusCode, 200);

        const dedicated1 = body.find((r) => r._id === 'ded_cross_1');
        const dedicated2 = body.find((r) => r._id === 'ded_cross_2');

        assert.ok(dedicated1, 'Completed dedicated session must appear in Cross-Exam history');
        assert.ok(dedicated2, 'In-progress dedicated session must appear in Cross-Exam history');

        assert.strictEqual(dedicated1.sessionType, 'dedicated_cross_exam');
        assert.strictEqual(dedicated1.isDedicatedCrossExam, true);
        assert.strictEqual(dedicated1.role, 'Staff Systems Architect');
        assert.strictEqual(dedicated1.status, 'Completed');
        assert.strictEqual(dedicated1.crossQuestioningType, 'Dedicated');
        assert.strictEqual(typeof dedicated1.finalScore, 'number');

        assert.strictEqual(dedicated2.sessionType, 'dedicated_cross_exam');
        assert.strictEqual(dedicated2.status, 'In Progress');
    });

    // ==========================================
    // Requirement 4: User isolation: records of other users are never returned
    // ==========================================
    it('4. should never return records belonging to other users under any filter', async () => {
        const normalReq = {
            userId: userA,
            query: { type: 'normal' },
        };
        const crossReq = {
            userId: userA,
            query: { type: 'cross' },
        };
        const deps = {
            InterviewModel: createMockInterviewModel(),
            SessionModel: createMockSessionModel(),
        };

        const normalRes = await executeGetMyInterviews(normalReq, deps);
        const crossRes = await executeGetMyInterviews(crossReq, deps);

        const allReturnedUserA = [...normalRes.body, ...crossRes.body];

        assert.ok(
            allReturnedUserA.every((r) => r._id !== 'std_userB_4' && r._id !== 'ded_userB_3'),
            'Must strictly exclude userB interviews and dedicated sessions'
        );
    });

    // ==========================================
    // Requirement 5: Routing destination validation
    // ==========================================
    it('5. should provide correct routing identifiers for standard report vs cross-exam session', () => {
        const standardNormal = sampleStandardInterviews[0];
        const standardCross = sampleStandardInterviews[2];
        const dedicatedCross = sampleDedicatedSessions[0];

        const normStdNormal = normalizeStandardInterview(standardNormal);
        const normStdCross = normalizeStandardInterview(standardCross);
        const normDedCross = normalizeDedicatedSession(dedicatedCross);

        // Routing rule helper matching Frontend implementation
        const resolveRoute = (item) => {
            if (item.sessionType === 'dedicated_cross_exam' || item.isDedicatedCrossExam) {
                return `/cross-examination/${item.sessionId || item._id}`;
            }
            return `/report/${item._id}`;
        };

        assert.strictEqual(resolveRoute(normStdNormal), '/report/std_normal_1');
        assert.strictEqual(resolveRoute(normStdCross), '/report/std_cross_3');
        assert.strictEqual(resolveRoute(normDedCross), '/cross-examination/ces_ded_1');
    });

    // ==========================================
    // Requirement 6: Empty history and error handling
    // ==========================================
    it('6. should handle empty history and unauthenticated access cleanly', async () => {
        // Unauthenticated access
        const unauthReq = {
            query: { type: 'normal' },
        };
        const unauthRes = await executeGetMyInterviews(unauthReq);
        assert.strictEqual(unauthRes.statusCode, 401);
        assert.match(unauthRes.body.message, /authentication required/i);

        // User with no history
        const emptyUserReq = {
            userId: 'empty_user_id',
            query: { type: 'cross' },
        };
        const deps = {
            InterviewModel: createMockInterviewModel([]),
            SessionModel: createMockSessionModel([]),
        };
        const emptyRes = await executeGetMyInterviews(emptyUserReq, deps);
        assert.strictEqual(emptyRes.statusCode, 200);
        assert.deepStrictEqual(emptyRes.body, []);
    });

    // ==========================================
    // Requirement 7: Deduplication and Chronological Sorting
    // ==========================================
    it('7. should deduplicate records and sort chronologically descending by createdAt', async () => {
        const req = {
            userId: userA,
            query: { type: 'cross' },
        };
        const deps = {
            InterviewModel: createMockInterviewModel(),
            SessionModel: createMockSessionModel(),
        };

        const { statusCode, body } = await executeGetMyInterviews(req, deps);

        assert.strictEqual(statusCode, 200);
        assert.strictEqual(body.length, 3); // std_cross_3 (Oct 12), ded_cross_1 (Oct 14), ded_cross_2 (Oct 15)

        // Verify chronological descending order: Oct 15 -> Oct 14 -> Oct 12
        assert.strictEqual(body[0]._id, 'ded_cross_2');
        assert.strictEqual(body[1]._id, 'ded_cross_1');
        assert.strictEqual(body[2]._id, 'std_cross_3');

        // Verify uniqueness
        const uniqueIds = new Set(body.map((r) => r._id));
        assert.strictEqual(uniqueIds.size, body.length, 'All returned items must have unique IDs');
    });

    // ==========================================
    // Requirement 8: Consistent Pagination
    // ==========================================
    it('8. should paginate merged cross-examination history consistently', async () => {
        const reqPage1 = {
            userId: userA,
            query: { type: 'cross', limit: '2', page: '1' },
        };
        const reqPage2 = {
            userId: userA,
            query: { type: 'cross', limit: '2', page: '2' },
        };
        const deps = {
            InterviewModel: createMockInterviewModel(),
            SessionModel: createMockSessionModel(),
        };

        const page1 = await executeGetMyInterviews(reqPage1, deps);
        const page2 = await executeGetMyInterviews(reqPage2, deps);

        assert.strictEqual(page1.body.length, 2);
        assert.strictEqual(page2.body.length, 1);

        assert.strictEqual(page1.body[0]._id, 'ded_cross_2');
        assert.strictEqual(page1.body[1]._id, 'ded_cross_1');
        assert.strictEqual(page2.body[0]._id, 'std_cross_3');
    });
});

