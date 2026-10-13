import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import User from '../models/User';
import { EmployeeError, Actor, permsOf, employeeOfUser } from '../services/employeeService';
import { MAX_FILE_BYTES } from '../services/employeeService';

/** Small helpers shared by the four employee route files. */

export const t = (req: Request) => String((req as any).tenantId || '');
export const u = (req: Request) => String((req as any).user?.id || '');
export const actorOf = (req: Request): Actor => (req as any).user;

export const wrap = (tag: string, fn: (req: Request, res: Response) => Promise<any>) => async (req: Request, res: Response) => {
  try {
    const data = await fn(req, res);
    if (!res.headersSent) res.json({ success: true, data });
  } catch (e: any) {
    const status = e instanceof EmployeeError ? e.status : 500;
    if (status === 500) console.error(`[${tag}]`, e);
    if (!res.headersSent) res.status(status).json({ success: false, message: status === 500 ? 'Something went wrong' : e?.message });
  }
};

/** The signed-in person's display name, for approval trails. */
export async function nameOf(req: Request): Promise<string> {
  const user: any = await User.findById(u(req)).select('firstName lastName email').lean();
  return [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Someone';
}

export const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_BYTES } });

/** Wraps multer so a file that is too large answers politely instead of with a stack trace. */
export const oneFile = (field = 'file') => (req: Request, res: Response, next: NextFunction) =>
  upload.single(field)(req, res, (err: any) => {
    if (err) return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ success: false, message: err.code === 'LIMIT_FILE_SIZE' ? 'That file is larger than 5 MB.' : err.message });
    next();
  });

export { permsOf, employeeOfUser };
