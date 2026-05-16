import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Tenant from '../models/Tenant';
import Lead from '../models/Lead';
import LeadFormConfig from '../models/LeadFormConfig';
import LeadStage from '../models/LeadStage';

// Rate limiting map (simple in-memory)
const submitCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10; // max 10 submissions per IP per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = submitCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    submitCounts.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// POST /api/v1/public/:tenantSlug/website-lead
// Simple dedicated endpoint for website contact/enquiry forms.
// Always creates a HOT lead with source = website. No form config required.
export const submitWebsiteLead = async (req: Request, res: Response) => {
  try {
    const { tenantSlug } = req.params;
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({ success: false, message: 'Too many requests. Please try again later.' });
    }

    const tenant = await Tenant.findOne({ slug: tenantSlug, isActive: true });
    if (!tenant) {
      return res.status(404).json({ success: false, message: 'Invalid form endpoint.' });
    }

    const { name, phone, mobile, email, courseInterest, course, message, notes,
            utm_source, utm_medium, utm_campaign, utm_content, utm_term } = req.body;

    const contactPhone = (phone || mobile || '').toString().replace(/[^\d+]/g, '');
    const contactName  = (name || '').toString().trim().substring(0, 200);
    const contactEmail = (email || '').toString().trim().substring(0, 200);
    const course_interest = courseInterest || course || '';

    if (!contactName) {
      return res.status(400).json({ success: false, message: 'Name is required.' });
    }
    if (!contactPhone && !contactEmail) {
      return res.status(400).json({ success: false, message: 'Phone number or email is required.' });
    }

    // Duplicate check by phone, then email
    const dupQuery: any[] = [];
    if (contactPhone) dupQuery.push({ tenantId: tenant._id, phone: contactPhone });
    if (contactEmail) dupQuery.push({ tenantId: tenant._id, email: contactEmail });

    const existing = dupQuery.length ? await Lead.findOne({ $or: dupQuery }) : null;
    const adminId  = (tenant as any).adminId;
    const noteText = message || notes || '';

    if (existing) {
      existing.activities.push({
        type: 'note',
        description: `Re-enquired via website.${noteText ? ' Message: ' + noteText : ''}`,
        createdBy:   adminId,
        createdAt:   new Date(),
      } as any);
      if (existing.priority === 'cold' || existing.priority === 'warm') {
        existing.priority = 'hot';
      }
      await existing.save();
      return res.status(200).json({ success: true, message: 'Thank you! We will contact you shortly.', isExisting: true });
    }

    // Find default stage — fall back to first stage if none marked default
    const defaultStage = await LeadStage.findOne({ tenantId: tenant._id, isDefault: true })
      || await LeadStage.findOne({ tenantId: tenant._id });

    if (!defaultStage) {
      console.error('[website-lead] No lead stage found for tenant', tenantSlug);
      return res.status(500).json({ success: false, message: 'Lead pipeline not configured. Please contact support.' });
    }

    const lead = new Lead({
      tenantId:  tenant._id,
      createdBy: adminId,
      name:      contactName,
      phone:     contactPhone || undefined,
      email:     contactEmail || undefined,
      source:    'website',
      sourceDetails: { platform: 'website', referrerUrl: req.headers.referer || '' },
      priority:  'hot',
      stageId:   defaultStage._id,
      courseInterest: course_interest
        ? (Array.isArray(course_interest) ? course_interest : [course_interest])
        : [],
      activities: [{
        type:        'created',
        description: `Hot lead from website.${noteText ? ' Message: ' + noteText : ''}`,
        createdBy:   adminId,
        createdAt:   new Date(),
      }],
      utmParams: { source: utm_source, medium: utm_medium, campaign: utm_campaign, content: utm_content, term: utm_term },
    });

    await lead.save();

    return res.status(201).json({ success: true, message: 'Thank you! We will contact you shortly.', isExisting: false });
  } catch (error) {
    console.error('[website-lead]', error);
    return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
};

// GET /api/v1/public/form/:tenantSlug — Get form fields for embedding
export const getPublicFormConfig = async (req: Request, res: Response) => {
  try {
    const { tenantSlug } = req.params;

    const tenant = await Tenant.findOne({ slug: tenantSlug, isActive: true });
    if (!tenant) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const config = await LeadFormConfig.findOne({ tenantId: tenant._id });
    if (!config) {
      return res.status(404).json({ error: 'Form not configured' });
    }

    // Return only enabled fields that are visible in forms
    const fields = config.fields
      .filter((f: any) => f.enabled)
      .sort((a: any, b: any) => a.order - b.order)
      .map((f: any) => ({
        fieldKey: f.fieldKey,
        label: f.label,
        type: f.type,
        required: f.required,
        options: f.options || [],
        placeholder: f.placeholder || '',
        helpText: f.helpText || '',
      }));

    const sources = config.sources || [];

    return res.json({
      tenantName: tenant.name,
      fields,
      sources,
    });
  } catch (error) {
    console.error('Error getting public form config:', error);
    return res.status(500).json({ error: 'Something went wrong' });
  }
};

// POST /api/v1/public/form/:tenantSlug — Submit lead from external form
export const submitPublicLeadForm = async (req: Request, res: Response) => {
  try {
    const { tenantSlug } = req.params;
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

    // Rate limiting
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({ error: 'Too many submissions. Please try again later.' });
    }

    const tenant = await Tenant.findOne({ slug: tenantSlug, isActive: true });
    if (!tenant) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const config = await LeadFormConfig.findOne({ tenantId: tenant._id });
    const enabledFields = config?.fields?.filter((f: any) => f.enabled) || [];

    // Validate required fields
    for (const field of enabledFields) {
      if (field.required && !req.body[field.fieldKey]) {
        return res.status(400).json({ error: `${field.label} is required` });
      }
    }

    // Extract standard fields
    const { name, phone, email, source, courseInterest, notes, priority, ...customFieldValues } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    // Sanitize phone (remove non-digits except +)
    const sanitizedPhone = phone.replace(/[^\d+]/g, '');

    // Check for duplicate by phone number
    const existingLead = await Lead.findOne({
      tenantId: tenant._id,
      phone: sanitizedPhone,
    });

    if (existingLead) {
      // Update existing lead with new activity
      existingLead.activities = existingLead.activities || [];
      existingLead.activities.push({
        type: 'form_submission',
        description: `Form resubmitted. ${notes ? 'Notes: ' + notes : ''}`,
        performedBy: existingLead.assignedTo || (tenant as any).adminId,
        createdAt: new Date(),
      } as any);
      await existingLead.save();

      return res.status(200).json({
        success: true,
        message: 'Thank you! We already have your details and will contact you soon.',
        isExisting: true,
      });
    }

    // Get default stage
    const defaultStage = await LeadStage.findOne({
      tenantId: tenant._id,
      isDefault: true,
    });

    // Build custom fields
    const customFields: Record<string, any> = {};
    for (const field of enabledFields) {
      if (!field.isBuiltIn && customFieldValues[field.fieldKey] !== undefined) {
        customFields[field.fieldKey] = customFieldValues[field.fieldKey];
      }
    }

    // Create lead
    const lead = new Lead({
      tenantId: tenant._id,
      name: String(name).trim().substring(0, 200),
      phone: sanitizedPhone,
      email: email ? String(email).trim().substring(0, 200) : undefined,
      source: source || 'website',
      sourceDetails: {
        platform: 'website',
        referrerUrl: req.headers.referer || '',
      },
      priority: priority || 'cold',
      stageId: defaultStage?._id,
      courseInterest: courseInterest ? (Array.isArray(courseInterest) ? courseInterest : [courseInterest]) : [],
      customFields,
      activities: [{
        type: 'form_submission',
        description: `Lead submitted via website form.${notes ? ' Notes: ' + notes : ''}`,
        performedBy: (tenant as any).adminId,
        createdAt: new Date(),
      }],
      utmParams: {
        source: req.body.utm_source,
        medium: req.body.utm_medium,
        campaign: req.body.utm_campaign,
        content: req.body.utm_content,
        term: req.body.utm_term,
      },
    });

    await lead.save();

    return res.status(201).json({
      success: true,
      message: 'Thank you! We will contact you soon.',
      isExisting: false,
    });
  } catch (error) {
    console.error('Error submitting public lead form:', error);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
