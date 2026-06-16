import { Request, Response } from 'express';
import axios from 'axios';
import StudentProfile from '../models/StudentProfile';
import { AuthenticatedRequest } from '../types';

// OAuth config — read at call time so values set in the Platform Settings UI
// (mirrored into process.env by settingsService.applyToEnv) take effect.
const GH = () => ({
  clientId: process.env.GITHUB_CLIENT_ID || '',
  clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
  callbackUrl: process.env.GITHUB_CALLBACK_URL || 'http://localhost:5000/api/v1/oauth/github/callback',
  authUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  userUrl: 'https://api.github.com/user',
  scope: 'user:email repo',
});

const LI = () => ({
  clientId: process.env.LINKEDIN_CLIENT_ID || '',
  clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
  callbackUrl: process.env.LINKEDIN_CALLBACK_URL || 'http://localhost:5000/api/v1/oauth/linkedin/callback',
  authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
  tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
  userUrl: 'https://api.linkedin.com/v2/userinfo',
  scope: 'openid profile email w_member_social',
});

const FE = () => process.env[['FRONTEND', 'URL'].join('_')] || 'http://localhost:3000';

// ============ GitHub OAuth ============

/**
 * Initiate GitHub OAuth flow
 * GET /api/v1/oauth/github/connect
 */
export const initiateGitHubOAuth = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Generate state for CSRF protection (includes userId)
    const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');

    const authUrl = new URL(GH().authUrl);
    authUrl.searchParams.append('client_id', GH().clientId);
    authUrl.searchParams.append('redirect_uri', GH().callbackUrl);
    authUrl.searchParams.append('scope', GH().scope);
    authUrl.searchParams.append('state', state);

    res.json({
      success: true,
      authUrl: authUrl.toString(),
    });
  } catch (error) {
    console.error('GitHub OAuth initiation error:', error);
    res.status(500).json({ success: false, message: 'Failed to initiate GitHub OAuth' });
  }
};

/**
 * Handle GitHub OAuth callback
 * GET /api/v1/oauth/github/callback
 */
export const handleGitHubCallback = async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.redirect(`${FE()}/profile/oauth-callback?error=missing_params&provider=github`);
    }

    // Decode state to get userId
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
    } catch {
      return res.redirect(`${FE()}/profile/oauth-callback?error=invalid_state&provider=github`);
    }

    const { userId } = stateData;

    // Exchange code for access token
    const tokenResponse = await axios.post(
      GH().tokenUrl,
      {
        client_id: GH().clientId,
        client_secret: GH().clientSecret,
        code,
        redirect_uri: GH().callbackUrl,
      },
      {
        headers: { Accept: 'application/json' },
      }
    );

    const { access_token, refresh_token } = tokenResponse.data;

    if (!access_token) {
      return res.redirect(`${FE()}/profile/oauth-callback?error=no_token&provider=github`);
    }

    // Get GitHub user info
    const userResponse = await axios.get(GH().userUrl, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const githubUser = userResponse.data;

    // Update student profile with GitHub connection
    await StudentProfile.findOneAndUpdate(
      { userId },
      {
        $set: {
          'oauthConnections.github': {
            accessToken: access_token,
            refreshToken: refresh_token || null,
            username: githubUser.login,
            profileUrl: githubUser.html_url,
            connectedAt: new Date(),
          },
          'professionalProfiles.githubUrl': githubUser.html_url,
        },
      },
      { new: true }
    );

    // Redirect to frontend with success
    res.redirect(`${FE()}/profile/oauth-callback?success=true&provider=github&username=${githubUser.login}`);
  } catch (error: any) {
    console.error('GitHub OAuth callback error:', error.response?.data || error.message);
    res.redirect(`${FE()}/profile/oauth-callback?error=callback_failed&provider=github`);
  }
};

/**
 * Disconnect GitHub account
 * POST /api/v1/oauth/github/disconnect
 */
export const disconnectGitHub = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    await StudentProfile.findOneAndUpdate(
      { userId },
      {
        $unset: { 'oauthConnections.github': 1 },
      }
    );

    res.json({ success: true, message: 'GitHub account disconnected successfully' });
  } catch (error) {
    console.error('GitHub disconnect error:', error);
    res.status(500).json({ success: false, message: 'Failed to disconnect GitHub account' });
  }
};

// ============ LinkedIn OAuth ============

/**
 * Initiate LinkedIn OAuth flow
 * GET /api/v1/oauth/linkedin/connect
 */
export const initiateLinkedInOAuth = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Generate state for CSRF protection
    const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');

    const authUrl = new URL(LI().authUrl);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('client_id', LI().clientId);
    authUrl.searchParams.append('redirect_uri', LI().callbackUrl);
    authUrl.searchParams.append('scope', LI().scope);
    authUrl.searchParams.append('state', state);

    res.json({
      success: true,
      authUrl: authUrl.toString(),
    });
  } catch (error) {
    console.error('LinkedIn OAuth initiation error:', error);
    res.status(500).json({ success: false, message: 'Failed to initiate LinkedIn OAuth' });
  }
};

/**
 * Handle LinkedIn OAuth callback
 * GET /api/v1/oauth/linkedin/callback
 */
export const handleLinkedInCallback = async (req: Request, res: Response) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(`${FE()}/profile/oauth-callback?error=${error}&provider=linkedin`);
    }

    if (!code || !state) {
      return res.redirect(`${FE()}/profile/oauth-callback?error=missing_params&provider=linkedin`);
    }

    // Decode state to get userId
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
    } catch {
      return res.redirect(`${FE()}/profile/oauth-callback?error=invalid_state&provider=linkedin`);
    }

    const { userId } = stateData;

    // Exchange code for access token
    const tokenResponse = await axios.post(
      LI().tokenUrl,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: LI().callbackUrl,
        client_id: LI().clientId,
        client_secret: LI().clientSecret,
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const { access_token, refresh_token } = tokenResponse.data;

    if (!access_token) {
      return res.redirect(`${FE()}/profile/oauth-callback?error=no_token&provider=linkedin`);
    }

    // Get LinkedIn user info using OpenID Connect
    const userResponse = await axios.get(LI().userUrl, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const linkedinUser = userResponse.data;

    // Update student profile with LinkedIn connection
    await StudentProfile.findOneAndUpdate(
      { userId },
      {
        $set: {
          'oauthConnections.linkedin': {
            accessToken: access_token,
            refreshToken: refresh_token || null,
            profileId: linkedinUser.sub,
            profileUrl: `https://www.linkedin.com/in/${linkedinUser.sub}`,
            connectedAt: new Date(),
          },
        },
      },
      { new: true }
    );

    // Redirect to frontend with success
    res.redirect(`${FE()}/profile/oauth-callback?success=true&provider=linkedin&name=${encodeURIComponent(linkedinUser.name || '')}`);
  } catch (error: any) {
    console.error('LinkedIn OAuth callback error:', error.response?.data || error.message);
    res.redirect(`${FE()}/profile/oauth-callback?error=callback_failed&provider=linkedin`);
  }
};

/**
 * Disconnect LinkedIn account
 * POST /api/v1/oauth/linkedin/disconnect
 */
export const disconnectLinkedIn = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    await StudentProfile.findOneAndUpdate(
      { userId },
      {
        $unset: { 'oauthConnections.linkedin': 1 },
      }
    );

    res.json({ success: true, message: 'LinkedIn account disconnected successfully' });
  } catch (error) {
    console.error('LinkedIn disconnect error:', error);
    res.status(500).json({ success: false, message: 'Failed to disconnect LinkedIn account' });
  }
};

// ============ Get OAuth Status ============

/**
 * Get current OAuth connections status
 * GET /api/v1/oauth/status
 */
export const getOAuthStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    const profile = await StudentProfile.findOne({ userId }).select(
      'oauthConnections.github.username oauthConnections.github.profileUrl oauthConnections.github.connectedAt ' +
      'oauthConnections.linkedin.profileId oauthConnections.linkedin.profileUrl oauthConnections.linkedin.connectedAt'
    );

    res.json({
      success: true,
      data: {
        github: profile?.oauthConnections?.github
          ? {
              connected: true,
              username: profile.oauthConnections.github.username,
              profileUrl: profile.oauthConnections.github.profileUrl,
              connectedAt: profile.oauthConnections.github.connectedAt,
            }
          : { connected: false },
        linkedin: profile?.oauthConnections?.linkedin
          ? {
              connected: true,
              profileId: profile.oauthConnections.linkedin.profileId,
              profileUrl: profile.oauthConnections.linkedin.profileUrl,
              connectedAt: profile.oauthConnections.linkedin.connectedAt,
            }
          : { connected: false },
      },
    });
  } catch (error) {
    console.error('Get OAuth status error:', error);
    res.status(500).json({ success: false, message: 'Failed to get OAuth status' });
  }
};
