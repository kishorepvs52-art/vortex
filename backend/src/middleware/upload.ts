// Multer image upload middleware (memory storage — sharp validates & normalises).
// Layer 1 of file validation: MIME whitelist + hard size cap.
// Layer 2 (magic bytes / re-encode) lives in storage/local.provider.ts.
import multer from 'multer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/apiError.js';

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.MAX_UPLOAD_MB * 1024 * 1024,
    files: 1,
    fields: 20,
  },
  fileFilter: (_req, file, cb) => {
    if (!env.allowedMimeTypes.includes(file.mimetype)) {
      return cb(
        ApiError.unprocessable(
          'INVALID_FILE_TYPE',
          `Unsupported file type "${file.mimetype}". Allowed: ${env.allowedMimeTypes.join(', ')}`,
        ),
      );
    }
    cb(null, true);
  },
}).single('image');
