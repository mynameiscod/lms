import { Request, Response } from 'express';
import PublicQuizSubmission from '../models/PublicQuizSubmission';
import Tenant from '../models/Tenant';

// ─────────────────────────────────────────────────────────────────────────────
// WEBSITE INTEGRATION ENDPOINT (public, for external site like codebegun.com)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/public/:tenantSlug/weekly-quiz-register
 *
 * Called from external website registration form.
 * Body: { name, email, phone?, weekLabel?, [any extra form fields + files] }
 */
export const registerForWeeklyQuizFromWebsite = async (req: Request, res: Response) => {
  try {
    const { tenantSlug } = req.params;

    const tenant = await Tenant.findOne({ slug: tenantSlug });
    if (!tenant) return res.status(404).json({ message: 'Organization not found' });

    const { name, email, phone, weekLabel, ...extraFields } = req.body as Record<string, any>;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'email is required' });
    }
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ message: 'name is required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const tenantId = tenant._id.toString();

    // Collect uploaded files saved to disk by multer
    const files = (req as any).files as Array<{ fieldname: string; filename: string; mimetype: string; originalname: string }> || [];
    const uploadedFiles = files.map(f => ({
      fieldName: f.fieldname,
      filePath: `/uploads/registrations/${f.filename}`,
      mimeType: f.mimetype,
      originalName: f.originalname
    }));

    const registrationData: Record<string, any> = {
      name,
      email: normalizedEmail,
      phone: phone || '',
      ...extraFields
    };

    // Duplicate detection — same email + same weekLabel = already registered
    const existingQuery: any = { tenantId, email: normalizedEmail };
    if (weekLabel) existingQuery.weekLabel = weekLabel.trim();

    const existing = await PublicQuizSubmission.findOne(existingQuery);
    if (existing) {
      return res.status(200).json({
        success: true,
        registered: true,
        alreadyRegistered: true,
        message: 'You are already registered. We will contact you shortly.'
      });
    }

    const submission = new PublicQuizSubmission({
      tenantId,
      email: normalizedEmail,
      name: name.trim(),
      registrationData,
      weekLabel: weekLabel ? weekLabel.trim() : undefined,
      isPreRegistration: !weekLabel,
      uploadedFiles,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || ''
    });
    await submission.save();

    return res.status(201).json({
      success: true,
      registered: true,
      message: 'Registration successful! We will review your details and contact you soon.'
    });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ENDPOINTS (authenticated)
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/public-quizzes/all-registrations — all registrations for tenant */
export const getAllRegistrations = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const { page = 1, limit = 100, search = '', week = '' } = req.query;

    const query: any = { tenantId };

    if (search) {
      const re = new RegExp(String(search), 'i');
      query.$or = [{ name: re }, { email: re }];
    }

    if (week === '__pre__') {
      query.isPreRegistration = true;
    } else if (week) {
      query.weekLabel = String(week);
    }

    const total = await PublicQuizSubmission.countDocuments(query);
    const submissions = await PublicQuizSubmission.find(query)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    // Get distinct week labels for filter dropdown
    const weekLabels = await PublicQuizSubmission.distinct('weekLabel', { tenantId, weekLabel: { $exists: true, $ne: '' } });

    res.json({ submissions, total, page: Number(page), limit: Number(limit), weekLabels });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/** GET /api/public-quizzes/registrations/:subId — full detail for one registration */
export const getRegistrationDetail = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const submission = await PublicQuizSubmission.findOne({ _id: req.params.subId, tenantId });
    if (!submission) return res.status(404).json({ message: 'Not found' });
    res.json(submission);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/** PUT /api/public-quizzes/registrations/:subId/approve — admin approves registration */
export const approveRegistration = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const userId = (req as any).user?.id;

    const submission = await PublicQuizSubmission.findOne({ _id: req.params.subId, tenantId });
    if (!submission) return res.status(404).json({ message: 'Not found' });

    submission.isApproved = true;
    submission.approvedBy = userId;
    submission.approvedAt = new Date();
    submission.rejectionReason = undefined;
    await submission.save();

    res.json({ success: true, message: 'Registration approved.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

/** PUT /api/public-quizzes/registrations/:subId/reject — admin rejects registration */
export const rejectRegistration = async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const { reason } = req.body;

    const submission = await PublicQuizSubmission.findOne({ _id: req.params.subId, tenantId });
    if (!submission) return res.status(404).json({ message: 'Not found' });

    submission.isApproved = false;
    submission.rejectionReason = reason || 'Rejected by admin';
    await submission.save();

    res.json({ success: true, message: 'Registration rejected.' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
