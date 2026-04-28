// backend/src/routes/evidenceRoutes.ts

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { tmpdir } from 'os';  // ✅ Added for Vercel temp directory

// Define MulterFile type locally (Multer does not export File type)
type MulterFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer?: Buffer;
};

const router = Router();

// ✅ Vercel-compatible upload directory: use /tmp (writable in serverless)
const UPLOAD_DIR = path.join(tmpdir(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,  // ✅ Use temp directory
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Multer instance
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and images allowed'));
    }
  }
});

// Upload route
router.post('/upload', upload.array('files'), (req: Request, res: Response) => {
  try {
    // ✅ Return relative paths (frontend doesn't need to know it's /tmp)
    const files = (req.files as MulterFile[]).map(file => `/uploads/${file.filename}`);
    res.json({ success: true, files });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

export default router;