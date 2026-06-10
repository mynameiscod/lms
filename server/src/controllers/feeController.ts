import { Request, Response } from 'express';
import Fee from '../models/Fee';
import User from '../models/User';
import Batch from '../models/Batch';
import Tenant from '../models/Tenant';
import { EmailService } from '../services/emailService';

const emailService = new EmailService();

interface AuthRequest extends Request {
  user?: { id: string; role?: string };
  tenantId?: string;
}

const inr = (n: number) => `₹${(n || 0).toLocaleString('en-IN')}`;
const inr2 = (n: number) => `₹${(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const sumPayments = (payments: any[]) => (payments || []).reduce((s, p) => s + (p.amount || 0), 0);

// CodeBegun brand details used on the printed / emailed receipt.
// Logo, signature and QR are hot-linked from the public site (same host as the
// assessment-page logo) so they render in email clients and on print.
const BRAND = {
  name: 'CODEBEGUN INSTITUTE OF TECHNOLOGIES',
  tagline: 'Code Your Career. Begin Your Future.',
  address: 'Plot No.4, Flat 102, SM Reddy Complex, Madhapur, Hyderabad, Telangana 500081',
  phone: '+91 63010 99587',
  email: 'contact@codebegun.com',
  website: 'www.codebegun.com',
  websiteUrl: 'https://www.codebegun.com',
  logo: 'https://codebegun.com/images/logo.png',
  signature: 'https://codebegun.com/images/receipt-signature.png',
  qr: 'https://codebegun.com/images/receipt-qr.png',
  primary: '#1b3a8a',
  primaryDark: '#13287a',
  accent: '#1d4ed8',
};

const fmtDate = (d?: Date | null) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const PAY_METHOD_LABEL: Record<string, string> = { cash: 'Cash', upi: 'UPI', card: 'Card', bank_transfer: 'Bank Transfer', other: 'Other' };

interface ReceiptData {
  receiptNo: string; issueDate: Date;
  studentName: string; mobile?: string; email: string; address?: string;
  courseName?: string; batchName?: string; batchStart?: Date | null; batchEnd?: Date | null;
  duration?: string; mode?: string; mentor?: string;
  courseFee: number; registrationFee: number; studyMaterials: number; otherCharges: number;
  totalAmount: number; discount: number; paidAmount: number; dueAmount: number; dueDate?: Date | null;
  status: string; payments: any[];
}

// Build a branded, printable HTML fee receipt matching the CodeBegun template.
function buildReceiptHtml(d: ReceiptData): string {
  const P = BRAND.primary, PD = BRAND.primaryDark, A = BRAND.accent;
  const labelCell = (t: string) => `<td style="padding:5px 0;color:#64748b;font-size:12px;width:120px;vertical-align:top">${t}</td><td style="padding:5px 6px;color:#0f172a;font-size:12px;vertical-align:top">:</td>`;
  const detailRow = (label: string, value: string) => `<tr>${labelCell(label)}<td style="padding:5px 0;color:#0f172a;font-size:12px;font-weight:600;vertical-align:top">${value || '—'}</td></tr>`;

  const feeRow = (desc: string, amt: number, opts?: { bold?: boolean }) => `
    <tr style="${opts?.bold ? `background:#eef2ff` : ''}">
      <td style="padding:11px 14px;border-bottom:1px solid #e5e7eb;font-size:13px;color:${opts?.bold ? P : '#334155'};font-weight:${opts?.bold ? 700 : 400}">${desc}</td>
      <td style="padding:11px 14px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:right;color:${opts?.bold ? P : '#334155'};font-weight:${opts?.bold ? 700 : 400}">${inr2(amt).replace('₹', '')}</td>
    </tr>`;

  const payRows = (d.payments || []).length
    ? d.payments.map(p => `
      <tr>
        <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#334155">${fmtDate(p.paymentDate)}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#334155">${PAY_METHOD_LABEL[p.paymentMethod] || p.paymentMethod || '—'}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#334155">${p.transactionId || '—'}</td>
        <td style="padding:9px 12px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#16a34a;font-weight:600;text-align:right">${inr2(p.amount).replace('₹', '')}</td>
      </tr>`).join('')
    : `<tr><td colspan="4" style="padding:12px;text-align:center;border-bottom:1px solid #e5e7eb;color:#94a3b8;font-size:12px">No payments recorded yet</td></tr>`;

  const summaryLine = (label: string, value: string, color: string) => `
    <tr><td style="padding:9px 0 3px;font-size:11px;color:#64748b;font-weight:700;letter-spacing:.3px">${label}</td></tr>
    <tr><td style="padding:0 0 8px;font-size:17px;color:${color};font-weight:800;border-bottom:1px solid #dbe3f5">${value}</td></tr>`;

  return `
  <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:760px;margin:0 auto;background:#fff;color:#1f2937;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
    <div style="height:6px;background:${PD}"></div>

    <!-- Header -->
    <table style="width:100%;border-collapse:collapse;padding:0">
      <tr>
        <td style="padding:24px 28px 12px;vertical-align:top">
          <img src="${BRAND.logo}" alt="CodeBegun" style="height:48px;display:block" />
          <div style="margin-top:14px;color:${P};font-weight:800;font-size:14px;letter-spacing:.3px">${BRAND.name}</div>
          <div style="margin-top:8px;color:#475569;font-size:12px;line-height:1.7">
            📍 ${BRAND.address}<br/>
            📞 ${BRAND.phone}<br/>
            ✉️ ${BRAND.email}<br/>
            🌐 ${BRAND.website}
          </div>
        </td>
        <td style="padding:24px 28px 12px;vertical-align:top;text-align:right;width:42%">
          <div style="color:${P};font-weight:800;font-size:30px;letter-spacing:1px">FEE RECEIPT</div>
          <div style="color:#64748b;font-size:12px;margin-top:2px">Thank you for choosing <span style="color:${A};font-weight:700">CodeBegun!</span></div>
          <table style="width:100%;border-collapse:collapse;margin-top:14px">
            <tr><td style="border:1px solid #cbd5e1;border-radius:8px;padding:10px 14px;text-align:center">
              <div style="font-size:10px;color:#64748b;font-weight:700;letter-spacing:.5px">RECEIPT NO.</div>
              <div style="font-size:15px;color:${P};font-weight:800;margin:4px 0">${d.receiptNo}</div>
              <div style="font-size:10px;color:#64748b;font-weight:700;letter-spacing:.5px;border-top:1px solid #e5e7eb;padding-top:6px;margin-top:4px">DATE OF ISSUE</div>
              <div style="font-size:12px;color:#334155;font-weight:600">${fmtDate(d.issueDate)}</div>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Student + Course details -->
    <div style="padding:6px 28px 0">
      <table style="width:100%;border-collapse:collapse;background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px">
        <tr>
          <td style="padding:16px 18px;vertical-align:top;width:50%;border-right:1px solid #e5e7eb">
            <div style="color:${P};font-weight:700;font-size:12px;letter-spacing:.4px;margin-bottom:10px">👤 STUDENT DETAILS</div>
            <table style="width:100%;border-collapse:collapse">
              ${detailRow('Student Name', d.studentName)}
              ${detailRow('Mobile Number', d.mobile || '—')}
              ${detailRow('Email', d.email)}
              ${d.address ? detailRow('Address', d.address) : ''}
            </table>
          </td>
          <td style="padding:16px 18px;vertical-align:top;width:50%">
            <div style="color:${P};font-weight:700;font-size:12px;letter-spacing:.4px;margin-bottom:10px">🎓 COURSE DETAILS</div>
            <table style="width:100%;border-collapse:collapse">
              ${detailRow('Course', d.courseName || '—')}
              ${detailRow('Batch', d.batchName || '—')}
              ${detailRow('Batch Start Date', fmtDate(d.batchStart))}
              ${detailRow('Batch End Date', fmtDate(d.batchEnd))}
              ${detailRow('Duration', d.duration || '—')}
              ${detailRow('Mode', d.mode || '—')}
              ${detailRow('Mentor', d.mentor || '—')}
            </table>
          </td>
        </tr>
      </table>
    </div>

    <!-- Fee details + summary -->
    <div style="padding:18px 28px 0">
      <div style="color:${P};font-weight:700;font-size:12px;letter-spacing:.4px;margin-bottom:10px">🧾 FEE DETAILS</div>
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="vertical-align:top;width:62%;padding-right:16px">
            <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
              <tr style="background:${P}">
                <th style="padding:10px 14px;text-align:left;color:#fff;font-size:11px;letter-spacing:.5px">DESCRIPTION</th>
                <th style="padding:10px 14px;text-align:right;color:#fff;font-size:11px;letter-spacing:.5px">AMOUNT (₹)</th>
              </tr>
              ${feeRow(`Course Fee${d.courseName ? ` (${d.courseName})` : ''}`, d.courseFee)}
              ${feeRow('Registration Fee', d.registrationFee)}
              ${feeRow('Study Materials', d.studyMaterials)}
              ${feeRow('Other Charges', d.otherCharges)}
              ${d.discount > 0 ? `<tr><td style="padding:11px 14px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#7c3aed">Discount${''}</td><td style="padding:11px 14px;border-bottom:1px solid #e5e7eb;font-size:13px;text-align:right;color:#7c3aed">- ${inr2(d.discount).replace('₹', '')}</td></tr>` : ''}
              ${feeRow('TOTAL FEE', d.totalAmount - (d.discount || 0), { bold: true })}
            </table>
          </td>
          <td style="vertical-align:top;width:38%">
            <table style="width:100%;border-collapse:collapse;background:#eff4ff;border:1px solid #dbe3f5;border-radius:10px">
              <tr><td style="padding:14px 18px 2px">
                <table style="width:100%;border-collapse:collapse">
                  ${summaryLine('TOTAL FEE', inr2(d.totalAmount - (d.discount || 0)), P)}
                  ${summaryLine('AMOUNT PAID', inr2(d.paidAmount), '#16a34a')}
                  ${summaryLine('DUE AMOUNT', inr2(d.dueAmount), '#dc2626')}
                  <tr><td style="padding:9px 0 3px;font-size:11px;color:#64748b;font-weight:700;letter-spacing:.3px">DUE DATE</td></tr>
                  <tr><td style="padding:0 0 12px;font-size:14px;color:#dc2626;font-weight:700">${d.dueAmount > 0 ? fmtDate(d.dueDate) : 'Fully Paid'}</td></tr>
                </table>
              </td></tr>
            </table>
          </td>
        </tr>
      </table>
    </div>

    <!-- Payment history + signature/QR -->
    <div style="padding:18px 28px 0">
      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="vertical-align:top;width:58%;padding-right:18px">
            <div style="color:${P};font-weight:700;font-size:12px;letter-spacing:.4px;margin-bottom:10px">💳 PAYMENT HISTORY</div>
            <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
              <tr style="background:${P}">
                <th style="padding:9px 12px;text-align:left;color:#fff;font-size:10.5px;letter-spacing:.4px">DATE</th>
                <th style="padding:9px 12px;text-align:left;color:#fff;font-size:10.5px;letter-spacing:.4px">MODE</th>
                <th style="padding:9px 12px;text-align:left;color:#fff;font-size:10.5px;letter-spacing:.4px">TRANSACTION ID</th>
                <th style="padding:9px 12px;text-align:right;color:#fff;font-size:10.5px;letter-spacing:.4px">AMOUNT (₹)</th>
              </tr>
              ${payRows}
            </table>
          </td>
          <td style="vertical-align:top;width:42%;text-align:center">
            <table style="width:100%;border-collapse:collapse">
              <tr>
                <td style="text-align:center;vertical-align:top;padding-top:6px">
                  <div style="color:#475569;font-size:11px;margin-bottom:6px">Scan &amp; Pay</div>
                  <img src="${BRAND.qr}" alt="" onerror="this.style.display='none'" style="width:96px;height:96px;border:1px solid #e5e7eb;border-radius:8px;background:#fff" />
                </td>
              </tr>
              <tr>
                <td style="text-align:center;padding-top:14px">
                  <img src="${BRAND.signature}" alt="" onerror="this.style.display='none'" style="height:46px;display:inline-block" />
                  <div style="border-top:1px solid #cbd5e1;margin-top:4px;padding-top:6px;color:#0f172a;font-size:12px;font-weight:600">Authorized Signatory</div>
                  <div style="color:#64748b;font-size:11px">For ${BRAND.name}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>

    <!-- Notes -->
    <div style="padding:16px 28px 22px">
      <div style="color:${P};font-weight:700;font-size:12px;letter-spacing:.4px;margin-bottom:8px">📝 NOTES</div>
      <ul style="margin:0;padding-left:18px;color:#64748b;font-size:11.5px;line-height:1.9">
        <li>Please clear the due amount on or before the due date to avoid late fee.</li>
        <li>Fees once paid are non-refundable and non-transferable.</li>
        <li>For any queries, contact us at ${BRAND.phone} or ${BRAND.email}</li>
      </ul>
    </div>

    <!-- Footer -->
    <div style="background:${PD};padding:16px 28px;color:#dbe3f5">
      <table style="width:100%;border-collapse:collapse;text-align:center">
        <tr>
          <td style="font-size:11px;padding:4px"><div style="font-weight:700;color:#fff">Expert Mentors</div>Learn from Industry Experts</td>
          <td style="font-size:11px;padding:4px"><div style="font-weight:700;color:#fff">Practical Learning</div>Projects &amp; Real-world Skills</td>
          <td style="font-size:11px;padding:4px"><div style="font-weight:700;color:#fff">Placement Support</div>Resume, Interviews &amp; Jobs</td>
          <td style="font-size:11px;padding:4px"><div style="font-weight:700;color:#fff">Career Growth</div>Your Success is Our Mission</td>
        </tr>
      </table>
    </div>
    <div style="background:#fff;padding:12px 28px;text-align:center;color:${A};font-size:12px;font-style:italic;border-top:1px solid #eef2ff">
      ${BRAND.tagline} &nbsp;·&nbsp; <a href="${BRAND.websiteUrl}" style="color:${A};text-decoration:none">${BRAND.website}</a>
    </div>
  </div>`;
}

// Indian financial-year string, e.g. "2025-26", for the given date.
function financialYear(d: Date): string {
  const y = d.getFullYear();
  // FY starts in April (month index 3)
  return d.getMonth() >= 3 ? `${y}-${String((y + 1) % 100).padStart(2, '0')}` : `${y - 1}-${String(y % 100).padStart(2, '0')}`;
}

async function loadStudentAndFee(studentId: string, tenantId: string) {
  const [student, fee] = await Promise.all([
    User.findOne({ _id: studentId, tenantId }).select('firstName lastName email batchId').lean() as any,
    Fee.findOne({ studentId, tenantId }),
  ]);
  return { student, fee };
}

// GET /fees — list all students' fees with filters + summary
export async function listFees(req: AuthRequest, res: Response) {
  try {
    const tenantId = req.tenantId;
    if (!tenantId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { batch, status, search } = req.query as any;

    const [students, fees, batches] = await Promise.all([
      User.find({ tenantId, role: 'STUDENT', isActive: true }).select('firstName lastName email batchId').lean(),
      Fee.find({ tenantId }).lean(),
      Batch.find({ tenantId }).select('name').lean(),
    ]);
    const batchName: Record<string, string> = {};
    batches.forEach((b: any) => { batchName[String(b._id)] = b.name; });
    const feeMap: Record<string, any> = {};
    fees.forEach((f: any) => { feeMap[String(f.studentId)] = f; });

    let rows = students.map((s: any) => {
      const f = feeMap[String(s._id)];
      const last = f?.payments?.length ? f.payments[f.payments.length - 1] : null;
      return {
        studentId: String(s._id),
        name: `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.email,
        email: s.email,
        batchId: s.batchId ? String(s.batchId) : null,
        batchName: s.batchId ? (batchName[String(s.batchId)] || '—') : '—',
        totalAmount: f?.totalAmount || 0,
        registrationFee: f?.registrationFee || 0,
        studyMaterials: f?.studyMaterials || 0,
        otherCharges: f?.otherCharges || 0,
        discount: f?.discount || 0,
        discountReason: f?.discountReason || '',
        paidAmount: f?.paidAmount || 0,
        dueAmount: f?.dueAmount || 0,
        status: f?.status || 'pending',
        hasFee: !!f,
        dueDate: f?.dueDate || null,
        followupDate: f?.followupDate || null,
        installments: f?.installments || [],
        lastPaymentDate: last?.paymentDate || null,
        lastPaymentAmount: last?.amount || null,
      };
    });

    if (batch) rows = rows.filter(r => r.batchId === batch);
    if (status) rows = rows.filter(r => r.status === status);
    if (search) {
      const q = String(search).toLowerCase();
      rows = rows.filter(r => `${r.name} ${r.email}`.toLowerCase().includes(q));
    }

    const summary = {
      students: rows.length,
      totalBilled: rows.reduce((s, r) => s + r.totalAmount, 0),
      totalCollected: rows.reduce((s, r) => s + r.paidAmount, 0),
      totalDue: rows.reduce((s, r) => s + r.dueAmount, 0),
      paid: rows.filter(r => r.status === 'paid').length,
      partial: rows.filter(r => r.status === 'partial').length,
      pending: rows.filter(r => r.status === 'pending').length,
      overdue: rows.filter(r => r.status === 'overdue').length,
    };

    res.json({ success: true, data: rows, summary });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to load fees' });
  }
}

// PUT /fees/:studentId — set/adjust total fee & due date
export async function upsertFee(req: AuthRequest, res: Response) {
  try {
    const tenantId = req.tenantId!;
    const { studentId } = req.params;
    const { totalAmount, dueDate, discount, discountReason, followupDate, installments,
      registrationFee, studyMaterials, otherCharges } = req.body;

    const student = await User.findOne({ _id: studentId, tenantId }).select('batchId').lean() as any;
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    let fee = await Fee.findOne({ studentId, tenantId });
    if (!fee) fee = new Fee({ studentId, tenantId, batchId: student.batchId, totalAmount: 0, paidAmount: 0 });
    if (totalAmount !== undefined && totalAmount !== null) fee.totalAmount = Number(totalAmount);
    if (registrationFee !== undefined && registrationFee !== null) fee.registrationFee = Number(registrationFee) || 0;
    if (studyMaterials !== undefined && studyMaterials !== null) fee.studyMaterials = Number(studyMaterials) || 0;
    if (otherCharges !== undefined && otherCharges !== null) fee.otherCharges = Number(otherCharges) || 0;
    if (discount !== undefined && discount !== null) fee.discount = Number(discount) || 0;
    if (discountReason !== undefined) fee.discountReason = discountReason || undefined;
    if (dueDate !== undefined) fee.dueDate = dueDate ? new Date(dueDate) : undefined;
    if (followupDate !== undefined) fee.followupDate = followupDate ? new Date(followupDate) : undefined;
    if (Array.isArray(installments)) {
      fee.installments = installments
        .filter((i: any) => i && Number(i.amount) > 0)
        .map((i: any) => ({
          label: i.label || undefined,
          amount: Number(i.amount),
          dueDate: i.dueDate ? new Date(i.dueDate) : undefined,
          status: i.status === 'paid' ? 'paid' : 'pending',
          paidDate: i.paidDate ? new Date(i.paidDate) : undefined,
        })) as any;
    }
    if (student.batchId) fee.batchId = student.batchId;
    await fee.save();
    res.json({ success: true, data: fee });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to update fee' });
  }
}

// POST /fees/:studentId/payments — record a payment
export async function recordPayment(req: AuthRequest, res: Response) {
  try {
    const tenantId = req.tenantId!;
    const userId = req.user?.id;
    const { studentId } = req.params;
    const { amount, paymentMethod, transactionId, remarks, paymentDate, totalAmount } = req.body;
    const amt = Number(amount);
    if (!amt || amt <= 0) return res.status(400).json({ success: false, message: 'Valid amount is required' });

    const student = await User.findOne({ _id: studentId, tenantId }).select('batchId').lean() as any;
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    let fee = await Fee.findOne({ studentId, tenantId });
    if (!fee) {
      fee = new Fee({ studentId, tenantId, batchId: student.batchId, totalAmount: Number(totalAmount) || amt, paidAmount: 0 });
    } else if (totalAmount !== undefined && totalAmount !== null) {
      fee.totalAmount = Number(totalAmount);
    }
    fee.payments.push({
      amount: amt,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      paymentMethod: paymentMethod || 'cash',
      transactionId,
      remarks,
      receivedBy: userId as any,
    });
    fee.paidAmount = sumPayments(fee.payments);
    await fee.save();
    res.json({ success: true, data: fee, message: 'Payment recorded' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to record payment' });
  }
}

// DELETE /fees/:studentId/payments/:paymentId — reverse a payment entry
export async function deletePayment(req: AuthRequest, res: Response) {
  try {
    const tenantId = req.tenantId!;
    const { studentId, paymentId } = req.params;
    const fee = await Fee.findOne({ studentId, tenantId });
    if (!fee) return res.status(404).json({ success: false, message: 'Fee record not found' });
    (fee.payments as any) = fee.payments.filter((p: any) => String(p._id) !== paymentId);
    fee.paidAmount = sumPayments(fee.payments);
    await fee.save();
    res.json({ success: true, data: fee });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to delete payment' });
  }
}

// GET /fees/analytics — monthly collections + batch-wise pending + totals
export async function getFeeAnalytics(req: AuthRequest, res: Response) {
  try {
    const tenantId = req.tenantId!;
    const [fees, batches] = await Promise.all([
      Fee.find({ tenantId }).lean(),
      Batch.find({ tenantId }).select('name').lean(),
    ]);
    const batchName: Record<string, string> = {};
    batches.forEach((b: any) => { batchName[String(b._id)] = b.name; });

    const totalBilled = fees.reduce((s: number, f: any) => s + (f.totalAmount || 0), 0);
    const totalCollected = fees.reduce((s: number, f: any) => s + (f.paidAmount || 0), 0);
    const totalDue = fees.reduce((s: number, f: any) => s + (f.dueAmount || 0), 0);

    // Monthly collections — last 6 months
    const months: { key: string; label: string; amount: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }), amount: 0 });
    }
    const monthIdx: Record<string, number> = {};
    months.forEach((m, i) => { monthIdx[m.key] = i; });
    fees.forEach((f: any) => (f.payments || []).forEach((p: any) => {
      const d = new Date(p.paymentDate);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (key in monthIdx) months[monthIdx[key]].amount += p.amount || 0;
    }));

    // Batch-wise pending
    const batchAgg: Record<string, { batchId: string; batchName: string; due: number; students: number }> = {};
    fees.forEach((f: any) => {
      const bid = f.batchId ? String(f.batchId) : 'none';
      if (!batchAgg[bid]) batchAgg[bid] = { batchId: bid, batchName: bid === 'none' ? 'Unassigned' : (batchName[bid] || '—'), due: 0, students: 0 };
      batchAgg[bid].due += f.dueAmount || 0;
      if ((f.dueAmount || 0) > 0) batchAgg[bid].students += 1;
    });
    const batchWisePending = Object.values(batchAgg).filter(b => b.due > 0).sort((a, b) => b.due - a.due);

    res.json({
      success: true,
      data: {
        totalBilled, totalCollected, totalDue,
        collectedThisMonth: months[months.length - 1]?.amount || 0,
        monthly: months,
        batchWisePending,
        statusCounts: {
          paid: fees.filter((f: any) => f.status === 'paid').length,
          partial: fees.filter((f: any) => f.status === 'partial').length,
          pending: fees.filter((f: any) => f.status === 'pending').length,
          overdue: fees.filter((f: any) => f.status === 'overdue').length,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to load analytics' });
  }
}

// Gather all data for a student's branded receipt and render the HTML.
// Shared by the admin receipt route and the student self-service route.
async function generateStudentReceipt(tenantId: string, studentId: string): Promise<{ html: string; studentEmail: string; hasFee: boolean } | null> {
  const student = await User.findOne({ _id: studentId, tenantId })
    .select('firstName lastName email phone batchId').lean() as any;
  if (!student) return null;
  const fee = await Fee.findOne({ studentId, tenantId });

  // Batch → course + mentor details
  let batch: any = null, course: any = null, mentor = '';
  if (student.batchId) {
    batch = await Batch.findById(student.batchId)
      .select('name startDate endDate courseId instructors').lean() as any;
    if (batch?.courseId) {
      const Course = (await import('../models/Course')).default;
      course = await Course.findById(batch.courseId).select('title duration').lean() as any;
    }
    if (batch?.instructors?.length) {
      const m = await User.findById(batch.instructors[0]).select('firstName lastName').lean() as any;
      if (m) mentor = `${m.firstName || ''} ${m.lastName || ''}`.trim();
    }
  }

  // Assign a stable receipt number on first generation
  if (fee && !fee.receiptNumber) {
    const issued = await Fee.countDocuments({ tenantId, receiptNumber: { $exists: true, $ne: null } });
    fee.receiptNumber = `CB/${financialYear(new Date())}/${String(issued + 1).padStart(4, '0')}`;
    await fee.save();
  }

  const durUnit = course?.duration?.unit || 'months';
  const duration = course?.duration?.value
    ? `${course.duration.value} ${durUnit.charAt(0).toUpperCase()}${durUnit.slice(1)}`
    : '';

  const reg = fee?.registrationFee || 0, mat = fee?.studyMaterials || 0, oth = fee?.otherCharges || 0;
  const total = fee?.totalAmount || 0;
  const courseFee = Math.max(0, total - reg - mat - oth);

  const html = buildReceiptHtml({
    receiptNo: fee?.receiptNumber || `CB/${financialYear(new Date())}/DRAFT`,
    issueDate: new Date(),
    studentName: `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.email,
    mobile: student.phone || '',
    email: student.email,
    courseName: course?.title || '',
    batchName: batch?.name || '',
    batchStart: batch?.startDate || null,
    batchEnd: batch?.endDate || null,
    duration,
    mode: 'Offline',
    mentor: mentor || 'CodeBegun Expert Team',
    courseFee,
    registrationFee: reg,
    studyMaterials: mat,
    otherCharges: oth,
    totalAmount: total,
    discount: fee?.discount || 0,
    paidAmount: fee?.paidAmount || 0,
    dueAmount: fee?.dueAmount || 0,
    dueDate: fee?.dueDate || null,
    status: fee?.status || 'pending',
    payments: fee?.payments || [],
  });

  return { html, studentEmail: student.email, hasFee: !!fee };
}

// GET /fees/:studentId/receipt[?email=true] — printable bill, optionally emailed (admin)
export async function getReceipt(req: AuthRequest, res: Response) {
  try {
    const tenantId = req.tenantId!;
    const { studentId } = req.params;
    const sendEmail = String(req.query.email) === 'true';

    const result = await generateStudentReceipt(tenantId, studentId);
    if (!result) return res.status(404).json({ success: false, message: 'Student not found' });

    if (sendEmail) {
      const ok = await emailService.sendGenericEmail(result.studentEmail, `Fee Receipt — ${BRAND.name}`, result.html);
      return res.json({ success: ok, message: ok ? 'Receipt emailed' : 'Failed to send email', data: { html: result.html } });
    }
    res.json({ success: true, data: { html: result.html } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to generate receipt' });
  }
}

// GET /fees/me/receipt[?email=true] — student downloads / emails their own branded receipt
export async function getMyReceipt(req: AuthRequest, res: Response) {
  try {
    const tenantId = req.tenantId!;
    const studentId = req.user?.id;
    if (!studentId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const sendEmail = String(req.query.email) === 'true';

    const result = await generateStudentReceipt(tenantId, studentId);
    if (!result) return res.status(404).json({ success: false, message: 'Student not found' });
    if (!result.hasFee) return res.status(404).json({ success: false, message: 'No fee record found for your account yet' });

    if (sendEmail) {
      const ok = await emailService.sendGenericEmail(result.studentEmail, `Fee Receipt — ${BRAND.name}`, result.html);
      return res.json({ success: ok, message: ok ? 'Receipt emailed' : 'Failed to send email', data: { html: result.html } });
    }
    res.json({ success: true, data: { html: result.html } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to generate receipt' });
  }
}

function reminderHtml(orgName: string, name: string, due: number, dueDate?: Date) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1f2937">
    <div style="background:#0f2942;color:#fff;padding:18px 22px;border-radius:10px 10px 0 0"><h2 style="margin:0">${orgName}</h2></div>
    <div style="border:1px solid #e5e7eb;border-top:none;padding:20px 22px;border-radius:0 0 10px 10px">
      <p>Dear ${name},</p>
      <p>This is a friendly reminder that you have an outstanding fee balance of
         <strong style="color:#dc2626">${inr(due)}</strong>${dueDate ? `, due by <strong>${new Date(dueDate).toLocaleDateString('en-IN')}</strong>` : ''}.</p>
      <p>Please clear the pending amount at your earliest convenience. If you have already paid, kindly ignore this message.</p>
      <p style="color:#64748b;font-size:13px">— ${orgName}</p>
    </div>
  </div>`;
}

// POST /fees/:studentId/remind — email a fee reminder to one student
export async function sendReminder(req: AuthRequest, res: Response) {
  try {
    const tenantId = req.tenantId!;
    const { studentId } = req.params;
    const { student, fee } = await loadStudentAndFee(studentId, tenantId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    if (!fee || (fee.dueAmount || 0) <= 0) return res.status(400).json({ success: false, message: 'No pending dues for this student' });
    const tenant = await Tenant.findById(tenantId).select('name').lean() as any;
    const name = `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.email;
    const ok = await emailService.sendGenericEmail(student.email, `Fee Reminder — ${tenant?.name || 'Codebegun'}`, reminderHtml(tenant?.name || 'Codebegun', name, fee.dueAmount, fee.dueDate));
    res.json({ success: ok, message: ok ? 'Reminder sent' : 'Failed to send reminder' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to send reminder' });
  }
}

// POST /fees/remind-bulk — email reminders to all students with dues
export async function sendBulkReminders(req: AuthRequest, res: Response) {
  try {
    const tenantId = req.tenantId!;
    const { batch } = req.body || {};
    const tenant = await Tenant.findById(tenantId).select('name').lean() as any;
    const orgName = tenant?.name || 'Codebegun';
    const query: any = { tenantId, dueAmount: { $gt: 0 } };
    if (batch) query.batchId = batch;
    const fees = await Fee.find(query).populate('studentId', 'firstName lastName email').lean();
    let sent = 0;
    for (const f of fees as any[]) {
      const s = f.studentId;
      if (!s?.email) continue;
      const name = `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.email;
      const ok = await emailService.sendGenericEmail(s.email, `Fee Reminder — ${orgName}`, reminderHtml(orgName, name, f.dueAmount, f.dueDate));
      if (ok) sent++;
    }
    res.json({ success: true, message: `Reminders sent to ${sent} student(s)`, data: { sent, total: fees.length } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to send reminders' });
  }
}
