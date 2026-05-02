import { Response } from 'express';
import mongoose from 'mongoose';
import SeatReservation from '../models/SeatReservation';
import Lead from '../models/Lead';
import LeadStage from '../models/LeadStage';
import User from '../models/User';
import { AuthenticatedRequest } from '../types';
import { EmailService } from '../services/emailService';
import crypto from 'crypto';

const emailService = new EmailService();

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

// ===================== CREATE SEAT RESERVATION =====================

export const createReservation = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, userId } = req;
    const {
      leadId, courseId, batchId, courseName, batchName,
      originalPrice, discountAmount, discountReason, seatNumber, expiresAt, notes
    } = req.body;

    // Validate lead
    const lead = await Lead.findOne({ _id: leadId, tenantId }).populate('stageId');
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Check for existing active reservation
    const existingReservation = await SeatReservation.findOne({
      tenantId,
      leadId,
      status: { $in: ['pending', 'partial_paid', 'paid', 'confirmed'] }
    });

    if (existingReservation) {
      return res.status(400).json({ 
        success: false, 
        message: 'Lead already has an active reservation',
        data: existingReservation
      });
    }

    const finalPrice = originalPrice - (discountAmount || 0);

    const reservation = new SeatReservation({
      tenantId,
      leadId,
      courseId,
      batchId,
      courseName,
      batchName,
      originalPrice,
      discountAmount: discountAmount || 0,
      discountReason,
      finalPrice,
      seatNumber,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      notes,
      createdBy: userId
    });

    await reservation.save();

    // Update lead stage to "Seat Reserved"
    const reservedStage = await LeadStage.findOne({ 
      tenantId, 
      name: { $regex: /seat.*reserved|reserved/i } 
    });
    
    if (reservedStage) {
      lead.stageId = reservedStage._id;
    }

    // Add activity
    lead.activities.push({
      type: 'note',
      description: `Seat reserved for ${courseName}${batchName ? ' - ' + batchName : ''}. Price: ₹${finalPrice}`,
      createdBy: new mongoose.Types.ObjectId(userId as string),
      createdAt: new Date()
    });
    await lead.save();

    // Auto-send confirmation email
    try {
      const populatedLead = await lead.populate ? lead : await Lead.findById(reservation.leadId);
      if ((populatedLead as any).email) {
        const r = reservation;
        const seatInfo = r.seatNumber ? `<div class="info-row"><span class="info-label">Seat Number</span><span class="info-value">${r.seatNumber}</span></div>` : '';
        const body = `
          <p class="greeting">🎉 Congratulations, ${(populatedLead as any).firstName || (populatedLead as any).name?.split(' ')[0] || 'there'}!</p>
          <p class="intro">Your seat has been successfully reserved for <strong>${courseName}</strong>. We're excited to have you join us!</p>
          <div class="info-card">
            <div class="info-card-title">📋 Reservation Summary</div>
            <div class="info-row"><span class="info-label">Booking ID</span><span class="info-value">#${(r._id as any).toString().slice(-8).toUpperCase()}</span></div>
            <div class="info-row"><span class="info-label">Course</span><span class="info-value">${courseName}</span></div>
            ${batchName ? `<div class="info-row"><span class="info-label">Batch</span><span class="info-value">${batchName}</span></div>` : ''}
            ${seatInfo}
            <div class="info-row"><span class="info-label">Total Fee</span><span class="info-value">₹${finalPrice.toLocaleString('en-IN')}</span></div>
            <div class="info-row"><span class="info-label">Status</span><span class="info-value"><span class="badge badge-purple">Seat Reserved ✓</span></span></div>
          </div>
          <div class="highlight-box"><p>💡 Our team will reach out with payment and batch details shortly. Congratulations on taking this step!</p></div>
          <a class="btn" href="${process.env.CLIENT_URL || 'https://platform.codebegun.com'}">View Details</a>
        `;
        await sendCustomEmail((populatedLead as any).email, `✅ Seat Reserved — ${courseName} | CodeBegun`, emailWrapper(body));
      }
    } catch (emailErr) {
      console.error('Auto-confirmation email failed:', emailErr);
    }

    res.status(201).json({
      success: true,
      message: 'Seat reserved successfully',
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

    // Update lead activity
    const lead = await Lead.findById(reservation.leadId);
    if (lead) {
      lead.activities.push({
        type: 'note',
        description: `Payment received: ₹${amount} via ${method}. Receipt: ${receiptNumber}. Balance: ₹${reservation.balanceAmount}`,
        createdBy: new mongoose.Types.ObjectId(userId as string),
        createdAt: new Date()
      });

      // Update stage if fully paid
      if (reservation.status === 'paid') {
        const paidStage = await LeadStage.findOne({ 
          tenantId, 
          name: { $regex: /payment.*done|paid|payment.*received/i } 
        });
        if (paidStage) {
          lead.stageId = paidStage._id;
        }
      }

      await lead.save();
    }

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

    const reservation = await SeatReservation.findOne({ _id: id, tenantId })
      .populate('leadId');
    
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    const lead = reservation.leadId as any;
    if (!lead.email) {
      return res.status(400).json({ success: false, message: 'Lead has no email address' });
    }

    // Generate receipt HTML
    const paymentsHtml = reservation.payments.map(p => 
      `<tr>
        <td>${new Date(p.paidAt).toLocaleDateString()}</td>
        <td>₹${p.amount}</td>
        <td>${p.method}</td>
        <td>${p.receiptNumber || 'N/A'}</td>
      </tr>`
    ).join('');

    const receiptHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Payment Receipt</h2>
        <p>Dear ${lead.name || lead.firstName},</p>
        <p>Thank you for your payment. Here are your payment details:</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Course: ${reservation.courseName}</h3>
          ${reservation.batchName ? `<p>Batch: ${reservation.batchName}</p>` : ''}
          <p><strong>Total Amount:</strong> ₹${reservation.finalPrice}</p>
          <p><strong>Paid Amount:</strong> ₹${reservation.paidAmount}</p>
          <p><strong>Balance:</strong> ₹${reservation.balanceAmount}</p>
        </div>

        <h4>Payment History:</h4>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #2563eb; color: white;">
              <th style="padding: 10px; text-align: left;">Date</th>
              <th style="padding: 10px; text-align: left;">Amount</th>
              <th style="padding: 10px; text-align: left;">Method</th>
              <th style="padding: 10px; text-align: left;">Receipt #</th>
            </tr>
          </thead>
          <tbody>
            ${paymentsHtml}
          </tbody>
        </table>

        <p style="margin-top: 20px;">If you have any questions, please contact us.</p>
        <p>Best regards,<br>Team CodeBegun</p>
      </div>
    `;

    await sendCustomEmail(
      lead.email,
      `Payment Receipt - ${reservation.courseName}`,
      receiptHtml
    );

    reservation.receiptSent = true;
    reservation.receiptSentAt = new Date();
    await reservation.save();

    res.json({
      success: true,
      message: 'Receipt sent to ' + lead.email
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ===================== CONVERT TO STUDENT =====================

export const convertToStudent = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { tenantId, userId } = req;
    const { id } = req.params;
    const { password, batchId } = req.body;

    const reservation = await SeatReservation.findOne({ _id: id, tenantId })
      .populate('leadId');
    
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found' });
    }

    if (reservation.status === 'enrolled') {
      return res.status(400).json({ success: false, message: 'Already converted to student' });
    }

    if (reservation.balanceAmount > 0 && reservation.status !== 'paid') {
      return res.status(400).json({ 
        success: false, 
        message: 'Full payment required before enrollment',
        data: { balanceAmount: reservation.balanceAmount }
      });
    }

    const lead = reservation.leadId as any;

    // Check if user already exists with this email
    let student = await User.findOne({ email: lead.email, tenantId });

    if (!student) {
      // Create new student user
      const tempPassword = password || crypto.randomBytes(8).toString('hex');
      
      student = new User({
        email: lead.email,
        password: tempPassword,
        firstName: lead.firstName || lead.name?.split(' ')[0] || 'Student',
        lastName: lead.lastName || lead.name?.split(' ').slice(1).join(' ') || '',
        phone: lead.phone,
        role: 'STUDENT',
        tenantId,
        isActive: true,
        isEmailVerified: false,
        batches: batchId ? [batchId] : [],
        createdBy: userId
      });

      await student.save();

      // Send welcome email with credentials
      const welcomeHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">🎉 Welcome to CodeBegun!</h2>
          <p>Dear ${student.firstName},</p>
          <p>Congratulations! Your enrollment is complete. Here are your login details:</p>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Course:</strong> ${reservation.courseName}</p>
            <p><strong>Email:</strong> ${student.email}</p>
            <p><strong>Temporary Password:</strong> ${tempPassword}</p>
          </div>

          <p style="color: #dc2626;">Please change your password after first login.</p>

          <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/login" 
             style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; margin: 20px 0;">
            Login Now
          </a>

          <p>If you have any questions, please reach out to us.</p>
          <p>Happy Learning! 🚀<br>Team CodeBegun</p>
        </div>
      `;

      await sendCustomEmail(
        student.email,
        `Welcome to CodeBegun - Your Learning Journey Begins!`,
        welcomeHtml
      );

      reservation.welcomeEmailSent = true;
      reservation.welcomeEmailSentAt = new Date();
    }

    // Update reservation
    reservation.status = 'enrolled';
    reservation.enrolledAt = new Date();
    reservation.studentId = student._id;
    if (batchId) reservation.batchId = batchId;
    await reservation.save();

    // Update lead
    const leadDoc = await Lead.findById(lead._id);
    if (leadDoc) {
      leadDoc.convertedStudentId = student._id;
      
      // Update stage to "Converted"
      const convertedStage = await LeadStage.findOne({ 
        tenantId, 
        name: { $regex: /converted|enrolled|student/i } 
      });
      if (convertedStage) {
        leadDoc.stageId = convertedStage._id;
      }

      leadDoc.activities.push({
        type: 'status_change',
        description: `Converted to student. Student ID: ${student._id}. Email: ${student.email}`,
        createdBy: new mongoose.Types.ObjectId(userId as string),
        createdAt: new Date()
      });

      await leadDoc.save();
    }

    res.json({
      success: true,
      message: 'Lead converted to student successfully',
      data: {
        reservation,
        student: {
          _id: student._id,
          email: student.email,
          firstName: student.firstName,
          lastName: student.lastName
        }
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
        .populate('leadId', 'name phone email')
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
      .populate('leadId', 'name phone email activities')
      .populate('createdBy', 'firstName lastName')
      .populate('studentId', 'email firstName lastName');

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

    // Update lead
    const lead = await Lead.findById(reservation.leadId);
    if (lead) {
      lead.activities.push({
        type: 'note',
        description: `Seat reservation cancelled. Reason: ${reason || 'N/A'}`,
        createdBy: new mongoose.Types.ObjectId(userId as string),
        createdAt: new Date()
      });
      await lead.save();
    }

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

    const reservation = await SeatReservation.findOne({ _id: id, tenantId }).populate('leadId');
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });

    const lead = reservation.leadId as any;
    if (!lead?.email) return res.status(400).json({ success: false, message: 'Lead has no email address' });

    const seatInfo = reservation.seatNumber ? `<div class="info-row"><span class="info-label">Seat Number</span><span class="info-value">${reservation.seatNumber}</span></div>` : '';
    const expiryInfo = reservation.expiresAt
      ? `<div class="info-row"><span class="info-label">Reservation Valid Till</span><span class="info-value">${new Date(reservation.expiresAt).toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' })}</span></div>`
      : '';

    const body = `
      <p class="greeting">🎉 Congratulations, ${lead.firstName || lead.name?.split(' ')[0] || 'there'}!</p>
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

    await sendCustomEmail(lead.email, `✅ Seat Reserved — ${reservation.courseName} | CodeBegun`, emailWrapper(body));

    res.json({ success: true, message: `Confirmation sent to ${lead.email}` });
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

    const reservation = await SeatReservation.findOne({ _id: id, tenantId }).populate('leadId');
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });

    const lead = reservation.leadId as any;
    if (!lead?.email) return res.status(400).json({ success: false, message: 'Lead has no email address' });

    if (reservation.balanceAmount <= 0) {
      return res.status(400).json({ success: false, message: 'No outstanding balance for this reservation' });
    }

    const dueDateStr = dueDate
      ? new Date(dueDate).toLocaleDateString('en-IN', { day:'2-digit', month:'long', year:'numeric' })
      : 'As soon as possible';

    const body = `
      <p class="greeting">Hi ${lead.firstName || lead.name?.split(' ')[0] || 'there'},</p>
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

    await sendCustomEmail(lead.email, `⏰ Payment Reminder — ₹${reservation.balanceAmount.toLocaleString('en-IN')} Due | ${reservation.courseName}`, emailWrapper(body));

    res.json({ success: true, message: `Payment reminder sent to ${lead.email}` });
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

    const reservation = await SeatReservation.findOne({ _id: id, tenantId }).populate('leadId');
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });

    const lead = reservation.leadId as any;
    if (!lead?.email) return res.status(400).json({ success: false, message: 'Lead has no email address' });

    const startDateStr = batchStartDate
      ? new Date(batchStartDate).toLocaleDateString('en-IN', { weekday:'long', day:'2-digit', month:'long', year:'numeric' })
      : 'To be confirmed';

    const docs: string[] = documentsNeeded?.length
      ? documentsNeeded
      : ['Aadhaar Card (original + photocopy)', 'Passport-size photographs (2)', '10th / 12th Marksheets', 'Graduation Certificate (if applicable)', 'Offer letter / Admission form'];

    const docsHtml = docs.map((d: string) => `<li class="step"><span class="step-num">📄</span><span class="step-text">${d}</span></li>`).join('');

    const body = `
      <p class="greeting">Great news, ${lead.firstName || lead.name?.split(' ')[0] || 'there'}! 🎊</p>
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

    await sendCustomEmail(lead.email, `🗓️ Joining Details — ${reservation.courseName} Starts ${startDateStr}`, emailWrapper(body));

    res.json({ success: true, message: `Pre-joining info sent to ${lead.email}` });
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

    const reservation = await SeatReservation.findOne({ _id: id, tenantId }).populate('leadId');
    if (!reservation) return res.status(404).json({ success: false, message: 'Reservation not found' });

    const lead = reservation.leadId as any;
    if (!lead?.email) return res.status(400).json({ success: false, message: 'Lead has no email address' });

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
      <p class="greeting">Welcome to CodeBegun, ${lead.firstName || lead.name?.split(' ')[0] || 'there'}! 🚀</p>
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

    await sendCustomEmail(lead.email, `🎉 Welcome Aboard! Your CodeBegun Journey Starts Today — ${reservation.courseName}`, emailWrapper(body));

    res.json({ success: true, message: `Joining day email sent to ${lead.email}` });
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
