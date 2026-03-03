import express from 'express';
import { register, login, registerOrganization } from '../controllers/authController';

const router = express.Router();

router.post('/register', register);
router.post('/register-organization', registerOrganization);
router.post('/login', login);

export default router;