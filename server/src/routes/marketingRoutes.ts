import { Router } from 'express';
import {
  createCompetitor,
  getCompetitors,
  updateCompetitor,
  deleteCompetitor,
  createAd,
  getAds,
  deleteAd,
  analyzeAdEndpoint,
  getInsights,
  getInsightById,
  generateContentEndpoint,
  getDashboardStats,
} from '../controllers/marketingController';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenantMiddleware';
import { roleGuard } from '../middleware/roleGuard';

const router = Router();

// All routes require auth + tenant
router.use(authMiddleware);
router.use(tenantMiddleware);

// Dashboard
router.get('/dashboard', roleGuard(['manage_marketing']), getDashboardStats);

// Competitors CRUD
router.post('/competitors', roleGuard(['manage_marketing']), createCompetitor);
router.get('/competitors', roleGuard(['manage_marketing']), getCompetitors);
router.put('/competitors/:id', roleGuard(['manage_marketing']), updateCompetitor);
router.delete('/competitors/:id', roleGuard(['manage_marketing']), deleteCompetitor);

// Ads
router.post('/ads', roleGuard(['manage_marketing']), createAd);
router.get('/ads', roleGuard(['manage_marketing']), getAds);
router.delete('/ads/:id', roleGuard(['manage_marketing']), deleteAd);

// Analysis
router.post('/ads/:adId/analyze', roleGuard(['manage_marketing']), analyzeAdEndpoint);

// Insights
router.get('/insights', roleGuard(['manage_marketing']), getInsights);
router.get('/insights/:id', roleGuard(['manage_marketing']), getInsightById);

// Content Generation
router.post('/insights/:insightId/generate', roleGuard(['manage_marketing']), generateContentEndpoint);

export default router;
