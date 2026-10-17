import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public');
  },
  filename: (req, file, cb) => {
    // Sanitize original file name to eliminate directory traversal and special characters
    const safeBaseName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileName = `${Date.now()}-${safeBaseName}`;
    cb(null, fileName);
  },
});

const pdfFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isPdfMime = file.mimetype === 'application/pdf';
  const isPdfExt = ext === '.pdf';

  if (isPdfMime || isPdfExt) {
    cb(null, true);
  } else {
    const err = new Error('Only PDF resume files (.pdf) are supported');
    err.code = 'INVALID_FILE_TYPE';
    cb(err, false);
  }
};

export const upload = multer({
  storage: storage,
  fileFilter: pdfFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10mb limit
});
