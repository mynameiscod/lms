import { Request, Response } from 'express';
import { verifyToken, suppress } from '../services/unsubscribeService';

/** Minimal branded confirmation page — this is opened from an email client, so it
 *  must stand alone with no app shell, no JS and no auth. */
const page = (title: string, body: string, ok = true) => `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} · CodeBegun</title></head>
<body style="margin:0;font-family:Arial,Helvetica,sans-serif;background:#eef4ff;padding:40px 16px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:36px 30px;text-align:center;box-shadow:0 18px 55px rgba(14,47,105,.10)">
    <div style="font-size:40px">${ok ? '✅' : '⚠️'}</div>
    <h1 style="font-size:22px;color:#0a2557;margin:14px 0 8px">${title}</h1>
    <p style="font-size:14px;line-height:1.65;color:#314464;margin:0">${body}</p>
    <a href="https://www.codebegun.com" style="display:inline-block;margin-top:22px;background:#0b1f56;color:#fff;text-decoration:none;padding:12px 22px;border-radius:9px;font-weight:700;font-size:14px">Back to CodeBegun</a>
  </div>
</body></html>`;

/**
 * GET /public/unsubscribe?e=<email>&t=<token>
 *
 * One click, no login, no confirmation step — that is the point of one-click
 * unsubscribe, and adding friction here is what gets mail marked as spam.
 */
export const unsubscribe = async (req: Request, res: Response) => {
  const email = String(req.query.e || '');
  const token = String(req.query.t || '');

  if (!email || !verifyToken(email, token)) {
    return res.status(400).send(page(
      'That link is not valid',
      'The unsubscribe link looks incomplete or altered. Please use the link exactly as it appears in the email, or write to <a href="mailto:support@codebegun.com" style="color:#0b1f56">support@codebegun.com</a> and we will remove you.',
      false,
    ));
  }

  try {
    await suppress(email, String(req.query.s || 'email'), 'user_click');
    res.send(page(
      'You have been unsubscribed',
      `We have removed <b>${email.replace(/[<>&]/g, '')}</b> from our mailing list. You will not receive further marketing email from CodeBegun.<br><br>Exam links and other messages you specifically asked for are unaffected.`,
    ));
  } catch {
    res.status(500).send(page(
      'Something went wrong',
      'We could not process that just now. Please write to <a href="mailto:support@codebegun.com" style="color:#0b1f56">support@codebegun.com</a> and we will remove you manually.',
      false,
    ));
  }
};
