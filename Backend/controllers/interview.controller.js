import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { askAI } from '../services/openRouter.service.js';
import { extractResumeClaims, extractTextFromDocxBuffer, safeParseJson } from '../services/resumeIntelligence.service.js';
import User from '../models/user.model.js';
import Interview from '../models/interview.model.js';
import CodingSubmission from '../models/codingSubmission.model.js';
import codingQuestionService from '../services/coding/codingQuestion.service.js';
import testCaseService from '../services/coding/testCase.service.js';
import CrossExaminationSession from '../models/crossExaminationSession.model.js';
import mongoose from 'mongoose';
import {
    INTERVIEW_CREDIT_COST,
    INSUFFICIENT_CREDITS_MESSAGE,
    checkUserCredits,
    deductInterviewCredits,
    refundInterviewCredits
} from '../services/credit.service.js';
import {
    calculateInterviewPricing,
    calculateQuestionDeadline,
    verifyAnswerDeadline,
    STANDARDIZED_DIFFICULTY,
    ANSWER_TIME_LIMIT_SECONDS,
    TIME_PACKAGES
} from '../services/interviewPricing.service.js';
import {
    evaluateAnswerWithEvidence,
    createEmptyAnswerEvaluation,
    buildSafeFallbackEvaluation,
    aggregateInterviewAnalytics,
    detectQuestionCategory
} from '../services/evidenceEvaluation.service.js';
import {
    DIFFICULTY_LEVELS,
    STEERING_ACTIONS,
    getTransitionPhrase
} from '../contracts/adaptiveContracts.js';
import {
    calculateDifficultyDecision
} from '../services/adaptiveDifficulty.service.js';
import {
    deriveApprovedCompetencies,
    updateTopicPerformanceRecord,
    detectKnowledgeGapsAndStrengths
} from '../services/knowledgeGap.service.js';
import {
    selectNextFocusTopic,
    generateAdaptiveQuestion
} from '../services/adaptiveSteering.service.js';

export { INTERVIEW_CREDIT_COST, STANDARDIZED_DIFFICULTY, ANSWER_TIME_LIMIT_SECONDS, TIME_PACKAGES };

export const cleanExtractedResumeText = (rawText) => {
    if (!rawText || typeof rawText !== 'string') return '';
    return rawText
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .replace(/[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000]/g, ' ')
        .replace(/\r\n|\r/g, '\n')
        .replace(/[^\S\r\n]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
};

export const resumeAnalyse = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Please upload your resume" });
        }

        // Support both memoryStorage (req.file.buffer) and diskStorage (req.file.path)
        let fileBuffer = req.file.buffer;
        if (!fileBuffer && req.file.path) {
            fileBuffer = await fs.promises.readFile(req.file.path);
        }

        if (!fileBuffer || fileBuffer.length === 0) {
            return res.status(400).json({ message: "Uploaded file is empty" });
        }

        const fileName = (req.file.originalname || '').toLowerCase();
        const isDocx = fileName.endsWith('.docx') || fileName.endsWith('.doc') || req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

        let resumeText = "";
        let totalTextItems = 0;
        let isScannedPdf = false;

        if (isDocx) {
            try {
                resumeText = extractTextFromDocxBuffer(fileBuffer);
            } catch (docxErr) {
                return res.status(400).json({
                    message: "The uploaded Word document is corrupted or unreadable. Please check the file and try again."
                });
            }
            if (!resumeText || !resumeText.trim()) {
                return res.status(400).json({
                    message: "Could not extract readable text from the Word document. The file may be empty, corrupt, or password-protected."
                });
            }
        } else {
            // PDF extraction with safe runtime options & error classification
            try {
                const uint8Array = new Uint8Array(fileBuffer);
                const loadingTask = pdfjsLib.getDocument({
                    data: uint8Array,
                    useSystemFonts: true,
                    isEvalSupported: false,
                    disableFontFace: true,
                });
                const pdf = await loadingTask.promise;

                // Extract text from all pages
                for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                    const page = await pdf.getPage(pageNum);
                    const content = await page.getTextContent();
                    if (content && content.items && content.items.length > 0) {
                        totalTextItems += content.items.length;
                        let pageText = '';
                        let lastY = null;
                        for (const item of content.items) {
                            if (item.str === undefined) continue;
                            const currentY = item.transform ? item.transform[5] : null;
                            if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 4) {
                                if (!pageText.endsWith('\n')) pageText += '\n';
                            }
                            pageText += item.str;
                            if (item.hasEOL && !pageText.endsWith('\n')) {
                                pageText += '\n';
                            } else if (!pageText.endsWith(' ') && !pageText.endsWith('\n')) {
                                pageText += ' ';
                            }
                            lastY = currentY;
                        }
                        resumeText += pageText + '\n\n';
                    }
                }

                if (pdf.numPages > 0 && totalTextItems === 0) {
                    isScannedPdf = true;
                }
            } catch (pdfErr) {
                if (pdfErr.name === 'PasswordException' || /password/i.test(pdfErr.message)) {
                    return res.status(400).json({
                        message: "Password-protected PDFs are not supported. Please upload an unprotected PDF."
                    });
                }
                if (pdfErr.name === 'InvalidPDFException' || /invalid pdf|corrupt|damaged/i.test(pdfErr.message)) {
                    return res.status(400).json({
                        message: "The uploaded PDF file is corrupted or unreadable. Please check the file and try again."
                    });
                }
                throw pdfErr;
            }
        }

        // Cleanup temporary file if diskStorage was used
        if (req.file.path && fs.existsSync(req.file.path)) {
            try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
        }

        if (isScannedPdf) {
            return res.status(400).json({
                message: "Scanned PDF detected without readable text. OCR is not supported; please upload a text-based PDF or Word document, or enter details manually.",
                isScanned: true
            });
        }

        resumeText = cleanExtractedResumeText(resumeText);

        if (!resumeText || resumeText.length < 20) {
            return res.status(400).json({
                message: "Could not extract sufficient text from document. The file may be empty or an image scan. Please upload a text-based PDF/DOCX or enter details manually.",
                isScanned: isScannedPdf || totalTextItems === 0
            });
        }

        // Safe extraction diagnostics (without logging sensitive personal data)
        const diagnostics = {
            fileType: req.file?.mimetype || (req.file?.originalname?.endsWith('.docx') ? 'docx' : 'pdf'),
            hasExtractedText: Boolean(resumeText && resumeText.trim().length > 0),
            extractedCharCount: resumeText?.length || 0,
            detectedSections: {
                skills: /(?:technical\s+skills|skills|technologies|core\s+competencies)/i.test(resumeText),
                projects: /(?:academic\s+&?\s*personal\s+projects|academic\s+projects|personal\s+projects|key\s+projects|projects)/i.test(resumeText),
                experience: /(?:experience|work\s+experience|employment)/i.test(resumeText),
                education: /(?:education|academics|university|college|b\.tech|bachelor)/i.test(resumeText),
            },
        };
        console.log('[resumeAnalyse] Safe extraction diagnostics:', JSON.stringify(diagnostics));

        // Source-grounded Resume Intelligence extraction pipeline
        const extraction = await extractResumeClaims({ resumeText });

        const normalizedProjects = (Array.isArray(extraction.projects) && extraction.projects.length)
            ? extraction.projects.map((p) => (typeof p === 'string' ? p : (p.name || p.title || ''))).filter(Boolean)
            : (Array.isArray(extraction.detailedProjects) ? extraction.detailedProjects.map((p) => (typeof p === 'string' ? p : (p.name || p.title || ''))).filter(Boolean) : []);

        diagnostics.structuredSkillsCount = (extraction.skills || []).length;
        diagnostics.structuredProjectsCount = normalizedProjects.length;

        // Return structured, validated fields with deterministic experience and skill/project metrics
        return res.status(200).json({
            role: extraction.role || '',
            targetRole: extraction.role || '',
            experience: extraction.experience || '',
            yearsOfExperience: extraction.experience || '',
            experienceLevel: extraction.experienceLevel || null,
            experienceEvidenceStatus: extraction.experienceEvidenceStatus || 'UNANALYZED',
            professionalExperienceMonths: extraction.professionalExperienceMonths || 0,
            internshipExperienceMonths: extraction.internshipExperienceMonths || 0,
            relevantExperienceMonths: extraction.relevantExperienceMonths || 0,
            projects: normalizedProjects,
            detailedProjects: extraction.detailedProjects || extraction.projects || [],
            skills: Array.isArray(extraction.skills) ? extraction.skills : [],
            categorizedSkills: extraction.categorizedSkills || null,
            skillsByProvenance: extraction.skillsByProvenance || null,
            resumeText,
            analysisStatus: extraction.success ? 'complete' : 'partial',
            extractionSuccess: true,
            warnings: extraction.warnings || [],
            diagnostics,
            crossExaminationProfile: {
                projects: extraction.detailedProjects || extraction.projects,
                standaloneClaims: extraction.standaloneClaims,
                allClaims: extraction.allClaims,
                resumeHash: extraction.resumeHash,
                provenanceStats: extraction.provenanceStats,
                warnings: extraction.warnings,
            },
        });

    } catch (error) {
        if (req.file?.path && fs.existsSync(req.file.path)) {
            try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
        }
        console.error("Error in resumeAnalyse:", error.message || error);
        return res.status(500).json({
            message: "Failed to process resume document. Please verify the document format or enter details manually.",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export const generateQuestions = async (req, res) => {
    let creditsDeductedAmount = 0;
    const safeRefund = async () => {
        if (creditsDeductedAmount > 0) {
            const toRefund = creditsDeductedAmount;
            creditsDeductedAmount = 0; // prevent duplicate refund
            try {
                await refundInterviewCredits(req.userId, User, toRefund);
            } catch (rErr) {
                console.error("[generateQuestions] CRITICAL: Failed to refund credits:", rErr);
            }
        }
    };

    try {
        let {
            role,
            experience,
            mode,
            resumeText,
            projects,
            skills,
            enableCrossQuestioning,
            crossQuestioningType,
            interviewMode,
            selectedQuestionCount,
            durationMinutes,
            timePackage
        } = req.body;

        role = role?.trim();
        experience = experience?.trim();
        mode = mode?.trim();
        enableCrossQuestioning = Boolean(enableCrossQuestioning);
        const validCrossTypes = ["Technical", "Behavioral"];
        const safeCrossQuestioningType = validCrossTypes.includes(crossQuestioningType) ? crossQuestioningType : "Technical";

        // Normalize mode to valid enum: ["HR", "Technical", "Coding"]
        const isCodingInterview = mode === "Coding" || req.body.interviewType === "coding";
        const safeMode = isCodingInterview ? "Coding" : (mode === "HR" || mode === "HR/Behavioral" || mode === "Behavioral") ? "HR" : "Technical";

        // Server-side guard: cross-questioning strictly requires a valid non-empty resume
        const hasValidResume = Boolean(resumeText && typeof resumeText === 'string' && resumeText.trim().length > 0);
        if (!hasValidResume) {
            enableCrossQuestioning = false;
        }

        if (!role || !experience || !mode) {
            return res.status(400).json({ message: "Please enter all the data" });
        }

        // 1. Authoritative Pricing Calculation & Server-Side Enforcement (Never trust client pricing)
        const pricing = calculateInterviewPricing({
            interviewMode,
            selectedQuestionCount,
            durationMinutes: durationMinutes || req.body.selectedDurationMinutes,
            timePackage
        });

        if (!pricing.valid) {
            return res.status(400).json({ message: pricing.error });
        }

        // 2. Authoritative User Balance Verification
        const creditCheck = await checkUserCredits(req.userId, User, pricing.creditsCharged);
        if (!creditCheck.hasCredits) {
            return res.status(creditCheck.statusCode || 400).json({
                message: creditCheck.message || INSUFFICIENT_CREDITS_MESSAGE
            });
        }

        // 3. Atomic Deduction (Exactly once, tracked for safe rollback)
        const deduction = await deductInterviewCredits(req.userId, User, pricing.creditsCharged);
        if (!deduction.success) {
            return res.status(deduction.statusCode || 400).json({
                message: deduction.message || INSUFFICIENT_CREDITS_MESSAGE
            });
        }
        creditsDeductedAmount = pricing.creditsCharged;

        // Dedicated Live Coding Interview Generation
        if (isCodingInterview) {
            const codingLanguage = req.body.codingLanguage || 'javascript';
            const codingCategory = req.body.codingCategory || 'Problem Solving';
            const codingDifficulty = req.body.codingDifficulty || 'Medium';

            let codingProblems = [];
            try {
                codingProblems = await codingQuestionService.generateCodingProblems({
                    role,
                    category: codingCategory,
                    difficulty: codingDifficulty,
                    language: codingLanguage,
                    count: Math.min(pricing.targetQuestionCount, 5)
                });
            } catch (probErr) {
                console.error("[generateQuestions] Coding problem generation error:", probErr);
                await safeRefund();
                return res.status(500).json({ message: "Failed to generate coding challenges" });
            }

            const startedAt = new Date();
            const expiresAt = pricing.selectedDurationMinutes
                ? new Date(startedAt.getTime() + pricing.selectedDurationMinutes * 60 * 1000)
                : null;
            const currentQuestionStartedAt = new Date();
            const currentQuestionDeadline = calculateQuestionDeadline({
                currentQuestionStartedAt,
                answerTimeLimitSeconds: 60,
                expiresAt
            });

            let interview;
            try {
                interview = await Interview.create({
                    userId: req.userId,
                    role,
                    experience,
                    mode: "Coding",
                    interviewType: "coding",
                    codingLanguage,
                    codingCategory,
                    codingProblems,
                    interviewMode: pricing.interviewMode,
                    selectedQuestionCount: pricing.selectedQuestionCount,
                    selectedDurationMinutes: pricing.selectedDurationMinutes,
                    targetQuestionCount: pricing.targetQuestionCount,
                    creditsCharged: pricing.creditsCharged,
                    difficulty: codingDifficulty.toLowerCase(),
                    answerTimeLimitSeconds: 60,
                    startedAt,
                    expiresAt,
                    currentQuestionIndex: 0,
                    currentQuestionStartedAt,
                    currentQuestionDeadline,
                    questions: codingProblems.map((p, idx) => ({
                        question: `${p.title}: ${p.description.slice(0, 100)}...`,
                        difficulty: p.difficulty.toLowerCase(),
                        topic: p.category,
                        category: 'coding',
                        timeLimit: 60,
                        isFollowUp: false,
                        depth: 0,
                        transitionPhrase: idx === 0 ? "Let's begin with your coding challenge." : ""
                    }))
                });
            } catch (createErr) {
                await safeRefund();
                throw createErr;
            }

            creditsDeductedAmount = 0;
            return res.json({
                interviewId: interview._id,
                creditsLeft: deduction.creditsLeft,
                interviewType: "coding",
                codingLanguage,
                codingCategory,
                codingProblems: codingProblems.map(p => {
                    const obj = p.toObject ? p.toObject() : { ...p };
                    delete obj.hiddenTestCases;
                    return obj;
                }),
                questions: interview.questions
            });
        }

        const projectText = Array.isArray(projects) && projects.length ? projects.map(p => typeof p === 'string' ? p : (p.name || p.title || '')).filter(Boolean).join(', ') : "None";
        const skillText = Array.isArray(skills) && skills.length ? skills.map(s => typeof s === 'string' ? s : (s.name || s.title || '')).filter(Boolean).join(', ') : "None";
        const safeResume = resumeText?.trim() || 'None';

        const userPrompt = `
            Role:${role}
            Experience:${experience}
            InterviewMode:${safeMode}
            Projects:${projectText}
            Skills:${skillText}
            resume:${safeResume}
        `;

        if (!userPrompt.trim()) {
            await safeRefund();
            return res.status(400).json({ message: "prompt is empty" });
        }

        const targetCount = pricing.targetQuestionCount;
        const maxTokens = Math.max(800, targetCount * 90);

        const messages = [
            {
                role: "system",
                content: `
                You are a real human interviewer conducting a professional interview.
                Speak in simple, natural English language as if you are directly talking to the candidate.
                Generate Exactly ${targetCount} questions
                Strict rules:
                - Each question must contain between 15-25 words
                - Each question should be single complete sentence
                - Do not number them.
                - Do not add explanations.
                - Do not add extra text before or after
                - One question per line only
                - Keep language simple and conversational
                - Questions must be practical and realistic.
                
                Difficulty requirement:
                All questions MUST be of MEDIUM difficulty. Do not generate easy or hard questions.

                Make questions based on the candidate's role, experience, interview mode, projects, skills, and resume details.
                `
            },
            {
                role: "user",
                content: userPrompt
            }
        ];

        let aiResponse;
        try {
            aiResponse = await askAI(messages, { max_tokens: maxTokens });
        } catch (aiErr) {
            console.error("[generateQuestions] AI provider error:", aiErr.message || aiErr);
            await safeRefund();

            const isDailyQuota = aiErr.code === 'FREE_MODEL_DAILY_LIMIT_EXCEEDED' ||
                aiErr.errorCode === 'FREE_MODEL_DAILY_LIMIT_EXCEEDED' ||
                (typeof aiErr.message === 'string' && aiErr.message.toLowerCase().includes('free-models-per-day'));

            let creditsLeft;
            try {
                const refreshedUser = await User.findById(req.userId);
                creditsLeft = refreshedUser?.credits;
            } catch (uErr) {
                console.error("[generateQuestions] Failed to fetch refreshed balance after refund:", uErr.message);
            }

            if (isDailyQuota) {
                return res.status(429).json({
                    errorCode: 'FREE_MODEL_DAILY_LIMIT_EXCEEDED',
                    message: "The AI provider's free daily model quota has been exhausted. Please try again tomorrow or later when the daily quota resets. Your interview credits have been fully refunded.",
                    creditsLeft,
                });
            }

            const status = (aiErr.status === 402 || aiErr.status === 429) ? 503 : 500;
            const message = aiErr.status === 402
                ? "AI generation quota exceeded. Please check API credits or try again later."
                : (aiErr.message || "Failed to generate interview questions from AI provider");
            return res.status(status).json({
                message,
                errorCode: aiErr.code || (aiErr.status === 402 ? 'QUOTA_EXCEEDED' : 'AI_PROVIDER_ERROR'),
                creditsLeft
            });
        }

        if (!aiResponse || !aiResponse.trim()) {
            await safeRefund();
            let creditsLeft;
            try {
                const refreshedUser = await User.findById(req.userId);
                creditsLeft = refreshedUser?.credits;
            } catch {}
            return res.status(500).json({ message: "AI didn't gave the answer", creditsLeft });
        }

        const rawLines = aiResponse.split("\n").map(q => q.trim()).filter(q => q.length > 0);
        let questionArray = rawLines
            .map(q => q.replace(/^\d+[\.\)]\s*|^[-*]\s*/, '').trim())
            .filter(q => q.length > 10 && !q.toLowerCase().startsWith('here are') && !q.toLowerCase().startsWith('sure,'))
            .slice(0, targetCount);

        // Bounded completion retry if AI generated fewer questions than purchased allocation
        if (questionArray.length < targetCount && questionArray.length > 0) {
            const deficit = targetCount - questionArray.length;
            try {
                const retryMessages = [
                    {
                        role: "system",
                        content: `You are an interviewer. Generate exactly ${deficit} more unique interview questions for the role: ${role}. Medium difficulty, one sentence per line, 15-25 words, no numbering, no explanations.`
                    },
                    { role: "user", content: `Please provide ${deficit} additional medium-difficulty questions.` }
                ];
                const retryResponse = await askAI(retryMessages, { max_tokens: Math.max(400, deficit * 90) });
                if (retryResponse) {
                    const extraLines = retryResponse.split("\n").map(q => q.trim()).filter(q => q.length > 0)
                        .map(q => q.replace(/^\d+[\.\)]\s*|^[-*]\s*/, '').trim())
                        .filter(q => q.length > 10 && !q.toLowerCase().startsWith('here are') && !q.toLowerCase().startsWith('sure,'));
                    for (const extra of extraLines) {
                        if (questionArray.length < targetCount && !questionArray.includes(extra)) {
                            questionArray.push(extra);
                        }
                    }
                }
            } catch (retryErr) {
                console.warn("[generateQuestions] Question deficit retry completion non-fatal error:", retryErr.message);
            }
        }

        // Validate final allocation: never charge full price for an under-allocated interview
        if (questionArray.length < targetCount) {
            await safeRefund();
            let creditsLeft;
            try {
                const refreshedUser = await User.findById(req.userId);
                creditsLeft = refreshedUser?.credits;
            } catch {}
            return res.status(503).json({
                message: `Unable to generate the full allocation of ${targetCount} questions. Your credits have been fully refunded. Please try again.`,
                creditsLeft
            });
        }

        const startedAt = new Date();
        const expiresAt = pricing.selectedDurationMinutes
            ? new Date(startedAt.getTime() + pricing.selectedDurationMinutes * 60 * 1000)
            : null;
        const currentQuestionStartedAt = new Date();
        const currentQuestionDeadline = calculateQuestionDeadline({
            currentQuestionStartedAt,
            answerTimeLimitSeconds: 60,
            expiresAt
        });

        const approvedCompetencies = deriveApprovedCompetencies({
            role,
            skills,
            projects,
            mode: safeMode
        });

        let interview;
        try {
            interview = await Interview.create({
                userId: req.userId,
                role,
                experience,
                mode: safeMode,
                resumeText: safeResume,
                enableCrossQuestioning,
                crossQuestioningType: safeCrossQuestioningType,
                interviewMode: pricing.interviewMode,
                selectedQuestionCount: pricing.selectedQuestionCount,
                selectedDurationMinutes: pricing.selectedDurationMinutes,
                targetQuestionCount: pricing.targetQuestionCount,
                creditsCharged: pricing.creditsCharged,
                difficulty: 'medium',
                answerTimeLimitSeconds: 60,
                startedAt,
                expiresAt,
                currentQuestionIndex: 0,
                currentQuestionStartedAt,
                currentQuestionDeadline,
                adaptiveState: {
                    currentDifficulty: DIFFICULTY_LEVELS.INTERMEDIATE,
                    previousDifficulty: DIFFICULTY_LEVELS.INTERMEDIATE,
                    consecutiveStrongAnswers: 0,
                    consecutiveWeakAnswers: 0,
                    topicPerformance: [],
                    identifiedKnowledgeGaps: [],
                    identifiedStrengths: [],
                    decisionHistory: [],
                    coveredTopics: [],
                    followUpCount: 0,
                    approvedCompetencies
                },
                questions: questionArray.map((q, idx) => ({
                    question: q,
                    difficulty: "medium", // Default medium baseline
                    topic: approvedCompetencies[idx % approvedCompetencies.length] || 'General',
                    category: detectQuestionCategory(q, safeMode),
                    timeLimit: 60,        // Strict 60-second limit
                    isFollowUp: false,
                    depth: 0,
                    transitionPhrase: idx === 0 ? "Let's begin with our first question." : ""
                }))
            });
        } catch (createErr) {
            await safeRefund();
            throw createErr;
        }

        // Successfully created: clear refund tracker to prevent accidental post-creation rollback
        creditsDeductedAmount = 0;

        res.json({
            interviewId: interview._id,
            creditsLeft: deduction.creditsLeft,
            userName: creditCheck.user?.name || "Candidate",
            questions: interview.questions,
            mode: safeMode,
            adaptiveState: interview.adaptiveState,
            enableCrossQuestioning: interview.enableCrossQuestioning,
            crossQuestioningType: interview.crossQuestioningType,
            interviewMode: interview.interviewMode,
            selectedQuestionCount: interview.selectedQuestionCount,
            selectedDurationMinutes: interview.selectedDurationMinutes,
            targetQuestionCount: interview.targetQuestionCount,
            creditsCharged: interview.creditsCharged,
            difficulty: interview.difficulty,
            answerTimeLimitSeconds: interview.answerTimeLimitSeconds,
            startedAt: interview.startedAt,
            expiresAt: interview.expiresAt,
            currentQuestionIndex: 0,
            currentQuestionStartedAt: interview.currentQuestionStartedAt,
            currentQuestionDeadline: interview.currentQuestionDeadline,
        });

    } catch (error) {
        await safeRefund();
        let creditsLeft;
        try {
            const refreshedUser = await User.findById(req.userId);
            creditsLeft = refreshedUser?.credits;
        } catch {}
        console.error("[generateQuestions] Unexpected error:", error.message || error);
        return res.status(500).json({ message: "internal Server error in the generateQuestion controller", creditsLeft });
    }
};

export const submitAnswer = async (req, res) => {
    let lockedInterviewId = null;
    try {
        const { interviewId, answer, timeTaken, questionIndex } = req.body;

        const userId = req.userId || req.user?._id || req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Authentication required" });
        }

        if (!interviewId) {
            return res.status(400).json({ message: "Interview ID is required" });
        }

        const interview = await Interview.findById(interviewId);
        if (!interview) {
            return res.status(404).json({ message: "Interview session not found" });
        }

        // 1. Strict Ownership Validation (Anti-IDOR)
        if (!interview.userId || interview.userId.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Forbidden: You cannot access or submit to another candidate's interview" });
        }

        // 2. Strict State Validation
        if (interview.status === "Completed") {
            return res.status(400).json({ message: "Interview session is already completed" });
        }

        const now = new Date();
        const isSessionExpired = Boolean(interview.expiresAt && now.getTime() >= new Date(interview.expiresAt).getTime());
        if (isSessionExpired) {
            interview.status = "Completed";
            await interview.save();
            return res.status(410).json({ message: "Interview session has expired", isSessionExpired: true });
        }

        // 3. Question Sequence & State Validation
        const expectedIndex = Number(interview.currentQuestionIndex || 0);
        if (Number(questionIndex) !== expectedIndex) {
            return res.status(409).json({
                message: "Question out of sequence or already submitted",
                currentQuestionIndex: expectedIndex
            });
        }

        if (expectedIndex < 0 || expectedIndex >= interview.questions.length) {
            return res.status(400).json({ message: "Invalid question index" });
        }

        // 4. Duplicate Submission Protection & Atomic Conditional Lock
        let lockedDoc;
        if (typeof Interview.findOneAndUpdate === 'function') {
            lockedDoc = await Interview.findOneAndUpdate(
                {
                    _id: interviewId,
                    userId: interview.userId,
                    status: { $ne: "Completed" },
                    currentQuestionIndex: expectedIndex,
                    isEvaluating: { $ne: true }
                },
                {
                    $set: { isEvaluating: true }
                },
                { returnDocument: 'after' }
            );
        } else {
            if (interview.isEvaluating) {
                return res.status(409).json({ message: "Question is currently being evaluated. Please wait." });
            }
            interview.isEvaluating = true;
            await interview.save();
            lockedDoc = interview;
        }

        if (!lockedDoc) {
            const fresh = await Interview.findById(interviewId);
            if (fresh?.isEvaluating) {
                return res.status(409).json({ message: "Question is currently being evaluated. Please wait." });
            }
            return res.status(409).json({
                message: "Question already submitted or session state modified",
                currentQuestionIndex: fresh?.currentQuestionIndex
            });
        }

        lockedInterviewId = interviewId;
        const currentQuestion = lockedDoc.questions[expectedIndex];

        // 5. Server-Side Deadline Verification
        const deadlineCheck = verifyAnswerDeadline({
            currentQuestionStartedAt: lockedDoc.currentQuestionStartedAt,
            currentQuestionDeadline: lockedDoc.currentQuestionDeadline,
            answerTimeLimitSeconds: lockedDoc.answerTimeLimitSeconds || 60,
            gracePeriodSeconds: 5,
            now,
        });

        // 6. Handle Empty Answer or Timeout Submission
        if (!answer || answer.trim() === "") {
            const category = detectQuestionCategory(currentQuestion.question, lockedDoc.mode);
            const emptyEval = createEmptyAnswerEvaluation({
                questionText: currentQuestion.question,
                category,
                isTimedOut: deadlineCheck.isTimedOut
            });

            currentQuestion.score = 0;
            currentQuestion.confidence = 0;
            currentQuestion.communication = 0;
            currentQuestion.correctness = 0;
            currentQuestion.feedback = deadlineCheck.isTimedOut
                ? "Time expired. No answer was submitted."
                : "You didn't submit an answer for this question.";
            currentQuestion.answer = "";
            currentQuestion.evidenceEvaluation = emptyEval;

            // Initialize adaptiveState if missing
            if (!lockedDoc.adaptiveState) {
                lockedDoc.adaptiveState = {
                    currentDifficulty: DIFFICULTY_LEVELS.INTERMEDIATE,
                    previousDifficulty: DIFFICULTY_LEVELS.INTERMEDIATE,
                    consecutiveStrongAnswers: 0,
                    consecutiveWeakAnswers: 0,
                    topicPerformance: [],
                    identifiedKnowledgeGaps: [],
                    identifiedStrengths: [],
                    decisionHistory: [],
                    coveredTopics: [],
                    followUpCount: 0,
                    approvedCompetencies: deriveApprovedCompetencies({ role: lockedDoc.role, mode: lockedDoc.mode })
                };
            }

            const currentTopic = currentQuestion.topic || 'General';
            lockedDoc.adaptiveState.topicPerformance = updateTopicPerformanceRecord(
                lockedDoc.adaptiveState.topicPerformance,
                currentTopic,
                0,
                expectedIndex
            );
            lockedDoc.adaptiveState.coveredTopics.push(currentTopic);

            const isFinalQuestion = expectedIndex >= (lockedDoc.targetQuestionCount || lockedDoc.questions.length) - 1;
            const decision = calculateDifficultyDecision({
                currentDifficulty: lockedDoc.adaptiveState.currentDifficulty,
                score: 0,
                evidenceEvaluation: emptyEval,
                consecutiveStrong: lockedDoc.adaptiveState.consecutiveStrongAnswers,
                consecutiveWeak: lockedDoc.adaptiveState.consecutiveWeakAnswers,
                followUpCount: lockedDoc.adaptiveState.followUpCount || 0,
                currentQuestionDepth: currentQuestion.depth || 0,
                isFinalQuestion
            });

            lockedDoc.adaptiveState.currentDifficulty = decision.newDifficulty;
            lockedDoc.adaptiveState.previousDifficulty = decision.previousDifficulty;
            lockedDoc.adaptiveState.consecutiveStrongAnswers = decision.consecutiveStrongAnswers;
            lockedDoc.adaptiveState.consecutiveWeakAnswers = decision.consecutiveWeakAnswers;

            let transitionPhrase = "";
            if (!isFinalQuestion && expectedIndex + 1 < lockedDoc.questions.length) {
                const nextTopic = selectNextFocusTopic({
                    approvedCompetencies: lockedDoc.adaptiveState.approvedCompetencies,
                    coveredTopics: lockedDoc.adaptiveState.coveredTopics,
                    topicPerformance: lockedDoc.adaptiveState.topicPerformance,
                    knowledgeGaps: lockedDoc.adaptiveState.identifiedKnowledgeGaps,
                    action: decision.action,
                    currentTopic
                });

                const nextAdaptiveQ = await generateAdaptiveQuestion({
                    role: lockedDoc.role,
                    mode: lockedDoc.mode,
                    previousQuestion: currentQuestion.question,
                    previousAnswer: "",
                    topic: nextTopic,
                    difficulty: decision.newDifficulty,
                    action: decision.action,
                    reason: decision.reason,
                    approvedCompetencies: lockedDoc.adaptiveState.approvedCompetencies,
                    askAIFn: askAI,
                    nextPreGeneratedQuestion: lockedDoc.questions[expectedIndex + 1]
                });

                transitionPhrase = nextAdaptiveQ.transitionPhrase || getTransitionPhrase(decision.action, nextTopic);

                lockedDoc.adaptiveState.decisionHistory.push({
                    questionIndex: expectedIndex,
                    previousDifficulty: decision.previousDifficulty,
                    newDifficulty: decision.newDifficulty,
                    action: decision.action,
                    reason: decision.reason,
                    targetTopic: nextTopic,
                    transitionPhrase,
                    timestamp: new Date()
                });

                // In-place replacement ensures strict allocation preservation
                lockedDoc.questions[expectedIndex + 1].question = nextAdaptiveQ.question;
                lockedDoc.questions[expectedIndex + 1].difficulty = nextAdaptiveQ.difficulty;
                lockedDoc.questions[expectedIndex + 1].topic = nextAdaptiveQ.topic;
                lockedDoc.questions[expectedIndex + 1].category = nextAdaptiveQ.category;
                lockedDoc.questions[expectedIndex + 1].transitionPhrase = transitionPhrase;
                lockedDoc.questions[expectedIndex + 1].adaptiveReason = nextAdaptiveQ.adaptiveReason;
                lockedDoc.questions[expectedIndex + 1].isFollowUp = nextAdaptiveQ.isFollowUp;
            }

            lockedDoc.currentQuestionIndex = expectedIndex + 1;
            lockedDoc.currentQuestionStartedAt = new Date();
            lockedDoc.currentQuestionDeadline = calculateQuestionDeadline({
                currentQuestionStartedAt: lockedDoc.currentQuestionStartedAt,
                answerTimeLimitSeconds: lockedDoc.answerTimeLimitSeconds || 60,
                expiresAt: lockedDoc.expiresAt
            });
            lockedDoc.isEvaluating = false;

            await lockedDoc.save();
            lockedInterviewId = null; // Lock released safely

            const targetAllocation = lockedDoc.targetQuestionCount || lockedDoc.questions.length;
            const isAllocationExhausted = lockedDoc.currentQuestionIndex >= targetAllocation || lockedDoc.currentQuestionIndex >= lockedDoc.questions.length;

            return res.json({
                feedback: currentQuestion.feedback,
                score: 0,
                evidenceEvaluation: emptyEval,
                adaptiveState: lockedDoc.adaptiveState,
                transitionPhrase,
                questions: lockedDoc.questions,
                currentQuestionIndex: lockedDoc.currentQuestionIndex,
                currentQuestionStartedAt: lockedDoc.currentQuestionStartedAt,
                currentQuestionDeadline: lockedDoc.currentQuestionDeadline,
                isSessionExpired: false,
                targetQuestionCount: lockedDoc.targetQuestionCount,
                isAllocationExhausted
            });
        }

        // 7. Non-Empty Answer: Evidence-Based Evaluation
        let evidenceEval;
        try {
            evidenceEval = await evaluateAnswerWithEvidence({
                question: currentQuestion.question,
                answer: answer.trim(),
                role: lockedDoc.role,
                experience: lockedDoc.experience,
                mode: lockedDoc.mode,
                difficulty: lockedDoc.difficulty || 'medium',
                askAIFn: askAI
            });
        } catch (evalErr) {
            console.warn("[submitAnswer] Evidence evaluation fallback triggered:", evalErr.message);
            const category = detectQuestionCategory(currentQuestion.question, lockedDoc.mode);
            evidenceEval = buildSafeFallbackEvaluation({
                question: currentQuestion.question,
                answer: answer.trim(),
                category,
                role: lockedDoc.role
            });
        }

        // If submitted after deadline + grace period, apply late-submission penalty
        if (deadlineCheck.isTimedOut) {
            evidenceEval.overallScore = Math.min(evidenceEval.overallScore, 4);
            evidenceEval.summaryFeedback = `[Time Expired] ${evidenceEval.summaryFeedback}`;
        }

        const techAccuracyCrit = evidenceEval.criteria?.find(c => c.name === 'Technical Accuracy');
        const commsCrit = evidenceEval.criteria?.find(c => c.name === 'Communication Clarity');
        const finalScore = Math.round(evidenceEval.overallScore);

        currentQuestion.answer = answer.trim();
        currentQuestion.confidence = Math.round((evidenceEval.evaluationConfidence || 0.8) * 10);
        currentQuestion.communication = Math.round(commsCrit?.score || finalScore);
        currentQuestion.correctness = Math.round(techAccuracyCrit?.score || finalScore);
        currentQuestion.score = finalScore;
        currentQuestion.feedback = evidenceEval.summaryFeedback;
        currentQuestion.evidenceEvaluation = evidenceEval;

        // 8. Adaptive Steering & Real-Time Performance Steering
        let followUpQuestion = null;
        const targetAllocation = lockedDoc.targetQuestionCount || lockedDoc.questions.length;

        // Ensure adaptiveState exists (for legacy/in-flight records)
        if (!lockedDoc.adaptiveState) {
            lockedDoc.adaptiveState = {
                currentDifficulty: DIFFICULTY_LEVELS.INTERMEDIATE,
                previousDifficulty: DIFFICULTY_LEVELS.INTERMEDIATE,
                consecutiveStrongAnswers: 0,
                consecutiveWeakAnswers: 0,
                topicPerformance: [],
                identifiedKnowledgeGaps: [],
                identifiedStrengths: [],
                decisionHistory: [],
                coveredTopics: [],
                followUpCount: 0,
                approvedCompetencies: deriveApprovedCompetencies({ role: lockedDoc.role, mode: lockedDoc.mode })
            };
        }

        const currentTopic = currentQuestion.topic || 'General';

        // 1. Update topic performance metrics
        lockedDoc.adaptiveState.topicPerformance = updateTopicPerformanceRecord(
            lockedDoc.adaptiveState.topicPerformance,
            currentTopic,
            finalScore,
            expectedIndex
        );
        lockedDoc.adaptiveState.coveredTopics.push(currentTopic);

        // 2. Extract grounded knowledge gaps and strengths
        const { newGaps, newStrengths } = detectKnowledgeGapsAndStrengths({
            topic: currentTopic,
            score: finalScore,
            evidenceEvaluation: evidenceEval,
            questionIndex: expectedIndex
        });
        if (newGaps.length > 0) {
            lockedDoc.adaptiveState.identifiedKnowledgeGaps.push(...newGaps);
        }
        if (newStrengths.length > 0) {
            lockedDoc.adaptiveState.identifiedStrengths.push(...newStrengths);
        }

        // 3. Evaluate adaptive difficulty policy
        const isFinalQuestion = expectedIndex >= targetAllocation - 1;

        const decision = calculateDifficultyDecision({
            currentDifficulty: lockedDoc.adaptiveState.currentDifficulty,
            score: finalScore,
            evidenceEvaluation: evidenceEval,
            consecutiveStrong: lockedDoc.adaptiveState.consecutiveStrongAnswers,
            consecutiveWeak: lockedDoc.adaptiveState.consecutiveWeakAnswers,
            followUpCount: lockedDoc.adaptiveState.followUpCount || 0,
            currentQuestionDepth: currentQuestion.depth || 0,
            isFinalQuestion
        });

        lockedDoc.adaptiveState.currentDifficulty = decision.newDifficulty;
        lockedDoc.adaptiveState.previousDifficulty = decision.previousDifficulty;
        lockedDoc.adaptiveState.consecutiveStrongAnswers = decision.consecutiveStrongAnswers;
        lockedDoc.adaptiveState.consecutiveWeakAnswers = decision.consecutiveWeakAnswers;

        let transitionPhrase = "";

        // 4. If not final question, steer and replace next question in sequence
        if (!isFinalQuestion && expectedIndex + 1 < lockedDoc.questions.length) {
            const nextTopic = selectNextFocusTopic({
                approvedCompetencies: lockedDoc.adaptiveState.approvedCompetencies,
                coveredTopics: lockedDoc.adaptiveState.coveredTopics,
                topicPerformance: lockedDoc.adaptiveState.topicPerformance,
                knowledgeGaps: lockedDoc.adaptiveState.identifiedKnowledgeGaps,
                action: decision.action,
                currentTopic
            });

            const nextAdaptiveQ = await generateAdaptiveQuestion({
                role: lockedDoc.role,
                mode: lockedDoc.mode,
                previousQuestion: currentQuestion.question,
                previousAnswer: answer,
                topic: nextTopic,
                difficulty: decision.newDifficulty,
                action: decision.action,
                reason: decision.reason,
                approvedCompetencies: lockedDoc.adaptiveState.approvedCompetencies,
                askAIFn: askAI,
                nextPreGeneratedQuestion: lockedDoc.questions[expectedIndex + 1]
            });

            transitionPhrase = nextAdaptiveQ.transitionPhrase || getTransitionPhrase(decision.action, nextTopic);

            if (nextAdaptiveQ.isFollowUp) {
                lockedDoc.adaptiveState.followUpCount = (lockedDoc.adaptiveState.followUpCount || 0) + 1;
                followUpQuestion = nextAdaptiveQ;
            }

            lockedDoc.adaptiveState.decisionHistory.push({
                questionIndex: expectedIndex,
                previousDifficulty: decision.previousDifficulty,
                newDifficulty: decision.newDifficulty,
                action: decision.action,
                reason: decision.reason,
                targetTopic: nextTopic,
                transitionPhrase,
                timestamp: new Date()
            });

            // Strict Allocation Preservation: If inserting a follow-up probe, displace the last unasked primary question
            let lastUnaskedPrimaryIndex = -1;
            for (let i = lockedDoc.questions.length - 1; i > expectedIndex + 1; i--) {
                if (!lockedDoc.questions[i].isFollowUp && !lockedDoc.questions[i].answer) {
                    lastUnaskedPrimaryIndex = i;
                    break;
                }
            }

            if (nextAdaptiveQ.isFollowUp && lastUnaskedPrimaryIndex > expectedIndex + 1) {
                lockedDoc.questions.splice(expectedIndex + 1, 0, {
                    question: nextAdaptiveQ.question,
                    difficulty: nextAdaptiveQ.difficulty,
                    topic: nextAdaptiveQ.topic,
                    category: nextAdaptiveQ.category,
                    timeLimit: 60,
                    isFollowUp: true,
                    parentQuestionIndex: expectedIndex,
                    depth: (currentQuestion.depth || 0) + 1,
                    transitionPhrase,
                    adaptiveReason: nextAdaptiveQ.adaptiveReason,
                    answer: "",
                    feedback: "",
                    score: 0,
                    confidence: 0,
                    communication: 0,
                    correctness: 0
                });

                // Displace the last unasked primary question
                for (let i = lockedDoc.questions.length - 1; i > expectedIndex + 1; i--) {
                    if (!lockedDoc.questions[i].isFollowUp && !lockedDoc.questions[i].answer) {
                        lockedDoc.questions.splice(i, 1);
                        break;
                    }
                }
            } else {
                // In-place replacement
                lockedDoc.questions[expectedIndex + 1].question = nextAdaptiveQ.question;
                lockedDoc.questions[expectedIndex + 1].difficulty = nextAdaptiveQ.difficulty;
                lockedDoc.questions[expectedIndex + 1].topic = nextAdaptiveQ.topic;
                lockedDoc.questions[expectedIndex + 1].category = nextAdaptiveQ.category;
                lockedDoc.questions[expectedIndex + 1].transitionPhrase = transitionPhrase;
                lockedDoc.questions[expectedIndex + 1].adaptiveReason = nextAdaptiveQ.adaptiveReason;
                lockedDoc.questions[expectedIndex + 1].isFollowUp = nextAdaptiveQ.isFollowUp;
            }
        }

        // 9. Advance Question Index & Reset Server-Side 60s Deadline
        lockedDoc.currentQuestionIndex = expectedIndex + 1;
        lockedDoc.currentQuestionStartedAt = new Date();
        lockedDoc.currentQuestionDeadline = calculateQuestionDeadline({
            currentQuestionStartedAt: lockedDoc.currentQuestionStartedAt,
            answerTimeLimitSeconds: lockedDoc.answerTimeLimitSeconds || 60,
            expiresAt: lockedDoc.expiresAt
        });
        lockedDoc.isEvaluating = false;

        await lockedDoc.save();
        lockedInterviewId = null; // Lock released safely

        const isAllocationExhausted = lockedDoc.currentQuestionIndex >= targetAllocation || lockedDoc.currentQuestionIndex >= lockedDoc.questions.length;

        return res.status(200).json({ 
            feedback: currentQuestion.feedback,
            score: currentQuestion.score,
            evidenceEvaluation: currentQuestion.evidenceEvaluation,
            adaptiveState: lockedDoc.adaptiveState,
            transitionPhrase,
            followUpQuestion,
            questions: lockedDoc.questions,
            currentQuestionIndex: lockedDoc.currentQuestionIndex,
            currentQuestionStartedAt: lockedDoc.currentQuestionStartedAt,
            currentQuestionDeadline: lockedDoc.currentQuestionDeadline,
            isSessionExpired: false,
            targetQuestionCount: lockedDoc.targetQuestionCount,
            isAllocationExhausted
        });

    } catch (error) {
        console.error("Error in submitAnswer:", error);
        return res.status(500).json({
            message: "Internal Server error in the submitAnswer controller",
            error: error.message
        });
    } finally {
        if (lockedInterviewId) {
            try {
                await Interview.updateOne(
                    { _id: lockedInterviewId, isEvaluating: true },
                    { $set: { isEvaluating: false } }
                );
            } catch (unlockErr) {
                console.error("[submitAnswer] Lock release failed in finally block:", unlockErr.message);
            }
        }
    }
};

export const finishInterview = async (req, res) => {
    try {
        const { interviewId } = req.body;

        const userId = req.userId || req.user?._id || req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: "Authentication required" });
        }

        const interview = await Interview.findById(interviewId);
        if (!interview) {
            return res.status(404).json({ message: "Interview not found" });
        }

        // Strict Ownership Validation (Anti-IDOR)
        if (!interview.userId || interview.userId.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Forbidden: You cannot access or complete another candidate's interview" });
        }

        let totalScore = 0, totalConfidence = 0, totalCorrectness = 0, totalCommunication = 0;
        const totalQuestions = interview.questions.length;

        interview.questions.forEach((q) => {
            totalScore += q.score || 0;
            totalConfidence += q.confidence || 0;
            totalCorrectness += q.correctness || 0;
            totalCommunication += q.communication || 0;
        });

        // Compute authoritative interview-level analytics
        const analytics = aggregateInterviewAnalytics(interview.questions, {
            role: interview.role,
            mode: interview.mode,
            experience: interview.experience,
        });
        interview.analytics = analytics;

        const data = {
            finalScore: totalQuestions ? Math.round(totalScore / totalQuestions) : 0,
            confidence: totalQuestions ? Math.round(totalConfidence / totalQuestions) : 0,
            communication: totalQuestions ? Math.round(totalCommunication / totalQuestions) : 0,
            correctness: totalQuestions ? Math.round(totalCorrectness / totalQuestions) : 0,
            analytics,
            adaptiveState: interview.adaptiveState || null,
            questions: interview.questions,
            role: interview.role,
            experience: interview.experience,
            mode: interview.mode,
            enableCrossQuestioning: interview.enableCrossQuestioning || false,
            crossQuestioningType: interview.crossQuestioningType || 'Technical',
            interviewMode: interview.interviewMode || 'question_based',
            selectedQuestionCount: interview.selectedQuestionCount || totalQuestions,
            selectedDurationMinutes: interview.selectedDurationMinutes || null,
            targetQuestionCount: interview.targetQuestionCount || totalQuestions,
            creditsCharged: typeof interview.creditsCharged === 'number' ? interview.creditsCharged : 50,
            difficulty: interview.difficulty || 'medium',
            answerTimeLimitSeconds: interview.answerTimeLimitSeconds || 60,
            startedAt: interview.startedAt || interview.createdAt,
            expiresAt: interview.expiresAt || null,
        };

        interview.finalScore = data.finalScore;
        interview.status = "Completed";
        await interview.save();

        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
};

const originalSessionFind = CrossExaminationSession.find;

export const normalizeStandardInterview = (doc) => {
    const isCross = Boolean(doc.enableCrossQuestioning);
    return {
        _id: doc._id ? doc._id.toString() : '',
        sessionId: doc._id ? doc._id.toString() : '',
        sessionType: isCross ? 'standard_cross_interview' : 'standard_interview',
        isDedicatedCrossExam: false,
        role: doc.role || 'Software Engineer',
        targetRole: doc.role || 'Software Engineer',
        experience: doc.experience || '',
        mode: doc.mode || 'Technical',
        finalScore: typeof doc.finalScore === 'number' ? doc.finalScore : 0,
        status: doc.status || 'Completed',
        rawStatus: doc.status || 'Completed',
        enableCrossQuestioning: isCross,
        crossQuestioningType: isCross ? (doc.crossQuestioningType || 'Technical') : null,
        analytics: doc.analytics || null,
        adaptiveState: doc.adaptiveState || null,
        questions: Array.isArray(doc.questions) ? doc.questions : [],
        totalQuestions: Array.isArray(doc.questions) ? doc.questions.length : 0,
        interviewMode: doc.interviewMode || 'question_based',
        selectedQuestionCount: doc.selectedQuestionCount || (Array.isArray(doc.questions) ? doc.questions.length : 0),
        selectedDurationMinutes: doc.selectedDurationMinutes || null,
        targetQuestionCount: doc.targetQuestionCount || (Array.isArray(doc.questions) ? doc.questions.length : 0),
        creditsCharged: typeof doc.creditsCharged === 'number' ? doc.creditsCharged : 50,
        difficulty: doc.difficulty || 'medium',
        answerTimeLimitSeconds: doc.answerTimeLimitSeconds || 60,
        startedAt: doc.startedAt || doc.createdAt || new Date(),
        expiresAt: doc.expiresAt || null,
        createdAt: doc.createdAt || new Date(),
        updatedAt: doc.updatedAt || new Date(),
    };
};

export const normalizeDedicatedSession = (doc) => {
    let displayStatus = 'In Progress';
    if (doc.status === 'completed') {
        displayStatus = 'Completed';
    } else if (doc.status === 'abandoned') {
        displayStatus = 'Incompleted';
    }

    let finalScore = null;
    if (typeof doc.finalScore === 'number') {
        finalScore = doc.finalScore;
    } else if (doc.report?.dimensionScores && Array.isArray(doc.report.dimensionScores)) {
        const validDims = doc.report.dimensionScores.filter(d => d.demonstratedLevel && d.demonstratedLevel !== 'UNAVAILABLE');
        if (validDims.length > 0) {
            const sum = validDims.reduce((acc, d) => {
                if (d.demonstratedLevel === 'STRONG') return acc + 90;
                if (d.demonstratedLevel === 'MODERATE') return acc + 75;
                if (d.demonstratedLevel === 'WEAK') return acc + 50;
                return acc + 60;
            }, 0);
            finalScore = Math.round(sum / validDims.length);
        }
    }

    const totalQuestions = Array.isArray(doc.questions) ? doc.questions.length : 0;
    const answeredCount = Array.isArray(doc.answers) ? doc.answers.length : 0;

    return {
        _id: doc._id ? doc._id.toString() : (doc.sessionId || ''),
        sessionId: doc.sessionId || (doc._id ? doc._id.toString() : ''),
        sessionType: 'dedicated_cross_exam',
        isDedicatedCrossExam: true,
        role: doc.targetRole || doc.sessionTitle || 'Cross-Examination',
        targetRole: doc.targetRole || doc.sessionTitle || 'Cross-Examination',
        experience: doc.targetDomain || 'System Architecture & Claims',
        mode: 'Cross-Examination',
        targetDomain: doc.targetDomain || 'General Software Engineering',
        finalScore,
        status: displayStatus,
        rawStatus: doc.status || 'in_progress',
        enableCrossQuestioning: true,
        crossQuestioningType: 'Dedicated',
        questions: Array.isArray(doc.questions) ? doc.questions : [],
        totalQuestions,
        answeredCount,
        createdAt: doc.createdAt || new Date(),
        updatedAt: doc.updatedAt || new Date(),
    };
};

export const getMyInterviews = async (req, res, customDeps = {}) => {
    try {
        const userId = req.userId || req.user?._id || req.user?.id;
        if (!userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const deps = (typeof customDeps === 'object' && customDeps !== null && typeof customDeps !== 'function')
            ? customDeps
            : {};
        const InterviewModel = deps.InterviewModel || Interview;
        const SessionModel = deps.SessionModel || CrossExaminationSession;

        const { type, limit, page } = req.query;

        const parsedLimit = limit ? Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100) : null;
        const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
        const maxToFetch = parsedLimit ? parsedPage * parsedLimit : 100;

        let filter = { userId };
        if (type === 'cross') {
            filter.enableCrossQuestioning = true;
        } else if (type === 'all') {
            // Keep filter strictly scoped to userId without filtering enableCrossQuestioning
        } else {
            // Default to 'normal': include false, missing, null, or undefined to preserve all legacy interviews
            filter.$or = [
                { enableCrossQuestioning: false },
                { enableCrossQuestioning: { $exists: false } },
                { enableCrossQuestioning: null }
            ];
        }

        let query = InterviewModel.find(filter)
            .sort({ createdAt: -1 })
            .select('role experience mode finalScore status createdAt enableCrossQuestioning crossQuestioningType questions');

        // Fast-path for normal interviews (only Interview model involved)
        if (type !== 'cross' && type !== 'all') {
            if (parsedLimit) {
                query = query.skip((parsedPage - 1) * parsedLimit).limit(parsedLimit);
            }
            const interviews = await query;
            const normalized = (interviews || []).map(normalizeStandardInterview);
            return res.status(200).json(normalized);
        }

        // For cross or all: fetch interviews up to maxToFetch
        if (parsedLimit) {
            query = query.limit(maxToFetch);
        }
        const interviews = await query;
        const normalizedInterviews = (interviews || []).map(normalizeStandardInterview);

        // Fetch dedicated Cross-Examination sessions
        let normalizedSessions = [];
        const isDbConnected = Boolean(mongoose.connection?.readyState === 1);
        const isCustomSessionModel = Boolean(deps.SessionModel && deps.SessionModel !== CrossExaminationSession);
        const isSessionFindMocked = SessionModel.find !== originalSessionFind;
        const shouldQuerySessions = isDbConnected || isCustomSessionModel || isSessionFindMocked;

        if (shouldQuerySessions) {
            try {
                let sessionQuery = SessionModel.find({ userId })
                    .sort({ createdAt: -1 })
                    .select('_id sessionId sessionTitle targetRole targetDomain status questions answers report createdAt updatedAt');

                if (parsedLimit) {
                    sessionQuery = sessionQuery.limit(maxToFetch);
                }
                const rawSessions = await sessionQuery;
                normalizedSessions = (rawSessions || []).map(normalizeDedicatedSession);
            } catch (sessionErr) {
                console.warn('[getMyInterviews] Failed to query CrossExaminationSession:', sessionErr.message);
            }
        }

        // Merge, deduplicate by ID, and sort descending by creation date
        const combined = [...normalizedInterviews, ...normalizedSessions];
        const seenIds = new Set();
        const deduped = [];
        for (const item of combined) {
            const idKey = String(item._id || item.sessionId);
            if (idKey && !seenIds.has(idKey)) {
                seenIds.add(idKey);
                deduped.push(item);
            }
        }

        deduped.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        if (parsedLimit) {
            const startIndex = (parsedPage - 1) * parsedLimit;
            const paginated = deduped.slice(startIndex, startIndex + parsedLimit);
            return res.status(200).json(paginated);
        }

        return res.status(200).json(deduped);

    } catch (error) {
        return res.status(500).json({ message: 'Error in getMyInterviews', error: error.message });
    }
};

export const getInterviewReport = async (req, res) => {
    try {
        const interview = await Interview.findById(req.params.id);

        if (!interview) {
            return res.status(404).json({ message: "Interview not found" });
        }

        // Strict user ownership check: User cannot access another user's interview report
        const userId = req.userId || req.user?._id || req.user?.id;
        if (interview.userId && userId && interview.userId.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Forbidden: You cannot access another user's interview" });
        }

        const totalQuestions = interview.questions.length;
        let totalConfidence = 0, totalCorrectness = 0, totalCommunication = 0;

        interview.questions.forEach((q) => {
            totalConfidence += q.confidence || 0;
            totalCorrectness += q.correctness || 0;
            totalCommunication += q.communication || 0;
        });

        const avgConfidence = totalQuestions ? Math.round(totalConfidence / totalQuestions) : 0;
        const avgCommunication = totalQuestions ? Math.round(totalCommunication / totalQuestions) : 0;
        const avgCorrectness = totalQuestions ? Math.round(totalCorrectness / totalQuestions) : 0;

        // Ensure interview-level analytics are present
        let analytics = interview.analytics;
        if (!analytics || !Array.isArray(analytics.criterionScores)) {
            analytics = aggregateInterviewAnalytics(interview.questions, {
                role: interview.role,
                mode: interview.mode,
                experience: interview.experience,
            });
            interview.analytics = analytics;
            if (typeof interview.save === 'function') {
                await interview.save().catch(() => {});
            }
        }

        const isCoding = interview.interviewType === 'coding' || interview.mode === 'Coding';
        const sanitizedProblems = (interview.codingProblems || []).map(p => {
            const obj = p.toObject ? p.toObject() : { ...p };
            delete obj.hiddenTestCases;
            return obj;
        });

        let codingSubmissions = [];
        if (isCoding || (interview.codingProblems && interview.codingProblems.length > 0)) {
            const rawSubs = await CodingSubmission.find({ interviewId: interview._id }).sort({ createdAt: 1 });
            codingSubmissions = rawSubs.map(s => {
                const obj = s.toObject();
                obj.testResults = testCaseService.sanitizeResultsForClient(obj.testResults);
                return obj;
            });
        }

        return res.status(200).json({
            role: interview.role,
            experience: interview.experience,
            mode: interview.mode,
            finalScore: interview.finalScore,
            confidence: avgConfidence, 
            communication: avgCommunication,
            correctness: avgCorrectness,
            analytics,
            adaptiveState: interview.adaptiveState || null,
            questions: interview.questions,
            interviewType: interview.interviewType || (isCoding ? 'coding' : 'conceptual'),
            codingLanguage: interview.codingLanguage || 'javascript',
            codingCategory: interview.codingCategory || 'Problem Solving',
            codingProblems: sanitizedProblems,
            codingSubmissions,
            enableCrossQuestioning: interview.enableCrossQuestioning || false,
            crossQuestioningType: interview.crossQuestioningType || 'Technical',
            interviewMode: interview.interviewMode || 'question_based',
            selectedQuestionCount: interview.selectedQuestionCount || totalQuestions,
            selectedDurationMinutes: interview.selectedDurationMinutes || null,
            targetQuestionCount: interview.targetQuestionCount || totalQuestions,
            creditsCharged: typeof interview.creditsCharged === 'number' ? interview.creditsCharged : 50,
            difficulty: interview.difficulty || 'medium',
            answerTimeLimitSeconds: interview.answerTimeLimitSeconds || 60,
            startedAt: interview.startedAt || interview.createdAt,
            expiresAt: interview.expiresAt || null,
        });

    } catch (error) {
        return res.status(500).json({ message: 'Error in getInterviewReport', error: error.message });
    }
};

/**
 * GET /api/interview/session/:id
 * Retrieves an active interview session for the authenticated candidate.
 * Used for resuming sessions and synchronizing timer state across refreshes.
 */
export const getInterviewSession = async (req, res) => {
    try {
        const interview = await Interview.findById(req.params.id);
        if (!interview) {
            return res.status(404).json({ message: "Interview session not found" });
        }

        const userId = req.userId || req.user?._id || req.user?.id;
        if (interview.userId && userId && interview.userId.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Forbidden: You cannot access another user's interview" });
        }

        const now = new Date();
        const isSessionExpired = Boolean(interview.expiresAt && now.getTime() >= new Date(interview.expiresAt).getTime());
        if (isSessionExpired && interview.status !== "Completed") {
            interview.status = "Completed";
            await interview.save();
        }

        const isCoding = interview.interviewType === 'coding' || interview.mode === 'Coding';
        const sanitizedProblems = (interview.codingProblems || []).map(p => {
            const obj = p.toObject ? p.toObject() : { ...p };
            delete obj.hiddenTestCases;
            return obj;
        });

        const totalQuestions = interview.questions.length;
        return res.status(200).json({
            interviewId: interview._id,
            role: interview.role,
            experience: interview.experience,
            mode: interview.mode,
            status: interview.status,
            isSessionExpired,
            interviewType: interview.interviewType || (isCoding ? 'coding' : 'conceptual'),
            codingLanguage: interview.codingLanguage || 'javascript',
            codingCategory: interview.codingCategory || 'Problem Solving',
            codingProblems: sanitizedProblems,
            analytics: interview.analytics || null,
            adaptiveState: interview.adaptiveState || null,
            questions: interview.questions,
            enableCrossQuestioning: interview.enableCrossQuestioning || false,
            crossQuestioningType: interview.crossQuestioningType || 'Technical',
            interviewMode: interview.interviewMode || 'question_based',
            selectedQuestionCount: interview.selectedQuestionCount || totalQuestions,
            selectedDurationMinutes: interview.selectedDurationMinutes || null,
            targetQuestionCount: interview.targetQuestionCount || totalQuestions,
            creditsCharged: typeof interview.creditsCharged === 'number' ? interview.creditsCharged : 50,
            difficulty: interview.difficulty || 'medium',
            answerTimeLimitSeconds: interview.answerTimeLimitSeconds || 60,
            startedAt: interview.startedAt || interview.createdAt,
            expiresAt: interview.expiresAt || null,
            currentQuestionIndex: interview.currentQuestionIndex || 0,
            currentQuestionStartedAt: interview.currentQuestionStartedAt || interview.createdAt,
            currentQuestionDeadline: interview.currentQuestionDeadline || null,
        });
    } catch (error) {
        return res.status(500).json({ message: 'Error in getInterviewSession', error: error.message });
    }
};
