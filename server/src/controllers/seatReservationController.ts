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
