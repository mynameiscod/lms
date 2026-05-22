import fs from 'fs';
import path from 'path';

const LOG_DIR = process.env.NODE_ENV === 'production' ? '/app/logs' : path.join(__dirname, '../../../logs');
const ERROR_LOG = path.join(LOG_DIR, 'api-errors.log');
const ALL_LOG   = path.join(LOG_DIR, 'api-all.log');
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB per file before rotation

try { fs.mkdirSync(LOG_DIR, { recursive: true }); } catch {}

function rotateIfNeeded(file: string) {
  try {
    if (fs.existsSync(file) && fs.statSync(file).size > MAX_BYTES) {
      fs.renameSync(file, file.replace('.log', `_${Date.now()}.log`));
    }
  } catch {}
}

function write(level: 'INFO' | 'WARN' | 'ERROR', message: string, meta?: Record<string, any>) {
  const ts  = new Date().toISOString();
  const tag = `[${ts}] [${level}]`;
  const metaStr = meta ? ' ' + JSON.stringify(meta) : '';
  const line = `${tag} ${message}${metaStr}\n`;

  // Always write to stdout so `docker-compose logs server` picks it up
  process.stdout.write(line);

  // Persist to file
  try {
    rotateIfNeeded(ALL_LOG);
    fs.appendFileSync(ALL_LOG, line);
    if (level === 'ERROR' || level === 'WARN') {
      rotateIfNeeded(ERROR_LOG);
      fs.appendFileSync(ERROR_LOG, line);
    }
  } catch {}
}

export const logger = {
  info:  (msg: string, meta?: Record<string, any>) => write('INFO',  msg, meta),
  warn:  (msg: string, meta?: Record<string, any>) => write('WARN',  msg, meta),
  error: (msg: string, meta?: Record<string, any>) => write('ERROR', msg, meta),
  /** Path to error-only log (for the admin UI endpoint) */
  errorLogFile: ERROR_LOG,
  allLogFile:   ALL_LOG,
  logDir:       LOG_DIR,
};
