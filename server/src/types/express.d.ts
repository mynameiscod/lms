import { Request } from 'express';
import { Multer } from 'multer';

declare global {
  namespace Express {
    interface Request {
      file?: Multer.File;
      files?: Multer.File[];
    }
  }
}

export interface AuthRequest extends Request {
  user?: any;
  file?: Multer.File;
  files?: Multer.File[];
}
