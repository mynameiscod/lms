import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import {
  hackathonExamApi as api, ExamOverview, ExamQuestion, RunResult,
} from '../../api/hackathonExamApi';
import { RichText } from '../../utils/richText';
import { useProctorRecorder } from './useProctorRecorder';
import './hackathonExam.css';

/**
 * The candidate's exam, end to end: team code → OTP → instructions → paper → submitted.
 *
 * ── THE CLOCK IS THE SERVER'S ─────────────────────────────────────────────────────────────
 *
 * The countdown is derived from `endsAt` and an offset measured against `serverNow`, never
 * from the browser's own time — which can be wrong, and can be changed. The heartbeat also
 * carries the authoritative "you are out of time", so the paper closes even if this tab has
 * been asleep and its own timer never fired.
 *
 * ── EVERY ANSWER IS SAVED AS IT IS MADE ───────────────────────────────────────────────────
 *
 * Nothing is held until submit. A dropped connection, a flat battery or a closed lid must cost
 * a candidate nothing, so each change is written through and the paper is rebuilt from the
 * server on reload.
 *
 * ── SECTIONS ARE FREELY NAVIGABLE ─────────────────────────────────────────────────────────
 *
 * A candidate can start with the coding problem or with the MCQs, and move between them
 * whenever they like — which is what somebody sitting a mixed paper actually needs, rather
 * than being marched through it in one order.
 */

type Phase = 'loading' | 'entry' | 'otp' | 'instructions' | 'exam' | 'submitted' | 'gate';

const mmss = (sec: number): string => {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
    : `${m}:${String(r).padStart(2, '0')}`;
};

/**
 * The entry screen's furniture.
 *
 * Icons are inline SVG rather than an icon package or emoji: this is the first screen a
 * candidate sees on an exam they may be nervous about, and it renders identically on the
 * college lab machines that will not have a modern emoji font.
 */
const ExamLogo: React.FC = () => {
  const [ok, setOk] = useState(true);
  return ok
    ? <img className="hxe-logo" src="/assets/logo.png" alt="CodeBegun" onError={() => setOk(false)} />
    : <span className="hxe-logo-txt">CODEBEGUN</span>;
};

const I = {
  team: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  shield: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>,
  clock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
  trophy: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8M12 17v4M6 4h12v5a6 6 0 0 1-12 0z"/><path d="M6 6H4a2 2 0 0 0 2 4M18 6h2a2 2 0 0 1-2 4"/></svg>,
  cal: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>,
  people: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>,
  phone: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/></svg>,
  lock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>,
  glass: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2h12M6 22h12"/><path d="M8 2v4.2c0 .6.27 1.17.73 1.55L12 10.5l3.27-2.75c.46-.38.73-.95.73-1.55V2"/><path d="M8 22v-4.2c0-.6.27-1.17.73-1.55L12 13.5l3.27 2.75c.46.38.73.95.73 1.55V22"/></svg>,
  rocket: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>,
  paper: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>,
  gear: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H1a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 2.6 7a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H7a1.7 1.7 0 0 0 1-1.5V1a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V7a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>,
  play: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z"/></svg>,
  send: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg>,
};

const FEATURES = [
  { tone: 'ind', icon: I.team,   title: 'Team Based',          blurb: 'Compete. Collaborate. Build Together.' },
  { tone: 'grn', icon: I.shield, title: 'Secure & Fair',       blurb: 'Proctored exam environment' },
  { tone: 'vio', icon: I.clock,  title: 'Timed Exam',          blurb: 'Solve within the given time' },
  { tone: 'amb', icon: I.trophy, title: 'Real World Questions',blurb: 'Think. Solve. Apply.' },
];

/**
 * Strip a leading {{n}} left over from a mis-set WhatsApp template.
 *
 * A dynamic URL button whose URL was saved with the placeholder percent-encoded does not
 * substitute: Meta cannot see a variable, treats the whole URL as static, and APPENDS the
 * parameter. The link then arrives as /hackathon-exam/{{1}}<token>.
 *
 * This is cleaned here, and not only in the template, because those links are already in
 * candidates' phones and cannot be recalled — an invite is marked sent per channel, so
 * pressing send again skips exactly the people holding the broken one. Fixing the template
 * alone would help nobody who was already invited.
 *
 * Anchored and narrow on purpose: it removes a leading placeholder, not anything that merely
 * looks wrong. A token that is genuinely invalid must still be rejected as invalid.
 */
/** Artwork is optional and supplied per event, so a dead URL must leave a gap, not a broken icon. */
const hideImg = (ev: React.SyntheticEvent<HTMLImageElement>) => { ev.currentTarget.style.display = 'none'; };

const cleanToken = (t?: string): string => (t || '').replace(/^\{\{\d+\}\}/, '').trim();

/*
 * The exam token survives the tab closing, on purpose.
 *
 * Most candidates open their link from WhatsApp, which runs its own in-app browser. A
 * message arriving, or the screen locking, can tear that tab down — and with sessionStorage
 * the token died with it, dropping somebody mid-exam back to a form asking for an event slug
 * and a team code they have never seen. Their verification is already recorded server-side,
 * so nothing is re-proved by making them start again; it was only the tab that forgot.
 *
 * It is cleared on submit, so a shared lab machine does not hand the next candidate the last
 * one's paper.
 */
const TOKEN_KEY = 'hx-exam-token';
const keep = {
  get: (): string => { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } },
  set: (v: string) => { try { localStorage.setItem(TOKEN_KEY, v); } catch { /* private mode */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ } },
};

const HackathonExam: React.FC = () => {
  const { slug: routeSlug, token: routeToken } = useParams();
  const [search] = useSearchParams();

  const [phase, setPhase] = useState<Phase>('loading');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  /* entry */
  const [slug, setSlug] = useState(routeSlug || search.get('slug') || '');
  const [teamCode, setTeamCode] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [masked, setMasked] = useState('');

  /* the paper */
  const [token, setToken] = useState(cleanToken(routeToken) || keep.get());
  const [overview, setOverview] = useState<ExamOverview | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [activeSection, setActiveSection] = useState('');
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { selectedOptionIds?: string[]; code?: string; text?: string }>>({});
  const [runs, setRuns] = useState<Record<string, RunResult | null>>({});
  const [running, setRunning] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  /* timing + proctoring */
  const [endsAt, setEndsAt] = useState<Date | null>(null);
  const [skewMs, setSkewMs] = useState(0);
  /*
   * null until the countdown has actually measured something.
   *
   * It cannot start at 0. The effect below submits the paper when it sees 0, and on the
   * first render after the exam opens the countdown has not run yet — so a 0 here means
   * `no time left` at the one moment it should mean `not known yet`, and every candidate
   * has their paper submitted, unanswered, the instant they press Start.
   */
  const [left, setLeft] = useState<number | null>(null);
  const [warn, setWarn] = useState<string>('');
  const [done, setDone] = useState<{ answered: number; total: number; timeSpentSec: number } | null>(null);

  const submitRef = useRef<() => void>(() => {});
  const phaseRef = useRef<Phase>('loading');
  phaseRef.current = phase;

  /* ── bootstrap ─────────────────────────────────────────────────────────── */

  const loadOverview = useCallback(async (t: string) => {
    const o = await api.overview(t);
    setOverview(o);
    setActiveSection((s) => s || o.exam.sections[0]?.key || '');
    /*
     * Clear the error on every path that is not itself an error.
     *
     * The gate writes its reason into `err`, and the instructions screen renders `err` as a
     * red banner. Nothing cleared it in between, so a candidate who waited out the countdown
     * arrived at the instructions with "The exam has not started yet." in red above the
     * button that starts it — contradicting the page it was sitting on.
     */
    if (o.attempt.submittedAt) { setErr(''); setPhase('submitted'); return; }
    if (o.gate && !o.attempt.startedAt) { setPhase('gate'); setErr(o.gate.message); return; }
    setErr('');
    setPhase('instructions');
  }, []);

  /* ── the gate's countdown ───────────────────────────────────────────────
     null until measured, for the same reason the exam clock is: a 0 that means
     "not worked out yet" is indistinguishable from one that means "now". */
  const [waitSecs, setWaitSecs] = useState<number | null>(null);
  const rechecked = useRef(false);

  const recheck = useCallback(async () => {
    if (!token) return;
    setBusy(true);
    try { await loadOverview(token); } catch { /* still shut: the gate simply stays */ }
    finally { setBusy(false); }
  }, [token, loadOverview]);

  useEffect(() => {
    if (phase !== 'gate' || !overview) { setWaitSecs(null); return; }
    const startMs = new Date(overview.exam.startAt).getTime();
    const first = Math.max(0, Math.round((startMs - Date.now()) / 1000));
    setWaitSecs(first);
    /* Already past — a draft exam, or one that has closed. Nothing to count, and nothing
       would come of asking the server again on a timer. */
    if (first === 0) return;
    const id = setInterval(() => {
      const left = Math.max(0, Math.round((startMs - Date.now()) / 1000));
      setWaitSecs(left);
      /* Open it for them rather than making them refresh — once, because an exam the
         organiser has not opened yet re-gates, and retrying every second would hammer it. */
      if (left === 0 && !rechecked.current) { rechecked.current = true; recheck(); }
    }, 1000);
    return () => clearInterval(id);
  }, [phase, overview, recheck]);

  useEffect(() => {
    (async () => {
      try {
        if (token) { await loadOverview(token); return; }
        setPhase('entry');
      } catch (e: any) {
        keep.clear();
        setToken('');
        setPhase('entry');
        setErr(e.message || '');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── entry ─────────────────────────────────────────────────────────────── */

  const askOtp = async () => {
    setBusy(true); setErr('');
    try {
      const r = await api.requestOtp(slug, teamCode, mobile);
      setMasked(r.maskedMobile);
      setPhase('otp');
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  const confirmOtp = async () => {
    setBusy(true); setErr('');
    try {
      const r = await api.verifyOtp(slug, teamCode, mobile, otp);
      keep.set(r.examToken);
      setToken(r.examToken);
      await loadOverview(r.examToken);
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  };

  /* ── the paper ─────────────────────────────────────────────────────────── */

  /*
   * Proving who you are when you arrived on your own link.
   *
   * The link is enough to read the instructions and not enough to start — it can be
   * forwarded. Before this, the only way to give that proof was the entry form, which asks
   * for an event slug and a team code that someone who followed their own link has never
   * seen. They pressed Start and were told to verify a mobile number, with nothing on the
   * page to verify it with. The code goes to the number already on the attempt; nothing is
   * asked for and nothing can be supplied.
   */
  const [vSent, setVSent] = useState('');
  const [vCode, setVCode] = useState('');

  const askLinkOtp = async () => {
    setBusy(true); setErr('');
    try {
      const r = await api.requestOtpByToken(token);
      setVSent(r.maskedMobile);
    } catch (e: any) { setErr(e.message || 'Could not send the code.'); }
    setBusy(false);
  };

  const verifyLinkOtp = async () => {
    setBusy(true); setErr('');
    try {
      await api.verifyOtpByToken(token, vCode);
      setVSent(''); setVCode('');
      await loadOverview(token);
    } catch (e: any) { setErr(e.message || 'Could not verify that code.'); }
    setBusy(false);
  };

  /*
   * The camera, when the exam asks for one.
   *
   * Started at begin() rather than on the instructions page: permission prompts asked before
   * somebody has committed to sitting are refused far more often, and a refusal here is
   * permanent for the attempt. It stops at submit, so the light goes out when the paper does.
   */
  const wantsCamera = !!overview?.exam.proctoring?.camera?.enabled;
  const recorder = useProctorRecorder({
    enabled: wantsCamera,
    token,
    onState: useCallback((st: string, note?: string) => {
      api.recordingState(token, st, note).catch(() => { /* the paper does not depend on this */ });
    }, [token]),
  });

  const begin = async () => {
    setBusy(true); setErr('');
    try {
      const r = await api.start(token);
      setQuestions(r.questions);
      const seeded: Record<string, any> = {};
      r.questions.forEach((q) => {
        seeded[q.itemId] = {
          selectedOptionIds: q.answer?.selectedOptionIds,
          code: q.answer?.code ?? q.starterCode ?? '',
          text: q.answer?.text,
        };
      });
      setAnswers(seeded);
      setEndsAt(new Date(r.endsAt));
      setSkewMs(new Date(r.serverNow).getTime() - Date.now());
      /*
       * Open on the section the exam declares first, not on whichever question happened to be
       * drawn first. Those are not the same: the draw is shuffled, so candidates were landing
       * on the coding problem — the hardest thing in the paper and worth 20 of 50 marks — as
       * the first thing they saw, with no indication the thirty questions existed. They can
       * still switch whenever they like; this only decides where they start.
       */
      setActiveSection(overview?.exam.sections[0]?.key || r.questions[0]?.sectionKey || '');
      setIdx(0);
      setPhase('exam');
      if (overview?.exam.proctoring?.fullscreen?.required) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      }
      if (wantsCamera) void recorder.start();
    } catch (e: any) {
      setErr(e.message);
      if (e.code === 'ANOTHER_DEVICE') setPhase('instructions');
    } finally { setBusy(false); }
  };

  /** Server time, as best this tab can know it. */
  const serverNow = useCallback(() => Date.now() + skewMs, [skewMs]);

  useEffect(() => {
    if (phase !== 'exam' || !endsAt) return;
    const tick = () => setLeft(Math.max(0, Math.round((endsAt.getTime() - serverNow()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase, endsAt, serverNow]);

  /* Local countdown reaching zero ends the paper; the heartbeat is the backstop. */
  useEffect(() => {
    if (phase === 'exam' && endsAt && left === 0) submitRef.current();   // left: null = not measured
  }, [left, phase, endsAt]);

  useEffect(() => {
    if (phase !== 'exam') return;
    const id = setInterval(async () => {
      try {
        const h = await api.heartbeat(token);
        setSkewMs(new Date(h.serverNow).getTime() - Date.now());
        if (h.submitted) { setWarn(''); setPhase('submitted'); }
        else if (h.endsAt) setEndsAt(new Date(h.endsAt));
      } catch { /* a dropped beat is not worth interrupting the paper for */ }
    }, 20000);
    return () => clearInterval(id);
  }, [phase, token]);

  /* ── autosave ──────────────────────────────────────────────────────────── */

  const saveTimers = useRef<Record<string, any>>({});

  const setAnswer = (q: ExamQuestion, patch: { selectedOptionIds?: string[]; code?: string; text?: string }) => {
    setAnswers((prev) => ({ ...prev, [q.itemId]: { ...prev[q.itemId], ...patch } }));

    /* MCQ writes through at once; typing is debounced so a code editor is not a chat client. */
    const delay = patch.code !== undefined || patch.text !== undefined ? 1200 : 0;
    clearTimeout(saveTimers.current[q.itemId]);
    saveTimers.current[q.itemId] = setTimeout(async () => {
      try {
        await api.saveAnswer(token, { itemId: q.itemId, language: q.language, ...patch });
        setSavedAt(new Date());
      } catch { /* the next keystroke retries; submit re-sends everything anyway */ }
    }, delay);
  };

  /* ── proctoring, reported to the server which decides ──────────────────── */

  const report = useCallback(async (kind: string, meta?: any) => {
    try {
      const out = await api.reportViolation(token, kind, meta);
      if (out.autoSubmitted) { setPhase('submitted'); setWarn(out.message || ''); return; }
      if (out.message) setWarn(out.message);
    } catch { /* never block the paper on a failed report */ }
  }, [token]);

  useEffect(() => {
    if (phase !== 'exam') return;
    let last = 0;
    const bump = (kind: string) => {
      const t = Date.now();
      if (t - last < 800) return;      // one switch fires both visibilitychange and blur
      last = t;
      report(kind);
    };
    const onVis = () => { if (document.hidden) bump('tab_switch'); };
    const onBlur = () => bump('window_blur');
    const onFs = () => { if (!document.fullscreenElement) report('fullscreen_exit'); };
    const onCopy = (e: ClipboardEvent) => {
      if (!overview?.exam.proctoring?.copyPasteBlocked) return;
      e.preventDefault(); report('copy_blocked');
    };
    const onPaste = (e: ClipboardEvent) => {
      if (!overview?.exam.proctoring?.copyPasteBlocked) return;
      e.preventDefault(); report('paste_blocked');
    };
    const onLeave = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; return ''; };

    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur', onBlur);
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);
    window.addEventListener('beforeunload', onLeave);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('paste', onPaste);
      window.removeEventListener('beforeunload', onLeave);
    };
  }, [phase, report, overview]);

  /* ── run + submit ──────────────────────────────────────────────────────── */

  const runCode = async (q: ExamQuestion) => {
    setRunning(true); setErr('');
    try {
      const r = await api.run(token, q.itemId, answers[q.itemId]?.code || '', q.language);
      setRuns((p) => ({ ...p, [q.itemId]: r }));
    } catch (e: any) {
      setRuns((p) => ({ ...p, [q.itemId]: null }));
      setErr(e.message);
    } finally { setRunning(false); }
  };

  const stopRecRef = useRef<() => void>(() => {});

  const submit = useCallback(async () => {
    if (phaseRef.current !== 'exam') return;
    setBusy(true);
    try {
      const r = await api.submit(token);
      setDone({ answered: r.answered, total: r.totalQuestions, timeSpentSec: r.timeSpentSec });
      setPhase('submitted');
      /* The light goes out when the paper does. A camera still running after submit is a
         camera nobody agreed to. */
      stopRecRef.current();
      keep.clear();
      document.exitFullscreen?.().catch(() => {});
    } catch (e: any) { setErr(e.message); } finally { setBusy(false); }
  }, [token]);
  submitRef.current = submit;
  stopRecRef.current = recorder.stop;

  /* ── derived ───────────────────────────────────────────────────────────── */

  const sections = overview?.exam.sections || [];
  const inSection = useMemo(
    () => questions.filter((q) => q.sectionKey === activeSection),
    [questions, activeSection],
  );
  const q = inSection[idx];
  /*
   * What is still blank, section by section.
   *
   * "24 of 31" does not tell somebody the thing that actually costs them marks. A candidate
   * who has answered every multiple-choice question reads 30 of 31 as finished and submits
   * with the coding problem — worth 20 of the 50 marks here — untouched. The warning has to
   * name the section and what it is worth, because that is the number they are deciding on.
   */
  const unfinished = useMemo(() => {
    const isDone = (x: ExamQuestion) => {
      const a = answers[x.itemId];
      return !!(a?.selectedOptionIds?.length || a?.code?.trim() || a?.text?.trim());
    };
    const by = new Map<string, { label: string; left: number; marks: number }>();
    for (const x of questions) {
      if (isDone(x)) continue;
      const label = overview?.exam.sections.find((sec) => sec.key === x.sectionKey)?.label || x.sectionKey;
      const e = by.get(x.sectionKey) || { label, left: 0, marks: 0 };
      e.left += 1; e.marks += x.marks || 0;
      by.set(x.sectionKey, e);
    }
    return [...by.values()];
  }, [questions, answers, overview]);

  const answeredCount = useMemo(
    () => questions.filter((x) => {
      const a = answers[x.itemId];
      return !!(a?.selectedOptionIds?.length || a?.code?.trim() || a?.text?.trim());
    }).length,
    [questions, answers],
  );
  const isCoding = q?.type === 'live_code' || q?.type === 'sql';
  const runsLeft = runs[q?.itemId || '']?.runsLeft;
  const maxRuns = overview?.exam.runPolicy?.maxRunsPerQuestion ?? 0;
  const usedRuns = runs[q?.itemId || '']?.runsUsed ?? q?.answer?.runsUsed ?? 0;

  /* ── screens ───────────────────────────────────────────────────────────── */

  if (phase === 'loading') {
    return <div className="hx-page"><div className="hx-mid"><div className="hx-card">Loading…</div></div></div>;
  }

  if (phase === 'entry' || phase === 'otp') {
    return (
      <div className="hxe">
        <div className="hxe-bg" aria-hidden="true"><i className="hxe-o1" /><i className="hxe-o2" /></div>

        <header className="hxe-top">
          <ExamLogo />
          <span className="hxe-pill">HACKATHON</span>
          <h1>Enter your <em>Exam</em></h1>
          <p>Use the team code from your registration confirmation<br />and your mobile number to start the exam.</p>
        </header>

        <div className="hxe-grid">
          <aside className="hxe-feats">
            {FEATURES.map((f) => (
              <div className="hxe-feat" key={f.title}>
                <span className={`hxe-ico ${f.tone}`}>{f.icon}</span>
                <div><b>{f.title}</b><span>{f.blurb}</span></div>
              </div>
            ))}
          </aside>

          <main className="hxe-card">
            {phase === 'entry' ? (
              <>
                {!routeSlug && (
                  <>
                    <label className="hxe-label" htmlFor="hxe-slug">Event</label>
                    <div className="hxe-field">
                      {I.cal}
                      <input id="hxe-slug" value={slug} onChange={(e) => setSlug(e.target.value)}
                        placeholder="Enter event slug (e.g. offline-hackathon-2026-nec)" />
                    </div>
                  </>
                )}

                <label className="hxe-label" htmlFor="hxe-code">Team code</label>
                <div className="hxe-field">
                  {I.people}
                  <input id="hxe-code" className="hxe-mono" value={teamCode}
                    onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                    placeholder="HK-XXXX-XXXX" autoFocus />
                </div>

                <label className="hxe-label" htmlFor="hxe-mob">Your mobile number</label>
                <div className="hxe-field">
                  {I.phone}
                  <input id="hxe-mob" value={mobile} inputMode="numeric"
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit mobile number" />
                </div>

                <div className="hxe-note">
                  <b>i</b>
                  <span>Use the team code you received when your team registered. It must be the number you
                  gave then — that is how we know the paper is yours.</span>
                </div>

                <button className="hxe-go" disabled={busy || !teamCode || mobile.length !== 10} onClick={askOtp}>
                  {I.send}{busy ? 'Sending…' : 'Send me a code'}
                </button>
                <p className="hxe-safe">{I.lock} We'll send a verification code to your mobile to start the exam.</p>
              </>
            ) : (
              <>
                <div className="hxe-sent">We sent a code to {masked}.</div>
                <label className="hxe-label" htmlFor="hxe-otp">Enter the code</label>
                <input id="hxe-otp" className="hxe-otp" value={otp} inputMode="numeric"
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="······" autoFocus />
                <button className="hxe-go" disabled={busy || otp.length < 4} onClick={confirmOtp}>
                  {busy ? 'Checking…' : 'Verify'}
                </button>
                <button className="hxe-back" onClick={() => { setPhase('entry'); setOtp(''); setErr(''); }}>
                  Use a different number
                </button>
              </>
            )}
            {err && <div className="hxe-err">{err}</div>}
          </main>

          <aside className="hxe-art">
            <div className="hxe-scene" aria-hidden="true">
              <span className="hxe-chip a">Ideas<br />to Impact</span>
              <span className="hxe-chip b">Code<br />Collaborate</span>
              <svg className="hxe-lap" viewBox="0 0 200 140" fill="none">
                <rect x="30" y="18" width="140" height="92" rx="9" fill="#1e3a8a" />
                <rect x="38" y="26" width="124" height="76" rx="5" fill="#eaf0ff" />
                <path d="M78 52 66 64l12 12M122 52l12 12-12 12M106 46 94 82" stroke="#1d4ed8"
                  strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
                <rect x="14" y="110" width="172" height="11" rx="5.5" fill="#c7d2fe" />
              </svg>
            </div>
            <p className="hxe-tag">More than an exam,<br /><b>a step towards your future.</b></p>
            <span className="hxe-luck">Good Luck!</span>
          </aside>
        </div>
      </div>
    );
  }

  if (phase === 'gate' && overview) {
    const hk = overview.hackathon;
    const startAt = new Date(overview.exam.startAt);
    /*
     * A countdown only belongs on a gate that will actually open. NOT_YET is also returned for
     * an exam still in draft — whose start time can already be in the past — and ENDED and
     * JOIN_CLOSED are not waits at all. Counting down to a moment that has been and gone, or to
     * one that changes nothing, is worse than saying plainly that it is shut.
     */
    const counting = waitSecs !== null && waitSecs > 0;

    return (
      <div className="hxg">
        <header className="hxg-nav">
          <img src="/assets/logo.png" alt="CodeBegun" onError={hideImg} />
          <span>Build Today. A Better Tomorrow.</span>
        </header>

        <div className="hxg-grid">
          <section className="hxg-intro">
            {hk.title && <span className="hxg-pill">{I.cal}{hk.title}</span>}
            <h1>{overview.exam.title}</h1>
            <p className="hxg-kicker">Code · Collaborate · Create Impact</p>
            <p className="hxg-blurb">
              A platform for curious minds to solve real-world problems, build innovative
              solutions, and make a difference.
            </p>
            <p className="hxg-script">Good ideas build<br />brighter tomorrows</p>
          </section>

          <main className="hxg-card">
            <div className={`hxg-glyph ${counting ? '' : 'shut'}`}>{counting ? I.glass : I.lock}</div>
            <h2>{err || 'The exam has not started yet.'}</h2>
            <p className="hxg-when">
              {overview.exam.title} starts {startAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>

            {counting && (
              <div className="hxg-clock">
                {[
                  { n: Math.floor(waitSecs! / 3600), t: 'Hours' },
                  { n: Math.floor((waitSecs! % 3600) / 60), t: 'Minutes' },
                  { n: waitSecs! % 60, t: 'Seconds' },
                ].map((u, i) => (
                  <React.Fragment key={u.t}>
                    {i > 0 && <span className="hxg-sep">:</span>}
                    <div><b>{String(u.n).padStart(2, '0')}</b><span>{u.t}</span></div>
                  </React.Fragment>
                ))}
              </div>
            )}

            <div className="hxg-note">
              <b>i</b>
              <div>
                <b>{counting ? 'Please come back when the exam window opens.' : 'Nothing to do here just now.'}</b>
                <span>Keep your device, internet and registered mobile number ready.</span>
              </div>
            </div>

            <button className="hxg-locked" disabled>{I.lock} Exam locked until the start time</button>
            <button className="hxg-again" onClick={recheck} disabled={busy}>
              {busy ? 'Checking…' : 'Check again'}
            </button>
          </main>

        </div>

        {hk.bannerUrl && (
          <div className="hxg-band"><img src={hk.bannerUrl} alt="" onError={hideImg} /></div>
        )}

        <div className="hxg-feats">
          {[
            { i: I.rocket, tone: 'blue', t: 'Real-world challenges', d: 'Work on meaningful problem statements from industry and society.' },
            { i: I.team, tone: 'ind', t: 'Team-based participation', d: 'Collaborate, learn and build together with your peers.' },
            { i: I.clock, tone: 'teal', t: 'Starts at the scheduled time', d: 'The exam is accessible only at the announced time.' },
          ].map((f) => (
            <div className="hxg-feat" key={f.t}>
              <span className={`hxg-ico ${f.tone}`}>{f.i}</span>
              <div><b>{f.t}</b><span>{f.d}</span></div>
            </div>
          ))}
        </div>

        <footer className="hxg-foot">
          <img src="/assets/logo.png" alt="CodeBegun" onError={hideImg} />
          <span>Same students. A brighter tomorrow.</span>
        </footer>
      </div>
    );
  }

  if (phase === 'instructions' && overview) {
    const e = overview.exam;
    const hk = overview.hackathon;
    const started = !!overview.attempt.startedAt;
    return (
      <div className="hxi">
        <header className="hxi-top">
         <div className="hxi-top-in">
          <div className="hxi-brand">
            {hk.collegeLogoUrl && <img src={hk.collegeLogoUrl} alt="" onError={hideImg} />}
            {hk.collegeLogoUrl && <span className="hxi-rule" />}
            <img src="/assets/logo.png" alt="CodeBegun" onError={hideImg} />
          </div>

          <div className="hxi-title">
            {hk.title && <span className="hxi-pill">{hk.title}</span>}
            <h1>{e.title}</h1>
            <p>Code Today. Build Tomorrow.</p>
          </div>

          <div className="hxi-values">
            <b>Ideas with Purpose</b>
            <span>People · Technology · Society</span>
            <span>A Brighter Tomorrow</span>
          </div>
         </div>
        </header>

        <div className="hxi-strip">
         <div className="hxi-strip-in">
          <p className="hxi-motto">Real Problems.<br />Brighter Minds.<br />Bigger Possibilities.</p>
          <div className="hxi-facts">
            <div><b>{overview.candidate.name}</b><span>Participant</span></div>
            <div><b>{overview.candidate.teamName}</b><span>Team name</span></div>
            <div><b className="hxi-code">{overview.candidate.teamCode}</b><span>Team code</span></div>
            <div><b>{e.durationMins} minutes</b><span>Duration</span></div>
            <div><b>{e.totalQuestions} questions</b><span>Total questions</span></div>
            <div><b>{e.totalMarks} marks</b><span>Total marks</span></div>
          </div>
         </div>
        </div>

        <div className="hxi-body">
          <main className="hxi-card">
            <section className="hxi-sec">
              <span className="hxi-ico blue">{I.paper}</span>
              <div>
                <h2>What you will sit</h2>
                <p>Your hackathon exam consists of the following sections.</p>
                <div className="hxi-tiles">
                  {e.sections.map((s, i) => (
                    <div className={`hxi-tile ${i % 2 ? 'teal' : 'blue'}`} key={s.key}>
                      <b>{s.count}</b><span>{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="hxi-sec">
              <span className="hxi-ico slate">{I.gear}</span>
              <div>
                <h2>How it works</h2>
                <p>Read this before you start. Every rule below is enforced by the exam itself.</p>

                <h3 className="hxi-h3">Before you begin</h3>
                <ul className="hxi-rules">
                  <li><b>Use a laptop or desktop.</b> A phone will work, but the coding problem
                    needs a real keyboard and the editor is cramped on a small screen. If a laptop
                    is available, use it.</li>
                  <li><b>Check your internet before you start the clock.</b> Answers save as you
                    make them, so a brief drop costs nothing — but the clock does not stop for it.</li>
                  {e.proctoring?.camera?.enabled && (
                    <li><b>Your camera and microphone must be on.</b> The whole exam is recorded.
                      Your browser will ask permission the moment you press Start — allow it. If you
                      decline, or the device has no camera, you can still sit the paper, but it is
                      recorded on your attempt and the organisers decide what that means.</li>
                  )}
                  {e.joinCutoffMins > 0 && (
                    <li><b>You cannot start late.</b> The door closes {e.joinCutoffMins} minutes
                      after the exam opens. Arrive after that and you cannot sit it at all.</li>
                  )}
                </ul>

                <h3 className="hxi-h3">The paper</h3>
                <ul className="hxi-rules">
                  <li><b>{e.totalQuestions} questions, {e.totalMarks} marks, {e.durationMins} minutes.</b>
                    {' '}The clock starts when you press Start, does not stop, and does not restart
                    if you reload or close the tab.</li>
                  {e.sections.map((s) => (
                    <li key={s.key}>
                      <b>{s.label}: {s.count} question{s.count === 1 ? '' : 's'}, {s.marks} mark{s.marks === 1 ? '' : 's'}.</b>
                      {s.count > 0 && s.marks > 0 && ` That is ${Math.round((s.marks / (e.totalMarks || 1)) * 100)}% of the paper, at ${+(s.marks / s.count).toFixed(2)} mark${(s.marks / s.count) === 1 ? '' : 's'} each.`}
                    </li>
                  ))}
                  {e.navigation === 'free' && <li><b>Answer in any order.</b> Move between sections
                    whenever you like. The coding problem is usually worth the most — do not leave
                    it until the last five minutes.</li>}
                  <li><b>Every answer saves as you make it.</b> If your connection drops or the
                    laptop dies, reopen the same link and carry on where you left off.</li>
                  {e.runPolicy?.enabled && (
                    <li><b>You can run your code</b>
                      {e.runPolicy.maxRunsPerQuestion > 0 ? <> — up to <b>{e.runPolicy.maxRunsPerQuestion} times per question</b></> : ''}.
                      It is graded against more cases than you can see, so make it work in general,
                      not just for the samples shown.</li>
                  )}
                  <li><b>One submit, for the whole paper.</b> There is a single Submit button and it
                    ends everything. It will tell you what is still blank and what those marks are
                    worth before it does.</li>
                </ul>

                <h3 className="hxi-h3">What is watched</h3>
                <ul className="hxi-rules">
                  {e.proctoring?.tabSwitch?.enabled && (
                    <li><b>Do not leave this tab.</b> Every switch away is counted and shown to the
                      organisers. After <b>{e.proctoring.tabSwitch.maxWarnings} switches</b>
                      {e.proctoring.tabSwitch.autoSubmit
                        ? <> your exam is <b>submitted automatically</b>, finished or not.</>
                        : <> it is recorded against your attempt.</>}</li>
                  )}
                  {e.proctoring?.fullscreen?.required && <li><b>The exam runs in fullscreen.</b> Leaving fullscreen is recorded.</li>}
                  {e.proctoring?.copyPasteBlocked && <li><b>Copy and paste are disabled</b> for the whole paper.</li>}
                  {e.proctoring?.clusterDetection && <li><b>Teams sitting from one device or one
                    network are flagged.</b> Everyone must sit their own paper on their own machine.</li>}
                </ul>

                <h3 className="hxi-h3">How your team is scored</h3>
                <ul className="hxi-rules">
                  <li>You are scored out of <b>{e.totalMarks} marks</b>. Every candidate draws their
                    own questions from the same bank, so no two papers are identical and there is
                    nothing to gain from comparing them.</li>
                  <li><b>Your team's score is the average across
                    {e.teamScoreDenominator === 'registered' ? ' every registered member' : ' every member who sat it'}.</b>
                    {e.teamScoreDenominator === 'registered'
                      ? ' A member who does not turn up counts as a zero in that average, so the whole team needs to sit it.'
                      : ' Only members who actually sat the paper are counted.'}</li>
                  <li>Teams are ranked on that team average. Results are published by the organisers
                    once every paper is in — you will get yours by email and WhatsApp.</li>
                </ul>
              </div>
            </section>

            {e.instructions && (
              <section className="hxi-sec">
                <span className="hxi-ico green">{I.team}</span>
                <div>
                  <h2>From the organisers</h2>
                  <RichText html={e.instructions} className="hxi-rich" />
                </div>
              </section>
            )}

            {err && <div className="hxi-err">{err}</div>}

            {!overview.attempt.otpVerified ? (
              <div className="hxi-verify">
                {!vSent ? (
                  <>
                    <p>Before you start, we need to check it is you. We will send a code to the
                      mobile number your team registered with.</p>
                    <button className="hxi-start" disabled={busy} onClick={askLinkOtp}>
                      {busy ? 'Sending…' : 'Send me a code'}
                    </button>
                  </>
                ) : (
                  <>
                    <p>We sent a code to <b>{vSent}</b>.</p>
                    <input className="hxi-otp" value={vCode} inputMode="numeric" autoFocus
                      placeholder="······"
                      onChange={(e) => setVCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
                    <button className="hxi-start" disabled={busy || vCode.length < 4} onClick={verifyLinkOtp}>
                      {busy ? 'Checking…' : 'Verify and continue'}
                    </button>
                    <button className="hxi-resend" disabled={busy} onClick={askLinkOtp}>Send another code</button>
                  </>
                )}
              </div>
            ) : (
              <button className="hxi-start" disabled={busy} onClick={begin}>
                {I.play}{busy ? 'Opening…' : started ? 'Resume my exam' : 'Start my exam'}
                <span className="hxi-arrow">›</span>
              </button>
            )}
            {started && <p className="hxi-note">You already started — your original time still applies.</p>}
            <p className="hxi-foot">Think · Solve · Create &nbsp;|&nbsp; Ideas Today. A Better Tomorrow.</p>
          </main>

        </div>

        {hk.bannerUrl && (
          <div className="hxi-band"><img src={hk.bannerUrl} alt="" onError={hideImg} /></div>
        )}
      </div>
    );
  }

  if (phase === 'submitted') {
    return (
      <div className="hx-page">
        <div className="hx-mid">
          <div className="hx-card hx-centre">
            <div className="hx-big">✅</div>
            <h2>Your answers are in</h2>
            {done && (
              <p className="hx-hint">
                {done.answered} of {done.total} questions answered · {Math.round(done.timeSpentSec / 60)} minutes
              </p>
            )}
            {warn && <div className="hx-err">{warn}</div>}
            <p className="hx-hint">
              Results are published by the organisers. You will get yours by email and WhatsApp
              when they are ready.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ── the exam ──────────────────────────────────────────────────────────── */

  const low = left !== null && left <= 300;

  return (
    <div className="hx-exam">
      <div className="hx-bar">
        <div className="hx-bar-l">
          <b>{overview?.exam.title}</b>
          <span className="hx-bar-sub">{overview?.candidate.teamName}</span>
        </div>
        <div className="hx-tabs">
          {sections.map((s) => {
            const qs = questions.filter((x) => x.sectionKey === s.key);
            const ans = qs.filter((x) => {
              const a = answers[x.itemId];
              return !!(a?.selectedOptionIds?.length || a?.code?.trim() || a?.text?.trim());
            }).length;
            return (
              <button
                key={s.key}
                className={`hx-tab ${activeSection === s.key ? 'on' : ''}`}
                onClick={() => { setActiveSection(s.key); setIdx(0); }}
              >
                {s.label} <span className="hx-tab-n">{ans}/{qs.length}</span>
              </button>
            );
          })}
        </div>
        {wantsCamera && (
          <div className={`hx-rec ${recorder.state}`} title={
            recorder.state === 'recording' ? 'Your camera and microphone are being recorded.'
              : recorder.state === 'denied' ? 'You declined the camera. This is recorded on your attempt.'
              : recorder.state === 'unavailable' ? 'No usable camera was found. This is recorded on your attempt.'
              : 'Not recording.'}>
            <i />{recorder.state === 'recording' ? 'Recording' : recorder.state === 'denied' ? 'Camera off' : 'No camera'}
          </div>
        )}
        <div className={`hx-clock ${low ? 'low' : ''}`}>{mmss(left ?? 0)}</div>
      </div>

      {warn && <div className="hx-warn">⚠️ {warn}</div>}

      <div className="hx-body">
        <aside className="hx-nav">
          <div className="hx-nav-head">{answeredCount}/{questions.length} answered</div>
          <div className="hx-grid">
            {inSection.map((x, i) => {
              const a = answers[x.itemId];
              const filled = !!(a?.selectedOptionIds?.length || a?.code?.trim() || a?.text?.trim());
              return (
                <button
                  key={x.itemId}
                  className={`hx-dot ${i === idx ? 'on' : ''} ${filled ? 'done' : ''}`}
                  onClick={() => setIdx(i)}
                >{i + 1}</button>
              );
            })}
          </div>
          <button className="hx-btn hx-submit" disabled={busy} onClick={() => {
            const lines = unfinished.map((u) => `  • ${u.label}: ${u.left} unanswered (${u.marks} marks)`);
            const msg = lines.length
              ? [
                  `You have answered ${answeredCount} of ${questions.length}.`,
                  '',
                  'Still blank:',
                  ...lines,
                  '',
                  'Those marks are lost if you submit now. Submit anyway?',
                ].join('\n')
              : [
                  `You have answered all ${questions.length} questions.`,
                  '',
                  'Submit now? You cannot reopen the paper.',
                ].join('\n');
            if (window.confirm(msg)) submit();
          }}>
            {busy ? 'Submitting…' : 'Submit exam'}
          </button>
          {savedAt && <div className="hx-saved">Saved {savedAt.toLocaleTimeString('en-IN')}</div>}
        </aside>

        <main className="hx-main">
          {!q ? <div className="hx-card">Nothing in this section.</div> : (
            <>
              <div className="hx-qhead">
                <span>Question {idx + 1} of {inSection.length}</span>
                <span className="hx-marks">{q.marks} mark{q.marks === 1 ? '' : 's'}</span>
              </div>
              <RichText html={q.prompt} className="hx-prompt" />
              {q.codeSnippet && <pre className="hx-snippet">{q.codeSnippet}</pre>}

              {q.type === 'mcq' && (
                <div className="hx-opts">
                  {(q.options || []).map((o) => {
                    const on = (answers[q.itemId]?.selectedOptionIds || []).includes(o.id);
                    return (
                      <button
                        key={o.id}
                        className={`hx-opt ${on ? 'on' : ''}`}
                        onClick={() => setAnswer(q, { selectedOptionIds: on ? [] : [o.id] })}
                      >
                        <span className="hx-opt-id">{o.id.toUpperCase()}</span>{o.text}
                      </button>
                    );
                  })}
                </div>
              )}

              {isCoding && (
                <div className="hx-code">
                  <div className="hx-ed-head">
                    <span>{q.language || 'code'}</span>
                    {maxRuns > 0 && (
                      <span className="hx-runs">
                        {runsLeft !== null && runsLeft !== undefined ? runsLeft : Math.max(0, maxRuns - usedRuns)} run(s) left
                      </span>
                    )}
                  </div>
                  <Editor
                    height="340px"
                    language={q.language === 'sql' || q.type === 'sql' ? 'sql' : (q.language || 'java')}
                    value={answers[q.itemId]?.code ?? ''}
                    onChange={(v) => setAnswer(q, { code: v ?? '' })}
                    options={{ minimap: { enabled: false }, fontSize: 13.5, scrollBeyondLastLine: false, automaticLayout: true }}
                  />
                  {overview?.exam.runPolicy?.enabled && (
                    <button className="hx-btn hx-run" disabled={running} onClick={() => runCode(q)}>
                      {running ? 'Running…' : '▶ Run against samples'}
                    </button>
                  )}
                  {!!q.sampleCases?.length && (
                    <div className="hx-cases">
                      <div className="hx-cases-head">Sample cases</div>
                      {q.sampleCases.map((c, i) => {
                        const got = runs[q.itemId]?.cases?.[i];
                        return (
                          <div className={`hx-case ${got ? (got.passed ? 'ok' : 'bad') : ''}`} key={i}>
                            <div><span>Input</span><pre>{c.input || '—'}</pre></div>
                            <div><span>Expected</span><pre>{c.expectedOutput}</pre></div>
                            {got && <div><span>Got</span><pre>{got.actualOutput || '—'}</pre></div>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {runs[q.itemId]?.error && <div className="hx-err">{runs[q.itemId]!.error}</div>}
                  <p className="hx-hint">
                    Your answer is graded against more cases than you can see here.
                  </p>
                </div>
              )}

              {(q.type === 'predict_output' || q.type === 'complete_code' || q.type === 'debug') && (
                <textarea
                  className="hx-text"
                  rows={5}
                  value={answers[q.itemId]?.text ?? ''}
                  onChange={(e) => setAnswer(q, { text: e.target.value })}
                  placeholder="Your answer"
                />
              )}

              {err && <div className="hx-err">{err}</div>}

              <div className="hx-move">
                <button className="hx-ghost" disabled={idx === 0} onClick={() => setIdx((i) => i - 1)}>← Previous</button>
                <button className="hx-ghost" disabled={idx >= inSection.length - 1} onClick={() => setIdx((i) => i + 1)}>Next →</button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default HackathonExam;
