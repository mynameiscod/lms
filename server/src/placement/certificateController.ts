import { Response } from 'express';
import PDFDocument from 'pdfkit';
import { AuthenticatedRequest } from '../types';
import PlacementDrive from '../models/PlacementDrive';
import CollegeMembership from '../models/CollegeMembership';
import User from '../models/User';

// GET /api/v1/college/placement/:driveId/certificate/:userId
export const downloadCertificate = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { driveId, userId } = req.params;
    const tenantId = req.user!.tenantId;

    // Must be the student themselves or an admin
    const requesterId = req.user!.id;
    const isAdmin = req.user!.role !== 'STUDENT';
    if (!isAdmin && requesterId !== userId) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const drive = await PlacementDrive.findOne({ _id: driveId, tenantId }).lean() as any;
    if (!drive) return res.status(404).json({ success: false, message: 'Drive not found' });

    // Verify placed status
    const statusMap: Record<string, string> = drive.applicantStatuses instanceof Map
      ? Object.fromEntries(drive.applicantStatuses)
      : (drive.applicantStatuses || {});
    if (statusMap[userId] !== 'placed') {
      return res.status(403).json({ success: false, message: 'Student is not placed in this drive' });
    }

    const [userDoc, membership] = await Promise.all([
      User.findById(userId).select('firstName lastName email').lean() as any,
      CollegeMembership.findOne({ userId, tenantId })
        .populate<{ departmentId: { name: string; code: string } }>('departmentId', 'name code')
        .lean() as any
    ]);
    if (!userDoc) return res.status(404).json({ success: false, message: 'User not found' });

    const studentName = `${userDoc.firstName} ${userDoc.lastName}`;
    const department = membership?.departmentId?.name || 'N/A';
    const driveDate = drive.driveDate ? new Date(drive.driveDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A';
    const ctcText = drive.ctcMin && drive.ctcMax ? `₹${drive.ctcMin}–${drive.ctcMax} LPA` : drive.ctcMin ? `₹${drive.ctcMin} LPA` : 'As per offer';

    // Build PDF
    const doc = new PDFDocument({ size: 'A4', margin: 60 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="placement-certificate-${userId}.pdf"`);
    doc.pipe(res);

    // ── Border ──────────────────────────────────────────────────────────────────
    doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60).stroke('#1a56db');
    doc.rect(35, 35, doc.page.width - 70, doc.page.height - 70).stroke('#1a56db');

    // ── Header ───────────────────────────────────────────────────────────────────
    doc.fontSize(28).fillColor('#1a56db').font('Helvetica-Bold').text('PLACEMENT CERTIFICATE', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor('#6b7280').font('Helvetica').text('This is to certify that', { align: 'center' });

    doc.moveDown(0.8);

    // ── Student name ─────────────────────────────────────────────────────────────
    doc.fontSize(26).fillColor('#111827').font('Helvetica-Bold').text(studentName, { align: 'center', underline: true });
    doc.moveDown(0.4);
    doc.fontSize(11).fillColor('#6b7280').font('Helvetica').text(`Department of ${department}`, { align: 'center' });

    doc.moveDown(0.8);
    doc.fontSize(13).fillColor('#374151').font('Helvetica')
      .text('has been successfully selected and placed at', { align: 'center' });

    doc.moveDown(0.5);
    doc.fontSize(22).fillColor('#059669').font('Helvetica-Bold').text(drive.companyName, { align: 'center' });
    doc.moveDown(0.2);
    doc.fontSize(14).fillColor('#374151').font('Helvetica').text(`for the role of`, { align: 'center' });
    doc.moveDown(0.2);
    doc.fontSize(17).fillColor('#1a56db').font('Helvetica-Bold').text(drive.role, { align: 'center' });

    doc.moveDown(1.5);

    // ── Details table ─────────────────────────────────────────────────────────────
    const detailsY = doc.y;
    const colW = (doc.page.width - 120) / 2;
    const addDetail = (label: string, value: string, x: number, y: number) => {
      doc.fontSize(9).fillColor('#9ca3af').font('Helvetica').text(label, x, y);
      doc.fontSize(12).fillColor('#111827').font('Helvetica-Bold').text(value, x, y + 13, { width: colW - 10 });
    };

    addDetail('Drive Date', driveDate, 60, detailsY);
    addDetail('CTC Offered', ctcText, 60 + colW, detailsY);
    addDetail('Drive Type', (drive.driveType || 'On-Campus').toUpperCase(), 60, detailsY + 45);
    addDetail('Certificate Issued', new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }), 60 + colW, detailsY + 45);

    doc.moveDown(4);

    // ── Footer separator ─────────────────────────────────────────────────────────
    const footerY = doc.page.height - 120;
    doc.moveTo(60, footerY).lineTo(doc.page.width - 60, footerY).stroke('#e5e7eb');

    doc.fontSize(10).fillColor('#6b7280').font('Helvetica')
      .text('Authorized by Placement Cell', 60, footerY + 15)
      .text('CodeBegun Learning Management System', 60, footerY + 30);

    doc.fontSize(9).fillColor('#9ca3af')
      .text(
        `Generated on ${new Date().toLocaleString('en-IN')} · This is a computer-generated certificate.`,
        60, footerY + 50,
        { align: 'center', width: doc.page.width - 120 }
      );

    doc.end();
  } catch (err) {
    console.error('[CertificateController]', err);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to generate certificate' });
    }
  }
};
