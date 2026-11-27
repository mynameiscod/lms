import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';
import { studentRulesApi, ProfileGate } from '../api/studentRulesApi';

/**
 * Student Rules → Profile gate, on the client. When the institute requires a complete profile and a
 * student's is not, every page sends them to /profile (the server refuses the APIs too, with
 * PROFILE_INCOMPLETE). The profile page calls refresh() after each save, so finishing the profile
 * unlocks the LMS at once.
 */

interface Ctx { gate: ProfileGate | null; blocked: boolean; refresh: () => Promise<void> }
const ProfileGateContext = createContext<Ctx>({ gate: null, blocked: false, refresh: async () => undefined });

export const PROFILE_GATE_REFRESH = 'profile-gate-refresh';

export const ProfileGateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [gate, setGate] = useState<ProfileGate | null>(null);
  const isStudent = isAuthenticated && user?.role === 'STUDENT';

  const refresh = useCallback(async () => {
    if (!isStudent) { setGate(null); return; }
    try { setGate((await studentRulesApi.me()).profileGate); } catch { /* keep the last known state */ }
  }, [isStudent]);

  useEffect(() => { refresh(); }, [refresh]);

  // Any API answering PROFILE_INCOMPLETE (e.g. the gate was switched on while the student was in the app).
  useEffect(() => {
    if (!isStudent) return;
    const onRefresh = () => { refresh(); };
    window.addEventListener(PROFILE_GATE_REFRESH, onRefresh);
    const id = axios.interceptors.response.use(undefined, (err) => {
      if (err?.response?.status === 403 && err?.response?.data?.code === 'PROFILE_INCOMPLETE') window.dispatchEvent(new Event(PROFILE_GATE_REFRESH));
      return Promise.reject(err);
    });
    return () => { window.removeEventListener(PROFILE_GATE_REFRESH, onRefresh); axios.interceptors.response.eject(id); };
  }, [isStudent, refresh]);

  const blocked = !!(isStudent && gate?.enabled && !gate.complete);
  return <ProfileGateContext.Provider value={{ gate, blocked, refresh }}>{children}</ProfileGateContext.Provider>;
};

export const useProfileGate = () => useContext(ProfileGateContext);

/** Pages a gated student can still open. */
export const profileGateOpenPath = (pathname: string) =>
  pathname === '/profile' || pathname.startsWith('/profile/') || pathname.startsWith('/attendance/check-in');
