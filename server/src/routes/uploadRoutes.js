import express from 'express';
import multer from 'multer';
import { uploadFile } from '../controllers/uploadController.js';
import { authenticateToken } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allowed mime types
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Invalid file type. Allowed: JPG, PNG, WEBP, GIF, PDF', 400, 'INVALID_FILE_TYPE'), false);
    }
  },
});

router.post('/', authenticateToken, upload.single('file'), uploadFile);

export default router;
