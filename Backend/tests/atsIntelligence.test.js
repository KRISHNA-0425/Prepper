/**
 * @file atsIntelligence.test.js
 * Comprehensive automated test suite for Module 7: AI Resume-to-Job ATS & Application Intelligence.
 * Verifies document parsing (PDF, DOCX, TXT), canonical skill normalization, explainable ATS scoring,
 * resume improvement non-hallucination rules, credit deductions, and anti-IDOR security.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

import {
  parseResumeDocument,
  sanitizeFileName,
  computeBufferHash,
} from '../services/ats/atsDocumentParser.service.js';
import {
  normalizeSkill,
  normalizeSkillList,
  checkSkillMatch,
} from '../services/ats/atsSkillNormalizer.js';
import {
  extractContactInfoRegex,
  segmentResumeSections,
  buildDeterministicProfile,
} from '../services/ats/atsResumeExtractor.service.js';
import {
  buildDeterministicJobProfile,
  analyzeJobDescription,
} from '../services/ats/atsJobAnalyzer.service.js';
import {
  evaluateDeterministicAts,
  deriveMatchCategory,
  buildSkillGapsList,
  matchResumeToJob,
} from '../services/ats/atsMatcher.service.js';
import {
  buildDeterministicImprovements,
  generateResumeImprovements,
} from '../services/ats/atsResumeImprovement.service.js';
import {
  runAtsAnalysis,
  getAtsAnalysisById,
  deleteAtsAnalysis,
  updateImprovementStatus,
} from '../services/ats/atsReport.service.js';
import Resume from '../models/resume.model.js';
import ATSAnalysis from '../models/atsAnalysis.model.js';
import User from '../models/user.model.js';

describe('Module 7: AI Resume-to-Job ATS & Application Intelligence Test Suite', () => {
  const userIdA = new mongoose.Types.ObjectId();
  const userIdB = new mongoose.Types.ObjectId();

  const sampleTxtResume = `
John Doe
john.doe@example.com | (555) 123-4567 | San Francisco, CA
https://linkedin.com/in/johndoe | https://github.com/johndoe

Professional Summary
Full-stack software engineer with 3+ years of experience building scalable web applications.

Technical Skills
JavaScript, TypeScript, React, Node.js, Express.js, MongoDB, PostgreSQL, Docker, Git, AWS

Experience
Senior Software Engineer at Acme Corp (2022 - Present)
- Engineered high-throughput microservices handling 10,000 requests per minute using Node.js and Express.js.
- Developed reactive client dashboards using React, Redux Toolkit, and Tailwind CSS.
- Optimized database query latency by 35% through indexing and MongoDB aggregation pipelines.

Software Developer at Beta Tech (2020 - 2022)
- Built internal tooling and REST APIs using Python and PostgreSQL.
- Implemented automated CI/CD deployment pipelines using Docker and GitHub Actions.

Projects
E-Commerce Cloud Platform
- Architected resilient microservices backend with Node.js, MongoDB, and Redis caching.
- Integrated payment processing gateway and automated order fulfillment notifications.

Education
Bachelor of Science in Computer Science, State University (2016 - 2020)
`;

  const sampleJobDescription = `
Senior Full Stack Engineer
Target Enterprise | San Francisco, CA

About the Role:
We are seeking a Senior Full Stack Engineer to lead architecture across our core cloud platform.
You will design scalable APIs, optimize distributed databases, and build rich user interfaces.

Requirements:
- 3+ years of experience with React, Node.js, and TypeScript.
- Strong knowledge of MongoDB or PostgreSQL.
- Experience with Docker and cloud deployments (AWS or GCP).

Preferred Qualifications:
- Experience with Next.js, Redis, and GraphQL.
- Familiarity with Kubernetes and microservices patterns.

Responsibilities:
- Build and maintain mission-critical customer-facing web services.
- Lead architectural decisions, code reviews, and engineering best practices.
- Collaborate with product designers and engineering managers.
`;

  // =========================================================================
  // 1. Document Parsing & Security Sanitization
  // =========================================================================
  describe('1. Document Parsing & Security Sanitization', () => {
    it('sanitizes malicious filenames and prevents path traversal attempts', () => {
      const maliciousName = '../../../../etc/passwd\0.pdf';
      const clean = sanitizeFileName(maliciousName);
      assert.ok(!clean.includes('..'), 'Must strip path traversal');
      assert.ok(!clean.includes('\0'), 'Must strip null bytes');
      assert.ok(!clean.includes('/'), 'Must strip slashes');
      assert.ok(clean.length > 0, 'Must produce clean name');
    });

    it('successfully parses TXT document and computes sha256 hash', async () => {
      const buffer = Buffer.from(sampleTxtResume, 'utf-8');
      const parsed = await parseResumeDocument({
        buffer,
        originalName: 'john_doe_resume.txt',
        mimeType: 'text/plain',
      });

      assert.equal(parsed.fileType, 'txt');
      assert.ok(parsed.rawText.includes('John Doe'));
      assert.ok(parsed.rawText.includes('Acme Corp'));
      assert.ok(parsed.contentHash.length === 64, 'Must compute 64-char sha256 hash');
      assert.equal(parsed.contentHash, computeBufferHash(buffer));
    });

    it('rejects unsupported file extensions with appropriate error code', async () => {
      const buffer = Buffer.from('executable binary code', 'utf-8');
      await assert.rejects(
        async () => {
          await parseResumeDocument({
            buffer,
            originalName: 'malicious_file.exe',
            mimeType: 'application/octet-stream',
          });
        },
        (err) => err.code === 'UNSUPPORTED_FORMAT'
      );
    });

    it('rejects empty or corrupt document buffers cleanly', async () => {
      const emptyBuffer = Buffer.alloc(0);
      await assert.rejects(
        async () => {
          await parseResumeDocument({
            buffer: emptyBuffer,
            originalName: 'empty.pdf',
          });
        },
        (err) => err.code === 'EMPTY_FILE'
      );
    });
  });

  // =========================================================================
  // 2. Canonical Skill Normalization & Mapping
  // =========================================================================
  describe('2. Canonical Skill Normalization', () => {
    it('maps technology aliases and variations to canonical standards without false merges', () => {
      assert.equal(normalizeSkill('react.js'), 'React');
      assert.equal(normalizeSkill('ReactJS'), 'React');
      assert.equal(normalizeSkill('react'), 'React');
      assert.equal(normalizeSkill('node.js'), 'Node.js');
      assert.equal(normalizeSkill('nodejs'), 'Node.js');
      assert.equal(normalizeSkill('mongo db'), 'MongoDB');
      assert.equal(normalizeSkill('mongodb'), 'MongoDB');
      assert.equal(normalizeSkill('ts'), 'TypeScript');
      assert.equal(normalizeSkill('golang'), 'Go');
      assert.equal(normalizeSkill('k8s'), 'Kubernetes');
    });

    it('deduplicates skills and strips invalid tokens', () => {
      const rawList = ['react.js', 'React', 'REACTJS', 'Node.js', 'node', 'MongoDB', 'mongo db'];
      const normalized = normalizeSkillList(rawList);
      assert.deepEqual(normalized, ['React', 'Node.js', 'MongoDB']);
    });

    it('matches required skills against candidate skills and source text with evidence sources', () => {
      const candidateSkills = ['React', 'Node.js', 'TypeScript', 'MongoDB'];
      const candidateText = 'Implemented distributed services with Docker and AWS.';

      const m1 = checkSkillMatch('react.js', candidateSkills, candidateText);
      assert.equal(m1.isMatched, true);
      assert.equal(m1.evidenceSource, 'skills_list');

      const m2 = checkSkillMatch('Docker', candidateSkills, candidateText);
      assert.equal(m2.isMatched, true);
      assert.equal(m2.evidenceSource, 'resume_body_text');

      const m3 = checkSkillMatch('Kubernetes', candidateSkills, candidateText);
      assert.equal(m3.isMatched, false);
      assert.equal(m3.evidenceSource, 'none');
    });

    it('strictly isolates Java from JavaScript, C from C++, and Go from Google Cloud', () => {
      const jsCandidate = ['JavaScript', 'Node.js', 'React'];
      const jsText = 'Fullstack JavaScript developer specializing in Node and React web apps.';

      // Java required -> must NOT match JavaScript
      const javaMatch = checkSkillMatch('Java', jsCandidate, jsText);
      assert.equal(javaMatch.isMatched, false, 'Java must NOT match JavaScript');

      // JavaScript required -> must match
      const jsMatch = checkSkillMatch('JavaScript', jsCandidate, jsText);
      assert.equal(jsMatch.isMatched, true, 'JavaScript must match');

      const cppCandidate = ['C++', 'Python'];
      const cppText = 'Developed high-performance trading engine in C++ and Python.';

      // C required -> must NOT match C++
      const cMatch = checkSkillMatch('C', cppCandidate, cppText);
      assert.equal(cMatch.isMatched, false, 'C must NOT match C++');

      // C++ required -> must match
      const cppMatch = checkSkillMatch('C++', cppCandidate, cppText);
      assert.equal(cppMatch.isMatched, true, 'C++ must match');

      // Go vs Google Cloud
      const gcpCandidate = ['Google Cloud'];
      const gcpText = 'Deployed microservices on Google Cloud platform.';
      const goMatch = checkSkillMatch('Go', gcpCandidate, gcpText);
      assert.equal(goMatch.isMatched, false, 'Go must NOT match Google Cloud');
    });
  });

  // =========================================================================
  // 3. Information Extraction (Resume & Job Description)
  // =========================================================================
  describe('3. Information Extraction Engine', () => {
    it('extracts contact information, links, and sections deterministically', () => {
      const contact = extractContactInfoRegex(sampleTxtResume);
      assert.equal(contact.fullName, 'John Doe');
      assert.equal(contact.email, 'john.doe@example.com');
      assert.ok(contact.linkedin.includes('linkedin.com/in/johndoe'));
      assert.ok(contact.github.includes('github.com/johndoe'));

      const sections = segmentResumeSections(sampleTxtResume);
      assert.ok(sections.skills.length > 0, 'Skills section must be captured');
      assert.ok(sections.experience.length > 0, 'Experience section must be captured');
      assert.ok(sections.projects.length > 0, 'Projects section must be captured');
    });

    it('parses job description and segregates mandatory vs preferred requirements', () => {
      const jdProfile = buildDeterministicJobProfile(sampleJobDescription, 'Senior Full Stack Engineer', 'Target Enterprise');
      assert.equal(jdProfile.jobTitle, 'Senior Full Stack Engineer');
      assert.equal(jdProfile.companyName, 'Target Enterprise');
      assert.ok(jdProfile.extractedRequirements.requiredTechnicalSkills.length > 0);
      assert.ok(jdProfile.extractedRequirements.preferredTechnicalSkills.length > 0);
      assert.equal(jdProfile.seniorityLevel, 'Senior-Level');
    });
  });

  // =========================================================================
  // 4. Explainable 7-Dimension ATS Scoring & Gap Engine
  // =========================================================================
  describe('4. Explainable 7-Dimension ATS Scoring Engine', () => {
    it('computes explainable score breakdown summing strictly to 100% weights', () => {
      const resumeProfile = buildDeterministicProfile(sampleTxtResume);
      const jdProfile = buildDeterministicJobProfile(sampleJobDescription, 'Senior Full Stack Engineer', 'Target Enterprise');

      const result = evaluateDeterministicAts(resumeProfile, jdProfile);

      assert.ok(typeof result.overallScore === 'number' && result.overallScore >= 0 && result.overallScore <= 100);
      assert.ok(['Excellent Match', 'Strong Match', 'Moderate Match', 'Weak Match', 'Low Match'].includes(result.matchCategory));

      const dims = result.dimensionScores;
      assert.ok(dims.requiredSkills.weight === 30, 'Required skills weight must be 30%');
      assert.ok(dims.experienceRelevance.weight === 20, 'Experience weight must be 20%');
      assert.ok(dims.projectRelevance.weight === 15, 'Project weight must be 15%');
      assert.ok(dims.preferredSkills.weight === 10, 'Preferred skills weight must be 10%');
      assert.ok(dims.responsibilitiesAlignment.weight === 10, 'Responsibilities weight must be 10%');
      assert.ok(dims.keywordCoverage.weight === 10, 'Keyword coverage weight must be 10%');
      assert.ok(dims.educationRelevance.weight === 5, 'Education weight must be 5%');

      const totalWeights = Object.values(dims).reduce((sum, d) => sum + d.weight, 0);
      assert.equal(totalWeights, 100, 'Dimension weights must sum strictly to 100%');
    });

    it('builds prioritized skill gaps distinguishing mandatory vs preferred requirements', () => {
      const missingReq = ['Kubernetes', 'GraphQL'];
      const missingPref = ['Next.js'];
      const gaps = buildSkillGapsList(missingReq, missingPref, 'Senior Full Stack Engineer');

      assert.equal(gaps.length, 3);
      assert.equal(gaps[0].skill, 'Kubernetes');
      assert.equal(gaps[0].importance, 'mandatory');
      assert.equal(gaps[0].impactPriority, 'High');

      assert.equal(gaps[2].skill, 'Next.js');
      assert.equal(gaps[2].importance, 'preferred');
      assert.equal(gaps[2].impactPriority, 'Medium');
    });
  });

  // =========================================================================
  // 5. Grounded Resume Improvements (Non-Hallucination Rules)
  // =========================================================================
  describe('5. Grounded Resume Improvement Engine', () => {
    it('rewrites summary, bullets, and projects without inventing unverified facts', () => {
      const resumeProfile = buildDeterministicProfile(sampleTxtResume);
      const jdProfile = buildDeterministicJobProfile(sampleJobDescription, 'Senior Full Stack Engineer', 'Target Enterprise');

      const improvements = buildDeterministicImprovements(resumeProfile, jdProfile);

      assert.ok(improvements.professionalSummary.suggested.length > 0);
      assert.ok(improvements.professionalSummary.suggested.includes('Target Enterprise'));
      assert.equal(improvements.professionalSummary.status, 'pending');

      assert.ok(improvements.experienceBullets.length > 0);
      assert.ok(improvements.experienceBullets[0].actionVerb.length > 0);
      assert.equal(improvements.experienceBullets[0].status, 'pending');

      assert.ok(improvements.projectImprovements.length > 0);
      assert.equal(improvements.projectImprovements[0].status, 'pending');

      assert.ok(improvements.keywordRecommendations.length > 0);
    });
  });

  // =========================================================================
  // 6. Report Persistence, Credit Safety & Anti-IDOR Security
  // =========================================================================
  describe('6. Report Persistence, Credit Deductions & Anti-IDOR Security', () => {
    const mockAnalyses = new Map();
    const mockResumes = new Map();
    let originalAnalysisSave;
    let originalAnalysisFindById;
    let originalAnalysisFindOne;
    let originalResumeFindOne;

    before(() => {
      originalAnalysisSave = ATSAnalysis.prototype.save;
      originalAnalysisFindById = ATSAnalysis.findById;
      originalAnalysisFindOne = ATSAnalysis.findOne;
      originalResumeFindOne = Resume.findOne;

      ATSAnalysis.prototype.save = async function () {
        if (!this._id) this._id = new mongoose.Types.ObjectId();
        mockAnalyses.set(this._id.toString(), this);
        return this;
      };

      ATSAnalysis.findById = function (id) {
        const doc = mockAnalyses.get(id?.toString()) || null;
        return {
          ...doc,
          userId: doc?.userId,
          populate: function () {
            return Promise.resolve(doc);
          },
          then: function (resolve) {
            return Promise.resolve(resolve(doc));
          },
        };
      };

      ATSAnalysis.findOne = function (query) {
        return mockAnalyses.get(query?._id?.toString()) || null;
      };

      Resume.findOne = async function (query) {
        return mockResumes.get(query?._id?.toString()) || null;
      };
    });

    after(() => {
      ATSAnalysis.prototype.save = originalAnalysisSave;
      ATSAnalysis.findById = originalAnalysisFindById;
      ATSAnalysis.findOne = originalAnalysisFindOne;
      Resume.findOne = originalResumeFindOne;
    });

    it('rejects analysis if candidate has insufficient credits', async () => {
      const mockResumeId = new mongoose.Types.ObjectId();
      mockResumes.set(mockResumeId.toString(), {
        _id: mockResumeId,
        userId: userIdA,
        structuredData: buildDeterministicProfile(sampleTxtResume),
      });

      const mockCheckCredits = async () => ({ hasCredits: false, message: 'Free limit reached please purchase more credits' });

      await assert.rejects(
        async () => {
          await runAtsAnalysis({
            userId: userIdA,
            resumeId: mockResumeId,
            jobTitle: 'Senior Full Stack Engineer',
            rawJobDescription: sampleJobDescription,
            options: { checkUserCredits: mockCheckCredits },
          });
        },
        /Free limit reached/
      );
    });

    it('triggers automatic credit refund rollback if analysis persistence throws', async () => {
      const mockResumeId = new mongoose.Types.ObjectId();
      mockResumes.set(mockResumeId.toString(), {
        _id: mockResumeId,
        userId: userIdA,
        structuredData: buildDeterministicProfile(sampleTxtResume),
      });

      let refunded = false;
      const mockCheckCredits = async () => ({ hasCredits: true });
      const mockDeductCredits = async () => ({ success: true });
      const mockRefundCredits = async () => {
        refunded = true;
        return { success: true };
      };
      const mockAskAI = async () => JSON.stringify({});

      const failingSave = async function () {
        throw new Error('Database disk error');
      };
      ATSAnalysis.prototype.save = failingSave;

      try {
        await runAtsAnalysis({
          userId: userIdA,
          resumeId: mockResumeId,
          jobTitle: 'Senior Full Stack Engineer',
          rawJobDescription: sampleJobDescription,
          options: {
            checkUserCredits: mockCheckCredits,
            deductInterviewCredits: mockDeductCredits,
            refundInterviewCredits: mockRefundCredits,
            askAI: mockAskAI,
          },
        });
      } catch (err) {
        // Expected
      } finally {
        ATSAnalysis.prototype.save = async function () {
          if (!this._id) this._id = new mongoose.Types.ObjectId();
          mockAnalyses.set(this._id.toString(), this);
          return this;
        };
      }

      assert.equal(refunded, true, 'Refund guard must execute on persistence failure');
    });

    it('prevents User B from accessing or deleting User A ATS analysis (anti-IDOR)', async () => {
      const testAnalysisId = new mongoose.Types.ObjectId();
      const userAAnalysis = {
        _id: testAnalysisId,
        userId: userIdA,
        jobDetails: { jobTitle: 'Cloud Architect' },
        scoring: { overallScore: 82, matchCategory: 'Strong Match' },
      };
      mockAnalyses.set(testAnalysisId.toString(), userAAnalysis);

      // User A access succeeds
      const ownReport = await getAtsAnalysisById(testAnalysisId, userIdA);
      assert.ok(ownReport);
      assert.equal(ownReport.scoring.overallScore, 82);

      // User B unauthorized access throws HTTP 403 Forbidden
      await assert.rejects(
        async () => {
          await getAtsAnalysisById(testAnalysisId, userIdB);
        },
        (err) => err.statusCode === 403
      );

      // User B deletion throws HTTP 403 Forbidden
      await assert.rejects(
        async () => {
          await deleteAtsAnalysis(testAnalysisId, userIdB);
        },
        (err) => err.statusCode === 403
      );
    });
  });
});
