/**
 * Help & Support in the browser: a ticket is never raised before the member confirms the review,
 * the assistant never shows a ticket number it did not get from the server, response targets
 * render only when set, and a crashing page shows a plain message instead of a stack.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const mockCreate = jest.fn();
const mockReply = jest.fn();
const mockChatAsk = jest.fn();
jest.mock('../../api/supportApi', () => {
  const actual = jest.requireActual('../../api/supportLabels');
  return {
    __esModule: true,
    ...actual,
    default: {
      create: (...a: unknown[]) => mockCreate(...a),
      reply: (...a: unknown[]) => mockReply(...a),
      chatAsk: (...a: unknown[]) => mockChatAsk(...a),
      chatSuggestions: () => Promise.resolve([]),
      chatSession: () => Promise.reject(new Error('none')),
      chatFeedback: () => Promise.resolve({}),
      chatClose: () => Promise.resolve({}),
    },
  };
});
const mockReport = jest.fn();
jest.mock('../../utils/clientMonitor', () => ({ lastFailedRequestId: () => undefined, reportError: (...a: unknown[]) => mockReport(...a) }));

/* eslint-disable import/first */
import TicketForm from './TicketForm';
import SupportChat from './SupportChat';
import { SlaBar } from './supportUi';
import AppErrorBoundary from '../../components/AppErrorBoundary';
/* eslint-enable import/first */

const Landing: React.FC = () => <div>Ticket page</div>;
const withRouter = (ui: React.ReactElement, start = '/careerpilot/support/new') => render(
  <MemoryRouter initialEntries={[start]}>
    <Routes>
      <Route path="/careerpilot/support/new" element={ui} />
      <Route path="/careerpilot/support/assistant" element={ui} />
      <Route path="/careerpilot/support/tickets/:id" element={<Landing />} />
    </Routes>
  </MemoryRouter>,
);

beforeEach(() => { mockCreate.mockReset(); mockReply.mockReset(); mockChatAsk.mockReset(); mockReport.mockReset(); try { sessionStorage.clear(); } catch { /* none */ } });

describe('TicketForm', () => {
  it('shows a review step and raises nothing until Submit', async () => {
    mockCreate.mockResolvedValue({ ticket: { id: 't1', ticketNumber: 'SUP-26-00001' }, duplicate: false });
    withRouter(<TicketForm basePath="/careerpilot/support" />);
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Day 3 will not open' } });
    fireEvent.change(screen.getByLabelText('What happened?'), { target: { value: 'It spins.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review ticket' }));
    expect(screen.getByText('Check your ticket before sending')).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Submit ticket/ }));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ subject: 'Day 3 will not open', diagnosticsConsent: false, diagnostics: undefined });
    await screen.findByText('Ticket page');
  });

  it('cannot be reviewed while required fields are empty', () => {
    withRouter(<TicketForm basePath="/careerpilot/support" />);
    expect(screen.getByRole('button', { name: 'Review ticket' })).toBeDisabled();
  });

  it('shares device details only when the box is ticked', async () => {
    mockCreate.mockResolvedValue({ ticket: { id: 't1', ticketNumber: 'SUP-26-00002' }, duplicate: false });
    withRouter(<TicketForm basePath="/careerpilot/support" />);
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Video black' } });
    fireEvent.change(screen.getByLabelText('What happened?'), { target: { value: 'Black screen.' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Review ticket' }));
    fireEvent.click(screen.getByRole('button', { name: /Submit ticket/ }));
    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    expect(mockCreate.mock.calls[0][0].diagnosticsConsent).toBe(true);
    expect(mockCreate.mock.calls[0][0].diagnostics).toMatch(/Screen:/);
  });

  it('says nothing was raised when sending fails', async () => {
    mockCreate.mockRejectedValue({ response: { status: 500, data: { message: 'Internal server error', requestId: 'abc-12345' } } });
    withRouter(<TicketForm basePath="/careerpilot/support" />);
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Broken' } });
    fireEvent.change(screen.getByLabelText('What happened?'), { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Review ticket' }));
    fireEvent.click(screen.getByRole('button', { name: /Submit ticket/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Nothing was raised.*reference abc-12345/);
  });
});

describe('SupportChat', () => {
  it('offers a draft, shows no ticket number, and raises a ticket only on Submit', async () => {
    mockChatAsk.mockResolvedValue({
      sessionId: 's1', content: "I couldn't confirm the exact solution from the available help documentation.", steps: [], sources: [],
      fallback: true, clarifying: false, handoff: false, offerTicket: true, general: true, turnIndex: 1,
      draft: { subject: 'Certificate wrong', module: 'other', category: 'technical', summary: '• Certificate wrong' },
    });
    mockCreate.mockResolvedValue({ ticket: { id: 't9', ticketNumber: 'SUP-26-00009' }, duplicate: false });
    withRouter(<SupportChat basePath="/careerpilot/support" />, '/careerpilot/support/assistant');
    fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'Certificate wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText('Raise a support ticket?')).toBeInTheDocument();
    expect(screen.queryByText(/SUP-\d/)).toBeNull();
    expect(mockCreate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Submit ticket' }));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1));
    expect(mockCreate.mock.calls[0][0]).toMatchObject({ chatSessionId: 's1', diagnosticsConsent: false });
    await screen.findByText('Ticket page');
  });

  it('shows the source of a grounded answer and labels it general guidance', async () => {
    mockChatAsk.mockResolvedValue({
      sessionId: 's2', content: 'Use Forgot password.', steps: ['Open sign-in', 'Choose Forgot password'], sources: [{ id: 'f1', title: 'How do I reset my password?' }],
      fallback: false, clarifying: false, handoff: false, offerTicket: false, general: true, turnIndex: 1,
    });
    withRouter(<SupportChat basePath="/careerpilot/support" />, '/careerpilot/support/assistant');
    fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'reset password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText('General guidance from help articles')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /How do I reset my password\?/ })).toBeInTheDocument();
    expect(screen.getByText('Choose Forgot password').tagName).toBe('LI');
  });

  it('offers a retry when the assistant is unavailable', async () => {
    mockChatAsk.mockRejectedValueOnce({ response: { status: 503, data: { message: 'The assistant is not available right now.' } } });
    withRouter(<SupportChat basePath="/careerpilot/support" />, '/careerpilot/support/assistant');
    fireEvent.change(screen.getByLabelText('Your question'), { target: { value: 'hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByRole('button', { name: /Retry/ })).toBeInTheDocument();
  });
});

describe('SlaBar', () => {
  it('renders nothing when no target is set', () => {
    const { container } = render(<SlaBar label="First response" clock={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a missed target', () => {
    render(<SlaBar label="First response" clock={{ targetMinutes: 60, dueAt: new Date().toISOString(), met: false, elapsedPct: 100 }} />);
    expect(screen.getByText('Past target')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });
});

describe('AppErrorBoundary', () => {
  it('shows a plain message instead of a stack, and reports the error', () => {
    const Boom = () => { throw new Error('render failed for a.b@x.test'); };
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<AppErrorBoundary><Boom /></AppErrorBoundary>);
    spy.mockRestore();
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong on this page');
    expect(screen.queryByText(/render failed/)).toBeNull();
    expect(mockReport).toHaveBeenCalledWith('react', expect.any(Error), expect.anything());
  });
});
