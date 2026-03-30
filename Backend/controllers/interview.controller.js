import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import { askAI } from '../services/openRouter.service.js';
import User from '../models/user.model.js';
import Interview from '../models/interview.model.js';


export const resumeAnalyse = async (req, res) => {

    // logic for resumeAnalyse => 
    // step1 - find the path of the resume where it is stored
    // step2 - read file data of the file 

    try {
        if (!req.file) {
            return res.status(400).json({ message: "Please upload your resume" });
        }

        const filePath = req.file.path

        // converting the data into binary data
        const fileBuffer = await fs.promises.readFile(filePath)
        // converting the data in the pdfjs-dist understandable format
        const uint8Array = new Uint8Array(fileBuffer);

        const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise


        let resumeText = "";

        // Extracting text form all the pages

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const content = await page.getTextContent();

            const pageText = content.items.map(items => items.str).join(' ');
            resumeText += pageText + '\n';
        }

        resumeText = resumeText.replace(/\s/g, " ").trim();

        // the main prompt for the ai
        const messages = [
            {
                role: 'system',
                content: `Extract structured data form the resume.
                Return strictly JSON:
                {
                    "role":"string",
                    "experience":"string",
                    "projects":["project1", "project2" ],
                    "skills":["skill1", "skill2"]
                }
                `
            },
            {
                role: "user",
                content: resumeText
            }
        ];

        const aiResponse = await askAI(messages)

        const parsed = JSON.parse(aiResponse);

        fs.unlinkSync(filePath)

        return res.status(200).json({
            role: parsed.role,
            experience: parsed.experience,
            projects: parsed.projects,
            skills: parsed.skills,
            resumeText
        })

    } catch (error) {

        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        return res.status(500).json({ message: "error in the resumeAnalyse controller", error });
    }
}

export const generateQuestions = async (req, res) => {
    try {
        let { role, experience, mode, resumeText, projects, skills } = req.body;


        // remove any type of special symbols if any from the resume
        role = role?.trim();
        experience = experience?.trim();
        mode = mode?.trim();

        if (!role || !experience || !mode) {
            return res.status(400).json({ "message": "Please enter all the data" });
        }

        // we are getting the user Id from the isAuth middleware
        const user = await User.findById(req.userId)

        if (!user) {
            return res.status(404).json({ message: "user not found" });
        }

        if (user.credits < 50) {
            return res.status(400).json({ message: "Free limit reached please purchase more credits" })
        }

        // this is for the AI to understand
        const projectText = Array.isArray(projects) && projects.length ? projects.join(', ') : "None";

        const skillText = Array.isArray(skills) && skills.length ? skills.join(', ') : "None"

        const safeResume = resumeText?.trim() || 'None';


        const userPrompt = `
            Role:${role}
            Experience:${experience}
            InterviewMode:${mode}
            Projects:${projectText}
            Skills:${skillText}
            resume:${safeResume}
        `
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
                
                difficulty progression

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

        const aiResponse = await askAI(messages)

        if (!aiResponse || !aiResponse.trim()) {
            return res.status(500).json({ message: "AI didn't gave the answer" })
        }

        const questionArray = aiResponse.split("\n").map(q => q.trim()).filter(q => q.length > 0).slice(0, 5);

        if (!questionArray.length) {
            return res.status(500).json({
                message: "AI didn't generate questions"
            })
        }

        user.credits -= 50;
        await user.save()

        const interview = await Interview.create({
            userId: user._id,
            role,
            experience,
            mode,
            resumeText: safeResume,
            questions: questionArray.map((q, idx) => ({
                question: q,
                difficulty: ["easy", "easy", "medium", "medium", "hard"][idx],
                timeLimit: [60, 60, 90, 90, 120][idx]
            }))

        })


        res.json({
            interviewId: interview._id,
            creditsLeft: user.credits,
            userName: user.name,
            questions: interview.questions,
            mode
        })

    } catch (error) {
        return res.status(500).json({ message: "internal Server error in the generateQuestion controller" });
    }
}

export const submitAnswer = async (req, res) => {
    try {
        // 1. Destructure correctly (added timeTaken)
        const { interviewId, answer, timeTaken, questionIndex } = req.body;

        const interview = await Interview.findById(interviewId);
        if (!interview) {
            return res.status(404).json({ message: "Interview session not found" });
        }

        const question = interview.questions[questionIndex];

        // 2. Logic: Handle Empty Answer
        if (!answer || answer.trim() === "") {
            question.score = 0;
            question.feedback = "You didn't submit an answer for this question.";
            question.answer = "";
            await interview.save();
            return res.json({ feedback: question.feedback, score: 0 });
        }

        // 3. Logic: Handle Time Exceeded
        if (timeTaken > question.timeLimit) {
            question.score = 0;
            question.feedback = "Time limit exceeded. Try to answer more concisely next time.";
            question.answer = answer;
            await interview.save();
            return res.json({ feedback: question.feedback, score: 0 });
        }

        // 4. Prepare AI Evaluation Messages

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
            }
            ,
            {
                role: "user",
                content: `
Question: ${question.question}
Answer: ${answer}
`
            }
        ];


        // 5. Call AI and Handle Response (Crucial: Added Await & JSON Sanitization)
        const aiResponse = await askAI(messages);

        const parsed = JSON.parse(aiResponse);

        // 6. Update Database
        question.answer = answer;
        question.confidence = parsed.confidence,
            question.communication = parsed.communication,
            question.score = parsed.finalScore;
        question.feedback = parsed.feedback;

        await interview.save()

        return res.status(200).json({ feedback: parsed.feedback })


    } catch (error) {
        console.error("Error in submitAnswer:", error);
        return res.status(500).json({
            message: "Internal Server error in the submitAnswer controller",
            error: error.message
        });
    }
}

export const finishInterview = async (req, res) => {
    try {
        const { interviewId } = req.body

        if (!interviewId) {
            return res.status(404).json({ message: "interviewId not found" });
        }

        const interview = await Interview.findById(interviewId)
        const totalQuestions = interview.questions.length;

        let totalScore = 0;
        let totalConfidence = 0;
        let totalCorrectness = 0;
        let totalCommunication = 0;

        interview.questions.forEach((q) => {
            totalScore += q.score || 0;
            totalConfidence += q.confidence || 0;
            totalCorrectness += q.correctness || 0;
            totalCommunication += q.communication || 0;
        })

        const finalScore = totalQuestions ? totalScore / totalQuestions : 0;

        const avgConfidence = totalConfidence ? totalConfidence / totalQuestions : 0;

        const avgCommunication = totalCommunication ? totalCommunication / totalQuestions : 0;

        const avgCorrectness = totalCorrectness ? totalCorrectness / totalQuestions : 0;

        interview.finalScore = finalScore;
        interview.status = "Completed";

        await interview.save()

        return res.status(200).json({
            finalScore: Number(finalScore.toFixed(1)),
            confidence: Number(avgConfidence.toFixed(1)),
            correctness: Number(avgCorrectness.toFixed(1)),
            communication: Number(avgCommunication.toFixed(1)),
            questionWiseScore: interview.questions.map((q) => ({
                question: q.question,
                score: q.score || 0,
                correctness: q.correctness || 0,
                communication: q.communication || 0,
                feedback: q.feedback || 0,
            }))
        });

    } catch (error) {
        return res.status(500).json({ message: "internal server error in finishInterview controller" })
    }
}
