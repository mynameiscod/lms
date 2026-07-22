import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { batchApi } from '../api';
import { StudentFeatureKey } from '../config/studentFeatureCatalog';

/**
 * Per-batch module gate for the CURRENT student.
 *
 * A student's batch can turn OFF features that the tenant otherwise allows
 * (batch can only restrict — never re-enable). This context fetches the
 * disabled-feature set for the logged-in student's own batch and exposes a
 * simple `isBatchFeatureEnabled` used by the sidebar.
 *
 * Fail-open everywhere: non-students, students with no batch, or a fetch error
 * all resolve to "everything enabled" so the menu is never wrongly emptied.
 */
interface BatchModulesContextType {
  disabledFeatures: string[];
  loading: boolean;
  isBatchFeatureEnabled: (key: StudentFeatureKey) => boolean;
  refreshBatchModules: () => Promise<void>;
}

const BatchModulesContext = createContext<BatchModulesContextType | undefined>(undefined);

export const BatchModulesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [disabledFeatures, setDisabledFeatures] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchModules = useCallback(async () => {
    // Only students are batch-gated; everyone else sees everything.
    if (user?.role !== 'STUDENT') {
      setDisabledFeatures([]);
      return;
    }
    setLoading(true);
    try {
      const res = await batchApi.getMyBatchModules();
      setDisabledFeatures(res?.data?.disabledFeatures || []);
    } catch {
      setDisabledFeatures([]); // fail-open
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    if (isAuthenticated) fetchModules();
    else setDisabledFeatures([]);
  }, [isAuthenticated, fetchModules]);

  const isBatchFeatureEnabled = useCallback((key: StudentFeatureKey): boolean => {
    if (user?.role !== 'STUDENT') return true;
    return !disabledFeatures.includes(key);
  }, [user?.role, disabledFeatures]);

  return (
    <BatchModulesContext.Provider value={{ disabledFeatures, loading, isBatchFeatureEnabled, refreshBatchModules: fetchModules }}>
      {children}
    </BatchModulesContext.Provider>
  );
};

export const useBatchModules = () => {
  const context = useContext(BatchModulesContext);
  if (context === undefined) {
    throw new Error('useBatchModules must be used within BatchModulesProvider');
  }
  return context;
};
