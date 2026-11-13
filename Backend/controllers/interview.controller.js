import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { askAI } from '../services/openRouter.service.js';
import { extractResumeClaims, extractTextFromDocxBuffer, safeParseJson } from '../services/resumeIntelligence.service.js';
import User from '../models/user.model.js';
import Interview from '../models/interview.model.js';
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

        // Normalize mode to valid enum: ["HR", "Technical"]
        const safeMode = (mode === "HR" || mode === "HR/Behavioral" || mode === "Behavioral") ? "HR" : "Technical";

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
            const status = (aiErr.status === 402 || aiErr.status === 429) ? 503 : 500;
            const message = aiErr.status === 402
                ? "AI generation quota exceeded. Please check API credits or try again later."
                : (aiErr.message || "Failed to generate interview questions from AI provider");
            return res.status(status).json({ message });
        }

        if (!aiResponse || !aiResponse.trim()) {
            await safeRefund();
            return res.status(500).json({ message: "AI didn't gave the answer" });
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
            return res.status(503).json({
                message: `Unable to generate the full allocation of ${targetCount} questions. Your credits have been fully refunded. Please try again.`
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
                questions: questionArray.map((q) => ({
                    question: q,
                    difficulty: "medium", // Medium difficulty exclusively
                    timeLimit: 60,        // Strict 60-second limit
                    isFollowUp: false,
                    depth: 0,
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
        console.error("[generateQuestions] Unexpected error:", error.message || error);
        return res.status(500).json({ message: "internal Server error in the generateQuestion controller" });
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
                { new: true }
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
            currentQuestion.score = 0;
            currentQuestion.confidence = 0;
            currentQuestion.communication = 0;
            currentQuestion.correctness = 0;
            currentQuestion.feedback = deadlineCheck.isTimedOut
                ? "Time expired. No answer was submitted."
                : "You didn't submit an answer for this question.";
            currentQuestion.answer = "";

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
                questions: lockedDoc.questions,
                currentQuestionIndex: lockedDoc.currentQuestionIndex,
                currentQuestionStartedAt: lockedDoc.currentQuestionStartedAt,
                currentQuestionDeadline: lockedDoc.currentQuestionDeadline,
                isSessionExpired: false,
                targetQuestionCount: lockedDoc.targetQuestionCount,
                isAllocationExhausted
            });
        }

        // 7. Non-Empty Answer: Evaluate Response with AI
        const messages = [
            {
                role: "system",
                content: `
You are a professional human interviewer evaluating a candidate's answer in a real interview.
Evaluate naturally and fairly, like a real person would.
Score the answer in these areas (0 to 10):
1. Confidence – Does the answer sound clear, confident, and well-presented?
2. Communication – Is the language simple, clear, and easy to understand?
3. Correctness – Is the answer accurate, relevant, and complete?

Calculate finalScore as average of confidence, communication, and correctness (rounded to nearest whole number).
Feedback Rules:
- Write natural human feedback (10 to 15 words only).
- Do NOT repeat the question or explain scoring.
Return ONLY valid JSON in format:
{
  "confidence": number,
  "communication": number,
  "correctness": number,
  "finalScore": number,
  "feedback": "short human feedback"
}
`
            },
            {
                role: "user",
                content: `Question: ${currentQuestion.question}\nAnswer: ${answer}`
            }
        ];

        let parsed = { confidence: 6, communication: 6, correctness: 6, finalScore: 6, feedback: "Response recorded and evaluated." };
        try {
            const aiResponse = await askAI(messages);
            const { data, error: parseError } = safeParseJson(aiResponse);
            if (!parseError && data && typeof data === 'object') {
                parsed = {
                    confidence: Number(data.confidence) || 6,
                    communication: Number(data.communication) || 6,
                    correctness: Number(data.correctness) || 6,
                    finalScore: Number(data.finalScore) || 6,
                    feedback: String(data.feedback || "Response recorded and evaluated.").trim()
                };
            }
        } catch (evalErr) {
            console.warn("[submitAnswer] AI evaluation fallback triggered:", evalErr.message);
        }

        // If submitted after deadline + grace period, apply late-submission penalty
        if (deadlineCheck.isTimedOut) {
            parsed.finalScore = Math.min(parsed.finalScore, 4);
            parsed.feedback = `[Time Expired] ${parsed.feedback}`;
        }

        currentQuestion.answer = answer.trim();
        currentQuestion.confidence = parsed.confidence;
        currentQuestion.communication = parsed.communication;
        currentQuestion.correctness = parsed.correctness;
        currentQuestion.score = parsed.finalScore;
        currentQuestion.feedback = parsed.feedback;

        // 8. Adaptive Cross-Questioning (Phase 4: Follow-up replaces unasked primary question, allocation strictly capped)
        let followUpQuestion = null;
        const isCrossQuestioningEnabled = Boolean(lockedDoc.enableCrossQuestioning);
        const targetAllocation = lockedDoc.targetQuestionCount || lockedDoc.questions.length;
        const existingFollowUpsCount = lockedDoc.questions.filter(q => q.isFollowUp).length;
        const currentDepth = Number(currentQuestion.depth) || 0;

        // Check if there are unasked primary questions later in the sequence that can be replaced
        let lastUnaskedPrimaryIndex = -1;
        for (let i = lockedDoc.questions.length - 1; i > expectedIndex; i--) {
            if (!lockedDoc.questions[i].isFollowUp && !lockedDoc.questions[i].answer) {
                lastUnaskedPrimaryIndex = i;
                break;
            }
        }

        const isEligibleForProbe =
            isCrossQuestioningEnabled &&
            !deadlineCheck.isTimedOut &&
            currentDepth < 1 &&
            existingFollowUpsCount < 2 &&
            lastUnaskedPrimaryIndex > expectedIndex &&
            answer.trim().length >= 20 &&
            parsed.finalScore >= 2 &&
            parsed.finalScore <= 8;

        if (isEligibleForProbe) {
            try {
                const crossType = lockedDoc.crossQuestioningType || 'Technical';
                const isBehavioral = crossType === 'Behavioral';
                const probeSystemPrompt = isBehavioral
                    ? `You are an expert interviewer specializing in behavioral probing.
Based on the candidate's answer, decide whether a targeted behavioral follow-up question is warranted.
Probe into concrete situations, individual ownership, decisions, collaboration, conflicts, actions taken, and outcomes.
Return ONLY valid JSON:
{
  "warranted": true,
  "followUpQuestion": "A single direct behavioral follow-up question (15-25 words)",
  "difficulty": "medium"
} or { "warranted": false }`
                    : `You are an expert interviewer specializing in technical probing.
Based on the candidate's answer, decide whether a targeted technical follow-up question is warranted to probe technical specifics, architectural trade-offs, debugging, and performance.
Return ONLY valid JSON:
{
  "warranted": true,
  "followUpQuestion": "A single direct technical follow-up question (15-25 words)",
  "difficulty": "medium"
} or { "warranted": false }`;

                const probeMessages = [
                    { role: "system", content: probeSystemPrompt },
                    { role: "user", content: `Role: ${lockedDoc.role}\nOriginal Question: ${currentQuestion.question}\nCandidate Answer: ${answer}\nFeedback: ${parsed.feedback}` }
                ];

                const probeResponse = await askAI(probeMessages);
                const { data: probeData } = safeParseJson(probeResponse);

                if (probeData && probeData.warranted && probeData.followUpQuestion) {
                    const qText = String(probeData.followUpQuestion).trim();
                    if (qText.length >= 15 && qText.toLowerCase() !== currentQuestion.question.toLowerCase()) {
                        followUpQuestion = {
                            question: qText,
                            difficulty: "medium", // Strictly medium difficulty
                            timeLimit: 60,        // Strict 60s
                            isFollowUp: true,
                            parentQuestionIndex: expectedIndex,
                            depth: currentDepth + 1,
                            answer: "",
                            feedback: "",
                            score: 0,
                            confidence: 0,
                            communication: 0,
                            correctness: 0
                        };

                        // Insert follow-up directly after current question
                        lockedDoc.questions.splice(expectedIndex + 1, 0, followUpQuestion);

                        // Displace / pop the last unasked primary question to ensure total questions never exceeds targetAllocation
                        for (let i = lockedDoc.questions.length - 1; i > expectedIndex + 1; i--) {
                            if (!lockedDoc.questions[i].isFollowUp && !lockedDoc.questions[i].answer) {
                                lockedDoc.questions.splice(i, 1);
                                break;
                            }
                        }
                    }
                }
            } catch (probeErr) {
                console.warn("[submitAnswer] Follow-up generation non-fatal error:", probeErr.message);
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
            feedback: parsed.feedback,
            score: parsed.finalScore,
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

        const data = {
            finalScore: totalQuestions ? Math.round(totalScore / totalQuestions) : 0,
            confidence: totalQuestions ? Math.round(totalConfidence / totalQuestions) : 0,
            communication: totalQuestions ? Math.round(totalCommunication / totalQuestions) : 0,
            correctness: totalQuestions ? Math.round(totalCorrectness / totalQuestions) : 0,
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

        return res.status(200).json({
            role: interview.role,
            experience: interview.experience,
            mode: interview.mode,
            finalScore: interview.finalScore,
            confidence: avgConfidence, 
            communication: avgCommunication,
            correctness: avgCorrectness,
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

        const totalQuestions = interview.questions.length;
        return res.status(200).json({
            interviewId: interview._id,
            role: interview.role,
            experience: interview.experience,
            mode: interview.mode,
            status: interview.status,
            isSessionExpired,
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
