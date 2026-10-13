import { useEffect, useState } from 'react';
import { portalApi } from '../api/employeesApi';
import { useAuth } from '../contexts/AuthContext';

export interface EmployeeStatus { loading: boolean; isEmployee: boolean; portalOnly: boolean; hasTeam: boolean }

type Cached = Omit<EmployeeStatus, 'loading'>;
const NOT: Cached = { isEmployee: false, portalOnly: false, hasTeam: false };
const keyFor = (id: string) => `employeeStatus:${id}`;

const readCache = (id: string): Cached | null => {
  try {
    const raw = sessionStorage.getItem(keyFor(id));
    return raw ? (JSON.parse(raw) as Cached) : null;
  } catch { return null; }
};
const writeCache = (id: string, v: Cached) => {
  try { sessionStorage.setItem(keyFor(id), JSON.stringify(v)); } catch { /* storage unavailable */ }
};

/** Is the signed-in user an employee (and do they manage a team)? Asked once per user per session. */
export function useEmployeeStatus(): EmployeeStatus {
  const { user } = useAuth();
  const userId = user?._id || '';
  const [state, setState] = useState<EmployeeStatus>(() => {
    const c = userId ? readCache(userId) : null;
    return c ? { loading: false, ...c } : { loading: !!userId, ...NOT };
  });

  useEffect(() => {
    if (!userId) { setState({ loading: false, ...NOT }); return undefined; }
    const cached = readCache(userId);
    if (cached) { setState({ loading: false, ...cached }); return undefined; }
    let live = true;
    setState({ loading: true, ...NOT });
    portalApi.exists()
      .then((r) => {
        const v: Cached = { isEmployee: !!r.isEmployee, portalOnly: !!r.portalOnly, hasTeam: !!r.hasTeam };
        writeCache(userId, v);
        if (live) setState({ loading: false, ...v });
      })
      .catch(() => { if (live) setState({ loading: false, ...NOT }); });
    return () => { live = false; };
  }, [userId]);

  return state;
}

export default useEmployeeStatus;
