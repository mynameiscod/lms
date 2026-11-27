import React from 'react';
import { reportError } from '../utils/clientMonitor';

/**
 * The last line of defence for a page that throws while rendering. The member sees a plain
 * message with two ways forward — reload, or report it — and never a stack trace. The error itself
 * goes to the support monitor (utils/clientMonitor), scrubbed.
 */
interface State { failed: boolean }

export default class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    reportError('react', error, { stack: `${error?.stack || ''}\n${info?.componentStack || ''}`.split('\n').slice(0, 6).join('\n') });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const member = window.location.pathname.startsWith('/careerpilot');
    return (
      <div role="alert" style={{ maxWidth: 520, margin: '12vh auto', padding: 24, textAlign: 'center', fontFamily: 'inherit', color: '#102A4F' }}>
        <div style={{ fontSize: 40, color: '#359AAD' }} aria-hidden>⚠</div>
        <h1 style={{ fontSize: 22, margin: '10px 0' }}>Something went wrong on this page</h1>
        <p style={{ color: '#64748B' }}>It has been reported. Reloading usually fixes it.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => window.location.reload()}
            style={{ background: '#051D64', color: '#fff', border: 0, borderRadius: 10, padding: '10px 18px', fontWeight: 600, cursor: 'pointer' }}>Reload</button>
          {member && (
            <a href={`/careerpilot/support/new?from=${encodeURIComponent(window.location.pathname)}`}
              style={{ border: '1px solid #E2EAF2', borderRadius: 10, padding: '10px 18px', fontWeight: 600, color: '#102A4F', textDecoration: 'none' }}>Report a problem</a>
          )}
        </div>
      </div>
    );
  }
}
