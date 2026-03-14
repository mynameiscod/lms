import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { tenantApi } from '../api';

export interface StudentFeatures {
  dashboard: boolean;
  myCourse: boolean;
  attendance: boolean;
  quizzes: boolean;
  assignments: boolean;
  mockInterviews: boolean;
}

const DEFAULT_FEATURES: StudentFeatures = {
  dashboard: true,
  myCourse: true,
  attendance: true,
  quizzes: true,
  assignments: true,
  mockInterviews: true
};

interface StudentFeaturesContextType {
  features: StudentFeatures;
  loading: boolean;
  isFeatureEnabled: (key: keyof StudentFeatures) => boolean;
  refreshFeatures: () => Promise<void>;
}

const StudentFeaturesContext = createContext<StudentFeaturesContextType | undefined>(undefined);

export const StudentFeaturesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [features, setFeatures] = useState<StudentFeatures>(DEFAULT_FEATURES);
  const [loading, setLoading] = useState(false);

  const fetchFeatures = useCallback(async () => {
    if (!user?.tenantId) return;
    setLoading(true);
    try {
      const response = await tenantApi.getStudentFeatures(user.tenantId);
      if (response.success && response.data) {
        setFeatures({ ...DEFAULT_FEATURES, ...response.data });
      }
    } catch (error) {
      console.error('Failed to fetch student features:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.tenantId]);

  useEffect(() => {
    if (isAuthenticated && user?.tenantId) {
      fetchFeatures();
    }
  }, [isAuthenticated, user?.tenantId, fetchFeatures]);

  const isFeatureEnabled = useCallback((key: keyof StudentFeatures): boolean => {
    // Non-student roles always see everything
    if (user?.role !== 'STUDENT') return true;
    return features[key] ?? true;
  }, [user?.role, features]);

  return (
    <StudentFeaturesContext.Provider value={{ features, loading, isFeatureEnabled, refreshFeatures: fetchFeatures }}>
      {children}
    </StudentFeaturesContext.Provider>
  );
};

export const useStudentFeatures = () => {
  const context = useContext(StudentFeaturesContext);
  if (context === undefined) {
    throw new Error('useStudentFeatures must be used within StudentFeaturesProvider');
  }
  return context;
};
