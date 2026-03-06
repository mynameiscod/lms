import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  initiateGitHubOAuth,
  handleGitHubCallback,
  disconnectGitHub,
  initiateLinkedInOAuth,
  handleLinkedInCallback,
  disconnectLinkedIn,
  getOAuthStatus,
} from '../controllers/oauthController';

const router = Router();

// ============ OAuth Status ============
// Get current OAuth connections status (requires auth)
router.get('/status', authMiddleware, getOAuthStatus);

// ============ GitHub OAuth ============
// Initiate GitHub OAuth flow (requires auth)
router.get('/github/connect', authMiddleware, initiateGitHubOAuth);

// Handle GitHub OAuth callback (no auth - state contains userId)
router.get('/github/callback', handleGitHubCallback);

// Disconnect GitHub account (requires auth)
router.post('/github/disconnect', authMiddleware, disconnectGitHub);

// ============ LinkedIn OAuth ============
// Initiate LinkedIn OAuth flow (requires auth)
router.get('/linkedin/connect', authMiddleware, initiateLinkedInOAuth);

// Handle LinkedIn OAuth callback (no auth - state contains userId)
router.get('/linkedin/callback', handleLinkedInCallback);

// Disconnect LinkedIn account (requires auth)
router.post('/linkedin/disconnect', authMiddleware, disconnectLinkedIn);

export default router;
