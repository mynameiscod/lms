import jwt from 'jsonwebtoken';
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import User from '../models/User';
import { jwtSecret } from '../config/secrets';
import { PARTNER_ROLE, partnerMayReach } from './placementPartnerScope';
import { lmsDemoMayReach } from './lmsDemoScope';

export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    console.log(`[AUTH] Path: ${req.method} ${req.path}, Authorization: ${authHeader ? 'Present' : 'Missing'}`);
    
    const token = authHeader?.split(' ')[1];

    if (!token) {
      console.log('[AUTH] No token provided');
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided' 
      });
    }

    const decoded = jwt.verify(token, jwtSecret()) as any;
    console.log(`[AUTH] Token valid for user: ${decoded.id}`);
    
    // Check if user still exists and is active
    const user = await User.findById(decoded.id).select('isActive customRoleId role lmsDemo batchId tenantId studentStatus lmsJoinedAt batchJoinedDate createdAt accessUntil');
    if (!user) {
      console.log('[AUTH] User not found in database');
      return res.status(401).json({ 
        success: false, 
        message: 'User account not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    if (!user.isActive) {
      console.log('[AUTH] User account is deactivated');
      return res.status(401).json({ 
        success: false, 
        message: 'Your account has been deactivated. Please contact your administrator.',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }
    
    // The role and custom role come from the account, not the token: a role changed on the Users screen applies
    // on the person's next request instead of after they next log in.
    req.user = { ...decoded, role: (user as any).role || decoded.role, customRoleId: user.customRoleId?.toString() || null };
    // A placement office login reaches the Talent Portal only — see placementPartnerScope.
    if (req.user!.role === PARTNER_ROLE && !partnerMayReach(req.method, req.originalUrl, String(user._id))) {
      return res.status(403).json({ success: false, message: 'This account can only open the Talent Portal.', code: 'PARTNER_SCOPE' });
    }
    // An LMS demo student reaches the learning plan only, and only the end screen once the demo is over — see lmsDemoScope.
    const demo = (user as any).lmsDemo;
    if (demo?.at) {
      const until = demo.endedAt && new Date(demo.endedAt) < new Date(demo.expiresAt) ? new Date(demo.endedAt) : new Date(demo.expiresAt);
      const ended = until.getTime() <= Date.now();
      const features = ended ? {} : (((await (await import('../services/lmsDemoService')).cachedConfig()) as any).features || {});
      if (!lmsDemoMayReach(req.method, req.originalUrl, String(user._id), ended, features)) {
        return res.status(403).json(ended
          ? { success: false, code: 'DEMO_ENDED', message: 'Your demo has ended. Talk to a counsellor to continue.' }
          : { success: false, code: 'DEMO_SCOPE', message: 'This is not part of the demo.' });
      }
    }
    // Students: their LMS access window (365 days from first joining unless extended) — after it,
    // nothing but logging out works. Never let a lookup failure lock anyone out.
    if (req.user!.role === 'STUDENT' && !demo?.at && (user as any).batchId) {
      let ended: { ended: boolean; until: Date | null } = { ended: false, until: null };
      try { ended = await (await import('../services/studentLifecycleService')).accessEnded(user); } catch { /* fail open */ }
      if (ended.ended && ended.until) {
        const { accessEndedMessage } = await import('../services/studentLifecycleService');
        return res.status(401).json({ success: false, code: 'ACCESS_ENDED', message: accessEndedMessage(ended.until) });
      }
    }
    // Students: remember they used the LMS (inactivity alerts), and hold a student in a batch on the
    // profile page until the profile is complete, when the institute has switched that on (Student Rules).
    // A student whose course is completed is past onboarding, so the profile gate no longer holds them.
    if (req.user!.role === 'STUDENT' && !demo?.at && (user as any).batchId && (user as any).studentStatus !== 'completed') {
      let blocked = false;
      try {
        const rules = await import('../services/studentRulesService');
        rules.touchLastActive(String(user._id));
        const tenantId = String((user as any).tenantId || '');
        blocked = !!tenantId && !rules.profileGateAllows(req.method, req.originalUrl, String(user._id)) && await rules.profileGateBlocks(tenantId, String(user._id));
      } catch { blocked = false; } // a rules lookup failing must never log the student out (the catch below answers 401)
      if (blocked) {
        return res.status(403).json({ success: false, code: 'PROFILE_INCOMPLETE', message: 'Complete your profile to 100% to use the LMS.' });
      }
    }
    next();
  } catch (error) {
    console.log(`[AUTH] Token verification failed: ${error}`);
    res.status(401).json({ 
      success: false, 
      message: 'Invalid or expired token' 
    });
  }
};