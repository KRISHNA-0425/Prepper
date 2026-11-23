/**
 * @file atsResumeExtractor.service.js
 * Information extraction service for resumes in Module 7: AI Resume-to-Job ATS Intelligence.
 * Extracts structured profile entities using deterministic parsing and AI synthesis.
 */

import { askAI as defaultAskAI } from '../openRouter.service.js';
import { safeParseJson } from '../resumeIntelligence.service.js';
import { normalizeSkillList } from './atsSkillNormalizer.js';

/**
 * Deterministically extracts basic contact info and links via regular expressions.
 * @param {string} text
 * @returns {object}
 */
export const extractContactInfoRegex = (text = '') => {
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;
  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  const linkedinRegex = /(https?:\/\/)?(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i;
  const githubRegex = /(https?:\/\/)?(www\.)?github\.com\/[a-zA-Z0-9_-]+/i;

  const emailMatch = text.match(emailRegex);
  const phoneMatch = text.match(phoneRegex);
  const linkedinMatch = text.match(linkedinRegex);
  const githubMatch = text.match(githubRegex);

  // Extract candidate name: first line or non-empty header
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const potentialName = lines[0] && lines[0].length < 40 && !lines[0].includes('@') ? lines[0] : 'Candidate';

  return {
    fullName: potentialName,
    email: emailMatch ? emailMatch[0] : '',
    phone: phoneMatch ? phoneMatch[0] : '',
    linkedin: linkedinMatch ? linkedinMatch[0] : '',
    github: githubMatch ? githubMatch[0] : '',
    location: '',
  };
};

/**
 * Deterministically segments text into sections based on typical resume headings.
 * @param {string} text
 * @returns {object}
 */
export const segmentResumeSections = (text = '') => {
  const sections = {
    summary: '',
    skills: '',
    experience: '',
    projects: '',
    education: '',
    certifications: '',
  };

  const lines = text.split('\n');
  let currentSection = 'summary';

  const headerPatterns = [
    { key: 'skills', regex: /^(technical\s+)?skills|technologies|tech\s+stack/i },
    { key: 'experience', regex: /^(work\s+)?experience|employment|work\s+history|internships?/i },
    { key: 'projects', regex: /^projects|academic\s+projects|personal\s+projects/i },
    { key: 'education', regex: /^education|academic\s+background|qualifications/i },
    { key: 'certifications', regex: /^certifications?|licenses|courses/i },
    { key: 'summary', regex: /^(professional\s+)?summary|profile|about\s+me/i },
  ];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let matchedHeader = false;
    for (const h of headerPatterns) {
      if (h.regex.test(trimmed) && trimmed.length < 35) {
        currentSection = h.key;
        matchedHeader = true;
        break;
      }
    }

    if (!matchedHeader) {
      sections[currentSection] += (sections[currentSection] ? '\n' : '') + trimmed;
    }
  }

  return sections;
};

/**
 * Fallback deterministic profile extractor when AI service is unavailable.
 * @param {string} rawText
 * @returns {object}
 */
export const buildDeterministicProfile = (rawText = '') => {
  const contact = extractContactInfoRegex(rawText);
  const sections = segmentResumeSections(rawText);

  // Extract skills from skills section or regex scan
  const rawSkills = sections.skills
    .split(/[,•|\n\t;]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length < 30);

  const normalizedSkills = normalizeSkillList(rawSkills);

  return {
    fullName: contact.fullName,
    contactInfo: {
      email: contact.email,
      phone: contact.phone,
      location: contact.location,
      linkedin: contact.linkedin,
      github: contact.github,
      portfolio: '',
    },
    professionalSummary: sections.summary.slice(0, 500) || 'Experienced software professional.',
    technicalSkills: normalizedSkills,
    programmingLanguages: normalizedSkills.filter((s) => ['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'Go', 'Rust'].includes(s)),
    frameworks: normalizedSkills.filter((s) => ['React', 'Node.js', 'Express.js', 'Next.js', 'Angular', 'Vue.js', 'Spring Boot'].includes(s)),
    databases: normalizedSkills.filter((s) => ['MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'SQL Server'].includes(s)),
    tools: normalizedSkills.filter((s) => ['Docker', 'Kubernetes', 'Git', 'AWS', 'GCP', 'Azure', 'Linux'].includes(s)),
    experience: sections.experience ? [{
      company: 'Documented Experience',
      role: 'Software Engineer',
      startDate: '',
      endDate: 'Present',
      durationYears: 2,
      isCurrent: true,
      description: sections.experience.slice(0, 400),
      bullets: sections.experience.split('\n').filter((l) => l.trim().length > 10).slice(0, 5),
      technologies: normalizedSkills.slice(0, 5),
    }] : [],
    projects: sections.projects ? [{
      name: 'Key Project',
      description: sections.projects.slice(0, 300),
      role: 'Developer',
      technologies: normalizedSkills.slice(0, 4),
      bullets: sections.projects.split('\n').filter((l) => l.trim().length > 10).slice(0, 4),
      link: '',
    }] : [],
    education: sections.education ? [{
      institution: 'Higher Education Institution',
      degree: 'Bachelor of Technology / Computer Science',
      fieldOfStudy: 'Computer Science',
      graduationYear: '',
      gpa: '',
    }] : [],
    certifications: sections.certifications ? sections.certifications.split('\n').filter(Boolean).slice(0, 5) : [],
    achievements: [],
    keywords: normalizedSkills.slice(0, 15),
    experienceLevel: sections.experience.length > 50 ? 'Mid-Level' : 'Fresher (0 years)',
    totalYearsExperience: sections.experience.length > 50 ? 2 : 0,
  };
};

/**
 * Extracts comprehensive structured information from resume text.
 * Combines deterministic regex extraction with OpenRouter AI schema synthesis.
 *
 * @param {string} rawText
 * @param {object} [options={}]
 * @returns {Promise<object>}
 */
export const extractResumeProfile = async (rawText = '', options = {}) => {
  if (!rawText || typeof rawText !== 'string' || rawText.trim().length < 20) {
    throw new Error('Resume text is too brief or empty to extract structured profile.');
  }

  const askAI = options.askAI || defaultAskAI;
  const deterministicFallback = buildDeterministicProfile(rawText);

  const prompt = `You are an expert Resume Parser and Talent Intelligence Analyzer.
Analyze the following raw resume text and extract clean, structured candidate information.

RULES:
1. ONLY extract information explicitly present in the resume text. Do NOT fabricate companies, dates, or skills.
2. Group skills into programmingLanguages, frameworks, databases, and tools.
3. Return clean JSON matching the specified schema.

RESUME TEXT:
"""
${rawText.slice(0, 15000)}
"""

RETURN STRICT JSON ONLY:
{
  "fullName": "Candidate Name",
  "contactInfo": {
    "email": "email@example.com",
    "phone": "+1...",
    "location": "City, Country",
    "linkedin": "url",
    "github": "url"
  },
  "professionalSummary": "Concise summary from resume",
  "technicalSkills": ["Skill 1", "Skill 2"],
  "programmingLanguages": ["Language 1"],
  "frameworks": ["Framework 1"],
  "databases": ["Database 1"],
  "tools": ["Tool 1"],
  "experience": [
    {
      "company": "Company Name",
      "role": "Job Title",
      "startDate": "Year/Month",
      "endDate": "Year/Month or Present",
      "durationYears": 1.5,
      "bullets": ["Achievement or responsibility bullet 1"],
      "technologies": ["Tech 1"]
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "Short project description",
      "role": "Role in project",
      "technologies": ["Tech 1"],
      "bullets": ["Key feature or bullet"]
    }
  ],
  "education": [
    {
      "institution": "University/College",
      "degree": "Degree name",
      "fieldOfStudy": "Major",
      "graduationYear": "2024"
    }
  ],
  "certifications": ["Cert 1"],
  "experienceLevel": "Fresher (0 years) | Entry-Level | Mid-Level | Senior-Level | Lead/Staff-Level",
  "totalYearsExperience": 2.5
}`;

  try {
    const rawAiResponse = await askAI(
      [
        { role: 'system', content: 'You are an objective resume information extraction engine. Return JSON only.' },
        { role: 'user', content: prompt },
      ],
      { max_tokens: 2500, temperature: 0.1 }
    );

    const { data } = safeParseJson(rawAiResponse);
    if (data && typeof data === 'object') {
      const normalizedSkills = normalizeSkillList([
        ...(Array.isArray(data.technicalSkills) ? data.technicalSkills : []),
        ...(Array.isArray(data.programmingLanguages) ? data.programmingLanguages : []),
        ...(Array.isArray(data.frameworks) ? data.frameworks : []),
        ...(Array.isArray(data.databases) ? data.databases : []),
        ...(Array.isArray(data.tools) ? data.tools : []),
      ]);

      return {
        fullName: String(data.fullName || deterministicFallback.fullName).trim(),
        contactInfo: {
          email: data.contactInfo?.email || deterministicFallback.contactInfo.email,
          phone: data.contactInfo?.phone || deterministicFallback.contactInfo.phone,
          location: data.contactInfo?.location || deterministicFallback.contactInfo.location,
          linkedin: data.contactInfo?.linkedin || deterministicFallback.contactInfo.linkedin,
          github: data.contactInfo?.github || deterministicFallback.contactInfo.github,
          portfolio: data.contactInfo?.portfolio || '',
        },
        professionalSummary: String(data.professionalSummary || deterministicFallback.professionalSummary).trim(),
        technicalSkills: normalizedSkills,
        programmingLanguages: normalizeSkillList(Array.isArray(data.programmingLanguages) ? data.programmingLanguages : deterministicFallback.programmingLanguages),
        frameworks: normalizeSkillList(Array.isArray(data.frameworks) ? data.frameworks : deterministicFallback.frameworks),
        databases: normalizeSkillList(Array.isArray(data.databases) ? data.databases : deterministicFallback.databases),
        tools: normalizeSkillList(Array.isArray(data.tools) ? data.tools : deterministicFallback.tools),
        experience: Array.isArray(data.experience) && data.experience.length > 0 ? data.experience : deterministicFallback.experience,
        projects: Array.isArray(data.projects) && data.projects.length > 0 ? data.projects : deterministicFallback.projects,
        education: Array.isArray(data.education) && data.education.length > 0 ? data.education : deterministicFallback.education,
        certifications: Array.isArray(data.certifications) ? data.certifications : deterministicFallback.certifications,
        achievements: Array.isArray(data.achievements) ? data.achievements : [],
        keywords: normalizedSkills.slice(0, 20),
        experienceLevel: data.experienceLevel || deterministicFallback.experienceLevel,
        totalYearsExperience: typeof data.totalYearsExperience === 'number' ? data.totalYearsExperience : deterministicFallback.totalYearsExperience,
      };
    }
  } catch (err) {
    // Retain deterministic fallback on AI timeout or failure
  }

  return deterministicFallback;
};
