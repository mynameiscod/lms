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
  getMyReservations,
  cancelReservation,
  refundReservation,
  getReservationStats,
  sendConfirmationEmail,
  sendPaymentReminderEmail,
  sendPreJoiningInfoEmail,
  sendJoiningDayEmail,
  sendWhatsAppPaymentReminder,
  updateDemoStatus,
  setInstallmentPlan
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

// ===================== STUDENT ACCESS =====================

router.get(
  '/me',
  authMiddleware,
  tenantResolver,
  getMyReservations
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

// ===================== EMAIL ACTIONS =====================

// Send booking confirmation
router.post('/:id/send-confirmation', authMiddleware, tenantResolver, roleGuard(leadPermissions), sendConfirmationEmail);

// Send payment reminder
router.post('/:id/send-payment-reminder', authMiddleware, tenantResolver, roleGuard(leadPermissions), sendPaymentReminderEmail);

// Send pre-joining info
router.post('/:id/send-prejoining', authMiddleware, tenantResolver, roleGuard(leadPermissions), sendPreJoiningInfoEmail);

// Send joining day email
router.post('/:id/send-joining-day', authMiddleware, tenantResolver, roleGuard(leadPermissions), sendJoiningDayEmail);

// ===================== CANCEL =====================

// Cancel reservation
router.put(
  '/:id/cancel',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads']),
  cancelReservation
);

// Record refund for reservation
router.post(
  '/:id/refund',
  authMiddleware,
  tenantResolver,
  roleGuard(['manage_leads']),
  refundReservation
);

// Send WhatsApp payment reminder
router.post('/:id/send-whatsapp-reminder', authMiddleware, tenantResolver, roleGuard(leadPermissions), sendWhatsAppPaymentReminder);

// Update demo period status
router.patch('/:id/demo-status', authMiddleware, tenantResolver, roleGuard(leadPermissions), updateDemoStatus);

// Set / update installment plan
router.put('/:id/installment-plan', authMiddleware, tenantResolver, roleGuard(leadPermissions), setInstallmentPlan);

export default router;
