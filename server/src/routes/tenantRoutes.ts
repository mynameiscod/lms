import express from 'express';
import { getBranding, saveBranding } from '../services/tenantBrandingService';
import { onboardTenant, onboardingChecklist } from '../services/tenantOnboardingService';
import { 
  createTenant, 
  getTenant, 
  updateTenant, 
  generateInviteLink,
  getStudentFeatures,
  updateStudentFeatures,
  listTenants,
  getTenantModules,
  updateTenantModules
} from '../controllers/tenantController';
import { authMiddleware } from '../middleware/auth';
import { roleGuard } from '../middleware/roleGuard';

const router = express.Router();

/**
 * Only your own institute — any other id answers 404 (so ids cannot be probed). The platform
 * administrator may act on any institute. Before this, any logged-in user could read another
 * institute's record and any tenant admin could switch another institute's student features.
 */
const ownTenant = (req: any, res: any, next: any) =>
  req.user?.role === 'SUPER_ADMIN' || String(req.user?.tenantId || '') === String(req.params.tenantId)
    ? next()
    : res.status(404).json({ success: false, message: 'Institute not found' });

// SUPER_ADMIN: list all tenants
router.get('/', authMiddleware, roleGuard(['manage_tenants']), listTenants);

router.post('/', authMiddleware, roleGuard(['manage_tenants']), createTenant);
router.get('/:tenantId', authMiddleware, ownTenant, getTenant);
router.patch('/:tenantId', authMiddleware, roleGuard(['manage_tenants']), updateTenant);
router.get('/:tenantId/invite-link', authMiddleware, ownTenant, generateInviteLink);
router.get('/:tenantId/student-features', authMiddleware, ownTenant, getStudentFeatures);
router.patch('/:tenantId/student-features', authMiddleware, ownTenant, roleGuard(['manage_tenant']), updateStudentFeatures);
router.get('/:tenantId/modules', authMiddleware, ownTenant, getTenantModules);
// Branding — the institute admin's own name, logo, colours and support contact (whitelisted fields).
router.get('/:tenantId/branding', authMiddleware, ownTenant, async (req: any, res: any) => {
  try { res.json({ success: true, data: await getBranding(req.params.tenantId) }); }
  catch (e: any) { res.status(e?.status || 500).json({ success: false, message: e?.message }); }
});
router.put('/:tenantId/branding', authMiddleware, ownTenant, roleGuard(['manage_tenant_settings', 'manage_tenant', 'manage_tenants']), async (req: any, res: any) => {
  try { res.json({ success: true, data: await saveBranding(req.params.tenantId, req.body || {}) }); }
  catch (e: any) { res.status(e?.status || 500).json({ success: false, message: e?.message }); }
});
// Onboarding: what is still to set up, and (re)run the default setup — idempotent.
router.get('/:tenantId/onboarding', authMiddleware, ownTenant, async (req: any, res: any) => {
  try { res.json({ success: true, data: await onboardingChecklist(req.params.tenantId) }); }
  catch (e: any) { res.status(404).json({ success: false, message: e?.message || 'Not found' }); }
});
router.post('/:tenantId/onboard', authMiddleware, ownTenant, roleGuard(['manage_tenant', 'manage_tenants']), async (req: any, res: any) => {
  try { res.json({ success: true, data: { ...(await onboardTenant(req.params.tenantId)), ...(await onboardingChecklist(req.params.tenantId)) } }); }
  catch (e: any) { res.status(500).json({ success: false, message: e?.message || 'Setup failed' }); }
});
router.patch('/:tenantId/modules', authMiddleware, roleGuard(['manage_tenants']), updateTenantModules);

export default router;