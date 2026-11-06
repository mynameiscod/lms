import React, { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import vzSound from './vzSound';

/**
 * Page-only controls for the LMS Code Visualizer: light/dark for this page, and sound.
 * Neither touches the app's global settings; both remember the choice in this browser only.
 */

export type VzTheme = 'light' | 'dark';
const THEME_KEY = 'cb-vz-theme';
const THEME_EVENT = 'cb-vz-theme';

const readTheme = (): VzTheme => {
  try { return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
};

/** The page theme, shared by the library and the workspace. */
export function useVzTheme(): [VzTheme, (t: VzTheme) => void] {
  const [theme, setThemeState] = useState<VzTheme>(readTheme);
  useEffect(() => {
    const on = () => setThemeState(readTheme());
    window.addEventListener(THEME_EVENT, on);
    return () => window.removeEventListener(THEME_EVENT, on);
  }, []);
  const setTheme = useCallback((t: VzTheme) => {
    try { localStorage.setItem(THEME_KEY, t); } catch { /* storage unavailable */ }
    setThemeState(t);
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);
  return [theme, setTheme];
}

export function useVzSound() {
  return useSyncExternalStore(vzSound.subscribe, vzSound.get, vzSound.get);
}

const Icon = {
  sun: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>,
  moon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></svg>,
  on: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /></svg>,
  off: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" /><path d="M17 9l5 6M22 9l-5 6" /></svg>,
  play: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l10-6.5z" /></svg>,
};

const VzToolbar: React.FC<{ theme: VzTheme; onTheme: (t: VzTheme) => void }> = ({ theme, onTheme }) => {
  const s = useVzSound();
  const muted = !s.enabled || s.volume === 0;
  return (
    <div className="vzp-toolbar" role="group" aria-label="Visualizer settings">
      <div className="vzp-sound">
        <button
          type="button"
          className={`vzp-icon-btn${s.enabled ? ' is-on' : ''}`}
          aria-pressed={s.enabled}
          aria-label={s.enabled ? 'Sound on. Turn sound off' : 'Sound off. Turn sound on'}
          title={s.enabled ? 'Sound on' : 'Sound off'}
          onClick={() => vzSound.setEnabled(!s.enabled)}
        >
          {muted ? Icon.off : Icon.on}
          <span className="vzp-icon-lbl">{s.enabled ? 'Sound on' : 'Sound off'}</span>
        </button>
        {s.enabled && (
          <>
            <input
              className="vzp-volume"
              type="range" min={0} max={100} step={5}
              value={Math.round(s.volume * 100)}
              onChange={e => vzSound.setVolume(Number(e.target.value) / 100)}
              aria-label="Sound volume"
              aria-valuetext={`${Math.round(s.volume * 100)} percent`}
              style={{ ['--vzp-vol' as any]: `${Math.round(s.volume * 100)}%` }}
            />
            <button type="button" className="vzp-icon-btn vzp-preview" onClick={() => vzSound.play('preview')} aria-label="Play a preview sound" title="Preview">
              {Icon.play}
            </button>
          </>
        )}
      </div>
      <button
        type="button"
        className="vzp-icon-btn"
        onClick={() => onTheme(theme === 'dark' ? 'light' : 'dark')}
        aria-label={theme === 'dark' ? 'Switch this page to light mode' : 'Switch this page to dark mode'}
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      >
        {theme === 'dark' ? Icon.sun : Icon.moon}
      </button>
      <span className="vzp-sr" aria-live="polite">{s.enabled ? 'Sound is on' : 'Sound is off'}</span>
    </div>
  );
};

export default VzToolbar;
