import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { createCrossExaminationController, defaultParsePdf } from '../controllers/crossExamination.controller.js';
import { extractResumeClaims } from '../services/resumeIntelligence.service.js';
import { analyzeProjectClaims } from '../services/projectClaimAnalysis.service.js';
import {
  PROVENANCE_TYPES,
  CONFIDENCE_LEVELS,
  CLAIM_CATEGORIES,
} from '../contracts/crossExamination.contracts.js';

// Helper mock session model
function createMockSessionClass() {
  let createdDoc = null;
  const store = new Map();

  class MockSession {
    constructor(data) {
      this._id = data._id || `sess_${Math.random().toString(36).substring(2, 10)}`;
      this.sessionId = this._id;
      Object.assign(this, data);
      this.createdAt = new Date();
      this.updatedAt = new Date();
    }

    async save() {
      createdDoc = this;
      store.set(this._id, this);
      return this;
    }

    toObject() {
      return { ...this };
    }

    static async findOne(query) {
      if (query.idempotencyKey) {
        for (const doc of store.values()) {
          if (doc.idempotencyKey === query.idempotencyKey && String(doc.userId) === String(query.userId)) {
            return doc;
          }
        }
      }
      return null;
    }

    static getCreated() {
      return createdDoc;
    }

    static reset() {
      createdDoc = null;
      store.clear();
    }
  }

  return MockSession;
}

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status: function (code) {
      this.statusCode = code;
      return this;
    },
    json: function (data) {
      this.body = data;
      return this;
    },
    setHeader: function (k, v) {
      this.headers[k] = v;
    },
  };
  return res;
}

const dummyUserId = '65f1a2b3c4d5e6f7a8b9c0d1';

const sampleStudentResume = `
Sagun Yadav 
Email: saguny44@gmail.com | Phone: 6393758118
Profile Summary 
Motivated Computer Science Engineering student with strong fundamentals in Data Structures & Algorithms (C++) and hands-on experience in Frontend Development.
Projects 
1. Sign Language Recognition System 
- Built a real-time sign language recognition system using Python, OpenCV, and MediaPipe. 
- Implemented static gesture recognition using 3D hand landmark detection.
- Trained a Random Forest classifier, achieving over 90% accuracy. 
- Developed a Tkinter-based GUI and integrated live camera input.
2. NutriShield - AI-Powered Food Allergen Detection System 
- Developed an AI-driven web application for food allergen detection using OCR and barcode scanning. 
- Designed a responsive frontend using HTML, CSS, JavaScript, and React.
- Implemented dynamic UI states, loading indicators, and real-time safety result rendering. 
- Integrated backend APIs using Fetch API and FormData for asynchronous communication. 
Technical Skills 
Languages: C++, Python, JavaScript 
Frontend: HTML, CSS, React, Tailwind CSS 
Backend: Django Framework 
Tools & Libraries: OpenCV, MediaPipe, Git, VS Code 
`;

const sparseResumeNoProjects = `
John Doe
Email: john@example.com | Phone: 555-0199
Objective: Seeking any entry-level general employment.
Education: High School Diploma, 2020.
Interests: Traveling, listening to music, reading books.
`;

const mockAiExtractionResponse = JSON.stringify({
  role: 'Frontend Developer',
  projects: [
    {
      title: 'Sign Language Recognition System',
      description: 'Built a real-time sign language recognition system using Python, OpenCV, and MediaPipe.',
      technologies: ['Python', 'OpenCV', 'MediaPipe'],
      claims: [
        {
          statement: 'Implemented static gesture recognition using 3D hand landmark detection.',
          category: CLAIM_CATEGORIES.PROJECT_CONTRIBUTION,
          sourceExcerpt: 'Implemented static gesture recognition using 3D hand landmark detection.',
          provenanceType: PROVENANCE_TYPES.EXPLICIT_SOURCE_STATEMENT,
          confidence: CONFIDENCE_LEVELS.HIGH,
        },
      ],
    },
  ],
  standaloneClaims: [],
});

describe('Cross-Examination Opportunity Derivation Hotfix Suite (HTTP 422 Resolution)', () => {

  // -------------------------------------------------------------
  // 1. Valid Resume Produces Usable Examination Opportunities
  // -------------------------------------------------------------
  it('1. should derive usable examination opportunities from a valid resume with projects', async () => {
    const MockSession = createMockSessionClass();
    const controller = createCrossExaminationController({
      SessionModel: MockSession,
      extractClaimsFn: ({ resumeText }) => extractResumeClaims({
        resumeText,
        askAIFn: async () => mockAiExtractionResponse,
      }),
      analyzeBlueprintFn: analyzeProjectClaims,
      generateQuestionsFn: async ({ examinationBlueprint }) => ({
        success: true,
        questions: [
          {
            questionId: 'q_test_1',
            questionText: 'How did you handle MediaPipe landmark detection latency in Sign Language Recognition?',
            opportunityId: examinationBlueprint.allOpportunitiesSorted[0].opportunityId,
          },
        ],
      }),
    });

    const req = {
      userId: dummyUserId,
      body: {
        resumeText: sampleStudentResume,
        targetRole: 'Frontend Developer',
        targetDomain: 'Computer Vision & Web Applications',
      },
    };
    const res = createMockRes();

    await controller.createSession(req, res);

    assert.strictEqual(res.statusCode, 201, `Expected 201, got ${res.statusCode}: ${JSON.stringify(res.body)}`);
    assert.ok(res.body.session, 'Session object must be present in response');
    assert.strictEqual(res.body.message, 'Cross-examination session created successfully');
    assert.strictEqual(MockSession.getCreated() !== null, true);
  });

  // -------------------------------------------------------------
  // 2. Extraction Schema Matches Opportunity Analyzer Contract
  // -------------------------------------------------------------
  it('2. should verify extracted projects with detailedProjects are normalized for blueprint analysis', async () => {
    const MockSession = createMockSessionClass();

    // Simulate extraction where projects is empty but detailedProjects has projects
    const mockExtractClaims = async () => ({
      success: false,
      isDeterministicFallback: true,
      role: 'Frontend Developer',
      projects: [],
      detailedProjects: [
        {
          name: 'Sign Language Recognition System',
          title: 'Sign Language Recognition System',
          description: 'Built a real-time sign language recognition system using Python, OpenCV, and MediaPipe. Implemented static gesture recognition using 3D hand landmark detection.',
          technologies: ['Python', 'OpenCV', 'MediaPipe'],
          achievements: ['Trained a Random Forest classifier, achieving over 90% accuracy.'],
        },
      ],
      standaloneClaims: [],
      allClaims: [],
    });

    let analyzedProfile = null;
    const controller = createCrossExaminationController({
      SessionModel: MockSession,
      extractClaimsFn: mockExtractClaims,
      analyzeBlueprintFn: ({ crossExaminationProfile }) => {
        analyzedProfile = crossExaminationProfile;
        return analyzeProjectClaims({ crossExaminationProfile });
      },
      generateQuestionsFn: async () => ({
        success: true,
        questions: [{ questionId: 'q1', questionText: 'Describe your OpenCV pipeline.' }],
      }),
    });

    const req = {
      userId: dummyUserId,
      body: {
        resumeText: sampleStudentResume,
      },
    };
    const res = createMockRes();

    await controller.createSession(req, res);

    assert.strictEqual(res.statusCode, 201);
    assert.ok(analyzedProfile !== null);
    assert.strictEqual(analyzedProfile.projects.length, 1);
    assert.strictEqual(analyzedProfile.projects[0].title, 'Sign Language Recognition System');
    assert.ok(analyzedProfile.projects[0].claims.length >= 1, 'Normalized project must have grounded claims');
  });

  // -------------------------------------------------------------
  // 3. Claims Extractor Output Schema Integrity
  // -------------------------------------------------------------
  it('3. should verify extractResumeClaims supplies max_tokens: 3000 to prevent mid-token JSON truncation', async () => {
    let capturedOptions = null;
    const mockAskAI = async (messages, options) => {
      capturedOptions = options;
      return JSON.stringify({
        role: 'Full-Stack Developer',
        projects: [
          {
            title: 'Sample Project',
            description: 'Sample description',
            technologies: ['React'],
            claims: [
              {
                statement: 'Built frontend in React',
                category: CLAIM_CATEGORIES.PROJECT_CONTRIBUTION,
                sourceExcerpt: 'Built frontend in React',
                provenanceType: PROVENANCE_TYPES.EXPLICIT_SOURCE_STATEMENT,
                confidence: CONFIDENCE_LEVELS.HIGH,
              },
            ],
          },
        ],
      });
    };

    const extraction = await extractResumeClaims({
      resumeText: 'Sample resume text with React project. Built frontend in React.',
      askAIFn: mockAskAI,
    });

    assert.ok(capturedOptions !== null);
    assert.strictEqual(capturedOptions.max_tokens, 3000, 'extractResumeClaims must request 3000 tokens to avoid truncation');
    assert.strictEqual(extraction.success, true);
    assert.strictEqual(extraction.projects.length, 1);
  });

  // -------------------------------------------------------------
  // 4. Valid Claims Are Not Incorrectly Filtered Out
  // -------------------------------------------------------------
  it('4. should not discard valid claims during blueprint opportunity mapping', () => {
    const profile = {
      projects: [
        {
          projectId: 'prj_1',
          title: 'NutriShield',
          description: 'AI-Powered Food Allergen Detection System using React and OCR.',
          technologies: ['React', 'JavaScript'],
          claims: [
            {
              claimId: 'clm_1',
              statement: 'Implemented dynamic UI states and real-time safety result rendering.',
              category: CLAIM_CATEGORIES.PROJECT_CONTRIBUTION,
              provenanceType: PROVENANCE_TYPES.EXPLICIT_SOURCE_STATEMENT,
              confidence: CONFIDENCE_LEVELS.HIGH,
            },
          ],
        },
      ],
    };

    const blueprint = analyzeProjectClaims({ crossExaminationProfile: profile });
    assert.strictEqual(blueprint.success, true);
    assert.ok(blueprint.allOpportunitiesSorted.length >= 1, 'Must have at least one opportunity');
    const directClaimOpp = blueprint.allOpportunitiesSorted.find(
      (o) => o.opportunityType === 'DIRECT_CLAIM_PROBE' && o.referencedClaimIds.includes('clm_1')
    );
    assert.ok(directClaimOpp, 'Direct claim probe must be present for clm_1');
  });

  // -------------------------------------------------------------
  // 5. Resume Genuinely Lacking Usable Claims Returns Clear 422
  // -------------------------------------------------------------
  it('5. should return HTTP 422 with clear message when resume genuinely lacks usable claims', async () => {
    const MockSession = createMockSessionClass();
    const controller = createCrossExaminationController({
      SessionModel: MockSession,
      extractClaimsFn: ({ resumeText }) => extractResumeClaims({
        resumeText,
        askAIFn: async () => JSON.stringify({ role: null, projects: [], standaloneClaims: [] }),
      }),
      analyzeBlueprintFn: analyzeProjectClaims,
    });

    const req = {
      userId: dummyUserId,
      body: {
        resumeText: sparseResumeNoProjects,
      },
    };
    const res = createMockRes();

    await controller.createSession(req, res);

    assert.strictEqual(res.statusCode, 422);
    assert.strictEqual(
      res.body.message,
      'Unable to derive examination opportunities from the provided resume/project claims'
    );
    assert.strictEqual(MockSession.getCreated(), null, 'Must NOT create a session when opportunities cannot be derived');
  });

  // -------------------------------------------------------------
  // 6. Malformed AI Responses Handled Safely via Fallback
  // -------------------------------------------------------------
  it('6. should safely fall back to deterministic extraction when AI returns malformed JSON or times out', async () => {
    const MockSession = createMockSessionClass();

    const failingAskAI = async () => {
      throw new Error('504 Gateway Timeout from AI provider');
    };

    const controller = createCrossExaminationController({
      SessionModel: MockSession,
      extractClaimsFn: ({ resumeText }) => extractResumeClaims({ resumeText, askAIFn: failingAskAI }),
      analyzeBlueprintFn: analyzeProjectClaims,
      generateQuestionsFn: async () => ({
        success: true,
        questions: [{ questionId: 'q_fb', questionText: 'Explain your sign language pipeline.' }],
      }),
    });

    const req = {
      userId: dummyUserId,
      body: {
        resumeText: sampleStudentResume,
      },
    };
    const res = createMockRes();

    await controller.createSession(req, res);

    assert.strictEqual(res.statusCode, 201, `Expected 201 on fallback, got ${res.statusCode}: ${JSON.stringify(res.body)}`);
    assert.ok(res.body.session);
    assert.ok(MockSession.getCreated() !== null);
  });

  // -------------------------------------------------------------
  // 7. Failed Derivation Leaves Zero Partial Sessions
  // -------------------------------------------------------------
  it('7. should leave no database session if question generation fails after opportunity derivation', async () => {
    const MockSession = createMockSessionClass();

    const controller = createCrossExaminationController({
      SessionModel: MockSession,
      extractClaimsFn: ({ resumeText }) => extractResumeClaims({
        resumeText,
        askAIFn: async () => mockAiExtractionResponse,
      }),
      analyzeBlueprintFn: analyzeProjectClaims,
      generateQuestionsFn: async () => ({
        success: false,
        questions: [],
        error: 'Question generation timeout',
      }),
    });

    const req = {
      userId: dummyUserId,
      body: {
        resumeText: sampleStudentResume,
      },
    };
    const res = createMockRes();

    await controller.createSession(req, res);

    assert.strictEqual(res.statusCode, 502);
    assert.strictEqual(MockSession.getCreated(), null, 'Database session must not be created when questions fail');
  });

  // -------------------------------------------------------------
  // 8. Retrying a Request Remains Idempotent
  // -------------------------------------------------------------
  it('8. should return existing session without duplicate creation on repeated idempotency key', async () => {
    const MockSession = createMockSessionClass();
    const controller = createCrossExaminationController({
      SessionModel: MockSession,
      extractClaimsFn: ({ resumeText }) => extractResumeClaims({
        resumeText,
        askAIFn: async () => mockAiExtractionResponse,
      }),
      analyzeBlueprintFn: analyzeProjectClaims,
      generateQuestionsFn: async () => ({
        success: true,
        questions: [{ questionId: 'q_idemp', questionText: 'Tell me about NutriShield.' }],
      }),
    });

    const req1 = {
      userId: dummyUserId,
      headers: { 'idempotency-key': 'idem_hotfix_422' },
      body: {
        resumeText: sampleStudentResume,
        idempotencyKey: 'idem_hotfix_422',
      },
    };
    const res1 = createMockRes();

    await controller.createSession(req1, res1);
    assert.strictEqual(res1.statusCode, 201);
    const createdSessionId = res1.body.session.sessionId;

    // Replay identical request
    const req2 = {
      userId: dummyUserId,
      headers: { 'idempotency-key': 'idem_hotfix_422' },
      body: {
        resumeText: sampleStudentResume,
        idempotencyKey: 'idem_hotfix_422',
      },
    };
    const res2 = createMockRes();

    await controller.createSession(req2, res2);
    assert.strictEqual(res2.statusCode, 200);
    assert.strictEqual(res2.body.isIdempotentReplay, true);
    assert.strictEqual(res2.body.session.sessionId, createdSessionId);
  });

  // -------------------------------------------------------------
  // 9. Real MY_RESUME.pdf Upload and Opportunity Derivation
  // -------------------------------------------------------------
  it('9. should successfully derive opportunities and initialize session from real MY_RESUME.pdf buffer', async () => {
    const realPdfPath = path.resolve('C:/Users/263237/Downloads/MY_RESUME.pdf');
    if (!fs.existsSync(realPdfPath)) return;

    const pdfBuffer = await fs.promises.readFile(realPdfPath);
    const MockSession = createMockSessionClass();

    const controller = createCrossExaminationController({
      SessionModel: MockSession,
      parsePdfFn: defaultParsePdf,
      extractClaimsFn: ({ resumeText }) => extractResumeClaims({
        resumeText,
        askAIFn: async () => mockAiExtractionResponse,
      }),
      analyzeBlueprintFn: analyzeProjectClaims,
      generateQuestionsFn: async ({ examinationBlueprint }) => ({
        success: true,
        questions: [
          {
            questionId: 'q_real_1',
            questionText: 'In your Sign Language Recognition System, how was the Random Forest trained on 3D landmarks?',
            opportunityId: examinationBlueprint.allOpportunitiesSorted[0].opportunityId,
          },
        ],
      }),
    });

    const req = {
      userId: dummyUserId,
      file: {
        buffer: pdfBuffer,
        originalname: 'MY_RESUME.pdf',
        size: pdfBuffer.length,
      },
      body: {
        targetRole: 'Computer Science Engineer',
        targetDomain: 'Machine Learning & Web Applications',
      },
    };
    const res = createMockRes();

    await controller.createSession(req, res);

    assert.strictEqual(res.statusCode, 201, `Failed to create session from real PDF: ${JSON.stringify(res.body)}`);
    assert.ok(res.body.session);
    assert.strictEqual(res.body.session.status, 'awaiting_answer');
    assert.strictEqual(res.body.session.questions.length, 1);
  });

  // -------------------------------------------------------------
  // 10. Real MY_RESUME.pdf Upload with AI Extraction Failure (Deterministic Fallback)
  // -------------------------------------------------------------
  it('10. should derive opportunities and initialize session from real MY_RESUME.pdf when AI fails completely', async () => {
    const realPdfPath = path.resolve('C:/Users/263237/Downloads/MY_RESUME.pdf');
    if (!fs.existsSync(realPdfPath)) return;

    const pdfBuffer = await fs.promises.readFile(realPdfPath);
    const MockSession = createMockSessionClass();

    let opportunitiesReceived = null;
    const controller = createCrossExaminationController({
      SessionModel: MockSession,
      parsePdfFn: defaultParsePdf,
      extractClaimsFn: ({ resumeText }) => extractResumeClaims({
        resumeText,
        askAIFn: async () => { throw new Error('AI extraction unavailable (local timeout/quota)'); },
      }),
      analyzeBlueprintFn: analyzeProjectClaims,
      generateQuestionsFn: async ({ examinationBlueprint }) => {
        opportunitiesReceived = examinationBlueprint.allOpportunitiesSorted;
        return {
          success: true,
          questions: [
            {
              questionId: 'q_fallback_1',
              questionText: 'How was the dataset collected for Sign Language Recognition?',
              opportunityId: examinationBlueprint.allOpportunitiesSorted[0].opportunityId,
            },
          ],
        };
      },
    });

    const req = {
      userId: dummyUserId,
      file: {
        buffer: pdfBuffer,
        originalname: 'MY_RESUME.pdf',
        size: pdfBuffer.length,
      },
      body: {
        targetRole: 'Software Engineer',
      },
    };
    const res = createMockRes();

    await controller.createSession(req, res);

    assert.strictEqual(res.statusCode, 201, 'Failed to create session with deterministic fallback');
    assert.ok(res.body.session);
    assert.ok(Array.isArray(opportunitiesReceived) && opportunitiesReceived.length > 0, 'Must derive opportunities from deterministic projects');
    const createdSession = MockSession.getCreated();
    assert.ok(createdSession);
    assert.ok(createdSession.projects.some((p) => p.title.includes('Sign Language Recognition System')));
  });

  // -------------------------------------------------------------
  // 11. PDF Text Reaches Claim Extractor Verifiably
  // -------------------------------------------------------------
  it('11. should verify valid PDF text extracted from buffer reaches the claim extractor', async () => {
    const realPdfPath = path.resolve('C:/Users/263237/Downloads/MY_RESUME.pdf');
    if (!fs.existsSync(realPdfPath)) return;

    const pdfBuffer = await fs.promises.readFile(realPdfPath);
    let capturedResumeText = null;

    const controller = createCrossExaminationController({
      SessionModel: createMockSessionClass(),
      parsePdfFn: defaultParsePdf,
      extractClaimsFn: async ({ resumeText }) => {
        capturedResumeText = resumeText;
        return {
          role: 'Full Stack Developer',
          projects: [
            {
              projectId: 'prj_test_1',
              title: 'Portfolio Website',
              claims: [
                {
                  claimId: 'clm_test_1',
                  statement: 'Built personal portfolio website with React',
                  category: 'PROJECT_CONTRIBUTION',
                },
              ],
            },
          ],
        };
      },
      analyzeBlueprintFn: analyzeProjectClaims,
      generateQuestionsFn: async ({ examinationBlueprint }) => ({
        success: true,
        questions: [
          {
            questionId: 'q_1',
            questionText: 'Tell me about Portfolio Website',
            opportunityId: examinationBlueprint.allOpportunitiesSorted[0].opportunityId,
          },
        ],
      }),
    });

    const req = {
      userId: dummyUserId,
      file: { buffer: pdfBuffer, originalname: 'MY_RESUME.pdf', size: pdfBuffer.length },
    };
    const res = createMockRes();

    await controller.createSession(req, res);

    assert.strictEqual(res.statusCode, 201);
    assert.ok(capturedResumeText, 'Extracted resume text must reach extractClaimsFn');
    assert.ok(capturedResumeText.includes('Sagun Yadav'), 'Captured text must contain real candidate name from PDF');
  });
});
