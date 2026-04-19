import { Request, Response } from 'express';
import sharp from 'sharp';
import QuizAttempt from '../models/QuizAttempt';
import Quiz from '../models/Quiz';
import User from '../models/User';
import Submission from '../models/Submission';
import Assignment from '../models/Assignment';
import CodeSnippetSubmission from '../models/CodeSnippetSubmission';
import CodeSnippetAssessment from '../models/CodeSnippetAssessment';

export const getQuizResult = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const attempt = await QuizAttempt.findOne({ shareToken: token });
    if (!attempt) {
      res.status(404).json({ success: false, message: 'Certificate not found' });
      return;
    }

    const [quiz, student] = await Promise.all([
      Quiz.findById(attempt.quizId).select('title'),
      User.findById(attempt.studentId).select('firstName lastName'),
    ]);

    res.json({
      success: true,
      data: {
        type: 'quiz',
        title: (quiz as any)?.title || 'Quiz',
        studentName: student
          ? `${(student as any).firstName} ${(student as any).lastName}`.trim()
          : 'Student',
        score: attempt.obtainedMarks ?? 0,
        totalMarks: attempt.totalMarks,
        percentage: attempt.percentage ?? 0,
        passed: attempt.passed ?? false,
        submittedAt: attempt.submittedAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load certificate' });
  }
};

export const getAssignmentResult = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const submission = await Submission.findOne({ shareToken: token })
      .populate('assignment', 'title totalPoints')
      .populate('student', 'firstName lastName');

    if (!submission) {
      res.status(404).json({ success: false, message: 'Certificate not found' });
      return;
    }

    const assignment = submission.assignment as any;
    const student = submission.student as any;

    res.json({
      success: true,
      data: {
        type: 'assignment',
        title: assignment?.title || 'Assignment',
        studentName: student
          ? `${student.firstName} ${student.lastName}`.trim()
          : 'Student',
        score: submission.finalScore ?? 0,
        totalPoints: assignment?.totalPoints ?? 0,
        percentage: submission.percentage ?? 0,
        isPassing: submission.isPassing,
        status: submission.status,
        submittedAt: submission.submittedAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load certificate' });
  }
};

export const getSnippetResult = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const submission = await CodeSnippetSubmission.findOne({ shareToken: token })
      .populate('assessmentId', 'title totalMarks')
      .populate('studentId', 'firstName lastName');

    if (!submission) {
      res.status(404).json({ success: false, message: 'Certificate not found' });
      return;
    }

    const assessment = submission.assessmentId as any;
    const student = submission.studentId as any;
    const total = assessment?.totalMarks ?? 0;
    const score = submission.totalMarksAwarded ?? 0;

    res.json({
      success: true,
      data: {
        type: 'snippet',
        title: assessment?.title || 'Code Assessment',
        studentName: student
          ? `${student.firstName} ${student.lastName}`.trim()
          : 'Student',
        score,
        totalMarks: total,
        percentage: total > 0 ? Math.round((score / total) * 100) : 0,
        status: submission.status,
        submittedAt: submission.submittedAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load certificate' });
  }
};

// Generate OG image as SVG for social media previews
export const getOgImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { type, token } = req.params;
    let studentName = 'Student';
    let title = 'Assessment';
    let percentage = 0;
    let score = '0/0';
    let isPassing = false;
    let dateStr = '';

    if (type === 'assignment') {
      const submission = await Submission.findOne({ shareToken: token })
        .populate('assignment', 'title totalPoints')
        .populate('student', 'firstName lastName');
      if (submission) {
        const asn = submission.assignment as any;
        const stu = submission.student as any;
        studentName = stu ? `${stu.firstName} ${stu.lastName}`.trim() : 'Student';
        title = asn?.title || 'Assignment';
        percentage = submission.percentage ?? 0;
        isPassing = submission.isPassing ?? false;
        score = `${submission.finalScore ?? 0} / ${asn?.totalPoints ?? 0}`;
        dateStr = submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
      }
    } else if (type === 'quiz') {
      const attempt = await QuizAttempt.findOne({ shareToken: token });
      if (attempt) {
        const [quiz, stu] = await Promise.all([
          Quiz.findById(attempt.quizId).select('title'),
          User.findById(attempt.studentId).select('firstName lastName')
        ]);
        studentName = stu ? `${(stu as any).firstName} ${(stu as any).lastName}`.trim() : 'Student';
        title = (quiz as any)?.title || 'Quiz';
        percentage = attempt.percentage ?? 0;
        isPassing = attempt.passed ?? false;
        score = `${attempt.obtainedMarks ?? 0} / ${attempt.totalMarks ?? 0}`;
        dateStr = attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
      }
    } else if (type === 'snippet') {
      const sub = await CodeSnippetSubmission.findOne({ shareToken: token })
        .populate('assessmentId', 'title totalMarks')
        .populate('studentId', 'firstName lastName');
      if (sub) {
        const asmt = sub.assessmentId as any;
        const stu = sub.studentId as any;
        studentName = stu ? `${stu.firstName} ${stu.lastName}`.trim() : 'Student';
        title = asmt?.title || 'Code Assessment';
        const total = asmt?.totalMarks ?? 0;
        const sc = sub.totalMarksAwarded ?? 0;
        percentage = total > 0 ? Math.round((sc / total) * 100) : 0;
        isPassing = percentage >= 50;
        score = `${sc} / ${total}`;
        dateStr = sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
      }
    }

    // Escape XML special characters
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const passColor = isPassing ? '#10b981' : '#ef4444';
    const passText = isPassing ? 'PASSED' : 'NOT PASSED';
    const scoreBarWidth = Math.max(percentage * 7.2, 0); // 720px max for the bar
    const font = 'DejaVu Sans, sans-serif';

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a1628"/>
      <stop offset="100%" style="stop-color:#1a2744"/>
    </linearGradient>
    <linearGradient id="accent" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#005897"/>
      <stop offset="100%" style="stop-color:#0088cc"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="1200" height="6" fill="url(#accent)"/>
  
  <!-- Logo area -->
  <text x="80" y="75" font-family="${font}" font-size="28" font-weight="700" fill="#0088cc">Codebegun</text>
  <text x="1120" y="75" font-family="${font}" font-size="18" fill="#64748b" text-anchor="end">Certificate of Completion</text>
  
  <!-- Divider -->
  <line x1="80" y1="100" x2="1120" y2="100" stroke="#1e3a5f" stroke-width="1"/>
  
  <!-- Student name -->
  <text x="80" y="165" font-family="${font}" font-size="20" fill="#94a3b8">This certifies that</text>
  <text x="80" y="215" font-family="${font}" font-size="42" font-weight="700" fill="#ffffff">${esc(studentName)}</text>
  
  <!-- Assignment title -->
  <text x="80" y="275" font-family="${font}" font-size="20" fill="#94a3b8">has completed the ${esc(type)}</text>
  <text x="80" y="320" font-family="${font}" font-size="32" font-weight="600" fill="#e2e8f0">${esc(title.length > 45 ? '"' + title.substring(0, 42) + '..."' : '"' + title + '"')}</text>
  
  <!-- Score section -->
  <rect x="80" y="365" width="1040" height="120" rx="12" fill="#0f1f38" stroke="#1e3a5f" stroke-width="1"/>
  
  <!-- Percentage -->
  <text x="160" y="420" font-family="${font}" font-size="52" font-weight="700" fill="${passColor}">${percentage}%</text>
  <text x="160" y="455" font-family="${font}" font-size="16" fill="#94a3b8">Score</text>
  
  <!-- Score bar -->
  <rect x="340" y="400" width="720" height="20" rx="10" fill="#1e3a5f"/>
  <rect x="340" y="400" width="${scoreBarWidth}" height="20" rx="10" fill="${passColor}"/>
  
  <!-- Marks -->
  <text x="340" y="460" font-family="${font}" font-size="18" fill="#e2e8f0">${esc(score)} points</text>
  
  <!-- Pass/Fail badge -->
  <rect x="920" y="430" width="140" height="36" rx="18" fill="${passColor}" opacity="0.15"/>
  <text x="990" y="455" font-family="${font}" font-size="16" font-weight="700" fill="${passColor}" text-anchor="middle">${passText}</text>
  
  <!-- Footer -->
  <line x1="80" y1="520" x2="1120" y2="520" stroke="#1e3a5f" stroke-width="1"/>
  <text x="80" y="560" font-family="${font}" font-size="16" fill="#64748b">${esc(dateStr)}</text>
  <text x="1120" y="560" font-family="${font}" font-size="16" fill="#64748b" text-anchor="end">platform.codebegun.com</text>
  
  <!-- Decorative circles -->
  <circle cx="1150" cy="180" r="100" fill="#005897" opacity="0.05"/>
  <circle cx="1100" cy="250" r="60" fill="#0088cc" opacity="0.05"/>
</svg>`;

    const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(pngBuffer);
  } catch {
    res.status(500).send('');
  }
};
