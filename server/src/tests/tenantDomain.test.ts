jest.mock('../models/Tenant', () => ({ __esModule: true, default: { exists: jest.fn(async () => null), updateOne: jest.fn(async () => ({})), findById: () => ({ select: () => ({ lean: async () => ({ branding: { customDomain: 'lms.college.edu' } }) }) }), findOne: () => ({ select: () => ({ lean: async () => null }) }) } }));
jest.mock('../services/settingsService', () => ({ getStr: (_k: string, f = '') => f, isPlatformOwner: () => false }));

import { normalizeHost, setDomain, tenantForHost, DomainError } from '../services/tenantDomainService';
import { rebrand, Brand } from '../services/tenantBrand';

const T = '6ac8c2f377f023a80d249660';

describe('custom domains', () => {
  it('normalises what people paste', () => {
    expect(normalizeHost('https://LMS.College.edu/login')).toBe('lms.college.edu');
    expect(normalizeHost('lms.college.edu:443')).toBe('lms.college.edu');
  });

  it('refuses junk and platform domains', async () => {
    await expect(setDomain(T, 'not a domain')).rejects.toBeInstanceOf(DomainError);
    await expect(setDomain(T, 'evil.codebegun.com')).rejects.toThrow(/own domain/);
    await expect(setDomain(T, 'lms.college.edu')).resolves.toMatchObject({ domain: 'lms.college.edu' });
  });

  it('the platform host, localhost and raw IPs never map to an institute', async () => {
    expect(await tenantForHost('platform.codebegun.com')).toBeNull();
    expect(await tenantForHost('localhost:3000')).toBeNull();
    expect(await tenantForHost('187.124.97.56')).toBeNull();
  });
});

describe('email links on a verified domain', () => {
  const b: Brand = { isPlatformOwner: false, name: 'College', logoUrl: 'https://college.edu/l.png', supportEmail: '', supportPhone: '', address: '', website: '', primaryColor: '#000000', baseUrl: 'https://lms.college.edu' };

  it('points platform links at the institute\'s domain — and still swaps the CodeBegun logo', () => {
    const out = rebrand('<img src="https://platform.codebegun.com/assets/logo.png"><a href="https://platform.codebegun.com/login">Log in</a>', b);
    expect(out).toContain('href="https://lms.college.edu/login"');
    expect(out).toContain('https://college.edu/l.png');
    expect(out).not.toContain('assets/logo.png');
  });
});
