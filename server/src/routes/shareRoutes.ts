import { Router } from 'express';
import { getQuizResult, getAssignmentResult, getSnippetResult, getOgImage } from '../controllers/shareController';

const router = Router();

router.get('/og-image/:type/:token', getOgImage);
router.get('/quiz/:token', getQuizResult);
router.get('/assignment/:token', getAssignmentResult);
router.get('/snippet/:token', getSnippetResult);

export default router;
