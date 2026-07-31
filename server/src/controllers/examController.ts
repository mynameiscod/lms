/**
 * Exam records — offline/external marks that staff enter by hand.
 *
 * The Exam model and the profile's Exams tab both already existed, but nothing in the
 * app could ever CREATE an exam: there was no controller and no route, so the tab was
 * permanently empty and staff had nowhere to record a placement test or a certification
 * result. This is that missing half.
 *
 * `percentage` is derived by a pre('save') hook on the model, so every write here goes
 * through .save() — findOneAndUpdate would skip the hook and silently store a stale
 * percentage next to fresh marks.
 */

import { Response } from 'express';
import mongoose from 'mongoose';
import Exam from '../models/Exam';
import User from '../models/User';
import { AuthRequest } from '../types/express';

const tenantOf = (req: AuthRequest) => String(req.user?.tenantId || '');

const asObjectId = (v: any) =>
  v && mongoose.Types.ObjectId.isValid(String(v)) ? new mongoose.Types.ObjectId(String(v)) : null;

/** Grade bands. Kept here (not in the model) so a tenant can be given its own later. */
function gradeFor(pct: number): string {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  if (pct >= 40) return 'E';
  return 'F';
}

/** Shared validation for create/update. Returns an error string, or null when valid. */
function validate(body: any, partial = false): string | null {
  const need = (k: string) => body[k] !== undefined && body[k] !== null && body[k] !== '';

  if (!partial || need('examName')) {
    if (!String(body.examName || '').trim()) return 'Exam name is required';
  }
  if (!partial || need('date')) {
    if (isNaN(new Date(body.date).getTime())) return 'A valid exam date is required';
  }
  if (!partial || need('maxScore')) {
    const max = Number(body.maxScore);
    if (!Number.isFinite(max) || max <= 0) return 'Max score must be greater than 0';
  }
  if (!partial || need('scoredMarks')) {
    const got = Number(body.scoredMarks);
    if (!Number.isFinite(got) || got < 0) return 'Scored marks cannot be negative';
  }
  // Only compare the two when we have both — on a partial update one may be absent.
  const max = Number(body.maxScore), got = Number(body.scoredMarks);
  if (Number.isFinite(max) && Number.isFinite(got) && got > max) {
    return 'Scored marks cannot exceed max score';
  }
  if (need('examType') && !['internal', 'external', 'certification', 'placement'].includes(body.examType)) {
    return 'Invalid exam type';
  }
  if (need('result') && !['pass', 'fail', 'pending'].includes(body.result)) {
    return 'Invalid result';
  }
  return null;
}

/** Fields every write applies, from a validated body. */
function applyFields(doc: any, body: any, actorId?: string) {
  if (body.examName !== undefined) doc.examName = String(body.examName).trim();
  if (body.examType !== undefined) doc.examType = body.examType;
  if (body.date !== undefined) doc.date = new Date(body.date);
  if (body.maxScore !== undefined) doc.maxScore = Number(body.maxScore);
  if (body.scoredMarks !== undefined) doc.scoredMarks = Number(body.scoredMarks);
  if (body.remarks !== undefined) doc.remarks = String(body.remarks || '').trim();
  if (body.batchId !== undefined) doc.batchId = asObjectId(body.batchId);

  const max = Number(doc.maxScore) || 0;
  const pct = max > 0 ? Math.round((Number(doc.scoredMarks) || 0) / max * 100) : 0;

  // Result: honour an explicit choice, otherwise derive from the pass mark (40%).
  doc.result = body.result ? body.result : (pct >= 40 ? 'pass' : 'fail');
  doc.grade = body.grade !== undefined && body.grade !== '' ? body.grade : gradeFor(pct);
  if (actorId && !doc.conductedBy) doc.conductedBy = asObjectId(actorId);
}

// GET /exams/student/:studentId — every exam recorded for one student.
export const listStudentExams = async (req: AuthRequest, res: Response) => {
  try {
    const tenantObjId = asObjectId(tenantOf(req));
    const studentObjId = asObjectId(req.params.studentId);
    if (!studentObjId) return res.status(400).json({ success: false, message: 'Invalid student ID' });

    const exams = await Exam.find({ studentId: studentObjId, ...(tenantObjId ? { tenantId: tenantObjId } : {}) })
      .populate('conductedBy', 'firstName lastName')
      .sort({ date: -1 })
      .lean();

    const scored = exams.filter((e: any) => e.result !== 'pending');
    res.json({
      success: true,
      data: {
        exams,
        summary: {
          total: exams.length,
          passed: exams.filter((e: any) => e.result === 'pass').length,
          failed: exams.filter((e: any) => e.result === 'fail').length,
          pending: exams.filter((e: any) => e.result === 'pending').length,
          averagePercentage: scored.length
            ? Math.round(scored.reduce((s: number, e: any) => s + (e.percentage || 0), 0) / scored.length)
            : 0,
        },
      },
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// POST /exams — record one exam result for one student.
export const createExam = async (req: AuthRequest, res: Response) => {
  try {
    const tenantObjId = asObjectId(tenantOf(req));
    if (!tenantObjId) return res.status(400).json({ success: false, message: 'Tenant not resolved' });

    const studentObjId = asObjectId(req.body.studentId);
    if (!studentObjId) return res.status(400).json({ success: false, message: 'Invalid student ID' });

    const err = validate(req.body);
    if (err) return res.status(400).json({ success: false, message: err });

    // The student must belong to this tenant — otherwise marks could be written onto
    // someone else's student by passing a foreign id.
    const student = await User.findOne({ _id: studentObjId, tenantId: tenantOf(req) }).select('batchId').lean();
    if (!student) return res.status(404).json({ success: false, message: 'Student not found in this organization' });

    const exam: any = new Exam({ studentId: studentObjId, tenantId: tenantObjId });
    applyFields(exam, { batchId: (student as any).batchId, ...req.body }, req.user?.id);
    await exam.save();

    res.status(201).json({ success: true, data: exam });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * POST /exams/bulk — record the SAME exam for many students in one go.
 *
 * This is how an exam actually happens: one paper, a room full of students, a
 * spreadsheet of marks. Entering them one at a time was the reason this never got used.
 * `results` is [{ studentId, scoredMarks, result?, remarks? }].
 */
export const createExamsBulk = async (req: AuthRequest, res: Response) => {
  try {
    const tenantObjId = asObjectId(tenantOf(req));
    if (!tenantObjId) return res.status(400).json({ success: false, message: 'Tenant not resolved' });

    const { results } = req.body;
    if (!Array.isArray(results) || !results.length) {
      return res.status(400).json({ success: false, message: 'results must be a non-empty array' });
    }
    if (results.length > 500) {
      return res.status(400).json({ success: false, message: 'Too many rows in one request (max 500)' });
    }

    const base = validate({ ...req.body, scoredMarks: 0 });
    if (base) return res.status(400).json({ success: false, message: base });

    // One query for every student in the batch, so a foreign id can't slip through.
    const ids = results.map((r: any) => asObjectId(r.studentId)).filter(Boolean) as mongoose.Types.ObjectId[];
    const students = await User.find({ _id: { $in: ids }, tenantId: tenantOf(req) }).select('batchId').lean();
    const known = new Map(students.map((s: any) => [String(s._id), s]));

    const created: any[] = [];
    const skipped: { studentId: string; reason: string }[] = [];

    for (const row of results) {
      const sid = String(row.studentId || '');
      const student = known.get(sid);
      if (!student) { skipped.push({ studentId: sid, reason: 'not a student in this organization' }); continue; }

      const rowErr = validate({ ...req.body, ...row }, false);
      if (rowErr) { skipped.push({ studentId: sid, reason: rowErr }); continue; }

      const exam: any = new Exam({ studentId: asObjectId(sid), tenantId: tenantObjId });
      applyFields(exam, { batchId: (student as any).batchId, ...req.body, ...row }, req.user?.id);
      await exam.save();
      created.push(exam);
    }

    res.status(201).json({
      success: true,
      data: { created: created.length, skipped, exams: created },
      message: `Recorded ${created.length} exam result(s)${skipped.length ? `, skipped ${skipped.length}` : ''}.`,
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// PUT /exams/:id — correct a previously entered result.
export const updateExam = async (req: AuthRequest, res: Response) => {
  try {
    const tenantObjId = asObjectId(tenantOf(req));
    const exam: any = await Exam.findOne({ _id: req.params.id, ...(tenantObjId ? { tenantId: tenantObjId } : {}) });
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found' });

    // Validate against the MERGED record, so "marks 90" against a stored maxScore of 50
    // is rejected even though the request only carried one of the two numbers.
    const merged = {
      examName: exam.examName, date: exam.date, maxScore: exam.maxScore,
      scoredMarks: exam.scoredMarks, examType: exam.examType, result: exam.result,
      ...req.body,
    };
    const err = validate(merged);
    if (err) return res.status(400).json({ success: false, message: err });

    applyFields(exam, req.body);
    await exam.save();

    res.json({ success: true, data: exam });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};

// DELETE /exams/:id
export const deleteExam = async (req: AuthRequest, res: Response) => {
  try {
    const tenantObjId = asObjectId(tenantOf(req));
    const gone = await Exam.findOneAndDelete({ _id: req.params.id, ...(tenantObjId ? { tenantId: tenantObjId } : {}) });
    if (!gone) return res.status(404).json({ success: false, message: 'Exam not found' });
    res.json({ success: true, message: 'Exam record deleted' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
};
