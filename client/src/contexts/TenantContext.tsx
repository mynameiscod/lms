import React, { createContext, useContext, useState, useEffect } from 'react';
import { Tenant } from '../types';

/** Convert "#rrggbb" → "r, g, b" string Bootstrap needs for rgba() */
function hexToRgb(hex: string): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m
    ? `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}`
    : '102, 80, 216';
}

interface TenantContextType {
  tenant: Tenant | null;
  setTenant: (tenant: Tenant | null) => void;
  tenantId: string | null;
  setTenantId: (id: string | null) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    const storedTenantId = localStorage.getItem('tenantId');
    if (storedTenantId) {
      setTenantId(storedTenantId);
    }
  }, []);

  // Override Bootstrap 5 CSS variables so every bs-component re-themes automatically
  useEffect(() => {
    const b = tenant?.branding;
    const primary   = b?.primaryColor   || '#6650d8';
    const secondary = b?.secondaryColor || '#38bdf8';
    const root = document.documentElement;

    // Core Bootstrap palette vars
    root.style.setProperty('--bs-primary',          primary);
    root.style.setProperty('--bs-primary-rgb',       hexToRgb(primary));
    root.style.setProperty('--bs-secondary',         secondary);
    root.style.setProperty('--bs-secondary-rgb',     hexToRgb(secondary));

    // Link colours follow primary
    root.style.setProperty('--bs-link-color',        primary);
    root.style.setProperty('--bs-link-hover-color',  primary);

    // Portal title (non-Bootstrap — used in <title> / nav header)
    root.style.setProperty('--portal-title', `"${b?.portalTitle || 'LMS'}"`);
  }, [tenant]);

  const value: TenantContextType = {
    tenant,
    setTenant,
    tenantId,
    setTenantId: (id: string | null) => {
      setTenantId(id);
      if (id) {
        localStorage.setItem('tenantId', id);
      } else {
        localStorage.removeItem('tenantId');
      }
    }
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return context;
};