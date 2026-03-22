import { Router } from 'express';
import { getQuizResult, getAssignmentResult, getSnippetResult } from '../controllers/shareController';

const router = Router();

router.get('/quiz/:token', getQuizResult);
router.get('/assignment/:token', getAssignmentResult);
router.get('/snippet/:token', getSnippetResult);

export default router;
