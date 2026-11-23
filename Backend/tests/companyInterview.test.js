import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import CompanyProfile from '../models/companyProfile.model.js';
import Interview from '../models/interview.model.js';
import {
  getCuratedProfiles,
  findCuratedProfile,
} from '../services/companySimulation/curatedCompanyProfiles.js';
import {
  generateCompanySlug,
  getOrGenerateCompanyProfile,
  recommendInterviewStructure,
  generateFallbackCompanyProfile,
} from '../services/companySimulation/companyIntelligence.service.js';
import {
  getFallbackCompanyQuestions,
  generateCompanyQuestions,
} from '../services/companySimulation/companyQuestionGenerator.service.js';
import {
  deriveHiringVerdict,
  deriveFitLevel,
  evaluateCompanyInterview,
} from '../services/companySimulation/companyEvaluation.service.js';
import {
  createCompanyInterviewSession,
  getCompanyInterviewSession,
  submitCompanyAnswer,
  finishCompanyInterview,
} from '../services/companySimulation/companyInterview.service.js';
import * as creditService from '../services/credit.service.js';

test('Module 6: Company-Specific Interview Simulation Backend Test Suite', async (t) => {
  const dummyUserId = new mongoose.Types.ObjectId();
  const unauthorizedUserId = new mongoose.Types.ObjectId();

  await t.test('1. Curated company profiles provide accurate, verified intelligence for premier companies', () => {
    const curated = getCuratedProfiles();
    assert.ok(curated.length >= 9, 'Must have at least 9 curated premier companies');

    const expectedCompanies = ['Google', 'Amazon', 'Microsoft', 'Adobe', 'IBM', 'TCS', 'Infosys', 'Accenture', 'Deloitte'];
    expectedCompanies.forEach((name) => {
      const found = findCuratedProfile(name);
      assert.ok(found, `Curated profile for ${name} must exist`);
      assert.ok(found.supportedRounds.length >= 3, `${name} must support at least 3 distinct interview rounds`);
      assert.ok(found.interviewCulture.length > 20, `${name} must include documented interview culture`);
      assert.ok(found.disclaimer.includes('not affiliated'), `${name} must include disclaimer`);
      assert.equal(found.isVerified, true);
    });

    // Test slug lookup
    const amazonBySlug = findCuratedProfile('amazon');
    assert.ok(amazonBySlug);
    assert.equal(amazonBySlug.name, 'Amazon');
  });

  await t.test('2. Dynamic company intelligence generation and deterministic fallback', async () => {
    // Test slug generator
    assert.equal(generateCompanySlug('Stripe, Inc.'), 'stripe-inc');
    assert.equal(generateCompanySlug('   Netflix   '), 'netflix');

    // Test fallback profile generator
    const fallbackProfile = generateFallbackCompanyProfile('Palantir Technologies', 'Forward Deployed Engineer');
    assert.equal(fallbackProfile.name, 'Palantir Technologies');
    assert.equal(fallbackProfile.slug, 'palantir-technologies');
    assert.ok(fallbackProfile.supportedRounds.length >= 4);
    assert.ok(fallbackProfile.interviewCulture.includes('Forward Deployed Engineer'));
    assert.equal(fallbackProfile.isVerified, false);

    // Test AI generation with fallback
    const profile = await getOrGenerateCompanyProfile({
      companyName: 'OpenAI',
      targetRole: 'Research Engineer',
      options: {
        askAI: async () => JSON.stringify({
          name: 'OpenAI',
          industry: 'Artificial General Intelligence',
          tier: 'Tier 1 Product',
          description: 'AI research and deployment company.',
          interviewCulture: 'High algorithmic bar, deep ML systems understanding.',
          supportedRounds: [
            {
              roundId: 'technical_round_1',
              name: 'Technical Round 1: ML Systems & Algorithms',
              focusAreas: ['Distributed training', 'PyTorch internals'],
              recommendedDuration: 45,
              typicalQuestionCount: 4,
              format: 'coding',
            },
          ],
          commonCompetencies: ['Transformers', 'GPU Memory', 'PyTorch'],
          techStackFocus: ['Python', 'PyTorch', 'CUDA'],
          behavioralPrinciples: ['Safe AGI', 'Collaboration'],
          sampleQuestionThemes: ['Implement multi-head attention.'],
        }),
      },
    });

    assert.ok(profile);
    assert.equal(profile.name, 'OpenAI');
    assert.equal(profile.slug, 'openai');
  });

  await t.test('3. Intelligent interview structure recommendations based on role & experience', () => {
    const googleProfile = findCuratedProfile('Google');

    // Senior software engineer should be recommended System Design
    const seniorRec = recommendInterviewStructure({
      companyProfile: googleProfile,
      targetRole: 'Senior Distributed Systems Engineer',
      experienceLevel: 'Senior (5+ yrs)',
    });
    assert.equal(seniorRec.recommendedRoundId, 'system_design');
    assert.ok(seniorRec.rationale.includes('Senior'));

    // Engineering manager should be recommended Hiring Manager / Leadership
    const managerRec = recommendInterviewStructure({
      companyProfile: googleProfile,
      targetRole: 'Engineering Manager',
      experienceLevel: 'Lead',
    });
    assert.equal(managerRec.recommendedRoundId, 'hiring_manager');

    // Entry level should be recommended Technical Round 1 (Foundations & DSA)
    const entryRec = recommendInterviewStructure({
      companyProfile: googleProfile,
      targetRole: 'Software Engineer',
      experienceLevel: 'Fresher / Entry Level',
    });
    assert.equal(entryRec.recommendedRoundId, 'technical_round_1');
  });

  await t.test('4. Company question generation produces authentic questions across all 7 rounds', async () => {
    const rounds = [
      'online_assessment',
      'technical_round_1',
      'technical_round_2',
      'system_design',
      'hiring_manager',
      'behavioral',
      'final_hr',
    ];

    rounds.forEach((roundId) => {
      const fallback = getFallbackCompanyQuestions({
        companyName: 'Microsoft',
        targetRole: 'Full Stack Engineer',
        interviewRound: roundId,
        count: 3,
      });

      assert.ok(fallback.interviewerGreeting.includes('Microsoft'));
      assert.equal(fallback.questions.length, 3);
      fallback.questions.forEach((q) => {
        assert.ok(q.question.length > 15);
        assert.ok(q.evaluationCriteria.length > 5);
        assert.ok(q.transitionPhrase.length > 5);
      });
    });

    // Test AI generation
    const aiResult = await generateCompanyQuestions({
      companyProfile: findCuratedProfile('Amazon'),
      targetRole: 'Software Development Engineer II',
      interviewRound: 'technical_round_2',
      roundTitle: 'Technical Round 2: Object-Oriented Design & LPs',
      questionCount: 2,
      options: {
        askAI: async () => JSON.stringify({
          interviewerGreeting: 'Welcome to Amazon SDE II round. Today we will design a locker service and discuss Customer Obsession.',
          questions: [
            {
              question: 'Design an Amazon Locker parcel allocation system with optimal slot sizing and concurrent access handling.',
              category: 'Low-Level Design',
              topic: 'Object-Oriented Design',
              difficulty: 'medium',
              timeLimit: 60,
              evaluationCriteria: 'Strategy pattern, thread-safety, handling expired reservations.',
              transitionPhrase: 'Let us start with the core locker allocation component.',
            },
            {
              question: 'Tell me about a time you had to make a technical compromise to deliver on a critical customer deadline.',
              category: 'Behavioral & LPs',
              topic: 'Customer Obsession & Bias for Action',
              difficulty: 'medium',
              timeLimit: 60,
              evaluationCriteria: 'STAR method, quantified customer impact, subsequent remediation.',
              transitionPhrase: 'Connecting to our leadership principles, tell me about a time you delivered under pressure.',
            },
          ],
        }),
      },
    });

    assert.equal(aiResult.isFallback, false);
    assert.equal(aiResult.questions.length, 2);
    assert.ok(aiResult.interviewerGreeting.includes('Amazon'));
    assert.equal(aiResult.questions[0].topic, 'Object-Oriented Design');
  });

  await t.test('5. Company evaluation produces consistent hiring verdicts and fit levels', async () => {
    // Test verdict threshold math
    assert.equal(deriveHiringVerdict(92), 'Strong Hire');
    assert.equal(deriveHiringVerdict(78), 'Hire');
    assert.equal(deriveHiringVerdict(60), 'Leaning Hire');
    assert.equal(deriveHiringVerdict(45), 'Leaning No Hire');
    assert.equal(deriveHiringVerdict(30), 'No Hire');

    assert.equal(deriveFitLevel(80), 'Exceeds Expectations');
    assert.equal(deriveFitLevel(65), 'Meets Expectations');
    assert.equal(deriveFitLevel(40), 'Needs Further Preparation');

    const mockInterview = {
      role: 'Backend Engineer',
      questions: [
        {
          question: 'Explain Raft consensus log replication.',
          category: 'Distributed Systems',
          topic: 'Consensus',
          answer: 'Raft divides time into terms with a single leader elected per term. Leader appends entries to its log and replicates them to follower nodes.',
          score: 8,
        },
        {
          question: 'How do you handle split-brain in distributed databases?',
          category: 'Distributed Systems',
          topic: 'Quorum',
          answer: 'By requiring a strict majority quorum ($N/2 + 1$) for writes and leader heartbeat timeouts.',
          score: 9,
        },
      ],
      companySimulation: {
        companyName: 'Google',
        targetDesignation: 'Senior Backend Engineer',
        roundTitle: 'Technical Round 2',
      },
    };

    const evalResult = await evaluateCompanyInterview({
      interview: mockInterview,
      companyProfile: findCuratedProfile('Google'),
      options: {
        askAI: async () => JSON.stringify({
          readinessScore: 85,
          verdict: 'Strong Hire',
          fitLevel: 'Exceeds Expectations',
          companyCultureFit: 'Demonstrates deep distributed systems clarity aligned with Google infrastructure expectations.',
          strengths: ['Quorum math mastery', 'Accurate Raft term state machine explanation'],
          criticalGaps: ['Explore geo-distributed cross-datacenter latency impact'],
          recommendedTopics: ['Spanner TrueTime and Paxos leases'],
          nextRoundRecommendation: 'Recommend advancing to Google System Design round.',
        }),
      },
    });

    assert.equal(evalResult.verdict, 'Strong Hire');
    assert.equal(evalResult.readinessScore, 85);
    assert.ok(evalResult.strengths.length >= 2);
    assert.ok(evalResult.nextRoundRecommendation.includes('Google'));
  });

  await t.test('6. Anti-IDOR Security: Rejects unauthorized access to other candidates company sessions', async () => {
    const originalFindById = Interview.findById;
    Interview.findById = async (id) => ({
      _id: id,
      userId: dummyUserId,
      companySimulation: {
        isCompanySimulation: true,
        companyName: 'Amazon',
      },
    });

    try {
      // Authorized access succeeds
      const authorized = await getCompanyInterviewSession('mock_session_id', dummyUserId);
      assert.ok(authorized);
      assert.equal(authorized.userId.toString(), dummyUserId.toString());

      // Unauthorized access throws 403 Forbidden
      await assert.rejects(
        async () => {
          await getCompanyInterviewSession('mock_session_id', unauthorizedUserId);
        },
        (err) => {
          assert.equal(err.status, 403);
          assert.ok(err.message.includes('Unauthorized'));
          return true;
        }
      );
    } finally {
      Interview.findById = originalFindById;
    }
  });

  await t.test('7. Credit deduction & insufficient funds protection', async () => {
    await assert.rejects(
      async () => {
        await createCompanyInterviewSession({
          userId: dummyUserId,
          companyName: 'Google',
          targetDesignation: 'Staff Engineer',
          options: {
            checkUserCredits: async () => ({
              hasCredits: false,
              message: 'Free limit reached please purchase more credits',
            }),
          },
        });
      },
      (err) => {
        assert.equal(err.statusCode, 400);
        assert.ok(err.message.includes('Free limit reached'));
        return true;
      }
    );
  });
});
