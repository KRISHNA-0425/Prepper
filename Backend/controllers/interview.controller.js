import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { askAI } from '../services/openRouter.service.js';
import { extractResumeClaims, safeParseJson } from '../services/resumeIntelligence.service.js';
import User from '../models/user.model.js';
import Interview from '../models/interview.model.js';

export const resumeAnalyse = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Please upload your resume" });
        }

        const filePath = req.file.path;

        // converting the data into binary data
        const fileBuffer = await fs.promises.readFile(filePath);
        // converting the data in the pdfjs-dist understandable format
        const uint8Array = new Uint8Array(fileBuffer);

        const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;

        let resumeText = "";

        // Extracting text from all pages
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const content = await page.getTextContent();
            const pageText = content.items.map(items => items.str).join(' ');
            resumeText += pageText + '\n';
        }

        resumeText = resumeText.replace(/\s/g, " ").trim();

        // Source-grounded Resume Intelligence extraction pipeline
        const extraction = await extractResumeClaims({ resumeText });

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Return legacy backward-compatible fields alongside the cross-examination claims profile
        return res.status(200).json({
            role: extraction.role || '',
            experience: extraction.experience || '',
            projects: extraction.projects.map((p) => p.title),
            skills: extraction.skills || [],
            resumeText,
            crossExaminationProfile: {
                projects: extraction.projects,
                standaloneClaims: extraction.standaloneClaims,
                allClaims: extraction.allClaims,
                resumeHash: extraction.resumeHash,
                provenanceStats: extraction.provenanceStats,
                warnings: extraction.warnings,
            },
        });

    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        return res.status(500).json({ message: "error in the resumeAnalyse controller", error });
    }
};

export const generateQuestions = async (req, res) => {
    try {
        let { role, experience, mode, resumeText, projects, skills, enableCrossQuestioning, crossQuestioningType } = req.body;

        role = role?.trim();
        experience = experience?.trim();
        mode = mode?.trim();
        enableCrossQuestioning = Boolean(enableCrossQuestioning);
        const validCrossTypes = ["Technical", "Behavioral"];
        const safeCrossQuestioningType = validCrossTypes.includes(crossQuestioningType) ? crossQuestioningType : "Technical";

        if (!role || !experience || !mode) {
            return res.status(400).json({ message: "Please enter all the data" });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ message: "user not found" });
        }

        if (user.credits < 50) {
            return res.status(400).json({ message: "Free limit reached please purchase more credits" });
        }

        const projectText = Array.isArray(projects) && projects.length ? projects.join(', ') : "None";
        const skillText = Array.isArray(skills) && skills.length ? skills.join(', ') : "None";
        const safeResume = resumeText?.trim() || 'None';

        const userPrompt = `
            Role:${role}
            Experience:${experience}
            InterviewMode:${mode}
            Projects:${projectText}
            Skills:${skillText}
            resume:${safeResume}
        `;

        if (!userPrompt.trim()) {
            return res.status(400).json({ message: "prompt is empty" });
        }

        const messages = [
            {
                role: "system",
                content: `
                You are a real human interviewer conducting a professional interview.
                Speak in simple, natural English language as if you are directly talking to the candidate.
                Generate Exactly 5 questions
                Strict rules:
                - Each question must contain between 15-25 words
                - Each question should be single complete sentence
                - Do not number them.
                - Do not add explanations.
                - Do not add extra text before or after
                - One question per line only
                - Keep language simple and conversational
                - Questions must be practical and realistic.
                
                difficulty progression:
                question 1 -> easy
                question 2 -> easy
                question 3 -> medium
                question 4 -> medium
                question 5 -> hard

                Make questions based on the candidate's role, experience, interview mode, projects, skills, and resume details.
                `
            },
            {
                role: "user",
                content: userPrompt
            }
        ];

        const aiResponse = await askAI(messages);

        if (!aiResponse || !aiResponse.trim()) {
            return res.status(500).json({ message: "AI didn't gave the answer" });
        }

        const questionArray = aiResponse.split("\n").map(q => q.trim()).filter(q => q.length > 0).slice(0, 5);

        if (!questionArray.length) {
            return res.status(500).json({
                message: "AI didn't generate questions"
            });
        }

        user.credits -= 50;
        await user.save();

        const interview = await Interview.create({
            userId: user._id,
            role,
            experience,
            mode,
            resumeText: safeResume,
            enableCrossQuestioning,
            questions: questionArray.map((q, idx) => ({
                question: q,
                difficulty: ["easy", "easy", "medium", "medium", "hard"][idx],
                timeLimit: [60, 60, 90, 90, 120][idx],
                isFollowUp: false,
                depth: 0,
            }))
        });

        res.json({
            interviewId: interview._id,
            creditsLeft: user.credits,
            userName: user.name,
            questions: interview.questions,
            mode,
            enableCrossQuestioning: interview.enableCrossQuestioning,
            crossQuestioningType: interview.crossQuestioningType
        });

    } catch (error) {
        return res.status(500).json({ message: "internal Server error in the generateQuestion controller" });
    }
};

export const submitAnswer = async (req, res) => {
    try {
        const { interviewId, answer, timeTaken, questionIndex } = req.body;

        const interview = await Interview.findById(interviewId);
        if (!interview) {
            return res.status(404).json({ message: "Interview session not found" });
        }

        if (questionIndex < 0 || questionIndex >= interview.questions.length) {
            return res.status(400).json({ message: "Invalid question index" });
        }

        const question = interview.questions[questionIndex];

        // 1. Handle Empty Answer
        if (!answer || answer.trim() === "") {
            question.score = 0;
            question.feedback = "You didn't submit an answer for this question.";
            question.answer = "";
            await interview.save();
            return res.json({ 
                feedback: question.feedback, 
                score: 0,
                questions: interview.questions 
            });
        }

        // 2. Prepare AI Evaluation Messages (Timeout policy: do NOT discard answer if candidate submitted)
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

Rules:
- Be realistic and unbiased.
- Do not give random high scores.
- If the answer is weak, score low.
- If the answer is strong and detailed, score high.
- Consider clarity, structure, and relevance.

Calculate:
finalScore = average of confidence, communication, and correctness (rounded to nearest whole number).

Feedback Rules:
- Write natural human feedback.
- 10 to 15 words only.
- Sound like real interview feedback.
- Can suggest improvement if needed.
- Do NOT repeat the question.
- Do NOT explain scoring.
- Keep tone professional and honest.

Return ONLY valid JSON in this format:

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
                content: `
Question: ${question.question}
Answer: ${answer}
`
            }
        ];

        // 3. Call AI and Handle Response with safe parsing
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
            } else if (aiResponse) {
                const manualParsed = JSON.parse(aiResponse);
                parsed = {
                    confidence: Number(manualParsed.confidence) || 6,
                    communication: Number(manualParsed.communication) || 6,
                    correctness: Number(manualParsed.correctness) || 6,
                    finalScore: Number(manualParsed.finalScore) || 6,
                    feedback: String(manualParsed.feedback || "Response recorded and evaluated.").trim()
                };
            }
        } catch (evalErr) {
            console.warn("AI evaluation fallback triggered:", evalErr.message);
        }

        // 4. Update Current Question in DB
        question.answer = answer;
        question.confidence = parsed.confidence;
        question.communication = parsed.communication;
        question.correctness = parsed.correctness;
        question.score = parsed.finalScore;
        question.feedback = parsed.feedback;

        // 5. Feature D: Optional Adaptive Cross-Questioning Probing
        let followUpQuestion = null;
        const isCrossQuestioningEnabled = Boolean(interview.enableCrossQuestioning);

        if (isCrossQuestioningEnabled) {
            const currentDepth = Number(question.depth) || 0;
            const existingFollowUpsCount = interview.questions.filter(q => q.isFollowUp).length;

            // Bounding guards:
            // 1. Max depth 1 (follow-ups cannot generate nested follow-ups)
            // 2. Max 2 follow-ups total across the entire interview
            // 3. Answer has meaningful content (>= 20 chars)
            // 4. Score is in probing range (between 2 and 8)
            const isEligibleForProbe = 
                currentDepth < 1 &&
                existingFollowUpsCount < 2 &&
                answer.trim().length >= 20 &&
                parsed.finalScore >= 2 &&
                parsed.finalScore <= 8;

            if (isEligibleForProbe) {
                try {
                    const crossType = interview.crossQuestioningType || 'Technical';
                    const isBehavioral = crossType === 'Behavioral';
                    const probeSystemPrompt = isBehavioral
                        ? `You are an expert interviewer specializing in behavioral probing.
Based on the candidate's answer, decide whether a targeted behavioral follow-up question is warranted.
Probe into concrete situations, the candidate's individual ownership, decisions, collaboration, conflicts, actions taken, outcomes, and lessons learned.
Rules:
- If warranted, return JSON:
{
  "warranted": true,
  "followUpQuestion": "A single direct behavioral follow-up question (15-25 words)",
  "difficulty": "medium"
}
- If the answer was sufficient or not suitable for probing, return JSON:
{
  "warranted": false
}
Return ONLY valid JSON.`
                        : `You are an expert interviewer specializing in technical and architectural probing.
Based on the candidate's answer, decide whether a targeted technical follow-up question is warranted to probe deeper into technical specifics, architectural trade-offs, debugging decisions, edge cases, performance, and evidence for technical claims.
Rules:
- If warranted, return JSON:
{
  "warranted": true,
  "followUpQuestion": "A single direct technical follow-up question (15-25 words)",
  "difficulty": "medium"
}
- If the answer was sufficient or not suitable for probing, return JSON:
{
  "warranted": false
}
Return ONLY valid JSON.`;

                    const probeMessages = [
                        {
                            role: "system",
                            content: probeSystemPrompt
                        },
                        {
                            role: "user",
                            content: `Role: ${interview.role}\nOriginal Question: ${question.question}\nCandidate Answer: ${answer}\nFeedback: ${parsed.feedback}`
                        }
                    ];

                    const probeResponse = await askAI(probeMessages);
                    const { data: probeData } = safeParseJson(probeResponse);

                    if (probeData && probeData.warranted && probeData.followUpQuestion) {
                        const qText = String(probeData.followUpQuestion).trim();
                        // Validate non-empty and not identical to original
                        if (qText.length >= 15 && qText.toLowerCase() !== question.question.toLowerCase()) {
                            followUpQuestion = {
                                question: qText,
                                difficulty: probeData.difficulty === 'hard' ? 'hard' : 'medium',
                                timeLimit: 90,
                                isFollowUp: true,
                                parentQuestionIndex: questionIndex,
                                depth: currentDepth + 1,
                                answer: "",
                                feedback: "",
                                score: 0,
                                confidence: 0,
                                communication: 0,
                                correctness: 0
                            };

                            // Insert into interview.questions directly after current question
                            interview.questions.splice(questionIndex + 1, 0, followUpQuestion);
                        }
                    }
                } catch (probeErr) {
                    console.warn("Follow-up generation non-fatal error:", probeErr.message);
                }
            }
        }

        await interview.save();

        return res.status(200).json({ 
            feedback: parsed.feedback,
            score: parsed.finalScore,
            followUpQuestion,
            questions: interview.questions
        });

    } catch (error) {
        console.error("Error in submitAnswer:", error);
        return res.status(500).json({
            message: "Internal Server error in the submitAnswer controller",
            error: error.message
        });
    }
};

export const finishInterview = async (req, res) => {
    try {
        const { interviewId } = req.body;
        const interview = await Interview.findById(interviewId);
        if (!interview) {
            return res.status(404).json({ message: "Interview not found" });
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
            questions: interview.questions
        };

        interview.finalScore = data.finalScore;
        interview.status = "Completed";
        await interview.save();

        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const getMyInterviews = async (req, res) => {
    try {
        const interviews = await Interview.find({ userId: req.userId })
            .sort({ createdAt: -1 })
            .select('role experience mode finalScore status createdAt enableCrossQuestioning'); 

        return res.status(200).json(interviews);

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
            finalScore: interview.finalScore,
            confidence: avgConfidence, 
            communication: avgCommunication,
            correctness: avgCorrectness,
            questions: interview.questions,
            enableCrossQuestioning: interview.enableCrossQuestioning || false
        });

    } catch (error) {
        return res.status(500).json({ message: 'Error in getInterviewReport', error: error.message });
    }
};
