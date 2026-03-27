// backend/src/routes/evidenceRoutes.ts
import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Typed request interface for Multer files
interface MulterRequest extends Request {
  files?: Express.Multer.File[];
  file?: Express.Multer.File; // optional for single file
}

// Ensure uploads directory exists
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

// Multer upload configuration
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and images allowed'));
    }
  },
});

const router = Router();

// Route to upload multiple files
router.post('/upload', upload.array('files'), (req: MulterRequest, res: Response) => {
  try {
    const files = req.files?.map(file => `/uploads/${file.filename}`) || [];
    res.json({ success: true, files });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Route to upload a single file
router.post('/upload-single', upload.single('file'), (req: MulterRequest, res: Response) => {
  try {
    const filePath = req.file ? `/uploads/${req.file.filename}` : null;
    res.json({ success: !!filePath, file: filePath });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

export default router;