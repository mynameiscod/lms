import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
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

// ===================== STATS =====================

router.get(
  '/stats',
  authenticate,
  authorize('SUPER_ADMIN', 'TENANT_ADMIN'),
  getReservationStats
);

// ===================== CRUD =====================

// Get all reservations
router.get(
  '/',
  authenticate,
  authorize('SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF'),
  getReservations
);

// Create reservation
router.post(
  '/',
  authenticate,
  authorize('SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF'),
  createReservation
);

// Get lead's reservation
router.get(
  '/lead/:leadId',
  authenticate,
  authorize('SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF'),
  getLeadReservation
);

// Get reservation by ID
router.get(
  '/:id',
  authenticate,
  authorize('SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF'),
  getReservationById
);

// ===================== PAYMENT =====================

// Add payment
router.post(
  '/:id/payment',
  authenticate,
  authorize('SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF'),
  addPayment
);

// Send receipt email
router.post(
  '/:id/send-receipt',
  authenticate,
  authorize('SUPER_ADMIN', 'TENANT_ADMIN', 'STAFF'),
  sendReceiptEmail
);

// ===================== CONVERSION =====================

// Convert to student
router.post(
  '/:id/convert-to-student',
  authenticate,
  authorize('SUPER_ADMIN', 'TENANT_ADMIN'),
  convertToStudent
);

// ===================== CANCEL =====================

// Cancel reservation
router.put(
  '/:id/cancel',
  authenticate,
  authorize('SUPER_ADMIN', 'TENANT_ADMIN'),
  cancelReservation
);

export default router;
