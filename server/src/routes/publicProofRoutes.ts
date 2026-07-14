import { Router } from 'express';
import { getPublicProof } from '../controllers/candidateProofController';

// Public, no-auth: the HR-facing candidate proof profile (secret is the token).
const router = Router();
router.get('/:token', getPublicProof);
export default router;
