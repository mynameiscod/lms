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
const sumPayments = (payments: any[]) => (payments || []).reduce((s, p) => s + (p.amount || 0), 0);

// Build a printable HTML receipt / bill for a fee record
function buildReceiptHtml(opts: {
  orgName: string; studentName: string; email: string; batchName?: string;
  totalAmount: number; discount?: number; paidAmount: number; dueAmount: number; status: string;
  payments: any[];
}): string {
  const rows = (opts.payments || []).map((p, i) => `
    <tr>
      <td style="padding:8px;border:1px solid #e5e7eb">${i + 1}</td>
      <td style="padding:8px;border:1px solid #e5e7eb">${new Date(p.paymentDate).toLocaleDateString('en-IN')}</td>
      <td style="padding:8px;border:1px solid #e5e7eb">${inr(p.amount)}</td>
      <td style="padding:8px;border:1px solid #e5e7eb">${p.paymentMethod || '-'}</td>
      <td style="padding:8px;border:1px solid #e5e7eb">${p.transactionId || '-'}</td>
    </tr>`).join('');
  return `
  <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#1f2937">
    <div style="background:#0f2942;color:#fff;padding:20px 24px;border-radius:10px 10px 0 0">
      <h2 style="margin:0">${opts.orgName}</h2>
      <div style="opacity:.85;font-size:13px">Fee Receipt</div>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:none;padding:20px 24px;border-radius:0 0 10px 10px">
      <p><strong>Student:</strong> ${opts.studentName}<br/>
         <strong>Email:</strong> ${opts.email}${opts.batchName ? `<br/><strong>Batch:</strong> ${opts.batchName}` : ''}</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin:14px 0">
        <thead><tr style="background:#f1f5f9">
          <th style="padding:8px;border:1px solid #e5e7eb;text-align:left">#</th>
          <th style="padding:8px;border:1px solid #e5e7eb;text-align:left">Date</th>
          <th style="padding:8px;border:1px solid #e5e7eb;text-align:left">Amount</th>
          <th style="padding:8px;border:1px solid #e5e7eb;text-align:left">Method</th>
          <th style="padding:8px;border:1px solid #e5e7eb;text-align:left">Txn ID</th>
        </tr></thead>
        <tbody>${rows || '<tr><td colspan="5" style="padding:12px;text-align:center;border:1px solid #e5e7eb">No payments recorded</td></tr>'}</tbody>
      </table>
      <table style="width:100%;font-size:14px">
        <tr><td style="padding:4px 0">Total Fee</td><td style="text-align:right">${inr(opts.totalAmount)}</td></tr>
        ${opts.discount && opts.discount > 0 ? `<tr><td style="padding:4px 0;color:#7c3aed">Discount</td><td style="text-align:right;color:#7c3aed">- ${inr(opts.discount)}</td></tr>` : ''}
        <tr><td style="padding:4px 0;color:#16a34a">Paid</td><td style="text-align:right;color:#16a34a">${inr(opts.paidAmount)}</td></tr>
        <tr><td style="padding:4px 0;color:#dc2626"><strong>Due</strong></td><td style="text-align:right;color:#dc2626"><strong>${inr(opts.dueAmount)}</strong></td></tr>
        <tr><td style="padding:4px 0">Status</td><td style="text-align:right;text-transform:uppercase">${opts.status}</td></tr>
      </table>
      <p style="font-size:12px;color:#94a3b8;margin-top:16px">Generated on ${new Date().toLocaleString('en-IN')}</p>
    </div>
  </div>`;
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
    const { totalAmount, dueDate, discount, discountReason, followupDate, installments } = req.body;

    const student = await User.findOne({ _id: studentId, tenantId }).select('batchId').lean() as any;
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    let fee = await Fee.findOne({ studentId, tenantId });
    if (!fee) fee = new Fee({ studentId, tenantId, batchId: student.batchId, totalAmount: 0, paidAmount: 0 });
    if (totalAmount !== undefined && totalAmount !== null) fee.totalAmount = Number(totalAmount);
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

// GET /fees/:studentId/receipt[?email=true] — printable bill, optionally emailed
export async function getReceipt(req: AuthRequest, res: Response) {
  try {
    const tenantId = req.tenantId!;
    const { studentId } = req.params;
    const sendEmail = String(req.query.email) === 'true';
    const { student, fee } = await loadStudentAndFee(studentId, tenantId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    const tenant = await Tenant.findById(tenantId).select('name').lean() as any;
    const batch = student.batchId ? await Batch.findById(student.batchId).select('name').lean() as any : null;

    const html = buildReceiptHtml({
      orgName: tenant?.name || 'Codebegun',
      studentName: `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.email,
      email: student.email,
      batchName: batch?.name,
      totalAmount: fee?.totalAmount || 0,
      discount: fee?.discount || 0,
      paidAmount: fee?.paidAmount || 0,
      dueAmount: fee?.dueAmount || 0,
      status: fee?.status || 'pending',
      payments: fee?.payments || [],
    });

    if (sendEmail) {
      const ok = await emailService.sendGenericEmail(student.email, `Fee Receipt — ${tenant?.name || 'Codebegun'}`, html);
      return res.json({ success: ok, message: ok ? 'Receipt emailed' : 'Failed to send email', data: { html } });
    }
    res.json({ success: true, data: { html } });
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
