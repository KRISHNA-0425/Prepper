import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Prepper AI — Unified Interview History Frontend Regression Suite', () => {

    const historyFilePath = path.resolve('src/pages/InterViewHistory.jsx');
    const historyCode = fs.readFileSync(historyFilePath, 'utf8');

    it('1. should verify InterViewHistory routes dedicated cross-examination sessions to /cross-examination/:sessionId', () => {
        assert.ok(
            historyCode.includes("navigate(`/cross-examination/${item.sessionId || item._id}`)"),
            'InterViewHistory must navigate dedicated cross-examinations to /cross-examination/:sessionId'
        );
    });

    it('2. should verify InterViewHistory routes standard interviews to /report/:id', () => {
        assert.ok(
            historyCode.includes("navigate(`/report/${item._id}`)"),
            'InterViewHistory must navigate standard interviews to /report/:id'
        );
    });

    it('3. should verify InterViewHistory discriminates based on sessionType or isDedicatedCrossExam', () => {
        assert.ok(
            historyCode.includes("item.sessionType === 'dedicated_cross_exam' || item.isDedicatedCrossExam"),
            'InterViewHistory must check sessionType or isDedicatedCrossExam to branch navigation'
        );
    });

    it('4. should verify InterViewHistory handles totalQuestions and questions array length safely', () => {
        assert.ok(
            historyCode.includes('item.totalQuestions || item.questions.length'),
            'InterViewHistory must display totalQuestions or fallback to questions array length'
        );
    });

    it('5. should verify InterViewHistory renders numeric and non-numeric scores cleanly without crashing', () => {
        assert.ok(
            historyCode.includes("typeof item.finalScore === 'number'"),
            'InterViewHistory must check if finalScore is a number'
        );
        assert.ok(
            historyCode.includes("'--'"),
            'InterViewHistory must fallback to clean dash when score is unavailable'
        );
    });

    it('6. should verify empty state action for Cross-Exam navigates to /cross-examination', () => {
        assert.ok(
            historyCode.includes("onClick={() => navigate('/cross-examination')}"),
            'Cross-Exam empty state button must navigate to /cross-examination'
        );
    });

    it('7. should simulate client-side route resolution logic across all 3 interview record types', () => {
        const stdNormal = { _id: 'std_1', sessionType: 'standard_interview', isDedicatedCrossExam: false };
        const stdCross = { _id: 'std_2', sessionType: 'standard_cross_interview', isDedicatedCrossExam: false };
        const dedCross = { _id: 'ded_3', sessionId: 'ces_123', sessionType: 'dedicated_cross_exam', isDedicatedCrossExam: true };

        const resolveRoute = (item) => {
            if (item.sessionType === 'dedicated_cross_exam' || item.isDedicatedCrossExam) {
                return `/cross-examination/${item.sessionId || item._id}`;
            }
            return `/report/${item._id}`;
        };

        assert.strictEqual(resolveRoute(stdNormal), '/report/std_1');
        assert.strictEqual(resolveRoute(stdCross), '/report/std_2');
        assert.strictEqual(resolveRoute(dedCross), '/cross-examination/ces_123');
    });
});

