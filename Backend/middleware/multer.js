import multer from 'multer';
import path from 'path';

// Use memoryStorage to avoid ephemeral/serverless filesystem dependencies and permission errors
const storage = multer.memoryStorage();

const resumeFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.pdf', '.docx', '.doc'];
  const allowedMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/octet-stream', // Fallback for some browsers on mobile/desktop
  ];

  const hasAllowedExt = allowedExtensions.includes(ext);
  const hasAllowedMime = allowedMimeTypes.includes(file.mimetype);

  if (hasAllowedExt && hasAllowedMime) {
    cb(null, true);
  } else {
    const err = new Error('Only PDF (.pdf) and Word (.docx) documents are supported');
    err.code = 'INVALID_FILE_TYPE';
    cb(err, false);
  }
};

export const upload = multer({
  storage: storage,
  fileFilter: resumeFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

/**
 * Express middleware wrapper around upload.single('resume') that catches
 * multer upload/validation errors and returns clear 400 JSON responses.
 */
export const handleResumeUpload = (req, res, next) => {
  upload.single('resume')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File is too large. Maximum file size is 10MB.' });
      }
      if (err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({ message: err.message || 'Only PDF and Word documents are supported' });
      }
      return res.status(400).json({ message: err.message || 'Error uploading file' });
    }
    next();
  });
};
