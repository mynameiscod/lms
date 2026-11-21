/**
 * Live "lead assigned to you" alert: joins the private room, shows the card, opens the lead, and
 * refreshes the bell. Students never get it.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';

const mockHandlers: Record<string, (p?: any) => void> = {};
const mockSocket = {
  connected: true,
  emit: jest.fn(),
  on: (ev: string, fn: any) => { mockHandlers[ev] = fn; },
  off: (ev: string) => { delete mockHandlers[ev]; },
};
let mockRole = 'STAFF';
const mockNavigate = jest.fn();
jest.mock('../../contexts/SocketContext', () => ({ useSocket: () => ({ socket: mockSocket }) }));
jest.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { role: mockRole } }) }));
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }));

// eslint-disable-next-line import/first
import LeadAssignedAlert from './index';

const mount = () => {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() => { root.render(<LeadAssignedAlert />); });
  return { el, root };
};

beforeEach(() => { Object.keys(mockHandlers).forEach(k => delete mockHandlers[k]); mockSocket.emit.mockClear(); mockNavigate.mockClear(); });

it('shows the alert for staff and opens the lead', () => {
  mockRole = 'STAFF';
  const refresh = jest.fn();
  window.addEventListener('cb:notifications-refresh', refresh);
  const { el, root } = mount();
  expect(mockSocket.emit).toHaveBeenCalledWith('me:join');
  act(() => { mockHandlers['lead:assigned']({ title: '📞 New lead assigned: Sravani', body: 'Call them now.', link: '/leads/abc' }); });
  expect(el.textContent).toContain('New lead assigned: Sravani');
  expect(refresh).toHaveBeenCalled();
  const btn = el.querySelector('.laa-go') as HTMLButtonElement;
  expect(btn.textContent).toContain('Open lead');
  act(() => { btn.click(); });
  expect(mockNavigate).toHaveBeenCalledWith('/leads/abc');
  expect(el.querySelector('.laa-card')).toBeNull();
  act(() => { root.unmount(); });
  window.removeEventListener('cb:notifications-refresh', refresh);
});

it('never listens for a student', () => {
  mockRole = 'STUDENT';
  const { root } = mount();
  expect(mockSocket.emit).not.toHaveBeenCalled();
  expect(mockHandlers['lead:assigned']).toBeUndefined();
  act(() => { root.unmount(); });
});
