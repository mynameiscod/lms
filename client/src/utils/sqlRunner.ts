// In-browser SQLite via sql.js (SQLite compiled to WASM), loaded from CDN on
// first use — no npm dependency, no server. Each run uses a fresh in-memory DB.

let sqlPromise: Promise<any> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load SQLite engine'));
    document.head.appendChild(s);
  });
}

async function getSql(): Promise<any> {
  if (!sqlPromise) {
    sqlPromise = (async () => {
      await loadScript('https://sql.js.org/dist/sql-wasm.js');
      const initSqlJs = (window as any).initSqlJs;
      return initSqlJs({ locateFile: (f: string) => `https://sql.js.org/dist/${f}` });
    })();
  }
  return sqlPromise;
}

export interface SqlResult { columns: string[]; values: any[][]; }

/** Run a SQL script against a fresh in-memory SQLite DB; returns result sets. */
export async function runSql(sql: string): Promise<SqlResult[]> {
  const SQL = await getSql();
  const db = new SQL.Database();
  try {
    return db.exec(sql) as SqlResult[];
  } finally {
    db.close();
  }
}
