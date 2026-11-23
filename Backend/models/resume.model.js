/**
 * @file resume.model.js
 * Mongoose schema for candidate resumes in Module 7: AI Resume-to-Job ATS Intelligence.
 * Stores sanitized raw text, file metadata, and structured extraction profile.
 */

import mongoose from 'mongoose';

const contactInfoSchema = new mongoose.Schema({
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  location: { type: String, default: '' },
  linkedin: { type: String, default: '' },
  github: { type: String, default: '' },
  portfolio: { type: String, default: '' },
}, { _id: false });

const experienceItemSchema = new mongoose.Schema({
  company: { type: String, default: '' },
  role: { type: String, default: '' },
  startDate: { type: String, default: '' },
  endDate: { type: String, default: '' },
  durationYears: { type: Number, default: 0 },
  isCurrent: { type: Boolean, default: false },
  description: { type: String, default: '' },
  bullets: { type: [String], default: [] },
  technologies: { type: [String], default: [] },
}, { _id: false });

const projectItemSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  description: { type: String, default: '' },
  role: { type: String, default: '' },
  technologies: { type: [String], default: [] },
  bullets: { type: [String], default: [] },
  link: { type: String, default: '' },
}, { _id: false });

const educationItemSchema = new mongoose.Schema({
  institution: { type: String, default: '' },
  degree: { type: String, default: '' },
  fieldOfStudy: { type: String, default: '' },
  graduationYear: { type: String, default: '' },
  gpa: { type: String, default: '' },
}, { _id: false });

const resumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  originalFileName: {
    type: String,
    required: true,
    trim: true,
  },
  fileType: {
    type: String,
    enum: ['pdf', 'docx', 'txt'],
    required: true,
  },
  fileSize: {
    type: Number,
    required: true,
  },
  contentHash: {
    type: String,
    index: true,
  },
  rawText: {
    type: String,
    required: true,
  },
  structuredData: {
    fullName: { type: String, default: '' },
    contactInfo: { type: contactInfoSchema, default: () => ({}) },
    professionalSummary: { type: String, default: '' },
    technicalSkills: { type: [String], default: [] },
    programmingLanguages: { type: [String], default: [] },
    frameworks: { type: [String], default: [] },
    databases: { type: [String], default: [] },
    tools: { type: [String], default: [] },
    experience: { type: [experienceItemSchema], default: [] },
    projects: { type: [projectItemSchema], default: [] },
    education: { type: [educationItemSchema], default: [] },
    certifications: { type: [String], default: [] },
    achievements: { type: [String], default: [] },
    keywords: { type: [String], default: [] },
  },
  experienceLevel: {
    type: String,
    default: 'Fresher (0 years)',
  },
  totalYearsExperience: {
    type: Number,
    default: 0,
  },
  isExtractionComplete: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

resumeSchema.index({ userId: 1, createdAt: -1 });

const Resume = mongoose.models.Resume || mongoose.model('Resume', resumeSchema);

export default Resume;
