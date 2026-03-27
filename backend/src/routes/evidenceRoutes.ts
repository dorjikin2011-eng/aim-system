// backend/src/routes/evidenceRoutes.ts
import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Add this near the top, after imports
interface MulterRequest extends Request {
  files?: Express.Multer.File[];
}

// Ensure uploads directory exists
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => { // ✅ No type annotations
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true); // ✅ This works at runtime
    } else {
      cb(new Error('Only PDF and images allowed'));
    }
  }
});

const router = Router();

router.post('/upload', upload.array('files'), (req: MulterRequest, res: Response) => {
  try {
    const files = req.files?.map(file => `/uploads/${file.filename}`) || [];
    res.json({ success: true, files });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

export default router;