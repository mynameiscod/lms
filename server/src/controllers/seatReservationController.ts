import { Response } from 'express';
import mongoose from 'mongoose';
import SeatReservation from '../models/SeatReservation';
import User from '../models/User';
import { AuthenticatedRequest } from '../types';
import crypto from 'crypto';


// Helper to send custom emails
async function sendCustomEmail(to: string, subject: string, html: string) {
  try {
    // Use nodemailer directly for custom emails
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html
    });
  } catch (error) {
    console.error('Email send error:', error);
  }
}

// ===================== CREATE SEAT RESERVATION (STANDALONE — no lead required) =====================

export const createReservation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, userId } = req;
    const {
      studentName, studentEmail, studentPhone,
      courseId, batchId, courseName, batchName,
      originalPrice, discountAmount, discountReason, seatNumber, expiresAt, notes
    } = req.body;

    // Validate required fields
    if (!studentName?.trim()) return res.status(400).json({ success: false, message: 'Student name is required' });
    if (!studentEmail?.trim()) return res.status(400).json({ success: false, message: 'Student email is required' });
    if (!studentPhone?.trim()) return res.status(400).json({ success: false, message: 'Student mobile is required' });
    if (!courseName?.trim()) return res.status(400).json({ success: false, message: 'Course name is required' });
    if (originalPrice == null || isNaN(Number(originalPrice))) return res.status(400).json({ success: false, message: 'Original price is required' });

    const emailNorm = studentEmail.trim().toLowerCase();

    // Check for existing active reservation for this email + course in this tenant
    const existingReservation = await SeatReservation.findOne({
      tenantId,
      studentEmail: emailNorm,
      courseName,
      status: { $in: ['pending', 'partial_paid', 'paid', 'confirmed', 'enrolled'] }
    });
    if (existingReservation) {
      return res.status(400).json({
        success: false,
        message: 'An active reservation already exists for this student and course',
        data: existingReservation
      });
    }

    // ── Create or fetch user account ──────────────────────────────────────
    let student = await User.findOne({ email: emailNorm, tenantId });
    let isNewUser = false;
    const tempPassword = crypto.randomBytes(6).toString('hex'); // 12-char hex
    const setupTokenRaw = crypto.randomBytes(32).toString('hex');
    const setupTokenHashed = crypto.createHash('sha256').update(setupTokenRaw).digest('hex');
    const nameParts = studentName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || firstName;

    if (!student) {
      student = new User({
        email: emailNorm,
        firstName,
        lastName,
        password: tempPassword,
        role: 'STUDENT',
        tenantId,
        phone: studentPhone.trim(),
        profileComplete: false,
        isActive: true,
        resetToken: setupTokenHashed,
        resetTokenExpires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days to set up
      });
      await student.save();
      isNewUser = true;
    } else {
      // Existing user — refresh the setup token so they can re-set password
      student.resetToken = setupTokenHashed;
      student.resetTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await student.save();
    }

    // ── Create reservation ────────────────────────────────────────────────
    const finalPrice = Number(originalPrice) - (Number(discountAmount) || 0);
    const reservation = new SeatReservation({
      tenantId,
      studentName: studentName.trim(),
      studentEmail: emailNorm,
      studentPhone: studentPhone.trim(),
      studentId: student._id,
      courseId,
      batchId,
      courseName: courseName.trim(),
      batchName: batchName?.trim(),
      originalPrice: Number(originalPrice),
      discountAmount: Number(discountAmount) || 0,
      discountReason,
      finalPrice,
      seatNumber,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      notes,
      createdBy: userId
    });
    await reservation.save();

    // ── Auto-send confirmation + account setup email ──────────────────────
    try {
      const frontendUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'https://platform.codebegun.com';
      const setupLink = `${frontendUrl}/setup-password?token=${setupTokenRaw}&email=${encodeURIComponent(emailNorm)}`;
      const greeting = isNewUser
        ? `🎉 Congratulations, ${firstName}! Your seat is reserved and your student account has been created.`
        : `🎉 Congratulations, ${firstName}! Your seat has been successfully reserved.`;
      const seatInfo = reservation.seatNumber ? `<div class="info-row"><span class="info-label">Seat Number</span><span class="info-value">${reservation.seatNumber}</span></div>` : '';
      const body = `
        <p class="greeting">${greeting}</p>
        <p class="intro">Welcome to <strong>CodeBegun</strong>! Here's everything you need about your reservation for <strong>${courseName}</strong>.</p>

        <div class="info-card">
          <div class="info-card-title">📋 Reservation Details</div>
          <div class="info-row"><span class="info-label">Booking ID</span><span class="info-value">#${(reservation._id as any).toString().slice(-8).toUpperCase()}</span></div>
          <div class="info-row"><span class="info-label">Student</span><span class="info-value">${studentName.trim()}</span></div>
          <div class="info-row"><span class="info-label">Course</span><span class="info-value">${courseName}</span></div>
          ${batchName ? `<div class="info-row"><span class="info-label">Batch</span><span class="info-value">${batchName}</span></div>` : ''}
          ${seatInfo}
          <div class="info-row"><span class="info-label">Reserved On</span><span class="info-value">${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</span></div>
          <div class="info-row"><span class="info-label">Status</span><span class="info-value"><span class="badge badge-purple">Seat Reserved ✓</span></span></div>
        </div>

        <div class="info-card">
          <div class="info-card-title">💰 Payment Summary</div>
          <div class="info-row"><span class="info-label">Course Fee</span><span class="info-value">₹${Number(originalPrice).toLocaleString('en-IN')}</span></div>
          ${Number(discountAmount) > 0 ? `<div class="info-row"><span class="info-label">Discount</span><span class="info-value" style="color:#15803d;">- ₹${Number(discountAmount).toLocaleString('en-IN')}</span></div>` : ''}
          <div class="info-row"><span class="info-label">Total Fee</span><span class="info-value" style="font-size:15px;font-weight:900;">₹${finalPrice.toLocaleString('en-IN')}</span></div>
        </div>

        ${isNewUser ? `
        <div class="info-card">
          <div class="info-card-title">🔐 Your Student Account</div>
          <div class="info-row"><span class="info-label">Login Email</span><span class="info-value">${emailNorm}</span></div>
          <div class="info-row"><span class="info-label">Temporary Password</span><span class="info-value" style="font-family:monospace;font-size:15px;">${tempPassword}</span></div>
          <div class="info-row"><span class="info-label">Portal URL</span><span class="info-value"><a href="${frontendUrl}">${frontendUrl}</a></span></div>
        </div>
        ` : ''}

        <div class="highlight-box">
          <p>👇 <strong>Important: Set up your profile!</strong> Click the button below to set your permanent password and complete your profile. This link is valid for 7 days.</p>
        </div>

        <a class="btn" href="${setupLink}">🔑 Set Password &amp; Complete Profile</a>

        <ol class="steps">
          <li class="step"><span class="step-num">1</span><span class="step-text"><strong>Set Your Password</strong> — Use the button above to set a permanent password for your account.</span></li>
          <li class="step"><span class="step-num">2</span><span class="step-text"><strong>Complete Payment</strong> — Pay the remaining balance to confirm your enrollment.</span></li>
          <li class="step"><span class="step-num">3</span><span class="step-text"><strong>Get Batch Details</strong> — We'll send start date, timings, and venue before your first class.</span></li>
          <li class="step"><span class="step-num">4</span><span class="step-text"><strong>Start Learning!</strong> — Begin your journey with CodeBegun. 🚀</span></li>
        </ol>

        <p style="color:#64748b;font-size:13px;">Questions? Reply to this email or call us — we respond within 2 hours.</p>
      `;
      await sendCustomEmail(emailNorm, `✅ Seat Reserved — ${courseName} | Welcome to CodeBegun`, emailWrapper(body));
    } catch (emailErr) {
      console.error('Auto-confirmation email failed:', emailErr);
    }

    res.status(201).json({
      success: true,
      message: `Seat reserved successfully. ${isNewUser ? 'Student account created and setup email sent.' : 'Setup email sent to existing account.'}`,
      data: reservation
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== ADD PAYMENT =====================

export const addPayment = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, userId } = req;
    const { id } = req.params;
    const { amount, method, transactionId, notes } = req.body;

    const reservation = await SeatReservation.findOne({ _id: id, tenantId });
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    // Generate receipt number
    const receiptNumber = `RCP-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    // Add payment
    reservation.payments.push({
      amount,
      method,
      transactionId,
      paidAt: new Date(),
      receiptNumber,
      notes,
      createdBy: new mongoose.Types.ObjectId(userId as string)
    });

    await reservation.save();

    res.json({
      success: true,
      message: 'Payment added',
      data: reservation
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== SEND RECEIPT EMAIL =====================

export const sendReceiptEmail = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId } = req;
    const { id } = req.params;

    const reservation = await SeatReservation.findOne({ _id: id, tenantId });
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });

    const toEmail = reservation.studentEmail;
    const toName = reservation.studentName || 'Student';
    if (!toEmail) return res.status(400).json({ success: false, message: 'No email address on this reservation' });

    const paymentsHtml = reservation.payments.map(p =>
      `<tr>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${new Date(p.paidAt).toLocaleDateString('en-IN')}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;">₹${p.amount.toLocaleString('en-IN')}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${p.method}</td>
        <td style="padding:8px;border-bottom:1px solid #e2e8f0;">${p.receiptNumber || 'N/A'}</td>
      </tr>`
    ).join('');

    const body = `
      <p class="greeting">Hi ${toName},</p>
      <p class="intro">Thank you for your payment! Here is your receipt for <strong>${reservation.courseName}</strong>.</p>
      <div class="info-card">
        <div class="info-card-title">📋 Reservation Summary</div>
        <div class="info-row"><span class="info-label">Booking ID</span><span class="info-value">#${(reservation._id as any).toString().slice(-8).toUpperCase()}</span></div>
        <div class="info-row"><span class="info-label">Course</span><span class="info-value">${reservation.courseName}</span></div>
        ${reservation.batchName ? `<div class="info-row"><span class="info-label">Batch</span><span class="info-value">${reservation.batchName}</span></div>` : ''}
        <div class="info-row"><span class="info-label">Total Fee</span><span class="info-value">₹${reservation.finalPrice.toLocaleString('en-IN')}</span></div>
        <div class="info-row"><span class="info-label">Paid</span><span class="info-value"><span class="badge badge-green">₹${reservation.paidAmount.toLocaleString('en-IN')}</span></span></div>
        ${reservation.balanceAmount > 0 ? `<div class="info-row"><span class="info-label">Balance Due</span><span class="info-value" style="color:#d97706;">₹${reservation.balanceAmount.toLocaleString('en-IN')}</span></div>` : ''}
      </div>
      <div class="info-card">
        <div class="info-card-title">💳 Payment History</div>
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr style="background:#7c3aed;color:white;">
            <th style="padding:8px;text-align:left;">Date</th>
            <th style="padding:8px;text-align:left;">Amount</th>
            <th style="padding:8px;text-align:left;">Method</th>
            <th style="padding:8px;text-align:left;">Receipt #</th>
          </tr></thead>
          <tbody>${paymentsHtml}</tbody>
        </table>
      </div>
      <p style="color:#64748b;font-size:13px;">Keep this email as your payment receipt. Questions? Reply here anytime.</p>
    `;

    await sendCustomEmail(toEmail, `🧾 Payment Receipt — ${reservation.courseName} | CodeBegun`, emailWrapper(body));

    reservation.receiptSent = true;
    reservation.receiptSentAt = new Date();
    await reservation.save();

    res.json({ success: true, message: `Receipt sent to ${toEmail}` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== CONVERT TO STUDENT (mark as enrolled — user already exists) =====================

export const convertToStudent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId } = req;
    const { id } = req.params;
    const { batchId } = req.body;

    const reservation = await SeatReservation.findOne({ _id: id, tenantId });
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });

    if (reservation.status === 'enrolled') {
      return res.status(400).json({ success: false, message: 'Already enrolled' });
    }

    const student = await User.findById(reservation.studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student account not found for this reservation' });

    // Update batch if provided
    if (batchId) {
      student.batchId = batchId;
      student.batchJoinedDate = new Date();
      await student.save();
    }

    reservation.status = 'enrolled';
    reservation.enrolledAt = new Date();
    if (batchId) reservation.batchId = batchId;
    reservation.welcomeEmailSent = true;
    reservation.welcomeEmailSentAt = new Date();
    await reservation.save();

    res.json({
      success: true,
      message: 'Student enrolled successfully',
      data: {
        reservation,
        student: { _id: student._id, email: student.email, firstName: student.firstName, lastName: student.lastName }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== GET RESERVATIONS =====================

export const getReservations = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId } = req;
    const { status, page = 1, limit = 20 } = req.query;

    const query: any = { tenantId };
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [reservations, total] = await Promise.all([
      SeatReservation.find(query)
        .populate('studentId', 'email firstName lastName phone profileComplete')
        .populate('createdBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      SeatReservation.countDocuments(query)
    ]);

    res.json({
      success: true,
      message: 'Reservations retrieved',
      data: reservations,
      pagination: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== GET RESERVATION BY ID =====================

export const getReservationById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId } = req;
    const { id } = req.params;

    const reservation = await SeatReservation.findOne({ _id: id, tenantId })
      .populate('createdBy', 'firstName lastName')
      .populate('studentId', 'email firstName lastName phone profileComplete');

    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    res.json({
      success: true,
      message: 'Reservation retrieved',
      data: reservation
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== GET LEAD RESERVATION =====================

export const getLeadReservation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId } = req;
    const { leadId } = req.params;

    const reservation = await SeatReservation.findOne({ tenantId, leadId })
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      message: 'Lead reservation retrieved',
      data: reservation
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== CANCEL RESERVATION =====================

export const cancelReservation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, userId } = req;
    const { id } = req.params;
    const { reason } = req.body;

    const reservation = await SeatReservation.findOne({ _id: id, tenantId });
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    if (reservation.status === 'enrolled') {
      return res.status(400).json({ success: false, message: 'Cannot cancel enrolled reservation' });
    }

    reservation.status = 'cancelled';
    reservation.notes = (reservation.notes || '') + `\nCancelled: ${reason || 'No reason provided'}`;
    await reservation.save();

    res.json({
      success: true,
      message: 'Reservation cancelled',
      data: reservation
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== BEAUTIFUL EMAIL TEMPLATES =====================

function emailWrapper(bodyHtml: string, tenantName = 'CodeBegun'): string {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f1f5f9; color: #1e293b; }
  .wrapper { max-width: 620px; margin: 32px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 32px rgba(0,0,0,0.10); }
  .header { background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%); padding: 36px 40px 28px; }
  .header-logo { font-size: 26px; font-weight: 900; color: #fff; letter-spacing: -0.5px; }
  .header-tagline { color: rgba(255,255,255,0.75); font-size: 13px; margin-top: 4px; }
  .body { padding: 36px 40px; }
  .greeting { font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 10px; }
  .intro { color: #475569; font-size: 14px; line-height: 1.7; margin-bottom: 28px; }
  .info-card { background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 22px 24px; margin-bottom: 24px; }
  .info-card-title { font-size: 13px; font-weight: 700; color: #7c3aed; text-transform: uppercase; letter-spacing: 0.7px; margin-bottom: 14px; }
  .info-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #e9edf2; }
  .info-row:last-child { border-bottom: none; padding-bottom: 0; }
  .info-label { font-size: 13px; color: #64748b; }
  .info-value { font-size: 13px; font-weight: 700; color: #1e293b; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; }
  .badge-green  { background: #dcfce7; color: #15803d; }
  .badge-blue   { background: #dbeafe; color: #1d4ed8; }
  .badge-amber  { background: #fef3c7; color: #d97706; }
  .badge-purple { background: #ede9fe; color: #7c3aed; }
  .btn { display: inline-block; background: linear-gradient(135deg,#7c3aed,#2563eb); color: #fff !important; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-size: 15px; font-weight: 700; margin: 8px 0 24px; }
  .steps { margin: 0 0 24px; padding: 0; }
  .step { display: flex; gap: 14px; align-items: flex-start; padding: 12px 0; border-bottom: 1px solid #f0f4f8; }
  .step:last-child { border-bottom: none; }
  .step-num { background: #7c3aed; color: #fff; width: 26px; height: 26px; border-radius: 50%; font-size: 13px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
  .step-text { font-size: 13px; color: #475569; line-height: 1.6; }
  .step-text strong { color: #1e293b; }
  .highlight-box { background: linear-gradient(135deg,#ede9fe,#dbeafe); border-radius: 12px; padding: 20px 24px; margin-bottom: 24px; }
  .highlight-box p { font-size: 14px; color: #4338ca; line-height: 1.7; }
  table.payment-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px; }
  .payment-table th { background: #7c3aed; color: #fff; padding: 10px 14px; text-align: left; }
  .payment-table td { padding: 10px 14px; border-bottom: 1px solid #f0f4f8; color: #475569; }
  .payment-table tr:last-child td { border-bottom: none; }
  .footer { background: #f8fafc; padding: 22px 40px; border-top: 1.5px solid #e2e8f0; text-align: center; }
  .footer p { font-size: 12px; color: #94a3b8; line-height: 1.8; }
  .footer a { color: #7c3aed; text-decoration: none; }
  @media (max-width: 600px) {
    .body, .header, .footer { padding-left: 22px !important; padding-right: 22px !important; }
    .info-row { flex-direction: column; align-items: flex-start; gap: 2px; }
  }
</style></head>
<body>
<div class="wrapper">
  <div class="header">
    <div class="header-logo">🎓 ${tenantName}</div>
    <div class="header-tagline">Software Training &amp; Career Solutions</div>
  </div>
  <div class="body">${bodyHtml}</div>
  <div class="footer">
    <p>This email was sent by <strong>${tenantName}</strong>.<br/>
    If you have any questions, reply to this email or call our support team.<br/>
    <a href="${process.env.CLIENT_URL || 'https://platform.codebegun.com'}">Visit Portal</a></p>
  </div>
</div>
</body></html>`;
}

// ===================== SEND CONFIRMATION EMAIL =====================

export const sendConfirmationEmail = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId } = req;
    const { id } = req.params;

    const reservation = await SeatReservation.findOne({ _id: id, tenantId });
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });

    const toEmail = reservation.studentEmail;
    const toFirstName = (reservation.studentName || 'there').split(' ')[0];
    if (!toEmail) return res.status(400).json({ success: false, message: 'No email address on this reservation' });

    const seatInfo = reservation.seatNumber ? `<div class="info-row"><span class="info-label">Seat Number</span><span class="info-value">${reservation.seatNumber}</span></div>` : '';
    const expiryInfo = reservation.expiresAt
      ? `<div class="info-row"><span class="info-label">Reservation Valid Till</span><span class="info-value">${new Date(reservation.expiresAt).toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' })}</span></div>`
      : '';

    const body = `
      <p class="greeting">🎉 Congratulations, ${toFirstName}!</p>
      <p class="intro">Your seat has been successfully reserved at <strong>CodeBegun</strong>. We're excited to have you join us! Here's a summary of your reservation.</p>

      <div class="info-card">
        <div class="info-card-title">📋 Reservation Details</div>
        <div class="info-row"><span class="info-label">Booking ID</span><span class="info-value">#${(reservation._id as any).toString().slice(-8).toUpperCase()}</span></div>
        <div class="info-row"><span class="info-label">Course</span><span class="info-value">${reservation.courseName}</span></div>
        ${reservation.batchName ? `<div class="info-row"><span class="info-label">Batch</span><span class="info-value">${reservation.batchName}</span></div>` : ''}
        ${seatInfo}
        <div class="info-row"><span class="info-label">Reserved On</span><span class="info-value">${new Date(reservation.reservedAt).toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' })}</span></div>
        ${expiryInfo}
        <div class="info-row"><span class="info-label">Status</span><span class="info-value"><span class="badge badge-purple">Seat Reserved ✓</span></span></div>
      </div>

      <div class="info-card">
        <div class="info-card-title">💰 Payment Summary</div>
        <div class="info-row"><span class="info-label">Course Fee</span><span class="info-value">₹${reservation.originalPrice.toLocaleString('en-IN')}</span></div>
        ${reservation.discountAmount > 0 ? `<div class="info-row"><span class="info-label">Discount ${reservation.discountReason ? '(' + reservation.discountReason + ')' : ''}</span><span class="info-value" style="color:#15803d;">- ₹${reservation.discountAmount.toLocaleString('en-IN')}</span></div>` : ''}
        <div class="info-row"><span class="info-label">Final Amount</span><span class="info-value" style="font-size:15px;">₹${reservation.finalPrice.toLocaleString('en-IN')}</span></div>
        <div class="info-row"><span class="info-label">Paid So Far</span><span class="info-value"><span class="badge badge-green">₹${reservation.paidAmount.toLocaleString('en-IN')}</span></span></div>
        ${reservation.balanceAmount > 0 ? `<div class="info-row"><span class="info-label">Balance Due</span><span class="info-value" style="color:#d97706;">₹${reservation.balanceAmount.toLocaleString('en-IN')}</span></div>` : ''}
      </div>

      <div class="highlight-box">
        <p>💡 <strong>What happens next?</strong> Our team will contact you with batch start details and payment instructions. You can also reach us anytime for support.</p>
      </div>

      <ol class="steps">
        <li class="step"><span class="step-num">1</span><span class="step-text"><strong>Complete Payment</strong> — Pay the remaining balance to confirm your enrollment.</span></li>
        <li class="step"><span class="step-num">2</span><span class="step-text"><strong>Get Joining Details</strong> — You'll receive batch start date, timings, and online/offline venue details.</span></li>
        <li class="step"><span class="step-num">3</span><span class="step-text"><strong>Portal Access</strong> — Login credentials will be shared before Day 1.</span></li>
        <li class="step"><span class="step-num">4</span><span class="step-text"><strong>Start Learning!</strong> — Begin your journey to a successful career. 🚀</span></li>
      </ol>

      <a class="btn" href="${process.env.CLIENT_URL || 'https://platform.codebegun.com'}">View Reservation Details</a>
      <p style="color:#64748b;font-size:13px;">Questions? Call us or reply to this email — we respond within 2 hours.</p>
    `;

    await sendCustomEmail(toEmail, `✅ Seat Reserved — ${reservation.courseName} | CodeBegun`, emailWrapper(body));

    res.json({ success: true, message: `Confirmation sent to ${toEmail}` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== SEND PAYMENT REMINDER EMAIL =====================

export const sendPaymentReminderEmail = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId } = req;
    const { id } = req.params;
    const { dueDate, customMessage } = req.body;

    const reservation = await SeatReservation.findOne({ _id: id, tenantId });
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });

    const toEmail = reservation.studentEmail;
    const toFirstName = (reservation.studentName || 'there').split(' ')[0];
    if (!toEmail) return res.status(400).json({ success: false, message: 'No email address on this reservation' });

    if (reservation.balanceAmount <= 0) {
      return res.status(400).json({ success: false, message: 'No outstanding balance for this reservation' });
    }

    const dueDateStr = dueDate
      ? new Date(dueDate).toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' })
      : 'As soon as possible';

    const body = `
      <p class="greeting">Hi ${toFirstName},</p>
      <p class="intro">Your seat is reserved for <strong>${reservation.courseName}</strong>. This is a friendly reminder about the pending balance for your reservation.</p>

      ${customMessage ? `<div class="highlight-box"><p>${customMessage}</p></div>` : ''}

      <div class="info-card">
        <div class="info-card-title">💳 Payment Status</div>
        <div class="info-row"><span class="info-label">Booking ID</span><span class="info-value">#${(reservation._id as any).toString().slice(-8).toUpperCase()}</span></div>
        <div class="info-row"><span class="info-label">Course</span><span class="info-value">${reservation.courseName}</span></div>
        <div class="info-row"><span class="info-label">Total Fee</span><span class="info-value">₹${reservation.finalPrice.toLocaleString('en-IN')}</span></div>
        <div class="info-row"><span class="info-label">Paid</span><span class="info-value"><span class="badge badge-green">₹${reservation.paidAmount.toLocaleString('en-IN')}</span></span></div>
        <div class="info-row"><span class="info-label">Outstanding Balance</span><span class="info-value" style="font-size:16px;color:#d97706;font-weight:900;">₹${reservation.balanceAmount.toLocaleString('en-IN')}</span></div>
        <div class="info-row"><span class="info-label">Payment Due By</span><span class="info-value" style="color:#dc2626;">${dueDateStr}</span></div>
      </div>

      <div class="info-card">
        <div class="info-card-title">🏦 Payment Options</div>
        <div class="info-row"><span class="info-label">💵 Cash</span><span class="info-value">Visit our office</span></div>
        <div class="info-row"><span class="info-label">📱 UPI</span><span class="info-value">${process.env.UPI_ID || 'Contact us for UPI details'}</span></div>
        <div class="info-row"><span class="info-label">🏧 Bank Transfer</span><span class="info-value">Contact us for account details</span></div>
      </div>

      <div class="highlight-box">
        <p>⚠️ <strong>Important:</strong> Please complete the payment before the due date to secure your seat. Reservations may be released if payment is not received by the due date.</p>
      </div>

      <a class="btn" href="${process.env.CLIENT_URL || 'https://platform.codebegun.com'}">Pay Now / View Details</a>
      <p style="color:#64748b;font-size:13px;">After payment, please share the transaction ID with your counsellor for quick confirmation.</p>
    `;

    await sendCustomEmail(toEmail, `⏰ Payment Reminder — ₹${reservation.balanceAmount.toLocaleString('en-IN')} Due | ${reservation.courseName}`, emailWrapper(body));

    res.json({ success: true, message: `Payment reminder sent to ${toEmail}` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== SEND PRE-JOINING INFO EMAIL =====================

export const sendPreJoiningInfoEmail = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId } = req;
    const { id } = req.params;
    const { batchStartDate, batchStartTime, venue, onlineLink, documentsNeeded, customMessage } = req.body;

    const reservation = await SeatReservation.findOne({ _id: id, tenantId });
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });

    const toEmail = reservation.studentEmail;
    const toFirstName = (reservation.studentName || 'there').split(' ')[0];
    if (!toEmail) return res.status(400).json({ success: false, message: 'No email address on this reservation' });

    const startDateStr = batchStartDate
      ? new Date(batchStartDate).toLocaleDateString('en-IN', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })
      : 'To be confirmed';

    const docs: string[] = documentsNeeded?.length
      ? documentsNeeded
      : ['Aadhaar Card (original + photocopy)', 'Passport-size photographs (2)', '10th / 12th Marksheets', 'Graduation Certificate (if applicable)', 'Offer letter / Admission form'];

    const docsHtml = docs.map((d: string) => `<li class="step"><span class="step-num">📄</span><span class="step-text">${d}</span></li>`).join('');

    const body = `
      <p class="greeting">Great news, ${toFirstName}! 🎊</p>
      <p class="intro">Your batch is starting soon! Here's everything you need to know before Day 1 of <strong>${reservation.courseName}</strong>.</p>

      ${customMessage ? `<div class="highlight-box"><p>${customMessage}</p></div>` : ''}

      <div class="info-card">
        <div class="info-card-title">📅 Batch Schedule</div>
        <div class="info-row"><span class="info-label">Course</span><span class="info-value">${reservation.courseName}</span></div>
        ${reservation.batchName ? `<div class="info-row"><span class="info-label">Batch</span><span class="info-value">${reservation.batchName}</span></div>` : ''}
        <div class="info-row"><span class="info-label">Start Date</span><span class="info-value"><span class="badge badge-blue">${startDateStr}</span></span></div>
        ${batchStartTime ? `<div class="info-row"><span class="info-label">Class Timing</span><span class="info-value">${batchStartTime}</span></div>` : ''}
        ${venue ? `<div class="info-row"><span class="info-label">📍 Venue</span><span class="info-value">${venue}</span></div>` : ''}
        ${onlineLink ? `<div class="info-row"><span class="info-label">💻 Online Link</span><span class="info-value"><a href="${onlineLink}" style="color:#7c3aed;">Join Online</a></span></div>` : ''}
      </div>

      <div class="info-card">
        <div class="info-card-title">📂 Documents to Bring</div>
        <ol class="steps" style="margin-bottom:0">${docsHtml}</ol>
      </div>

      <div class="info-card">
        <div class="info-card-title">✅ Pre-Joining Checklist</div>
        <ol class="steps" style="margin-bottom:0">
          <li class="step"><span class="step-num">1</span><span class="step-text"><strong>Complete any pending fee payment</strong> before the start date.</span></li>
          <li class="step"><span class="step-num">2</span><span class="step-text"><strong>Keep all documents ready</strong> as listed above.</span></li>
          <li class="step"><span class="step-num">3</span><span class="step-text"><strong>Set up your laptop/PC</strong> — ensure Chrome or Firefox is installed.</span></li>
          <li class="step"><span class="step-num">4</span><span class="step-text"><strong>Download VS Code</strong> from code.visualstudio.com if not already installed.</span></li>
          <li class="step"><span class="step-num">5</span><span class="step-text"><strong>Arrive 15 minutes early</strong> on Day 1 for induction and setup.</span></li>
        </ol>
      </div>

      <div class="highlight-box">
        <p>🎯 <strong>Pro Tip:</strong> Come with an open mind and eagerness to learn. Our team is here to guide you every step of the way. Your career transformation starts on Day 1!</p>
      </div>

      <a class="btn" href="${onlineLink || process.env.CLIENT_URL || 'https://platform.codebegun.com'}">View Joining Details</a>
      <p style="color:#64748b;font-size:13px;">Portal login credentials will be sent separately before the start date.</p>
    `;

    await sendCustomEmail(toEmail, `🗓️ Joining Details — ${reservation.courseName} Starts ${startDateStr}`, emailWrapper(body));

    res.json({ success: true, message: `Pre-joining info sent to ${toEmail}` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== SEND JOINING DAY EMAIL =====================

export const sendJoiningDayEmail = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId } = req;
    const { id } = req.params;
    const { loginEmail, tempPassword, onlineLink, customMessage } = req.body;

    const reservation = await SeatReservation.findOne({ _id: id, tenantId });
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });

    const toEmail = reservation.studentEmail;
    const toFirstName = (reservation.studentName || 'there').split(' ')[0];
    if (!toEmail) return res.status(400).json({ success: false, message: 'No email address on this reservation' });

    const credentialsSection = (loginEmail || tempPassword) ? `
      <div class="info-card">
        <div class="info-card-title">🔐 Your Portal Login</div>
        ${loginEmail ? `<div class="info-row"><span class="info-label">Email / Username</span><span class="info-value">${loginEmail}</span></div>` : ''}
        ${tempPassword ? `<div class="info-row"><span class="info-label">Temporary Password</span><span class="info-value" style="font-family:monospace;background:#f0f4ff;padding:3px 8px;border-radius:6px;">${tempPassword}</span></div>` : ''}
        <div class="info-row"><span class="info-label">Portal URL</span><span class="info-value"><a href="${process.env.CLIENT_URL || 'https://platform.codebegun.com'}" style="color:#7c3aed;">${process.env.CLIENT_URL || 'platform.codebegun.com'}</a></span></div>
      </div>
      <div class="highlight-box"><p>🔒 <strong>Security:</strong> Please change your password immediately after your first login. Go to Profile → Change Password.</p></div>
    ` : '';

    const body = `
      <p class="greeting">Welcome to CodeBegun, ${toFirstName}! 🚀</p>
      <p class="intro">Today is a big day — <strong>Day 1 of ${reservation.courseName}</strong>! We're thrilled to have you with us. Here's everything you need to get started today.</p>

      ${customMessage ? `<div class="highlight-box"><p>${customMessage}</p></div>` : ''}

      <div class="info-card">
        <div class="info-card-title">📚 Your Enrolled Course</div>
        <div class="info-row"><span class="info-label">Course</span><span class="info-value">${reservation.courseName}</span></div>
        ${reservation.batchName ? `<div class="info-row"><span class="info-label">Batch</span><span class="info-value">${reservation.batchName}</span></div>` : ''}
        <div class="info-row"><span class="info-label">Enrollment Date</span><span class="info-value">${new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' })}</span></div>
        ${onlineLink ? `<div class="info-row"><span class="info-label">💻 Today's Class Link</span><span class="info-value"><a href="${onlineLink}" style="color:#7c3aed;">Join Now</a></span></div>` : ''}
      </div>

      ${credentialsSection}

      <div class="info-card">
        <div class="info-card-title">🗺️ Your Learning Journey</div>
        <ol class="steps" style="margin-bottom:0">
          <li class="step"><span class="step-num">1</span><span class="step-text"><strong>Login to the Portal</strong> and complete your profile setup.</span></li>
          <li class="step"><span class="step-num">2</span><span class="step-text"><strong>Attend today's orientation</strong> — meet your batch mates and instructors.</span></li>
          <li class="step"><span class="step-num">3</span><span class="step-text"><strong>Explore your course content</strong> — videos, assignments, and quizzes are available 24/7.</span></li>
          <li class="step"><span class="step-num">4</span><span class="step-text"><strong>Join the student WhatsApp group</strong> for daily updates and peer support.</span></li>
          <li class="step"><span class="step-num">5</span><span class="step-text"><strong>Track your progress</strong> — your dashboard shows real-time learning stats.</span></li>
        </ol>
      </div>

      <div style="text-align:center;padding:10px 0 20px;">
        <p style="font-size:22px;margin-bottom:10px;">🌟 "The expert in anything was once a beginner."</p>
        <p style="color:#7c3aed;font-size:14px;font-weight:700;">Every great developer started exactly where you are today.</p>
      </div>

      ${onlineLink ? `<a class="btn" href="${onlineLink}">Join Today's Class 🎓</a>` : `<a class="btn" href="${process.env.CLIENT_URL || 'https://platform.codebegun.com'}">Open Learning Portal 🎓</a>`}
      <p style="color:#64748b;font-size:13px;">We're with you every step of the way. Let's build something great together!</p>
    `;

    await sendCustomEmail(toEmail, `🎉 Welcome Aboard! Your CodeBegun Journey Starts Today — ${reservation.courseName}`, emailWrapper(body));

    res.json({ success: true, message: `Joining day email sent to ${toEmail}` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== GET RESERVATION STATS =====================

export const getReservationStats = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId } = req;

    const stats = await SeatReservation.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(tenantId as string) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$finalPrice' },
          paidAmount: { $sum: '$paidAmount' },
          balanceAmount: { $sum: '$balanceAmount' }
        }
      }
    ]);

    const totals = await SeatReservation.aggregate([
      { $match: { tenantId: new mongoose.Types.ObjectId(tenantId as string) } },
      {
        $group: {
          _id: null,
          totalReservations: { $sum: 1 },
          totalRevenue: { $sum: '$paidAmount' },
          pendingRevenue: { $sum: '$balanceAmount' },
          averagePrice: { $avg: '$finalPrice' }
        }
      }
    ]);

    res.json({
      success: true,
      message: 'Reservation stats retrieved',
      data: {
        byStatus: stats,
        totals: totals[0] || { totalReservations: 0, totalRevenue: 0, pendingRevenue: 0, averagePrice: 0 }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
