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
  const [modules, setModules] = useState<TenantModules>(DEFAULT_MODULES);
  const [loading, setLoading] = useState(false);

  const fetchModules = useCallback(async () => {
    if (!user?.tenantId) return;
    setLoading(true);
    try {
      const response = await tenantApi.getTenantModules(user.tenantId);
      if (response.success && response.data) {
        setModules({ ...DEFAULT_MODULES, ...response.data });
      }
    } catch {
      // fallback to all-enabled defaults
    } finally {
      setLoading(false);
    }
  }, [user?.tenantId]);

  useEffect(() => {
    if (isAuthenticated && user?.tenantId) {
      fetchModules();
    }
  }, [isAuthenticated, user?.tenantId, fetchModules]);

  // SUPER_ADMIN bypasses module gates (they manage other tenants, not their own)
  const isModuleEnabled = useCallback((key: keyof TenantModules): boolean => {
    if (user?.role === 'SUPER_ADMIN') return true;
    return modules[key] ?? true;
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
