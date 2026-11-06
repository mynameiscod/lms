import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
export class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(_error: Error, _info: ErrorInfo) { /* Never log source or private content. */ }
  render() { return this.state.failed ? this.props.fallback ?? <div className="empty-card" role="alert"><h1>Something didn’t load.</h1><p>Reload this page to try again. Only previously saved fundamental drafts can be restored.</p><button className="button primary" onClick={() => window.location.reload()}>Reload workspace</button></div> : this.props.children; }
}
