/**
 * THE LAST LINE OF DEFENCE FOR AN UNATTENDED KIOSK.
 *
 * This app had no error boundary at all. A React app with no boundary does not show an
 * error when a render throws — it unmounts the entire tree, leaving a blank white screen.
 * On a panel-mounted iPad in a shop that means a dead fixture and a customer whose order
 * has vanished, with nothing on screen to explain it and nothing to tap.
 *
 * That is not hypothetical. The QR encoder threw on any order past its byte capacity —
 * measured at seven cart lines — and blanked the kiosk every time. `src/handoff.ts` now
 * prevents that specific throw, but fixing one known crash is not the same as surviving
 * an unknown one, and ~18 of these run unattended in shops that cannot debug them.
 *
 * Three things this must do, in order of importance:
 *
 *  1. Never blank. Say something a customer and a shop attendant can both act on.
 *  2. Recover itself. Nobody in the shop is going to know to reload a kiosk.
 *  3. Not loop. A fault that reproduces on boot would otherwise reload forever, which
 *     looks exactly like broken hardware and is harder to diagnose than a stopped screen.
 *
 * Deliberately dependency-free: React, and a log call that already swallows its own
 * errors. **The styles are inline rather than Tailwind classes on purpose** — if the
 * failure ever involves the stylesheet, a fallback built from utility classes fails with
 * it, and unstyled white-on-white is indistinguishable from the blank screen this exists
 * to prevent.
 */

import React from 'react';
import { addLog } from './utils/logger';
import { hardReload } from './utils/hardReload';

/** Long enough to read the message, short enough that a shop is not left with a dead panel. */
const RECOVERY_DELAY_MS = 20000;

/** Crashes closer together than this are treated as the same fault repeating. */
const LOOP_WINDOW_MS = 120000;

/** Auto-recovery attempts inside that window before it stops trying and waits for a human. */
const MAX_RECOVERY_ATTEMPTS = 2;

const CRASH_HISTORY_KEY = 'm2m_crash_history';

/**
 * Record this crash and report whether recovering is still worth attempting.
 *
 * sessionStorage, not localStorage: the history should survive the reloads this triggers
 * but not outlive the tab, so a fault fixed by a deploy does not leave a kiosk refusing to
 * self-heal days later. Wrapped because storage access itself can throw, and a crash
 * handler that crashes is worse than no crash handler.
 */
const recordCrashAndDecide = (): boolean => {
  try {
    const now = Date.now();
    const raw = sessionStorage.getItem(CRASH_HISTORY_KEY);
    const recent: number[] = (raw ? JSON.parse(raw) : []).filter(
      (t: number) => typeof t === 'number' && now - t < LOOP_WINDOW_MS,
    );
    recent.push(now);
    sessionStorage.setItem(CRASH_HISTORY_KEY, JSON.stringify(recent));
    return recent.length <= MAX_RECOVERY_ATTEMPTS;
  } catch {
    // Storage unavailable: recover once. Better a possible loop on a kiosk nobody can
    // reach than a panel that is definitely dead.
    return true;
  }
};

interface State {
  hasError: boolean;
  willRecover: boolean;
}

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, willRecover: false };
  private timer: ReturnType<typeof setTimeout> | null = null;

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // The kiosk's log is the only diagnostic that survives the reload below, and it is
    // readable from the Settings panel — so this is how a fault in a shop gets reported.
    addLog(`CRASH: ${error?.message ?? 'unknown error'}`);

    const willRecover = recordCrashAndDecide();
    this.setState({ willRecover });

    if (willRecover) {
      // A full reload, not a state reset: whatever produced the error is somewhere in a
      // tree this component can no longer trust, and a clean boot is the only state that
      // is definitely valid.
      this.timer = setTimeout(hardReload, RECOVERY_DELAY_MS);
    }
  }

  componentWillUnmount() {
    if (this.timer) clearTimeout(this.timer);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.5rem',
          padding: '3rem',
          textAlign: 'center',
          background: '#0D0F0E',
          color: '#F2EFE6',
          fontFamily: "'Inter Variable', Inter, system-ui, sans-serif",
        }}
      >
        <p
          style={{
            fontSize: '2.75rem',
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            margin: 0,
          }}
        >
          Sorry — something went wrong.
          <br />
          <span style={{ color: '#00C805' }}>Please see a shop attendant.</span>
        </p>
        <p style={{ fontSize: '1.25rem', maxWidth: '38rem', lineHeight: 1.5, margin: 0, color: '#A1A1AA' }}>
          {/*
            Said plainly because it is true and because it changes what the customer does
            next. A customer who thinks their order went through will walk away; one who
            knows it did not will go to the counter, which is the outcome that works.
          */}
          This order was not submitted. Nothing has been charged.
        </p>
        <button
          onClick={hardReload}
          style={{
            marginTop: '0.5rem',
            padding: '1.25rem 3rem',
            fontSize: '1.125rem',
            fontWeight: 800,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#0D0F0E',
            background: '#00C805',
            border: 'none',
            borderRadius: '1.5rem',
            cursor: 'pointer',
          }}
        >
          Start over
        </button>
        <p style={{ fontSize: '0.875rem', color: '#52525B', margin: 0 }}>
          {this.state.willRecover
            ? 'This screen will reset on its own in a few seconds.'
            : 'This kiosk needs attention from Market 2 Mint.'}
        </p>
      </div>
    );
  }
}
