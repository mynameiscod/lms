import express, { Request, Response, NextFunction } from 'express';
import multer, { MulterError } from 'multer';
import path from 'path';
import * as ctrl from '../controllers/battleController';

// Public (no auth) Tech Battle funnel: list → landing → register(proofs/OTP) → time-gated exam → leaderboard.
const router = express.Router();

// Proof uploads (ID card, screenshots) — same folder the platform serves statically at /uploads.
const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'registrations');
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `battle_${Date.now()}_${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`),
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });
const multipart = (req: Request, res: Response, next: NextFunction) => {
  upload.any()(req, res, (err: any) => {
    if (err instanceof MulterError) return res.status(413).json({ message: 'File too large (max 8MB).' });
    if (err) return res.status(400).json({ message: 'Upload failed.' });
    next();
  });
};

// Token-scoped exam + OTP (specific literals first).
router.post('/battles/verify', express.json(), ctrl.verifyBattleOtp);
router.post('/battles/resend', express.json(), ctrl.resendBattleOtp);
router.get('/battles/exam/:token', ctrl.getBattleExam);
router.post('/battles/exam/:token/start', express.json(), ctrl.startBattleExam);
router.post('/battles/exam/:token/heartbeat', express.json(), ctrl.battleHeartbeat);
router.post('/battles/exam/:token/submit', express.json(), ctrl.submitBattleExam);

// Tenant-scoped listing / landing / register / leaderboard.
router.get('/:tenantSlug/battles', ctrl.listPublicBattles);
router.get('/:tenantSlug/battles/:slug', ctrl.getPublicBattle);
router.post('/:tenantSlug/battles/:slug/register', multipart, ctrl.registerForBattle);
router.get('/:tenantSlug/battles/:slug/leaderboard', ctrl.getPublicLeaderboard);

export default router;
