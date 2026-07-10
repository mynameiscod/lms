import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { tenantApi } from '../api';

export interface TenantModules {
  courses: boolean;
  attendance: boolean;
  quizzes: boolean;
  assignments: boolean;
  classRecordings: boolean;
  codeAssessments: boolean;
  mockInterviews: boolean;
  placement: boolean;
  leads: boolean;
  marketing: boolean;
  feeManagement: boolean;
  thinkingLab: boolean;
  speakingPractice: boolean;
  resourceLibrary: boolean;
  careerPilot: boolean;
}

const DEFAULT_MODULES: TenantModules = {
  courses: true,
  attendance: true,
  quizzes: true,
  assignments: true,
  classRecordings: true,
  codeAssessments: true,
  mockInterviews: true,
  placement: true,
  leads: true,
  marketing: true,
  feeManagement: true,
  thinkingLab: true,
  speakingPractice: true,
  resourceLibrary: true,
  careerPilot: true,
};

const ALL_DISABLED_MODULES: TenantModules = {
  courses: false,
  attendance: false,
  quizzes: false,
  assignments: false,
  classRecordings: false,
  codeAssessments: false,
  mockInterviews: false,
  placement: false,
  leads: false,
  marketing: false,
  feeManagement: false,
  thinkingLab: false,
  speakingPractice: false,
  resourceLibrary: false,
  careerPilot: false,
};

interface TenantModulesContextType {
  modules: TenantModules;
  loading: boolean;
  isModuleEnabled: (key: keyof TenantModules) => boolean;
  refreshModules: () => Promise<void>;
}

const TenantModulesContext = createContext<TenantModulesContextType | undefined>(undefined);

export const TenantModulesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [modules, setModules] = useState<TenantModules>(ALL_DISABLED_MODULES);
  const [loading, setLoading] = useState(true);

  const fetchModules = useCallback(async () => {
    if (!user?.tenantId) return;
    setLoading(true);
    try {
      const response = await tenantApi.getTenantModules(user.tenantId);
      if (response.success && response.data) {
        // Merge with ALL_DISABLED so any missing key stays false (fail-closed)
        setModules({ ...ALL_DISABLED_MODULES, ...response.data });
      }
    } catch {
      // On error, keep all disabled (fail-closed — better than showing everything)
    } finally {
      setLoading(false);
    }
  }, [user?.tenantId]);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'SUPER_ADMIN') {
      // SUPER_ADMIN has no tenant; skip fetch and unlock all modules immediately
      setModules(DEFAULT_MODULES);
      setLoading(false);
    } else if (isAuthenticated && user?.tenantId) {
      fetchModules();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user?.role, user?.tenantId, fetchModules]);

  // SUPER_ADMIN bypasses module gates (they manage other tenants, not their own)
  const isModuleEnabled = useCallback((key: keyof TenantModules): boolean => {
    if (user?.role === 'SUPER_ADMIN') return true;
    return modules[key] === true;
  }, [user?.role, modules]);

  return (
    <TenantModulesContext.Provider value={{ modules, loading, isModuleEnabled, refreshModules: fetchModules }}>
      {children}
    </TenantModulesContext.Provider>
  );
};

export const useTenantModules = () => {
  const context = useContext(TenantModulesContext);
  if (!context) throw new Error('useTenantModules must be used within TenantModulesProvider');
  return context;
};
