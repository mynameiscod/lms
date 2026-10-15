import express from 'express';
import McpOAuthCode from '../models/McpOAuthCode';
import McpOAuthAccessToken from '../models/McpOAuthAccessToken';
import { registeredRedirect, verifyPkceS256, tokenDigest, generateOpaqueToken } from './oauthSecurity';

/**
 * Internal OAuth code exchange prototype. Disabled in production.
 * Authorization, consent, client registration and refresh/revocation still
 * require a complete reviewed OAuth provider implementation.
 */
const router = express.Router();
router.use((_req, res, next) => {
  if (process.env.NODE_ENV === 'production') return res.status(404).end();
  next();
});

router.post('/token', async (req, res) => {
  if (req.body?.grant_type !== 'authorization_code') return res.status(400).json({ error: 'unsupported_grant_type' });
  const { code, client_id: clientId, redirect_uri: redirectUri, code_verifier: verifier } = req.body;
  if (typeof code !== 'string' || code.length < 40 || typeof clientId !== 'string' || typeof redirectUri !== 'string') {
    return res.status(400).json({ error: 'invalid_request' });
  }
  try {
    const codeHash = tokenDigest(code);
    const authCode = await McpOAuthCode.findOne({ codeHash, clientId, redirectUri, consumedAt: { $exists: false }, expiresAt: { $gt: new Date() } });
    if (!authCode || !registeredRedirect(redirectUri, [authCode.redirectUri]) || !verifyPkceS256(verifier, authCode.challenge)) {
      return res.status(400).json({ error: 'invalid_grant' });
    }
    const consumed = await McpOAuthCode.findOneAndUpdate({
      _id: authCode._id, consumedAt: { $exists: false }, expiresAt: { $gt: new Date() },
    }, { $set: { consumedAt: new Date() } }, { new: true });
    if (!consumed) return res.status(400).json({ error: 'invalid_grant' });
    const token = generateOpaqueToken();
    await McpOAuthAccessToken.create({
      tokenHash: tokenDigest(token), userId: consumed.userId, tenantId: consumed.tenantId,
      clientId, audience: consumed.audience, expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });
    return res.set('Cache-Control', 'no-store').json({ access_token: token, token_type: 'Bearer', expires_in: 900 });
  } catch {
    return res.status(503).json({ error: 'temporarily_unavailable' });
  }
});
export default router;
