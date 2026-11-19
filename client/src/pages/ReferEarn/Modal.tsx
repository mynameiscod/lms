import React, { useEffect } from 'react';
import './referEarn.css';

/** The Refer & Earn dialog (student page and admin screen). Escape or a click outside closes it. */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="rfe-modal-bg" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rfe-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="rfe-modal-head"><h2>{title}</h2><button type="button" aria-label="Close" onClick={onClose}><i className="bi bi-x-lg" /></button></div>
        {children}
      </div>
    </div>
  );
}
