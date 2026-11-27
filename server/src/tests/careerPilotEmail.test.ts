import { registrationEmail, paymentEmail, passwordSetEmail } from '../services/careerPilotEmailService';

describe('the CareerPilot emails', () => {
  it('welcomes the member by name, says where to sign in, and is branded CareerPilot by CodeBegun', () => {
    const m = registrationEmail({ firstName: 'Asha', email: 'asha@example.com' });
    expect(m.subject).toContain('Asha');
    expect(m.subject).toContain('CareerPilot by CodeBegun');
    expect(m.html).toContain('/careerpilot/login');
    expect(m.html).toContain('asha@example.com');
    expect(m.text).toContain('/careerpilot/login');
    expect(m.html + m.text).not.toMatch(/Compass|CareerDNA/);
  });

  it('puts a member\'s name in the mail safely: markup in a name never reaches the page', () => {
    const m = registrationEmail({ firstName: '<script>alert(1)</script>', email: 'x@y.z' });
    expect(m.html).not.toContain('<script>');
    expect(m.html).toContain('&lt;script&gt;');
  });

  it('shows the receipt: amount in rupees, the date, the end date, and both ids', () => {
    const m = paymentEmail({
      user: { firstName: 'Ravi', email: 'r@x.com' }, amountPaise: 49900, orderId: 'order_ABC', paymentId: 'pay_XYZ',
      paidAt: '2026-10-24T10:00:00Z', validUntil: '2027-10-24T10:00:00Z',
    });
    expect(m.subject).toContain('₹499');
    expect(m.html).toContain('₹499');
    expect(m.html).toContain('pay_XYZ');
    expect(m.html).toContain('order_ABC');
    expect(m.html).toContain('2027');
    expect(m.text).toContain('Payment ID: pay_XYZ');
  });

  it('copes with a receipt that has no ids or end date', () => {
    const m = paymentEmail({ user: { firstName: 'Ravi' }, amountPaise: 150000 });
    expect(m.subject).toContain('₹1,500');
    expect(m.html).not.toContain('undefined');
    expect(m.text).not.toContain('undefined');
  });

  it('confirms a password without ever containing it, and says what to do if it was not them', () => {
    const set = passwordSetEmail({ firstName: 'Asha', email: 'asha@example.com', phone: '9876543210' }, false, '2026-10-30T10:00:00Z');
    expect(set.subject).toBe('Your CareerPilot password is set');
    expect(set.html).toContain('asha@example.com');
    expect(set.html).toContain('9876543210');
    expect(set.html).toMatch(/remember it/i);
    expect(set.html).toMatch(/Didn’t do this\?/);
    expect(set.html).toContain('/careerpilot/login');
    expect(set.text).toMatch(/remember it/i);
    const changed = passwordSetEmail({ firstName: 'Asha', email: 'asha@example.com' }, true);
    expect(changed.subject).toBe('Your CareerPilot password was changed');
    expect(changed.html).toContain('was changed');
  });
});
