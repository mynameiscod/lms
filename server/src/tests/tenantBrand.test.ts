jest.mock('../models/Tenant', () => ({ __esModule: true, default: {} }));
jest.mock('../services/settingsService', () => ({ isPlatformOwner: () => false }));

import { rebrand, CODEBEGUN_BRAND, Brand } from '../services/tenantBrand';

const college: Brand = {
  isPlatformOwner: false, name: "St. Mary's College", logoUrl: 'https://stmarys.edu/logo.png',
  supportEmail: 'office@stmarys.edu', supportPhone: '+91 90000 11111', address: 'Secunderabad', website: 'https://stmarys.edu', primaryColor: '#123456',
};

const mail = `<img src="https://platform.codebegun.com/assets/logo.png" alt="CodeBegun" />
<p>Welcome to CodeBegun. Open <a href="https://platform.codebegun.com/login">your dashboard</a>.</p>
<p>This is an automated message from CodeBegun Learning Management System.</p>
<p>hr@codebegun.com<br>contact@codebegun.com<br>+91 63010 99587<br>Madhapur, Hyderabad</p>
© 2026 CodeBegun · codebegun.com`;

describe('rebrand', () => {
  it('leaves CodeBegun\'s own mail exactly as it was', () => {
    expect(rebrand(mail, CODEBEGUN_BRAND)).toBe(mail);
  });

  it('puts the institute\'s name, logo and contact in a college\'s mail', () => {
    const out = rebrand(mail, college);
    expect(out).toContain("Welcome to St. Mary's College.");
    expect(out).toContain("automated message from St. Mary's College.");
    expect(out).toContain('<img src="https://stmarys.edu/logo.png"');
    expect(out).toContain('office@stmarys.edu');
    expect(out).toContain('+91 90000 11111');
    expect(out).toContain('Secunderabad');
    expect(out).toContain("© 2026 St. Mary's College");
    expect(out).not.toMatch(/hr@codebegun|contact@codebegun|63010 99587|Madhapur/);
  });

  it('keeps links working — URLs and domains are not rewritten', () => {
    const out = rebrand(mail, college);
    expect(out).toContain('href="https://platform.codebegun.com/login"');
    expect(out).toContain('codebegun.com');
  });

  it('drops the CodeBegun logo when the institute has none', () => {
    expect(rebrand(mail, { ...college, logoUrl: '' })).not.toContain('<img');
  });
});
