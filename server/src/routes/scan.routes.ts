import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth.middleware';
import { analyzeFoodLabel } from '../services/ai/gemini.service';
import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(requireAuth);

// POST /api/scan — analyze food packaging image
router.post('/', upload.single('image'), async (req: AuthRequest, res: Response) => {
  try {
    let base64: string;
    let mimeType: string;

    if (req.file) {
      // File upload via multipart
      base64 = req.file.buffer.toString('base64');
      mimeType = req.file.mimetype || 'image/jpeg';
    } else if (req.body.base64) {
      // Direct base64 in JSON body
      base64 = req.body.base64.replace(/^data:image\/\w+;base64,/, '');
      mimeType = req.body.mimeType || 'image/jpeg';
    } else {
      res.status(400).json({ error: 'No image provided. Send file or base64.' });
      return;
    }

    const result = await analyzeFoodLabel(base64, mimeType);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Scan failed';
    if (message.includes('GEMINI_API_KEY')) {
      res.status(503).json({ error: message, code: 'NO_API_KEY' });
    } else {
      res.status(500).json({ error: message });
    }
  }
});

export { router as scanRoutes };
