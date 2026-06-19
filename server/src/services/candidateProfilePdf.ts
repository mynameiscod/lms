import PDFDocument from 'pdfkit';
import mongoose from 'mongoose';
import User from '../models/User';
import StudentProfile from '../models/StudentProfile';
import Resume from '../models/Resume';

const NAVY = '#051D64';
const TEAL = '#359AAD';
const GREY = '#64748b';
const DARK = '#1f2937';

export interface OnePager { buffer: Buffer; fileName: string; studentName: string; }

const uniq = (arr: string[]) => Array.from(new Set(arr.filter(Boolean).map(s => s.trim()))).filter(Boolean);

/** Generate a branded one-page candidate profile PDF for a student. */
export async function generateOnePager(studentId: string, tenantId: string): Promise<OnePager> {
  const oid = (s: string) => new mongoose.Types.ObjectId(s);
  const [user, profile, resume] = await Promise.all([
    User.findOne({ _id: oid(studentId), tenantId: oid(tenantId) }).select('firstName lastName email phone').lean() as any,
    StudentProfile.findOne({ userId: oid(studentId), tenantId: oid(tenantId) }).lean() as any,
    Resume.findOne({ userId: oid(studentId), tenantId: oid(tenantId) }).sort({ updatedAt: -1 }).lean() as any,
  ]);
  if (!user) throw new Error('Student not found');

  const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Candidate';
  const sections = resume?.sections || {};
  const contact = sections.contact || {};
  const title = contact.title || profile?.courseInterest?.interestedCourse || 'Java Full Stack Developer';
  const summary = sections.summary || '';
  const skills = uniq([
    ...(sections.skills || []),
    ...((profile?.technicalBackground?.programmingLanguages) || []),
    ...((profile?.technicalBackground?.technologies) || []),
  ]);
  const projects: any[] = sections.projects || [];
  const education: any[] = sections.education || [];
  const phone = contact.phone || user.phone || '';
  const email = contact.email || user.email || '';

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks: Buffer[] = [];
  doc.on('data', (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>(resolve => doc.on('end', () => resolve(Buffer.concat(chunks))));

  const pageW = doc.page.width;

  // ── Header band ───────────────────────────────────────────────────────────
  doc.rect(0, 0, pageW, 110).fill(NAVY);
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(24).text(name, 50, 34);
  doc.fillColor('#bcd3e0').font('Helvetica').fontSize(12).text(title, 50, 66);
  doc.fillColor('#9fb6c8').fontSize(9).text(
    [email, phone].filter(Boolean).join('   |   '), 50, 86);
  // Brand mark
  doc.fillColor(TEAL).font('Helvetica-Bold').fontSize(13).text('CodeBegun', pageW - 160, 40, { width: 110, align: 'right' });
  doc.fillColor('#9fb6c8').font('Helvetica').fontSize(8).text('Verified Candidate', pageW - 160, 58, { width: 110, align: 'right' });

  doc.fillColor(DARK).y = 130;
  doc.x = 50;

  const heading = (t: string) => {
    doc.moveDown(0.8);
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(13).text(t);
    doc.moveTo(50, doc.y + 2).lineTo(pageW - 50, doc.y + 2).strokeColor(TEAL).lineWidth(1.5).stroke();
    doc.moveDown(0.5);
    doc.fillColor(DARK).font('Helvetica').fontSize(10);
  };

  if (summary) {
    heading('Profile Summary');
    doc.fillColor('#374151').fontSize(10).text(summary, { align: 'left' });
  }

  if (skills.length) {
    heading('Technical Skills');
    doc.fillColor('#374151').fontSize(10).text(skills.join('  •  '), { align: 'left' });
  }

  if (projects.length) {
    heading('Key Projects');
    projects.slice(0, 4).forEach(p => {
      doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(10.5).text(p.title || p.name || 'Project');
      if (p.techStack || p.tech) doc.fillColor(TEAL).font('Helvetica-Oblique').fontSize(9).text(p.techStack || p.tech);
      if (p.description) doc.fillColor('#374151').font('Helvetica').fontSize(9.5).text(p.description, { align: 'left' });
      doc.moveDown(0.3);
    });
  }

  if (education.length) {
    heading('Education');
    education.slice(0, 3).forEach(e => {
      doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(10).text(e.degree || e.qualification || 'Qualification');
      doc.fillColor(GREY).font('Helvetica').fontSize(9).text(
        [e.institution || e.school, e.year || e.yearOfPassing].filter(Boolean).join(' · '));
      doc.moveDown(0.2);
    });
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const fy = doc.page.height - 60;
  doc.moveTo(50, fy).lineTo(pageW - 50, fy).strokeColor('#e2e8f0').lineWidth(1).stroke();
  doc.fillColor(GREY).font('Helvetica').fontSize(8).text(
    'Shared by CodeBegun — Java Full Stack Training & Placements, Hyderabad  ·  hr@codebegun.com',
    50, fy + 8, { width: pageW - 100, align: 'center' });

  doc.end();
  const buffer = await done;
  return { buffer, fileName: `${name.replace(/[^a-zA-Z0-9]+/g, '_')}_CodeBegun.pdf`, studentName: name };
}
