import express from 'express';
import {
  registerAssessment,
  verifyAssessmentOtp,
  resendAssessmentOtp,
  startAssessment,
  submitAssessment,
  getAssessmentResult,
} from '../controllers/publicAssessmentController';

// Public, unauthenticated skill-assessment funnel (Meta-ad → exam → roadmap).
const router = express.Router();

router.post('/register', registerAssessment);
router.post('/verify-otp', verifyAssessmentOtp);
router.post('/resend-otp', resendAssessmentOtp);
router.post('/start', startAssessment);
router.post('/submit', submitAssessment);
router.get('/result/:token', getAssessmentResult);

export default router;
