/**
 * @file atsDocumentParser.service.js
 * Multi-format document parser for Module 7: AI Resume-to-Job ATS Intelligence.
 * Safely extracts plain text from PDF, DOCX, and TXT documents in-memory.
 */

import crypto from 'crypto';
import path from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import mammoth from 'mammoth';

export const SUPPORTED_EXTENSIONS = Object.freeze(['.pdf', '.docx', '.doc', '.txt']);

export const SUPPORTED_MIME_TYPES = Object.freeze([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'application/octet-stream',
]);

export const PARSER_LIMITS = Object.freeze({
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  MAX_TEXT_LENGTH_CHARS: 60000,
  MIN_TEXT_LENGTH_CHARS: 50,
});

/**
 * Sanitizes original filename to prevent path traversal, null bytes, and malicious characters.
 * @param {string} originalName
 * @returns {string}
 */
export const sanitizeFileName = (originalName = '') => {
  if (typeof originalName !== 'string') return 'resume_document';
  // Strip null bytes, path traversal sequences, and control characters
  const base = path.basename(originalName);
  const sanitized = base
    .replace(/\0/g, '')
    .replace(/[\\/]/g, '')
    .replace(/[^a-zA-Z0-9._\s-]/g, '')
    .trim();
  return sanitized.slice(0, 150) || 'resume_document';
};

/**
 * Computes sha256 hash of a buffer for content deduplication & integrity checks.
 * @param {Buffer} buffer
 * @returns {string}
 */
export const computeBufferHash = (buffer) => {
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

/**
 * Extracts plain text from a PDF buffer using pdfjs-dist.
 * @param {Buffer} buffer
 * @returns {Promise<string>}
 */
export const extractTextFromPdf = async (buffer) => {
  const uint8Array = new Uint8Array(buffer);
  const loadingTask = pdfjsLib.getDocument({
    data: uint8Array,
    useSystemFonts: true,
    isEvalSupported: false,
    disableFontFace: true,
  });

  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;
  const pageTextPromises = [];

  for (let i = 1; i <= numPages; i++) {
    pageTextPromises.push(
      pdf.getPage(i).then(async (page) => {
        const textContent = await page.getTextContent();
        return textContent.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ');
      })
    );
  }

  const pageTexts = await Promise.all(pageTextPromises);
  return pageTexts.join('\n\n');
};

/**
 * Extracts plain text from a DOCX buffer using mammoth.
 * @param {Buffer} buffer
 * @returns {Promise<string>}
 */
export const extractTextFromDocx = async (buffer) => {
  const result = await mammoth.extractRawText({ buffer });
  return result.value || '';
};

/**
 * Extracts plain text from a TXT buffer.
 * @param {Buffer} buffer
 * @returns {string}
 */
export const extractTextFromTxt = (buffer) => {
  return buffer.toString('utf-8');
};

/**
 * Universal document parser entry point.
 * Validates, identifies format, extracts plain text, and sanitizes output.
 *
 * @param {object} params
 * @param {Buffer} params.buffer - In-memory file buffer
 * @param {string} params.originalName - Uploaded filename
 * @param {string} [params.mimeType] - Uploaded MIME type
 * @returns {Promise<{ rawText: string, fileType: string, sanitizedName: string, contentHash: string, sizeBytes: number }>}
 */
export const parseResumeDocument = async ({ buffer, originalName, mimeType = '' }) => {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    const err = new Error('Empty or invalid resume file provided.');
    err.code = 'EMPTY_FILE';
    err.statusCode = 400;
    throw err;
  }

  if (buffer.length > PARSER_LIMITS.MAX_FILE_SIZE_BYTES) {
    const err = new Error(`File exceeds maximum allowed size of 10MB.`);
    err.code = 'FILE_TOO_LARGE';
    err.statusCode = 400;
    throw err;
  }

  const sanitizedName = sanitizeFileName(originalName);
  const ext = path.extname(sanitizedName).toLowerCase();

  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    const err = new Error(`Unsupported file type "${ext}". Supported formats: PDF (.pdf), Word (.docx), Text (.txt).`);
    err.code = 'UNSUPPORTED_FORMAT';
    err.statusCode = 400;
    throw err;
  }

  let fileType = 'pdf';
  if (ext === '.docx' || ext === '.doc') fileType = 'docx';
  else if (ext === '.txt') fileType = 'txt';

  let rawText = '';

  try {
    if (fileType === 'pdf') {
      rawText = await extractTextFromPdf(buffer);
    } else if (fileType === 'docx') {
      rawText = await extractTextFromDocx(buffer);
    } else if (fileType === 'txt') {
      rawText = extractTextFromTxt(buffer);
    }
  } catch (parseErr) {
    const err = new Error(`Failed to parse ${fileType.toUpperCase()} document: ${parseErr.message}`);
    err.code = 'PARSER_FAILED';
    err.statusCode = 400;
    throw err;
  }

  // Normalize whitespace and clean control characters
  const cleanedText = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim();

  if (cleanedText.length < PARSER_LIMITS.MIN_TEXT_LENGTH_CHARS) {
    const err = new Error('Document does not contain sufficient readable text. Please check for scanned images without OCR.');
    err.code = 'INSUFFICIENT_TEXT';
    err.statusCode = 400;
    throw err;
  }

  const boundedText = cleanedText.slice(0, PARSER_LIMITS.MAX_TEXT_LENGTH_CHARS);
  const contentHash = computeBufferHash(buffer);

  return {
    rawText: boundedText,
    fileType,
    sanitizedName,
    contentHash,
    sizeBytes: buffer.length,
  };
};
