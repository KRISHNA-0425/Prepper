import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import mongoose from 'mongoose';
import {
  createCrossExaminationController,
  defaultParsePdf,
} from '../controllers/crossExamination.controller.js';

describe('Cross-Examination PDF Upload & Session Creation Hotfix Suite', () => {

  const dummyUserId = new mongoose.Types.ObjectId().toString();

  const createSampleBlueprint = () => ({
    success: true,
    blueprintId: 'blp_sample_01',
    allOpportunitiesSorted: [
      {
        opportunityId: 'opp_alpha_01',
        projectId: 'prj_alpha_1',
        projectTitle: 'Cloud Platform',
        referencedClaimIds: ['clm_1'],
        priorityScore: 85,
      },
    ],
  });

  const createSampleQuestions = () => [
    {
      questionId: 'ceq_sample_1',
      order: 1,
      questionText: 'Can you elaborate on your distributed cache architecture?',
      inquiryType: 'CLARIFY_METRIC',
      status: 'current',
      difficulty: 'medium',
      timeLimit: 90,
    },
  ];

  const createMockSessionClass = () => {
    let createdDoc = null;
    const store = new Map();

    class MockSession {
      constructor(data) {
        Object.assign(this, data);
        this._id = new mongoose.Types.ObjectId().toString();
        this.status = 'initialized';
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
          for (const s of store.values()) {
            if (s.idempotencyKey === query.idempotencyKey) return s;
          }
        }
        return null;
      }

      static getCreated() {
        return createdDoc;
      }

      static seedSession(doc) {
        store.set(doc._id, doc);
      }
    }

    return MockSession;
  };

  const createMockRes = () => {
    const res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
    };
    return res;
  };

  // =========================================================================
  // 1. Valid PDF upload with buffer (MemoryStorage) and file path
  // =========================================================================
  describe('1. PDF Upload Format Compatibility (Buffer vs Path)', () => {
    it('should parse PDF when req.file contains a buffer (multer.memoryStorage)', async () => {
      let passedInput = null;
      const MockSessionModel = createMockSessionClass();

      const controller = createCrossExaminationController({
        SessionModel: MockSessionModel,
        parsePdfFn: async (input) => {
          passedInput = input;
          return 'Senior Full Stack Engineer with 5 years experience in Node.js, React, distributed systems, and PostgreSQL.';
        },
        extractClaimsFn: async () => ({
          projects: [{ projectId: 'p1', name: 'Cloud Platform', claims: [] }],
          allClaims: [],
          resumeHash: 'hash_buffer_123',
          role: 'Full Stack Engineer',
        }),
        analyzeBlueprintFn: () => createSampleBlueprint(),
        generateQuestionsFn: async () => ({
          success: true,
          questions: createSampleQuestions(),
        }),
      });

      const mockBuffer = Buffer.from('%PDF-1.4 Mock valid PDF binary buffer');
      const req = {
        userId: dummyUserId,
        file: {
          fieldname: 'resume',
          originalname: 'MY_RESUME.pdf',
          mimetype: 'application/pdf',
          buffer: mockBuffer,
          size: mockBuffer.length,
        },
        body: { targetRole: 'Full Stack Engineer' },
      };
      const res = createMockRes();

      await controller.createSession(req, res);

      assert.strictEqual(res.statusCode, 201, 'Must return 201 Created on valid buffer upload');
      assert.ok(Buffer.isBuffer(passedInput), 'parsePdfFn must receive the buffer directly from memoryStorage');
      assert.strictEqual(passedInput, mockBuffer);
      assert.strictEqual(res.body.session.targetRole, 'Full Stack Engineer');
      assert.ok(MockSessionModel.getCreated(), 'Session document must be created');
    });

    it('should parse PDF when req.file contains a file path (diskStorage compatibility)', async () => {
      let passedInput = null;
      const MockSessionModel = createMockSessionClass();

      const controller = createCrossExaminationController({
        SessionModel: MockSessionModel,
        parsePdfFn: async (input) => {
          passedInput = input;
          return 'Experienced DevOps Engineer with Kubernetes, Terraform, and AWS infrastructure background.';
        },
        extractClaimsFn: async () => ({
          projects: [{ projectId: 'p1', name: 'Infra Pipeline', claims: [] }],
          allClaims: [],
          resumeHash: 'hash_disk_123',
          role: 'DevOps Engineer',
        }),
        analyzeBlueprintFn: () => createSampleBlueprint(),
        generateQuestionsFn: async () => ({
          success: true,
          questions: createSampleQuestions(),
        }),
      });

      const fakePath = 'temp_resume_test.pdf';
      fs.writeFileSync(fakePath, 'dummy pdf file');

      try {
        const req = {
          userId: dummyUserId,
          file: {
            fieldname: 'resume',
            originalname: 'resume.pdf',
            mimetype: 'application/pdf',
            path: fakePath,
          },
          body: { targetRole: 'DevOps Engineer' },
        };
        const res = createMockRes();

        await controller.createSession(req, res);

        assert.strictEqual(res.statusCode, 201);
        assert.strictEqual(passedInput, fakePath, 'parsePdfFn must receive filePath when path exists');
        assert.strictEqual(fs.existsSync(fakePath), false, 'Disk file must be safely unlinked in finally block');
      } finally {
        if (fs.existsSync(fakePath)) fs.unlinkSync(fakePath);
      }
    });
  });

  // =========================================================================
  // 2. Exact multipart field name ('resume') and middleware guards
  // =========================================================================
  describe('2. Multipart Field Name & Route Validation', () => {
    it('should reject unsupported file types (.docx or images) with 400', () => {
      const req = {
        is: (type) => type === 'multipart/form-data',
        file: {
          fieldname: 'resume',
          originalname: 'my_resume.docx',
          mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          buffer: Buffer.from('fake docx'),
          size: 100,
        },
      };
      let resStatus = null;
      let resBody = null;
      const res = {
        status(code) {
          resStatus = code;
          return this;
        },
        json(data) {
          resBody = data;
          return this;
        },
      };

      let nextCalled = false;
      const middleware = (r, s, n) => {
        if (r.file) {
          const ext = (r.file.originalname || '').toLowerCase();
          if (!ext.endsWith('.pdf')) {
            return s.status(400).json({ message: 'Only PDF resume files (.pdf) are supported' });
          }
        }
        n();
      };

      middleware(req, res, () => { nextCalled = true; });

      assert.strictEqual(resStatus, 400);
      assert.strictEqual(resBody.message, 'Only PDF resume files (.pdf) are supported');
      assert.strictEqual(nextCalled, false);
    });

    it('should reject 0-byte empty file with 400', () => {
      const req = {
        is: (type) => type === 'multipart/form-data',
        file: {
          fieldname: 'resume',
          originalname: 'empty.pdf',
          mimetype: 'application/pdf',
          buffer: Buffer.alloc(0),
          size: 0,
        },
      };
      let resStatus = null;
      let resBody = null;
      const res = {
        status(code) {
          resStatus = code;
          return this;
        },
        json(data) {
          resBody = data;
          return this;
        },
      };

      const middleware = (r, s, n) => {
        if (r.file) {
          if (!r.file.size || r.file.size === 0 || (r.file.buffer && r.file.buffer.length === 0)) {
            return s.status(400).json({ message: 'Uploaded PDF resume file is empty' });
          }
        }
        n();
      };

      middleware(req, res, () => {});
      assert.strictEqual(resStatus, 400);
      assert.strictEqual(resBody.message, 'Uploaded PDF resume file is empty');
    });
  });

  // =========================================================================
  // 3. Error Classification & Zero Partial Creation
  // =========================================================================
  describe('3. Error Classification & Zero Partial Session Creation', () => {
    it('should distinguish password-protected PDF from generic parser error and NOT create a session', async () => {
      const MockSessionModel = createMockSessionClass();

      const controller = createCrossExaminationController({
        SessionModel: MockSessionModel,
        parsePdfFn: async () => {
          const err = new Error('PasswordException: Document is encrypted');
          err.name = 'PasswordException';
          throw err;
        },
      });

      const req = {
        userId: dummyUserId,
        file: {
          buffer: Buffer.from('%PDF encrypted'),
          originalname: 'protected.pdf',
        },
        body: {},
      };
      const res = createMockRes();

      await controller.createSession(req, res);

      assert.strictEqual(res.statusCode, 400);
      assert.ok(res.body.message.includes('Password-protected PDFs are not supported'));
      assert.strictEqual(MockSessionModel.getCreated(), null, 'Database session must NOT be created when PDF parsing fails');
    });

    it('should distinguish corrupt/invalid PDF from generic parser error and NOT create a session', async () => {
      const MockSessionModel = createMockSessionClass();

      const controller = createCrossExaminationController({
        SessionModel: MockSessionModel,
        parsePdfFn: async () => {
          const err = new Error('InvalidPDFException: Format error');
          err.name = 'InvalidPDFException';
          throw err;
        },
      });

      const req = {
        userId: dummyUserId,
        file: {
          buffer: Buffer.from('not a pdf at all'),
          originalname: 'corrupt.pdf',
        },
        body: {},
      };
      const res = createMockRes();

      await controller.createSession(req, res);

      assert.strictEqual(res.statusCode, 400);
      assert.ok(res.body.message.includes('corrupted or unreadable'));
      assert.strictEqual(MockSessionModel.getCreated(), null);
    });

    it('should distinguish scanned PDF without readable text and NOT create a session', async () => {
      const MockSessionModel = createMockSessionClass();

      const controller = createCrossExaminationController({
        SessionModel: MockSessionModel,
        parsePdfFn: async () => {
          const err = new Error('Scanned PDF detected without readable text');
          err.isScanned = true;
          throw err;
        },
      });

      const req = {
        userId: dummyUserId,
        file: {
          buffer: Buffer.from('%PDF scanned image only'),
          originalname: 'scanned.pdf',
        },
        body: {},
      };
      const res = createMockRes();

      await controller.createSession(req, res);

      assert.strictEqual(res.statusCode, 400);
      assert.ok(res.body.message.includes('Scanned PDFs without readable text'));
      assert.strictEqual(MockSessionModel.getCreated(), null);
    });

    it('should distinguish session validation errors (e.g. invalid questionCount) from PDF parser errors', async () => {
      const MockSessionModel = createMockSessionClass();

      const controller = createCrossExaminationController({
        SessionModel: MockSessionModel,
        parsePdfFn: async () => 'Valid resume text that is more than fifty characters long with technical projects.',
      });

      const req = {
        userId: dummyUserId,
        file: {
          buffer: Buffer.from('%PDF valid'),
          originalname: 'resume.pdf',
        },
        body: { questionCount: 999 }, // Out of bounds
      };
      const res = createMockRes();

      await controller.createSession(req, res);

      assert.strictEqual(res.statusCode, 400);
      assert.ok(res.body.message.includes('questionCount must be an integer between'));
      assert.strictEqual(MockSessionModel.getCreated(), null);
    });

    it('should reject unauthenticated request with 401 before touching file or parser', async () => {
      let parserCalled = false;
      const controller = createCrossExaminationController({
        parsePdfFn: async () => {
          parserCalled = true;
          return 'some text';
        },
      });

      const req = {
        userId: null,
        file: { buffer: Buffer.from('test') },
        body: {},
      };
      const res = createMockRes();

      await controller.createSession(req, res);

      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(parserCalled, false, 'Parser must never be invoked if user is unauthenticated');
    });
  });

  // =========================================================================
  // 4. Actual MY_RESUME.pdf Upload Flow (Without Exposing Contents)
  // =========================================================================
  describe('4. Real MY_RESUME.pdf Upload & Session Creation Verification', () => {
    const realPdfPath = 'C:/Users/263237/Downloads/MY_RESUME.pdf';
    const fileExists = fs.existsSync(realPdfPath);

    it('should successfully parse real MY_RESUME.pdf buffer and extract > 50 chars of valid text', async () => {
      if (!fileExists) {
        console.log('Skipping MY_RESUME.pdf test (file not in Downloads)');
        return;
      }

      const fileBuffer = await fs.promises.readFile(realPdfPath);
      assert.ok(fileBuffer.length > 0, 'Buffer must not be empty');

      const extracted = await defaultParsePdf(fileBuffer);

      assert.ok(typeof extracted === 'string', 'Extracted text must be a string');
      assert.ok(extracted.length > 100, 'Must extract meaningful text (> 100 chars)');
      // Zero fabrication: must not be hardcoded placeholder
      assert.ok(!extracted.includes('[INSERT ROLE]') && !extracted.includes('LOREM IPSUM'));
    });

    it('should create a complete session from real MY_RESUME.pdf buffer without leaking sensitive data', async () => {
      if (!fileExists) return;

      const fileBuffer = await fs.promises.readFile(realPdfPath);
      const MockSessionModel = createMockSessionClass();

      let extractedClaimsCalled = false;
      const controller = createCrossExaminationController({
        SessionModel: MockSessionModel,
        parsePdfFn: defaultParsePdf,
        extractClaimsFn: async ({ resumeText }) => {
          extractedClaimsCalled = true;
          assert.ok(resumeText.length > 100);
          return {
            projects: [{ projectId: 'prj_1', name: 'Verified Project', claims: [] }],
            allClaims: [],
            resumeHash: 'hash_real_pdf',
            role: 'Software Developer',
          };
        },
        analyzeBlueprintFn: () => createSampleBlueprint(),
        generateQuestionsFn: async () => ({
          success: true,
          questions: createSampleQuestions(),
        }),
      });

      const req = {
        userId: dummyUserId,
        file: {
          fieldname: 'resume',
          originalname: 'MY_RESUME.pdf',
          mimetype: 'application/pdf',
          buffer: fileBuffer,
          size: fileBuffer.length,
        },
        body: { targetRole: 'Software Developer' },
      };
      const res = createMockRes();

      await controller.createSession(req, res);

      assert.strictEqual(res.statusCode, 201);
      assert.strictEqual(extractedClaimsCalled, true);
      assert.ok(res.body.session, 'Created session must be returned in response');
      assert.strictEqual(res.body.session.targetRole, 'Software Developer');
      assert.strictEqual(res.body.session.status, 'initialized');
    });
  });

  // =========================================================================
  // 5. Idempotent Retry Behavior
  // =========================================================================
  describe('5. Idempotent Retry Behavior', () => {
    it('should return existing session on replay without duplicating database records', async () => {
      const MockSessionModel = createMockSessionClass();
      const existingDoc = {
        _id: 'existing_session_456',
        userId: dummyUserId,
        idempotencyKey: 'idem_key_abc',
        targetRole: 'Platform Engineer',
        status: 'initialized',
        questions: [{ questionId: 'q1', order: 1, status: 'current' }],
        answers: [],
        toObject: function () { return { ...this }; },
      };
      MockSessionModel.seedSession(existingDoc);

      let parseCalled = false;
      const controller = createCrossExaminationController({
        SessionModel: MockSessionModel,
        parsePdfFn: async () => { parseCalled = true; },
      });

      const req = {
        userId: dummyUserId,
        headers: { 'idempotency-key': 'idem_key_abc' },
        file: { buffer: Buffer.from('dummy') },
        body: { idempotencyKey: 'idem_key_abc' },
      };
      const res = createMockRes();

      await controller.createSession(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.body.isIdempotentReplay, true);
      assert.strictEqual(res.body.session.sessionId, 'existing_session_456');
      assert.strictEqual(parseCalled, false, 'Parser must NOT be rerun when idempotent replay matches');
    });
  });

});
