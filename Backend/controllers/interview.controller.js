import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import { askAI } from '../services/openRouter.service.js';

// logic for resumeAnalyse => 
// step1 - find the path of the resume where it is stored
// step2 - read file data of the file 

export const resumeAnalyse = async (req, res) => {
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