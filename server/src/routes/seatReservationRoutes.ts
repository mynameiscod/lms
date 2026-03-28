import express from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantResolver } from '../middleware/tenantResolver';
import { roleGuard } from '../middleware/roleGuard';
import {
  createReservation,
  addPayment,
  sendReceiptEmail,
  convertToStudent,
  getReservations,
  getReservationById,
  getLeadReservation,
  cancelReservation,
  getReservationStats
} from '../controllers/seatReservationController';

const router = express.Router();

const leadPermissions = ['manage_leads', 'view_leads', 'edit_leads'];

// ===================== STATS =====================

router.get(
  '/stats',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads']),
  getReservationStats
);

// ===================== CRUD =====================

// Get all reservations
router.get(
  '/',
  authMiddleware,
  tenantResolver,
  roleGuard(leadPermissions),
  getReservations
);

// Create reservation
router.post(
  '/',
  authMiddleware,
  tenantResolver,
  roleGuard(leadPermissions),
  createReservation
);

// Get lead's reservation
router.get(
  '/lead/:leadId',
  authMiddleware,
  tenantResolver,
  roleGuard(leadPermissions),
  getLeadReservation
);

// Get reservation by ID
router.get(
  '/:id',
  authMiddleware,
  tenantResolver,
  roleGuard(leadPermissions),
  getReservationById
);

// ===================== PAYMENT =====================

// Add payment
router.post(
  '/:id/payment',
  authMiddleware,
  tenantResolver,
  roleGuard(leadPermissions),
  addPayment
);

// Send receipt email
router.post(
  '/:id/send-receipt',
  authMiddleware,
  tenantResolver,
  roleGuard(leadPermissions),
  sendReceiptEmail
);

// ===================== CONVERSION =====================

// Convert to student
router.post(
  '/:id/convert-to-student',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads', 'manage_tenant_users']),
  convertToStudent
);

// ===================== CANCEL =====================

// Cancel reservation
router.put(
  '/:id/cancel',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads']),
  cancelReservation
);

export default router;
