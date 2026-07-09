import { Router } from 'express';
import { verifyCertificate } from '../controllers/certificateAdminController';

// Public certificate verification — no auth. The verify code is the secret.
const router = Router();
router.get('/:code', verifyCertificate);

export default router;
