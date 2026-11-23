# 🎙️ Module 1: Conversational AI Mock Interview Engine

## Overview
Module 1 delivers a conversational, voice- and text-driven technical mock interview tailored to candidate target roles and parsed resumes.

## Architecture
- **PDF Resume Ingestion**: Uses `pdfjs-dist` to extract raw skills, projects, and experiences in-memory via `multer` buffers.
- **OpenRouter LLM Integration**: Generates role-calibrated questions and dynamically scores spoken responses on a 6-criterion rubric.
- **6 Evaluation Criteria**:
  1. Technical Accuracy (25%)
  2. Completeness (20%)
  3. Structure & Clarity (15%)
  4. Problem-Solving (15%)
  5. Communication Quality (15%)
  6. Behavioral Relevance (10%)
- **Audio & Speech Synchronization**: Supports live speech recognition with Web Speech API and text-to-speech audio synthesis.
- **Pricing & Credit Parity**: Fixed 10 credit consumption with atomic refund protection on network timeouts or quota exhaustion.
