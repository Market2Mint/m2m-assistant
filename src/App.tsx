/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// M2M Kiosk v1.0.6 - Sync Build
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Home,
  HelpCircle,
  Shield,
  CheckCircle2,
  X,
  ShoppingBag,
  Plus,
  PlusCircle,
  Minus,
  Trash2,
  Play
} from 'lucide-react';
import { POLICY, POLICY_VERSION, TERMS_OF_USE_SECTIONS, PRIVACY_POLICY_SECTIONS, SUBMISSION_POLICY_SECTIONS } from './data';
import { ACTIVE_SERVICES, copyFor, type ServiceRecord } from './serviceMenu';
import badgeUrl from './assets/M2M_badge.png';
import {
  PREGRADE_PRICE_KIOSK,
  SHIPPING_AND_INSURANCE,
  SHIPPING_DISCLOSURE,
  SUBMISSION_FROM_PRICE,
  formatTurnaround,
  formatTurnaroundDays,
  formatUSD,
  lineTotal,
  shippingFeeForCart,
} from './pricing';
import { LANDING, QR_DESTINATION, TICKER_SAMPLE } from './landingStrings';
import { HERO_DWELL_MS, HERO_SLABS } from './heroSlabs';
import StoreSettings from './components/StoreSettings';
import { addLog } from './utils/logger';
import { hardReload } from './utils/hardReload';
import { summariseTiers } from './tiers';
import { buildPayload, sendTelemetry } from './telemetry';
import { CUSTOMER_NOTES_MAX_LENGTH, QR_ERROR_CORRECTION_LEVEL, fitHandoffUrl } from './handoff';
import { EMPTY_HEALTH, UPDATE_WINDOWS, shouldApplyUpdate, type UpdateHealth } from './updatePolicy';
import { refreshPublishedMenu, resolveMenuAtBoot } from './menuSource';
import {
  autoAdvance,
  filterByAnswer,
  getOptionsForQuestion,
  isCardFactQuestion,
  singleOptionDetails,
} from './flow';
import {
  MAX_QUANTITY_PER_LINE,
  MIN_QUANTITY_PER_LINE,
  keypadBackspacePressed,
  keypadDigitPressed,
  keypadQuantity,
  openKeypadState,
  stepQuantity,
  type KeypadState,
} from './quantity';
import {
  CARD_REFERENCE_LABEL,
  CARD_REFERENCE_MAX_LENGTH,
  CARD_REFERENCE_PLACEHOLDER,
  MINIMUM_GRADES,
  MIN_GRADE_COLLAPSED_LABEL,
  MIN_GRADE_CONSEQUENCE_REST,
  MIN_GRADE_LEAD_REST,
  MIN_GRADE_LEAD_STRONG,
  NO_MINIMUM_DISCLOSURE,
  NO_MINIMUM_LABEL,
  formatGrade,
  minimumGradeConsequenceLead,
  minimumGradeHandoffFragment,
  sanitizeCardReference,
  supportsMinimumGrade,
} from './minimumGrade';

// --- Types ---

interface Service {
  questions: string[]; // [Q1, Q2, Q3, Q4, Q5]
  name: string;
  /** Carried through from the menu so `supportsMinimumGrade` can read it off a cart line. */
  category: string;
  cost: string;
  turnaround: string;
  /** The same figure as `turnaround`, unparsed. Use this for anything but display. */
  businessDays: number;
  maxValue: string;
  /** The price is a starting figure, quoted before the item has been assessed. */
  priceIsMinimum: boolean;
  /** Flat per-card upcharge for an oversized card, or null if not offered. */
  oversizedSurcharge: number | null;
  description: string;
  details: string;
}

interface CartLine {
  id: number;
  service: Service;
  quantity: number;
  oversized: boolean;
  /** null = "No minimum". Never defaulted to a value — a customer must choose the risk. */
  minimumGrade: number | null;
  /** Optional free text, for staff eyes only. Never blocks completion. */
  cardReference: string;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  showMainMenu?: boolean;
  onMainMenuClick?: () => void;
  /**
   * Rendered OUTSIDE the scrolling body, pinned to the modal's bottom edge. For
   * actions: nothing a customer must PRESS may require scrolling to reach (Phase 1
   * measured the acknowledgement checkbox arriving below the fold while every
   * mechanics press sat above it). Scrolling to READ stays; scrolling to ACT is gone.
   */
  footer?: React.ReactNode;
}

// --- Helpers ---

/**
 * The render code below works in `Service`, so the generated menu is adapted to that
 * shape once, here. This replaces a 110-line CSV parser that ran on every boot and
 * silently dropped malformed rows — a bad row meant a service just vanished from the
 * kiosk with no error. The menu is now typed data, checked at build time.
 */
const toService = (r: ServiceRecord): Service => ({
  questions: r.questions as string[],
  name: r.name,
  category: r.category,
  cost: formatUSD(r.price.customer),
  turnaround: String(r.businessDays),
  businessDays: r.businessDays,
  maxValue: r.maxInsuredValue,
  priceIsMinimum: r.priceIsMinimum,
  oversizedSurcharge: r.oversizedSurcharge,
  ...copyFor(r.name),
});

// --- Components ---

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, showMainMenu, onMainMenuClick, footer }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/90 backdrop-blur-xl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 40 }}
        className="bg-zinc-900 rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden border border-zinc-800"
      >
        <div className="p-10 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
          <h2 className="text-3xl font-black text-white uppercase italic tracking-tight">{title}</h2>
          <div className="flex items-center gap-6">
            {showMainMenu && (
              <div className="flex items-center gap-4">
                <span className="text-sm font-black text-m2m-green uppercase italic tracking-widest">Main Menu</span>
                <button 
                  onClick={onMainMenuClick}
                  className="p-4 bg-zinc-900 border-2 border-m2m-green rounded-2xl shadow-sm active:scale-90 transition-transform"
                >
                  <Home className="w-6 h-6 text-m2m-green" />
                </button>
              </div>
            )}
            <button 
              onClick={onClose} 
              className="p-4 bg-zinc-800 hover:bg-zinc-700 rounded-2xl transition-all text-zinc-400 hover:text-white active:scale-90"
            >
              <X className="w-8 h-8" />
            </button>
          </div>
        </div>
        <div className="p-10 overflow-y-auto flex-1 text-zinc-300">
          {children}
        </div>
        {footer && (
          <div className="shrink-0 border-t border-zinc-800 bg-zinc-950/50 px-10 py-6">
            {footer}
          </div>
        )}
      </motion.div>
    </div>
  );
};

/**
 * The answers so far, including the ones the kiosk filled in because only one option
 * existed. Those are marked, not hidden: a choice made on a customer's behalf that they
 * cannot see is indistinguishable from the kiosk getting it wrong.
 */
const AnswerTrail: React.FC<{ answers: { value: string; auto: boolean }[] }> = ({ answers }) => {
  if (answers.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {answers.map((a, i) => (
        <React.Fragment key={`${a.value}-${i}`}>
          {i > 0 && <ChevronRight className="w-4 h-4 text-zinc-700" />}
          <span
            className={`rounded-full px-4 py-1.5 text-sm font-bold uppercase tracking-widest ${
              a.auto
                ? 'border border-dashed border-zinc-700 text-zinc-500'
                : 'bg-zinc-900 border border-zinc-800 text-m2m-ivory'
            }`}
          >
            {a.value}
            {a.auto && <span className="ml-2 normal-case tracking-normal text-zinc-600">only option</span>}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
};

/** The Question-1 value that identifies the pregrade path. */
const PREGRADE_CATEGORY = 'Pregrading';

/** Survives the reload it guards — see `readLastUpdateApplied`. */
const LAST_UPDATE_APPLIED_KEY = 'm2m_last_update_applied';

/**
 * The customer gets a warning before the kiosk resets, and 30 seconds is deliberate: long
 * enough to notice, read and reach out on a panel-mounted screen, without leaving an
 * abandoned order on display for the next person in the queue.
 */
const IDLE_RESET_AFTER_MS = 120_000;
const IDLE_WARNING_AFTER_MS = IDLE_RESET_AFTER_MS - 30_000;

/** Updater health. Persisted because the interesting failures span reloads. */
const UPDATE_HEALTH_KEY = 'm2m_update_health';

/*
 * Landing-screen icons, carried across from the approved mockup
 * (Kiosk v3/kiosk_attract_messi_2026-08-07.html) rather than swapped for lucide
 * near-equivalents — the mockup's strokes were drawn to sit inside the 35px chip
 * circles at these exact weights. Order matches LANDING.chips.
 */
const CHIP_ICON_PATHS: readonly React.ReactNode[] = [
  // submitted-for-you: clipboard sheet + check
  <>
    <rect x="3.5" y="6.5" width="12" height="15" rx="2" />
    <path d="M8 3.5h10a2 2 0 012 2v12" />
    <path d="M7 12l2.2 2.2L13.5 10" />
  </>,
  // secure & insured: padlock
  <>
    <rect x="4" y="10" width="16" height="10" rx="2" />
    <path d="M8 10V7a4 4 0 018 0v3" />
  </>,
  // dashboard: monitor + rising line
  <>
    <rect x="3" y="4" width="18" height="13" rx="2" />
    <path d="M9 21h6" />
    <path d="M12 17v4" />
    <path d="M7 13l3-3 2.5 2.5L17 8" />
  </>,
];

/*
 * The hero alcove — flanking angled panels plus a hexagonal recess echoing the
 * badge's own geometry, carried across from the approved mockup verbatim. Dark
 * fills, green on the EDGES only: this is scenery, not the logo. The green strokes
 * are #00C805 at low opacity — edge light, never a filled green panel.
 */
const HERO_WINGS = (
  <svg viewBox="0 0 640 536" aria-hidden>
    <defs>
      <linearGradient id="hero-wgL" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#040605" />
        <stop offset="1" stopColor="#0E1211" />
      </linearGradient>
      <linearGradient id="hero-wgR" x1="1" y1="0" x2="0" y2="0">
        <stop offset="0" stopColor="#040605" />
        <stop offset="1" stopColor="#0C100F" />
      </linearGradient>
    </defs>
    {/* flanking panels, angled away from the recess */}
    <polygon points="14,158 162,92 162,444 14,378" fill="url(#hero-wgL)" />
    <polygon points="626,158 478,92 478,444 626,378" fill="url(#hero-wgR)" />
    <polygon points="14,158 162,92 162,444 14,378" fill="none" stroke="#00C805" strokeOpacity=".20" strokeWidth="1.2" />
    <polygon points="626,158 478,92 478,444 626,378" fill="none" stroke="#00C805" strokeOpacity=".20" strokeWidth="1.2" />
    {/* hexagonal recess the badge sits inside */}
    <polygon points="320,44 480,136 480,400 320,492 160,400 160,136" fill="#080A09" />
    <polygon points="320,44 480,136 480,400 320,492 160,400 160,136" fill="none" stroke="#00C805" strokeOpacity=".38" strokeWidth="1.6" />
    <polygon points="320,84 446,156 446,380 320,452 194,380 194,156" fill="none" stroke="#00C805" strokeOpacity=".15" strokeWidth="1" />
  </svg>
);

/** Delivery truck beside the shipping disclosure. */
const SHIP_ICON = (
  <svg
    viewBox="0 0 24 24"
    className="h-[29px] w-[29px] shrink-0 stroke-m2m-green [filter:drop-shadow(0_0_10px_rgba(0,200,5,0.38))]"
    fill="none"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M3 7h11v9H3z" />
    <path d="M14 10h4l3 3v3h-7" />
    <circle cx="7" cy="18" r="1.8" />
    <circle cx="17" cy="18" r="1.8" />
  </svg>
);

export default function App() {
  // ACTIVE_SERVICES is already filtered to active + routable, so the merchandising
  // decision that used to be buried in the parser ("Temporarily suspend and hide PSA
  // Value tier services", marked temporary, still live six weeks later) is now a data
  // flag anyone can see in serviceMenu.ts and in the generated M2M_SERVICE_MENU.md.
  // Resolved ONCE, at boot. The menu deliberately never changes underneath a live session:
  // a customer part-way through choosing a service must not have the price move, and doing
  // the swap only when there is no session is the cheapest way to guarantee that. A newly
  // published menu lands at the next reload, which the update policy already schedules.
  const [menuAtBoot] = useState(resolveMenuAtBoot);
  const allServices = useMemo(
    () => menuAtBoot.services.filter((s) => s.active && s.questions !== null).map(toService),
    [menuAtBoot],
  );
  /** The one service the checkout can offer as a quick add — see the cart's upsell row. */
  const pregradeService = useMemo(
    () => allServices.find((s) => s.questions[0] === PREGRADE_CATEGORY) ?? null,
    [allServices],
  );
  
  const [step, setStep] = useState<'landing' | 'questions' | 'results' | 'handoff'>('landing');
  const [policyAccepted, setPolicyAccepted] = useState(false);
  /**
   * WHEN the box was ticked — captured at the tick, not at submit, so the record
   * matches the moment of agreement. Re-ticking updates it to the LAST tick;
   * unticking clears it. Travels with the order as `policyAcknowledgedAt`.
   */
  const [policyAcknowledgedAt, setPolicyAcknowledgedAt] = useState<string | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [showYearQuestion, setShowYearQuestion] = useState(false);
  // `auto` marks an answer the kiosk chose because it was the only one available. The
  // customer never saw that question, so Back must not return them to it — and the
  // answer still has to be shown, because a choice made on someone's behalf that they
  // cannot see is indistinguishable from a bug.
  const [selectedAnswers, setSelectedAnswers] = useState<{ value: string; auto: boolean }[]>([]);
  const [history, setHistory] = useState<{ questionIdx: number; services: Service[]; auto?: boolean; wasYearQuestion?: boolean }[]>([]);
  const [remainingServices, setRemainingServices] = useState<Service[]>(allServices);
  
  const [storeCode, setStoreCode] = useState(() => localStorage.getItem('storeCode') || '');
  const [brightness, setBrightness] = useState(() => parseInt(localStorage.getItem('brightness') || '100'));
  const [volume, setVolume] = useState(() => parseInt(localStorage.getItem('volume') || '80'));
  const [cardShowMode, setCardShowMode] = useState(() => localStorage.getItem('cardShowMode') === 'true');
  const [showPregradingPrice, setShowPregradingPrice] = useState(() => parseFloat(localStorage.getItem('showPregradingPrice') || '5.00'));
  const [globalDiscount, setGlobalDiscount] = useState(() => parseFloat(localStorage.getItem('globalDiscount') || '10'));
  const [showName, setShowName] = useState(() => localStorage.getItem('showName') || '');
  // `oversized` is a per-line flag, not a separate service, so a customer can order two
  // standard cards and one oversized in the same visit. Lines are keyed on service AND
  // flag for that reason.
  //
  // `minimumGrade` and `cardReference` (brief §5.2b) are per-line too. The cart line stays
  // the unit — there is deliberately no per-card row model, because the consumer is an M2M
  // staff member doing the PSA intake by hand, not PSA.
  //
  // `id` is a stable identity for a line. React keys and the per-line expanded state were
  // both on the array index, which is wrong the moment a line is removed: every row below
  // it inherits the state of the row that used to sit there.
  const [cart, setCart] = useState<CartLine[]>([]);
  const nextLineId = useRef(1);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [oversizedSel, setOversizedSel] = useState<Record<string, boolean>>({});
  const [customerNotes, setCustomerNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card');
  // 'submission' was already being set and read but was missing from this union.
  const [activeModal, setActiveModal] = useState<'terms' | 'privacy' | 'submission' | 'cart' | 'video' | null>(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);

  const playUIAudio = (frequency = 600, duration = 0.08) => {
    try {
      const savedVolume = localStorage.getItem('volume');
      const currentVal = savedVolume !== null ? parseInt(savedVolume) : volume;
      if (currentVal === 0) return;
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      
      const val = currentVal / 100;
      gainNode.gain.setValueAtTime(val * 0.05, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('UI Audio click failed:', e);
    }
  };

  // Sound is for COMMITTED ACTIONS ONLY (ruled 2026-08-10): add to cart, quantity
  // changes to a cart line, complete order. A step-change chime used to play here on
  // EVERY transition — including Back and the inactivity reset — which is exactly the
  // "never scroll or back" case the ruling forbids. Feedback for navigation is visual
  // (active states, the transition itself), not audible.

  useEffect(() => {
    if (step === 'results') {
      setShowScrollIndicator(true);
    }
  }, [step]);

  const [handoffCountdown, setHandoffCountdown] = useState(60);
  /** True for the last 30 seconds before an inactivity reset. */
  const [idleWarning, setIdleWarning] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Video Analytics State
  const playerRef = useRef<any>(null);
  const progressTracked = useRef<{ [key: number]: boolean }>({});
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  // --- Automatic Update Checker & Global Idle Reload (within Guided Access) ---
  const getBundleFromDoc = (docToScan: Document | any): string | null => {
    try {
      const scripts = Array.from(docToScan.getElementsByTagName('script')) as HTMLScriptElement[];
      for (const script of scripts) {
        const src = script.getAttribute('src');
        if (src) {
          if (src.includes('assets/index-') || src.includes('index-') || src.includes('main.tsx')) {
            return new URL(src, window.location.href).href;
          }
        }
      }
      for (const script of scripts) {
        const src = script.getAttribute('src');
        if (src && !src.includes('youtube.com') && !src.includes('ytimg.com')) {
          return new URL(src, window.location.href).href;
        }
      }
    } catch (e) {
      console.error('Error scanning document scripts:', e);
    }
    return null;
  };

  const currentBundleUrlRef = useRef<string | null>(null);

  useEffect(() => {
    currentBundleUrlRef.current = getBundleFromDoc(document);
    addLog(`VERSION_INITIAL: Running bundle is ${currentBundleUrlRef.current}`);
  }, []);

  const [updateDetected, setUpdateDetected] = useState(false);
  const updateDetectedRef = useRef(false);
  const pendingBundleUrlRef = useRef<string | null>(null);
  /** When this page loaded. Reported as uptime — a kiosk showing weeks has not reloaded. */
  const pageLoadedAtRef = useRef<number>(Date.now());
  /** A newly published menu is cached and waiting for the next reload to adopt it. */
  const menuPendingRef = useRef(false);
  const lastInteractionRef = useRef<number>(Date.now());

  /**
   * When this kiosk last took an update. In localStorage because it has to survive the
   * reload it describes — the whole point is to stop the kiosk re-applying inside the
   * same window, and an in-memory value is wiped by the very act it is guarding.
   */
  const readLastUpdateApplied = (): number | null => {
    try {
      const raw = localStorage.getItem(LAST_UPDATE_APPLIED_KEY);
      const parsed = raw === null ? NaN : Number(raw);
      return Number.isFinite(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };

  const writeLastUpdateApplied = (at: number) => {
    try {
      localStorage.setItem(LAST_UPDATE_APPLIED_KEY, String(at));
    } catch {
      // Storage full or blocked. The update still applies; the worst case is one extra
      // reload in this window, which is far better than refusing to update at all.
    }
  };

  /**
   * Updater health, persisted across reloads.
   *
   * The failure that matters is not one bad check — shop WiFi drops constantly — it is a
   * kiosk that has not completed a successful check since last month. That sentence can
   * only be written down, never remembered, so it lives in storage.
   */
  const readHealth = (): UpdateHealth => {
    try {
      const raw = localStorage.getItem(UPDATE_HEALTH_KEY);
      if (!raw) return { ...EMPTY_HEALTH, lastAppliedAt: readLastUpdateApplied() };
      return { ...EMPTY_HEALTH, ...JSON.parse(raw), lastAppliedAt: readLastUpdateApplied() };
    } catch {
      return { ...EMPTY_HEALTH };
    }
  };

  const writeHealth = (next: Partial<UpdateHealth>) => {
    try {
      const merged = { ...readHealth(), ...next };
      localStorage.setItem(UPDATE_HEALTH_KEY, JSON.stringify(merged));
    } catch {
      /* storage blocked — health is diagnostic, never load-bearing */
    }
  };

  const recordCheckSuccess = () => {
    const before = readHealth();
    writeHealth({ lastSuccessfulCheck: Date.now(), consecutiveFailures: 0 });
    // Logged only on the transition, so a recovery is findable in a log that is otherwise
    // one "OK" line every five minutes.
    if (before.consecutiveFailures > 0) {
      addLog(`VERSION_CHECK_RECOVERED after ${before.consecutiveFailures} failures`);
    }
  };

  const recordCheckFailure = (why: string) => {
    const before = readHealth();
    const consecutiveFailures = before.consecutiveFailures + 1;
    writeHealth({ consecutiveFailures, totalFailures: before.totalFailures + 1 });
    addLog(`VERSION_CHECK_FAILED (${consecutiveFailures} in a row): ${why}`);
  };

  // Keep state ref in sync
  useEffect(() => {
    updateDetectedRef.current = updateDetected;
  }, [updateDetected]);

  // Track global user interactions across window frame
  useEffect(() => {
    const handleUserInteraction = () => {
      lastInteractionRef.current = Date.now();
    };

    const interactionEvents = [
      'mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'
    ];
    
    interactionEvents.forEach(event => {
      window.addEventListener(event, handleUserInteraction, { passive: true });
    });

    return () => {
      interactionEvents.forEach(event => {
        window.removeEventListener(event, handleUserInteraction);
      });
    };
  }, []);

  const checkForUpdate = async () => {
    try {
      const res = await fetch(`/index.html?cb=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        cache: 'no-store'
      });
      if (!res.ok) {
        recordCheckFailure(`HTTP ${res.status}`);
        return;
      }
      const htmlText = await res.text();
      
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlText, 'text/html');
      const fetchedUrl = getBundleFromDoc(doc);

      if (!fetchedUrl) {
        // A 200 that is not the app — a captive-portal WiFi login page is the classic
        // shape, and it must not be mistaken for a healthy check.
        recordCheckFailure('response carried no bundle url');
        return;
      }

      if (!currentBundleUrlRef.current) {
        currentBundleUrlRef.current = fetchedUrl;
        addLog(`VERSION_CHECK_INIT: Base bundle is ${fetchedUrl}`);
        console.log(`Version Check Baseline set to: ${fetchedUrl}`);
        return;
      }

      // The check reached the server. Recorded BEFORE deciding whether the bundle changed,
      // because "did the poll work" and "is there an update" are different questions and
      // conflating them is what made a broken kiosk indistinguishable from a current one.
      recordCheckSuccess();

      const current = currentBundleUrlRef.current;
      if (fetchedUrl !== current) {
        addLog(`VERSION_CHECK_UPDATE: Detected new bundle ${fetchedUrl} (Running: ${current})`);
        // Remembered so the pre-reload check can fetch the exact bundle we are about to
        // reload into, rather than merely proving that *something* answers.
        pendingBundleUrlRef.current = fetchedUrl;
        setUpdateDetected(true);
        console.log(`Version Check: New bundle detected! (${fetchedUrl})`);
      } else {
        addLog(`VERSION_CHECK_OK: Kiosk is up-to-date (Running: ${current})`);
        console.log(`Version Check: Kiosk is up-to-date.`);
      }
    } catch (e) {
      console.error('Failed to run version update check:', e);
      recordCheckFailure((e as Error)?.message ?? 'unknown');
    }
  };

  /**
   * Confirm the new bundle is genuinely fetchable before committing to a reload.
   *
   * `navigator.onLine` reports a LINK, not reachability — an iPad associated to a shop
   * access point whose uplink is down reports online. Reloading on that answer lands on a
   * Safari error page, and because the app is gone, nothing retries: the kiosk is dead
   * until someone notices. Actually pulling the bundle is the only honest test, and it is
   * cheap next to the cost of being wrong.
   */
  const newBundleIsReachable = async (): Promise<boolean> => {
    try {
      const target = pendingBundleUrlRef.current;
      if (!target) return false;
      const res = await fetch(`${target}${target.includes('?') ? '&' : '?'}cb=${Date.now()}`, {
        cache: 'no-store',
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  // Poll for bundle updates periodically (every 5 mins) & evaluate the update policy
  useEffect(() => {
    // 1. Poll every 5 minutes for a new bundle AND for a newly published menu.
    //
    // Both are "the kiosk must restart to pick this up", so they share one mechanism
    // rather than growing two. A price edit and a code deploy then reach the fleet on the
    // same schedule, through the same network check, with the same idle requirement.
    const pollForChanges = () => {
      addLog('VERSION_CHECK_START: Querying server index');
      checkForUpdate()
        // AFTER the check, so the beacon carries this round's result rather than the
        // previous one. A fleet view whose health is always one cycle stale reports a
        // kiosk as fine on the run where it first broke.
        .finally(reportIn);
      refreshPublishedMenu(menuAtBoot.version, addLog).then(({ changed }) => {
        if (changed) menuPendingRef.current = true;
      });
    };

    /*
     * Tell HQ what this kiosk is, quietly.
     *
     * Inert until a URL is configured, rate-limited to once per ten minutes unless
     * something meaningful changed, and every failure is swallowed. A kiosk that cannot
     * report is still a kiosk that sells.
     *
     * ⚠️ THE ROSTER IS THE SOURCE OF TRUTH AND SILENCE IS THE ALARM. This half only makes
     * silence meaningful; the receiving end holds the expected list of shops, so the
     * finding is a row that has NOT been heard from. A dashboard built from kiosks that
     * reported can only ever show healthy ones.
     */
    const reportIn = () => {
      void sendTelemetry(
        buildPayload({
          storeCode: localStorage.getItem('storeCode') || '',
          menuVersion: menuAtBoot.version,
          health: readHealth(),
          updatePending: updateDetectedRef.current || menuPendingRef.current,
          pageLoadedAt: pageLoadedAtRef.current,
        }),
        Date.now(),
      );
    };
    const updatePollInterval = setInterval(pollForChanges, 5 * 60 * 1000); // 5 minutes
    // Once at boot too. The old code waited a full five minutes before its first check,
    // so a kiosk restarted to pick up a fix learned about the next one late.
    pollForChanges();

    /*
     * ── RE-CHECK ON WAKE — cheap insurance, NOT the fix for the live fleet. ──
     *
     * I originally wrote this as the answer to stuck kiosks, on the theory that a sleeping
     * iPad suspends `setInterval`. **That theory is dead.** Cayden established 2026-08-07
     * how the fleet actually runs: Safari → Add to Home Screen → standalone web app under
     * Guided Access. They never sleep, so timer suspension was never happening.
     *
     * The real cause is not fixable in software: builds between 2026-03-14 and 2026-05-22
     * shipped with NO update mechanism at all, so a kiosk last touched in that window has
     * nothing on the device listening and can never be reached by a deploy. Those need a
     * person to delete and re-add the Home Screen icon.
     *
     * These listeners stay because they cost two event handlers and still cover cases that
     * do occur — a device powered off overnight, iOS reclaiming memory from a backgrounded
     * app, or a shop that runs the kiosk as an ordinary Safari tab. They are no longer
     * claimed to be load-bearing.
     *
     * Both events, because they fire in different situations: `visibilitychange` covers the
     * app being re-foregrounded; `pageshow` with `persisted` covers a back/forward-cache
     * restore, where no other lifecycle event fires at all.
     */
    const recheckOnWake = (why: string) => {
      addLog(`VERSION_CHECK_WAKE: ${why}`);
      pollForChanges();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') recheckOnWake('visibilitychange');
    };
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) recheckOnWake('pageshow/bfcache');
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pageshow', onPageShow as EventListener);

    // 2. Every 10 seconds, ask the policy whether now is the moment.
    //
    // This used to be "reload as soon as idle 5 minutes", which is why a deploy rolled
    // through the shops one at a time all afternoon, and why a kiosk could reload onto a
    // dead network. The policy adds two windows a day and a network check; the fetch
    // below adds proof. See src/updatePolicy.ts.
    let applying = false;
    const idleCheckInterval = setInterval(async () => {
      if (applying) return;

      const decision = shouldApplyUpdate({
        now: new Date(),
        updatePending: updateDetectedRef.current || menuPendingRef.current,
        online: navigator.onLine,
        msSinceInteraction: Date.now() - lastInteractionRef.current,
        lastAppliedAt: readLastUpdateApplied(),
      });
      if (!decision.apply) return;

      applying = true;
      // A menu-only change needs no bundle check — the new menu is already cached on the
      // device and a reload simply adopts it. Demanding a reachable bundle would strand a
      // published price change behind an unrelated network problem.
      if (updateDetectedRef.current && !(await newBundleIsReachable())) {
        // Deliberately does NOT mark the window as serviced — the kiosk is still owed
        // this update and should retry on the next tick once the network recovers.
        addLog('VERSION_HOLD: Update due but the new bundle could not be fetched. Not reloading.');
        applying = false;
        return;
      }

      addLog(`VERSION_AUTO_RELOAD: Applying update in window (${decision.reason}).`);
      writeLastUpdateApplied(Date.now());
      clearInterval(updatePollInterval);
      clearInterval(idleCheckInterval);
      hardReload();
    }, 10000); // 10 seconds

    return () => {
      clearInterval(updatePollInterval);
      clearInterval(idleCheckInterval);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pageshow', onPageShow as EventListener);
    };
  }, []);

  /*
   * ── INACTIVITY RESET, WITH A WARNING FIRST ──
   *
   * A hard timeout with no warning is an accessibility failure, not a convenience. It
   * resets someone who is simply reading slowly, or who is deaf, or dyslexic, or elderly,
   * or translating the screen for a friend — and it takes their order with it and tells
   * them nothing about why. The customer's own reasonable pace becomes the fault.
   *
   * So the last 30 seconds are spent asking. The countdown is visible, the dismissal is a
   * single large tap, and taking it resets the clock completely — anyone who needs longer
   * can have longer, as many times as they like.
   */
  useEffect(() => {
    if (step === 'landing') {
      setIdleWarning(false);
      return;
    }

    let warnId: NodeJS.Timeout;
    let resetId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(warnId);
      clearTimeout(resetId);
      setIdleWarning(false);
      warnId = setTimeout(() => setIdleWarning(true), IDLE_WARNING_AFTER_MS);
      resetId = setTimeout(() => {
        addLog('Global Inactivity Timeout');
        handleReset();
      }, IDLE_RESET_AFTER_MS);
    };

    // `input` is here because the other events do not reliably fire while someone is
    // typing on the iPad's on-screen keyboard: the software keyboard is not part of the
    // page, so its taps produce no `touchstart`, and `keypress` is deprecated and skipped
    // by dictation, autocorrect accepts and paste. Without it the kiosk can reset out from
    // under a customer mid-sentence.
    const events = ['mousedown', 'mousemove', 'keypress', 'input', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(warnId);
      clearTimeout(resetId);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [step]);

  const handleScroll = () => {
    if (scrollRef.current && scrollRef.current.scrollTop > 20) {
      setShowScrollIndicator(false);
    }
  };

  // The AI chat box that used to live here was removed on 2026-08-05 (Cayden's decision).
  // It sat on the landing screen, 550px tall, below a wall of disclaimers, and it was the
  // only reason the app shipped a Gemini API key into a public bundle. It is recoverable
  // from git history — `git log -S sendMessage` — if it is ever wanted back, but it would
  // need a server-side proxy first.

  /** The per-card price of a line, before any oversized upcharge. */
  const unitPriceOf = (service: Service) =>
    cardShowMode && service.name.toLowerCase().includes('pregrading')
      ? showPregradingPrice
      : parseFloat(service.cost.replace(/[^0-9.]/g, '')) || 0;

  /** The oversized upcharge actually applying to a line — 0 unless the customer chose it. */
  const surchargeOf = (item: { service: Service; oversized: boolean }) =>
    item.oversized ? item.service.oversizedSurcharge : null;

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + lineTotal(unitPriceOf(item.service), item.quantity, surchargeOf(item)), 0),
    [cart, cardShowMode, showPregradingPrice],
  );

  const showDiscount = useMemo(() => {
    if (!cardShowMode) return 0;
    // The show discount applies to the SERVICE price only. The oversized upcharge is a
    // pass-through of what BGS charges, carrying $1.50 of margin — discounting it 10%
    // would sell it at a loss.
    const eligibleSubtotal = cart.reduce((sum, item) => {
      if (!item.service.name.toLowerCase().includes('pregrading')) {
        return sum + unitPriceOf(item.service) * item.quantity;
      }
      return sum;
    }, 0);
    return eligibleSubtotal * (globalDiscount / 100);
  }, [cart, cardShowMode, globalDiscount, showPregradingPrice]);

  /**
   * Does any line carry a price that is only a floor?
   *
   * One such line makes the whole total a minimum, so this drives both the cart copy and
   * the handoff. JSA and PSA/DNA memorabilia are assessed per item AFTER the order.
   */
  const cartHasMinimumPricedItem = useMemo(
    () => cart.some((item) => item.service.priceIsMinimum),
    [cart],
  );

  // Shipping & insurance — $24.00 FLAT, once per order, however many cards.
  // The rule, its history and its tests live in src/pricing.ts. This is the only place
  // the app calls it, and renderHandoff reuses this value rather than recomputing it.
  const shippingFee = useMemo(() => shippingFeeForCart(cart.length), [cart]);

  const total = subtotal + shippingFee - showDiscount;

  const addBusinessDays = (startDate: Date, days: number) => {
    // ⚠️ MAINTENANCE REQUIRED ANNUALLY.
    // These are US federal holidays (observed). When the calendar runs out, estimated
    // completion dates do NOT error — they silently drift, counting holidays as business
    // days. Extend this list before the last year listed expires.
    // Proper fix: compute federal holidays algorithmically so this can never lapse.
    const holidays = [
      // 2026
      "2026-01-01", // New Year's Day
      "2026-01-19", // MLK Day
      "2026-02-16", // Presidents' Day
      "2026-05-25", // Memorial Day
      "2026-06-19", // Juneteenth
      "2026-07-03", // Independence Day (Observed)
      "2026-09-07", // Labor Day
      "2026-10-12", // Columbus Day
      "2026-11-11", // Veterans Day
      "2026-11-26", // Thanksgiving Day
      "2026-12-25", // Christmas Day
      // 2027
      "2027-01-01", // New Year's Day
      "2027-01-18", // MLK Day
      "2027-02-15", // Presidents' Day
      "2027-05-31", // Memorial Day
      "2027-06-18", // Juneteenth (Observed — Jun 19 is a Saturday)
      "2027-07-05", // Independence Day (Observed — Jul 4 is a Sunday)
      "2027-09-06", // Labor Day
      "2027-10-11", // Columbus Day
      "2027-11-11", // Veterans Day
      "2027-11-25", // Thanksgiving Day
      "2027-12-24", // Christmas Day (Observed — Dec 25 is a Saturday)
    ];

    let date = new Date(startDate);
    let added = 0;
    while (added < days) {
      date.setDate(date.getDate() + 1);
      const dateStr = date.toISOString().split('T')[0];
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const isHoliday = holidays.includes(dateStr);
      
      if (!isWeekend && !isHoliday) {
        added++;
      }
    }
    return date;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getEstimatedDate = (turnaroundStr: string) => {
    const days = parseInt(turnaroundStr.replace(/\D/g, '')) || 0;
    // Use current date for estimates
    const today = new Date();
    const estimatedDate = addBusinessDays(today, days);
    return formatDate(estimatedDate);
  };

  const updateQuantity = (serviceName: string, delta: 1 | -1) => {
    setQuantities(prev => ({
      ...prev,
      [serviceName]: stepQuantity(prev[serviceName] || 1, delta),
    }));
  };

  /**
   * Bulk quantity entry (Phase 2 P5). The stepper is right at real quantities — the
   * five most common orders never pass three cards — but 30 cards must not be 29
   * taps. Tapping the quantity NUMBER (results stepper or a cart line) opens this
   * keypad. Digits give visual feedback only; the commit sound plays on Done when it
   * changes a cart line, because that is the moment the order changes.
   */
  const [keypadTarget, setKeypadTarget] = useState<
    { kind: 'results'; name: string } | { kind: 'line'; id: number } | null
  >(null);
  // The calculator convention lives in quantity.ts as a pure state machine, tested
  // there — this is only the React shell around it.
  const [keypadState, setKeypadState] = useState<KeypadState>({ entry: '', pristine: true });

  const openKeypad = (
    target: { kind: 'results'; name: string } | { kind: 'line'; id: number },
    current: number,
  ) => {
    setKeypadTarget(target);
    setKeypadState(openKeypadState(current));
  };

  const commitKeypad = () => {
    const qty = keypadQuantity(keypadState.entry);
    if (qty === null || keypadTarget === null) return;
    if (keypadTarget.kind === 'line') {
      playUIAudio(700, 0.08);
      updateCartLine(keypadTarget.id, { quantity: qty });
    } else {
      setQuantities((prev) => ({ ...prev, [keypadTarget.name]: qty }));
    }
    setKeypadTarget(null);
  };

  const addToCart = (service: Service, qtyOverride?: number) => {
    playUIAudio(700, 0.08);
    const oversized = !!oversizedSel[service.name] && service.oversizedSurcharge !== null;
    addLog(`Added ${service.name}${oversized ? ' (oversized)' : ''} to Cart`);
    // `qtyOverride` exists for callers that never showed a quantity control — the
    // cart's quick-add row says "per card" and must add exactly one, not whatever
    // count a previous visit to the results stepper left in `quantities`.
    const qty = qtyOverride ?? (quantities[service.name] || 1);
    setCart(prev => {
      // Merge on service AND oversized: the same service at two different prices is two
      // lines, otherwise one flag would silently reprice cards the customer already added.
      //
      // A line that already carries a minimum grade is NOT a merge target. Folding a later
      // addition into it would silently apply someone's grade threshold to cards they
      // never chose it for — and the downside of that threshold is the whole fee. Two
      // lines is also the shape §5.2b describes for "minimum 9 on two, minimum 8 on one":
      // the customer sets the second grade on the new line.
      const target = prev.find(
        item =>
          item.service.name === service.name &&
          item.oversized === oversized &&
          item.minimumGrade === null,
      );
      if (target) {
        return prev.map(item =>
          item.id === target.id ? { ...item, quantity: item.quantity + qty } : item
        );
      }
      return [
        ...prev,
        { id: nextLineId.current++, service, quantity: qty, oversized, minimumGrade: null, cardReference: '' },
      ];
    });
    // Reset local quantity after adding
    setQuantities(prev => ({ ...prev, [service.name]: 1 }));
    setOversizedSel(prev => ({ ...prev, [service.name]: false }));
    // Adding shows you your order (Phase 2 P1a): the checkout IS the confirmation of
    // what the press just did, and the Cart-button press it replaces carried no
    // information — every completed order pressed it next anyway. "Another Service"
    // remains one press away, on this modal's own footer.
    setActiveModal('cart');
  };

  const removeFromCart = (id: number) => {
    playUIAudio(450, 0.08);
    setCart(prev => prev.filter(item => item.id !== id));
  };

  /** Edit one cart line in place, by identity rather than by position. */
  const updateCartLine = (id: number, patch: Partial<CartLine>) => {
    setCart(prev => prev.map(item => (item.id === id ? { ...item, ...patch } : item)));
  };

  // Which lines have the minimum-grade control open. Collapsed is the default and the
  // point (§5.2d) — a customer who has never heard of minimum grading must be able to
  // finish an order without ever opening it, and without wondering whether they skipped a
  // required step. A line that HAS a grade or a reference is always rendered open, so a
  // choice the customer made can never be hidden from them behind a collapsed summary.
  const [openMinGradeLines, setOpenMinGradeLines] = useState<number[]>([]);
  const isMinGradeOpen = (item: CartLine) =>
    openMinGradeLines.includes(item.id) || item.minimumGrade !== null || item.cardReference !== '';

  const questionTexts = [
    "What can we help you with today?",
    "Preferred grading company.",
    "Is the item autographed?",
    "Pack-Pulled or Aftermarket?",
    "Select the Card Release Year",
    "Which variation?"
  ];

  const getQuestionText = (idx: number, answers: string[]) => {
    if (idx === 1 && answers[0]?.toLowerCase() === 'memorabilia') {
      return "CHOOSE AN AUTHENTICATOR";
    }
    return questionTexts[idx];
  };

  const questionDefinitions = [
    null,
    null,
    null,
    {
      "Pack-pulled": "A hand-signed signature from an athlete or celebrity that is officially inserted into a sealed, commercial, or retail pack by the manufacturer.",
      "Aftermarket": "A signature added to a trading card or collectible by the signer after its initial release."
    },
    null,
    null
  ];

  // --- Logic ---
  // The flow logic — filterByAnswer, getOptionsForQuestion, autoAdvance and the
  // service-question vs card-question split that decides what may be answered on the
  // customer's behalf — lives in src/flow.ts, pure and tested. It was inline here when
  // its "sixteen auto-advance events" comment silently went stale at 25; the real
  // counts are now pinned in flow.test.ts, where drifting fails the gate instead.

  /**
   * Both home-screen cards start the SAME flow with a different opening filter. There is
   * no second code path: a fork would be two flows to keep in step, and they would not
   * stay in step.
   *
   * The policy acknowledgement does not gate this. It gates "Complete Order" at checkout,
   * where the customer is already committed. Leading a stranger with five disclaimers is
   * what made people ask "what is Market2Mint?" while standing in front of the kiosk.
   */
  const startFlow = (entry: 'pregrade' | 'submissions') => {
    // No sound: starting the flow is navigation, not a commitment. The tap sound is
    // reserved for actions that change the order, so it always means the same thing.
    addLog(`START_SUBMISSION: ${entry}`);

    const isPregrade = (s: Service) => s.questions[0] === PREGRADE_CATEGORY;

    const advanced = entry === 'pregrade'
      ? autoAdvance(
          allServices.filter(isPregrade),
          1,
          // Shown to the customer as a normal answer, because it is one — they chose it
          // by tapping the card...
          [{ value: PREGRADE_CATEGORY, auto: false }],
          // ...but flagged in the history as machine-made, so Back returns them to the
          // home screen rather than to a category list they never saw.
          [{ questionIdx: 0, services: allServices, auto: true }],
          addLog,
        )
      // Pregrading has its own entry now, so it must not reappear as an option inside
      // submissions. Question 1 is still asked — minus that one choice.
      : autoAdvance(allServices.filter((s) => !isPregrade(s)), 0, [], [], addLog);

    setSelectedAnswers(advanced.answers);
    setHistory(advanced.trail);
    setRemainingServices(advanced.services);
    setCurrentQuestionIdx(advanced.idx);
    setStep(advanced.idx >= 6 ? 'results' : 'questions');
  };

  const handleAnswer = (answer: string) => {
    addLog(`Answered Q${currentQuestionIdx + 1}: ${answer}`);

    const nextServices = filterByAnswer(remainingServices, currentQuestionIdx, answer);
    const advanced = autoAdvance(
      nextServices,
      currentQuestionIdx + 1,
      [...selectedAnswers, { value: answer, auto: false }],
      [...history, { questionIdx: currentQuestionIdx, services: remainingServices }],
      addLog,
    );

    setSelectedAnswers(advanced.answers);
    setHistory(advanced.trail);
    setRemainingServices(advanced.services);
    if (advanced.idx >= 6) {
      setStep('results');
    } else {
      setCurrentQuestionIdx(advanced.idx);
    }
  };

  const handleYearAnswer = (yearOption: string) => {
    // Deprecated legacy handler, bypassed in 6-step dynamic mode
  };

  const handleBack = () => {
    if (showYearQuestion) {
      setShowYearQuestion(false);
      return;
    }

    // Special case for Memorabilia authenticator selection
    if (currentQuestionIdx === 1 && selectedAnswers[0]?.value.toLowerCase() === 'memorabilia') {
      handleReset();
      return;
    }

    if (history.length === 0) {
      setStep('landing');
      return;
    }

    // Rewind to the last question the CUSTOMER answered, not the last question answered.
    // Landing on an auto-answered question would immediately auto-advance forward again,
    // which reads as a dead Back button.
    let target = history.length - 1;
    while (target > 0 && history[target].auto) target--;
    const lastState = history[target];

    if (lastState.wasYearQuestion) {
      setShowYearQuestion(true);
      setHistory(history.slice(0, target));
      setRemainingServices(lastState.services);
      setCurrentQuestionIdx(lastState.questionIdx);
      setSelectedAnswers(selectedAnswers.slice(0, target));
      return;
    }

    // Every auto-answer before the first real question is still true at the landing
    // screen, so if nothing manual remains, go home rather than to a screen with one
    // button on it.
    if (history.slice(0, target + 1).every((h) => h.auto)) {
      setStep('landing');
      return;
    }

    setHistory(history.slice(0, target));
    setSelectedAnswers(selectedAnswers.slice(0, target));
    setRemainingServices(lastState.services);
    setCurrentQuestionIdx(lastState.questionIdx);
    if (step === 'results') setStep('questions');
  };

  const handleReset = () => {
    if (step === 'questions') {
      addLog(`Abandoned at Q${currentQuestionIdx + 1}`);
    } else {
      addLog('Reset Application');
    }
    setStep('landing');
    setPolicyAccepted(false);
    setPolicyAcknowledgedAt(null);
    setCurrentQuestionIdx(0);
    setSelectedAnswers([]);
    setHistory([]);
    setRemainingServices(allServices);
    setActiveModal(null);
    setCart([]);
    setQuantities({});
    setOversizedSel({});
    setOpenMinGradeLines([]);
    setCustomerNotes('');
    setPaymentMethod('card');
    // The keypad renders above every step, so an abandoned one would sit over the
    // NEXT customer's attract screen — and a stale Done could commit the previous
    // customer's count into their session. Found by review 2026-08-10.
    setKeypadTarget(null);
    setKeypadState({ entry: '', pristine: true });
  };

  /**
   * "Another service" restarts at question 1 across the WHOLE menu, including Pregrading.
   *
   * Not from the card the customer came in through: restarting the pregrade entry would
   * land them straight back on the one service they are already looking at, which is a
   * button that appears to do nothing. And the rule that Pregrading must not appear
   * inside the submissions flow is about the home screen not offering two routes to the
   * same thing — once someone is adding a SECOND item, a pregrade is a legitimate thing
   * to want, and this is the only way to build a mixed order.
   */
  const handleSelectAnother = () => {
    const advanced = autoAdvance(allServices, 0, [], [], addLog);
    setSelectedAnswers(advanced.answers);
    setHistory(advanced.trail);
    setRemainingServices(advanced.services);
    setCurrentQuestionIdx(advanced.idx);
    setStep(advanced.idx >= 6 ? 'results' : 'questions');
  };

  /**
   * LANDING — the attract screen.
   *
   * It has exactly one job: tell a stranger standing a few feet away what Market2Mint
   * does, what it costs, and how to start — in that order. Customers kept asking "what is
   * Market2Mint?" while looking straight at this screen, because it used to open with
   * the app's own name, then five liability statements under the heading "Submission
   * Essentials", then a mandatory acknowledgement checkbox, then a 550px AI chat box.
   * There was no price anywhere on it.
   *
   * Rules this screen is built to (CLAUDE.md + M2M_BRAND_FOUNDATION_v6.md):
   *  · Liability copy belongs at checkout, not on the attract screen. POLICY now renders
   *    in the cart, where the acknowledgement gates "Complete Order".
   *  · Pregrade-led, but NEVER pregrade-only — submissions stay visible alongside it.
   *  · $7.00 kiosk pregrade. The $5.00 show price may only appear when show mode is
   *    explicitly enabled, and never on kiosk artwork.
   *  · The $24.00 line is disclosed early and verbatim, because customers assume it is
   *    charged per card.
   *  · Wordmark is set in type — Inter 800, words in ivory, the "2" in green. The live
   *    physical panel has this inverted; do not copy it. The badge is the real asset,
   *    never redrawn.
   *  · No phone numbers, and no partner logos (rights uncleared in writing) — naming the
   *    grading companies in plain body text is fine and is what tells a stranger what
   *    this is.
   *
   * Sized for the actual device: an iPad in landscape (~1180×820), panel-mounted at
   * counter height. The whole screen fits without scrolling there; `overflow-y-auto` is
   * only a safety net so a shorter viewport scrolls instead of clipping.
   */
  const landingPregradePrice = cardShowMode ? showPregradingPrice : PREGRADE_PRICE_KIOSK;

  /*
   * Hero crossfade: 9s dwell, deliberately NOT a divisor of the 14s CSS turn, so the
   * swap lands at a different angle each cycle and never reads as a scripted loop.
   * Gated on the landing step (no work while a customer is mid-order) and on
   * prefers-reduced-motion (the first card simply stays up, mid-turn per the CSS).
   */
  const [heroSlab, setHeroSlab] = useState(0);
  useEffect(() => {
    if (step !== 'landing') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setHeroSlab((i) => (i + 1) % HERO_SLABS.length), HERO_DWELL_MS);
    return () => clearInterval(id);
  }, [step]);

  const renderLanding = () => (
    <div className="landing-stage h-full w-full overflow-hidden">
      {/*
        The gradient ground is full-bleed (the outer div) while the content column caps
        at 1366px — so a wider 1.44:1 tablet gets more dark stage, never letterbox bars.
        overflow-y-auto is a safety net only: on every iPad we mount, this fits.
      */}
      {/* Show mode paints a fixed banner in the top-left corner; the header is now
          left-aligned, so give the column extra top room then or the banner sits on
          the badge. */}
      <div
        className={`mx-auto flex h-full w-full max-w-[1366px] flex-col overflow-y-auto px-10 pb-[var(--pad-b)] ${
          cardShowMode ? 'pt-14' : 'pt-[var(--pad-t)]'
        }`}
      >

        {/* ── WHO ── lateral lockup. Never stack the badge above the wordmark — that is
            the retired stacked lockup. The ESPAÑOL pill is deferred; its slot stays
            empty on purpose, nothing else moves into it. */}
        <header className="flex shrink-0 items-center gap-[18px]">
          {/* The real badge asset, embedded. Never redrawn, never recoloured. */}
          <img
            src={badgeUrl}
            alt=""
            className="h-auto w-[var(--badge-w)] [filter:drop-shadow(0_0_14px_rgba(0,200,5,0.30))]"
          />
          <div>
            {/* Wordmark set in type: ivory words, green 2. Brand mark — not in LANDING
                because it never translates. */}
            {/* Market2Mint — mixed case per the lockup spec §7: the 2 is a lining
                figure at cap height, so between lowercase t and M it stands taller
                than its neighbours and reads as distinct by SHAPE before colour —
                which is what survives one-colour reproduction. */}
            <p className="text-[length:var(--wordmark)] font-extrabold leading-none tracking-[0.5px] text-m2m-ivory">
              Market
              <span className="text-m2m-green [text-shadow:0_0_18px_rgba(0,200,5,0.38)]">2</span>
              Mint
            </p>
            <p className="mt-[5px] text-[10.5px] font-semibold tracking-[4px] text-m2m-ink3">
              {LANDING.tagline}
            </p>
          </div>
        </header>

        {/* flex-1 lets the row absorb spare height on a tall screen; no min-h-0 —
            on a short viewport the row keeps its content height and the outer
            overflow-y-auto scrolls, instead of the columns painting over the strips
            below. */}
        <div className="mt-[var(--gap-main)] grid flex-1 grid-cols-[minmax(0,1fr)_var(--hero-col)] gap-[30px]">
          <div className="min-w-0">
            {/* ── WHAT IS THIS? ── */}
            <h1 className="mt-1 text-[length:var(--h1)] font-extrabold leading-[1.06] tracking-[-0.4px] text-m2m-ivory">
              {LANDING.h1Line1}
              <br />
              <span className="text-m2m-green [text-shadow:0_0_26px_rgba(0,200,5,0.38)]">
                {LANDING.h1Green}
              </span>
              {LANDING.h1Tail}
            </h1>
            <p className="mt-[clamp(8px,1.4vh,14px)] max-w-[620px] text-[length:var(--sub)] leading-[1.5] text-m2m-ink2">
              {LANDING.sub}
            </p>

            <div className="mt-[clamp(10px,2vh,20px)] flex gap-6 max-[1120px]:gap-4">
              {LANDING.chips.map((chip, i) => (
                <div key={chip.label} className="flex items-center gap-2.5">
                  <span className="flex h-[35px] w-[35px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-[rgba(0,200,5,0.55)] bg-[rgba(0,200,5,0.12)] max-[1120px]:h-[29px] max-[1120px]:w-[29px]">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4 stroke-m2m-green"
                      fill="none"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      {CHIP_ICON_PATHS[i]}
                    </svg>
                  </span>
                  <span>
                    <span className="block text-[14.5px] font-semibold leading-tight text-m2m-ivory max-[1120px]:text-[12.5px]">
                      {chip.label}
                    </span>
                    <span className="mt-px block text-[11px] font-medium text-m2m-ink3 max-[1120px]:text-[10px]">
                      {chip.caption}
                    </span>
                  </span>
                </div>
              ))}
            </div>

            {/*
              ── WHAT DOES IT COST, AND HOW DO I START? ──
              The cards ARE the action — the whole surface is the button; the CTA row
              inside is visual. Pregrade leads; submissions sit beside it, never behind
              it. Both start the same flow with a different opening filter.
            */}
            <div className="mt-[clamp(12px,2.2vh,22px)] grid grid-cols-[1.06fr_1fr] gap-[18px]">
              <button
                onClick={() => startFlow('pregrade')}
                className="svc-primary relative overflow-hidden rounded-[18px] px-6 pb-[var(--svc-pb)] pt-[var(--svc-pt)] text-left transition-transform duration-[120ms] active:scale-[0.985]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[12.5px] font-bold tracking-[2.6px] text-m2m-green [text-shadow:0_0_12px_rgba(0,200,5,0.38)]">
                    {LANDING.pregrade.label}
                  </span>
                  <span className="rounded-full bg-m2m-green px-3 py-[5px] text-[10.5px] font-bold tracking-[1.6px] text-m2m-jet [box-shadow:0_0_16px_rgba(0,200,5,0.38)]">
                    {LANDING.pregrade.pill}
                  </span>
                </div>
                <div className="mt-[9px] flex items-baseline gap-2.5">
                  {/* Never a literal price — card-show mode quotes the show figure. */}
                  <span className="tabular-nums text-[length:var(--price)] font-extrabold leading-none tracking-[-0.8px] text-m2m-green [text-shadow:0_0_26px_rgba(0,200,5,0.38)]">
                    {formatUSD(landingPregradePrice)}
                  </span>
                  <span className="text-[11px] font-bold tracking-[1.8px] text-m2m-ink3">
                    {LANDING.pregrade.perUnit}
                  </span>
                </div>
                <p className="mt-[9px] min-h-[var(--copy-minh)] text-sm leading-[1.5] text-m2m-ink2">
                  <strong className="font-semibold text-m2m-ivory">
                    {LANDING.pregrade.copyStrong}
                  </strong>
                  {LANDING.pregrade.copyRest}
                </p>
                <div className="mt-[9px] flex items-center gap-[7px]">
                  <span className="mr-0.5 text-[10.5px] font-bold tracking-[1.2px] text-m2m-ink3">
                    {LANDING.pregrade.meterLabel}
                  </span>
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} className="meter-bar">
                      <i style={{ animationDelay: `${i * 0.3}s` }} />
                    </span>
                  ))}
                </div>
                <span className="mt-[clamp(8px,1.3vh,13px)] inline-flex min-h-[clamp(40px,4.4vh,44px)] items-center gap-[9px] rounded-xl bg-m2m-green px-[22px] text-sm font-bold tracking-[1.3px] text-m2m-jet [box-shadow:0_6px_26px_rgba(0,200,5,0.35)]">
                  {LANDING.pregrade.cta}
                  <span className="font-extrabold">›</span>
                </span>
              </button>

              <button
                onClick={() => startFlow('submissions')}
                className="svc-plain relative overflow-hidden rounded-[18px] px-6 pb-[var(--svc-pb)] pt-[var(--svc-pt)] text-left transition-transform duration-[120ms] active:scale-[0.985]"
              >
                <span className="block text-[12.5px] font-bold tracking-[2.6px] text-m2m-ivory">
                  {LANDING.submission.label}
                </span>
                <div className="mt-[9px] flex items-baseline gap-2.5">
                  <span className="text-lg font-semibold text-m2m-ink2">
                    {LANDING.submission.from}
                  </span>
                  <span className="tabular-nums text-[length:var(--price)] font-extrabold leading-none tracking-[-0.8px] text-m2m-ivory">
                    {formatUSD(SUBMISSION_FROM_PRICE)}
                  </span>
                  <span className="text-[11px] font-bold tracking-[1.8px] text-m2m-ink3">
                    {LANDING.submission.perUnit}
                  </span>
                </div>
                <p className="mt-[9px] min-h-[var(--copy-minh)] text-sm leading-[1.5] text-m2m-ink2">
                  {LANDING.submission.copy}
                </p>
                <span className="mt-[clamp(8px,1.3vh,13px)] inline-flex min-h-[clamp(40px,4.4vh,44px)] items-center gap-[9px] rounded-xl border-[1.5px] border-[rgba(0,200,5,0.55)] bg-[rgba(0,200,5,0.06)] px-[22px] text-sm font-bold tracking-[1.3px] text-m2m-ivory">
                  {LANDING.submission.cta}
                  <span className="font-extrabold">›</span>
                </span>
              </button>
            </div>

            {/* ── The shipping fee, disclosed early. Customers assume it is per card.
                The figure is composed from pricing.ts; landingStrings.test.ts proves
                figure + tail === SHIPPING_DISCLOSURE, so this line cannot drift. ── */}
            <div className="ship-bar mt-[var(--row-my)] flex items-center gap-[15px] rounded-[14px] border border-m2m-line px-[22px] py-[clamp(8px,1.4vh,14px)]">
              {SHIP_ICON}
              <p className="text-[length:var(--sub)] font-semibold text-m2m-ivory">
                <b className="tabular-nums font-extrabold text-m2m-green [text-shadow:0_0_14px_rgba(0,200,5,0.38)]">
                  {formatUSD(SHIPPING_AND_INSURANCE)}
                </b>{' '}
                {LANDING.ship.tail}
              </p>
              <span className="ml-auto text-right leading-tight">
                <span className="block text-[11px] font-bold tracking-[2px] text-m2m-ivory max-[1120px]:text-[10px] max-[1120px]:tracking-[1px]">
                  {LANDING.ship.labelA}
                </span>
                <span className="mt-0.5 block text-[10px] font-semibold tracking-[1.8px] text-m2m-ink3 max-[1120px]:text-[9px] max-[1120px]:tracking-[1px]">
                  {LANDING.ship.labelB}
                </span>
              </span>
            </div>
          </div>

          {/* ── HERO COLUMN ── overflow-hidden is load-bearing: everything decorative
              in here is sized against the COLUMN and clipped to it, so nothing this
              block ever does can cover copy the customer has to read. Anatomy per
              design record §2, painted back to front — halo, alcove, plate, badge,
              slab rotation, pedestal, proof band. Entirely inert: nothing in this
              column is tappable. */}
          <div className="hero-col relative flex min-h-0 flex-col items-center justify-center overflow-hidden">
            <div className="hero-halo" />
            <div className="hero-wings">{HERO_WINGS}</div>
            <div className="hero-plate" />
            {/* The hero backdrop reuses the header's badge asset — one source, so a
                badge update can never leave the two out of step. */}
            <img className="hero-mark" src={badgeUrl} alt="" />
            <div className="hero-cardwrap">
              <div className="hero-tilt">
                {HERO_SLABS.map((slab, i) => (
                  <div key={slab.src} className={`hero-slab${i === heroSlab ? ' on' : ''}`}>
                    <img src={slab.src} alt={slab.alt} />
                    <i className="hero-glare" />
                  </div>
                ))}
              </div>
            </div>
            <div className="hero-pedestal">
              <span className="p-body" />
              <span className="p-disc" />
              <span className="p-contact" />
              <span className="p-spill" />
            </div>
            <div className="z-[2] mt-[clamp(8px,1.8vh,18px)] text-center">
              <p className="text-[11.5px] font-bold tracking-[3.2px] text-m2m-ink3">
                {LANDING.proof.label}
              </p>
              {/* Type, never logos — rights uncleared. nowrap makes a seventh name fail
                  loudly by overflowing instead of quietly wrapping the band. The hero
                  column floors at 370px (330px below 1120px viewports) — narrower than
                  the band at full size, so the band steps down instead of clipping. */}
              <p className="mt-1.5 whitespace-nowrap text-[15.5px] font-bold tracking-[2.8px] text-m2m-ivory max-[1240px]:text-[13.5px] max-[1240px]:tracking-[2px] max-[1120px]:text-[12px] max-[1120px]:tracking-[1.5px]">
                {LANDING.proof.partners.map((partner, i) => (
                  <React.Fragment key={partner}>
                    {i > 0 && <span className="px-1.5 font-medium text-m2m-ink3">·</span>}
                    {partner}
                  </React.Fragment>
                ))}
              </p>
            </div>
          </div>
        </div>

        {/* ── HOW IT WORKS ── four steps, one line each (copy lengths enforced by
            landingStrings.test.ts). */}
        <div className="mt-[var(--row-my)] flex shrink-0 items-center gap-2 rounded-2xl border border-m2m-line bg-white/[0.022] px-6 py-[var(--how-py)]">
          <p className="mr-4 whitespace-nowrap text-base font-extrabold leading-[1.15] tracking-[0.5px] text-m2m-green [text-shadow:0_0_14px_rgba(0,200,5,0.38)]">
            {LANDING.how.headLine1}
            <br />
            {LANDING.how.headLine2}
          </p>
          {LANDING.how.steps.map((step, i) => (
            <React.Fragment key={step.title}>
              {i > 0 && <span className="px-2 text-xl font-extrabold text-m2m-green opacity-80">›</span>}
              <div className="flex flex-1 items-center gap-3">
                <span className="flex h-[var(--stepn)] w-[var(--stepn)] shrink-0 items-center justify-center rounded-full bg-m2m-green text-[13px] font-extrabold text-m2m-jet [box-shadow:0_0_14px_rgba(0,200,5,0.38)]">
                  {i + 1}
                </span>
                <span>
                  <span className="block text-[length:var(--stept)] font-bold tracking-[0.6px] text-m2m-ivory">
                    {step.title}
                  </span>
                  <span className="mt-0.5 block text-[length:var(--stepd)] leading-[1.35] text-m2m-ink2">
                    {step.desc}
                  </span>
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* ── BOTTOM BLOCK: ticker + footer stacked, with the QR spanning BOTH
            rows on the right. The QR is PROTECTED at 90px of actual code, like the
            prices — the mockup's 62px box was 1.79px/module, borderline unscannable
            in the approved design itself. Stacking the two rows beside it costs far
            less height than growing the footer row to hold it; what gives is the
            TICKER'S WIDTH — its marquee simply ends ~210px earlier. */}
        <div className="mt-[clamp(6px,1.2vh,12px)] flex shrink-0 items-stretch gap-4">
          <div className="flex min-w-0 flex-1 flex-col">
            {/* ── RECENT GRADES ── sample data today; the dashboard feed replaces
                TICKER_SAMPLE and nothing else (see landingStrings.ts). Card, grade and
                company only — never a customer name on the attract screen. */}
            <div className="flex items-center gap-3.5 overflow-hidden rounded-xl border border-m2m-line bg-m2m-panel-deep px-[18px] py-[var(--live-py)]">
              <span className="flex items-center whitespace-nowrap text-[11.5px] font-extrabold tracking-[2.6px] text-m2m-green">
                {LANDING.tickerTag}
              </span>
              <div className="marq min-w-0 flex-1 overflow-hidden whitespace-nowrap">
                {/* The list renders TWICE; the keyframe slides -50%, so the loop joins
                    seamlessly. The second pass is aria-hidden. */}
                <div className="marq-track">
                  {[0, 1].map((half) => (
                    <span key={half} aria-hidden={half === 1}>
                      {TICKER_SAMPLE.map((entry) => (
                        <span
                          key={`${half}-${entry.card}`}
                          className="pr-14 text-[13px] font-semibold text-m2m-ink2"
                        >
                          <span className="font-extrabold text-m2m-green">{entry.grade}</span>
                          {'\u2002'}
                          <b className="font-bold text-m2m-ivory">{entry.card}</b>
                        </span>
                      ))}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* ── FOOTER ── policies reachable but not leading; the video invitation
                sits centred in the empty middle, quieter than the service cards — for
                people who want it, never a step in the flow. 44px targets throughout:
                the person tapping may be elderly, or holding a stack of cards. */}
            <footer className="mt-auto flex items-center gap-6 pt-[clamp(4px,1vh,10px)]">
              <div className="-my-2 flex">
                {LANDING.footer.links.map(({ modal, label }) => (
                  <button
                    key={modal}
                    onClick={() => setActiveModal(modal)}
                    className="flex min-h-[44px] items-center rounded-xl px-3.5 text-[13px] font-medium text-m2m-ink3 transition-colors hover:text-m2m-green active:text-m2m-green"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex min-w-0 flex-1 justify-center">
                <button
                  onClick={() => setActiveModal('video')}
                  className="flex min-h-[44px] items-center gap-2.5 rounded-xl border border-m2m-line bg-white/[0.02] px-5 text-xs font-bold tracking-[1.5px] text-m2m-ink2 transition-all hover:border-zinc-600 hover:text-m2m-ivory active:scale-[0.98]"
                >
                  <Play className="h-4 w-4 fill-current" />
                  {LANDING.footer.video}
                </button>
              </div>
              {/* The address, not the wordmark — all lowercase, green 2 retained. */}
              <p className="text-[15px] font-extrabold tracking-[2.5px] text-m2m-ivory">
                market<b className="text-m2m-green">2</b>mint.com
              </p>
            </footer>
          </div>

          {/* The QR + the .com beside it — the only contact routes on any surface.
              No label: the footer renders market2mint.com right next to it, and the
              code goes exactly where the text says. A label would say it twice. */}
          <div className="flex shrink-0 items-center">
            <span className="flex h-[var(--qr)] w-[var(--qr)] items-center justify-center rounded-[10px] bg-m2m-ivory p-[5px]">
              <QRCodeSVG value={QR_DESTINATION} size={90} bgColor="#f2efe6" fgColor="#0d0f0e" className="h-full w-full" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderQuestions = () => {
    const rawOptions = showYearQuestion ? ['1998 & OLDER', '1999 TO PRESENT'] : getOptionsForQuestion(currentQuestionIdx, remainingServices);
    const definitions = showYearQuestion ? null : questionDefinitions[currentQuestionIdx];
    const currentQuestionText = showYearQuestion ? 'Select the Card Release Year' : getQuestionText(currentQuestionIdx, selectedAnswers.map((a) => a.value));

    // Map options for Step 6 (index 5)
    const options = rawOptions;

    // Deduplicate mapped options
    const uniqueOptions = Array.from(new Set(options));

    return (
      <div className="landscape-container p-8 lg:p-12 flex flex-col overflow-y-auto">
        <div className="flex justify-between items-center mb-10">
          <button 
            onClick={handleBack}
            className="flex items-center gap-3 font-black text-xl text-white active:scale-90 transition-transform bg-zinc-900 px-6 py-3 rounded-2xl border border-zinc-800"
          >
            <ChevronLeft className="w-6 h-6" />
            Back
          </button>
          <div className="flex gap-3">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div 
                key={i} 
                className={`h-3 rounded-full transition-all duration-500 ${
                  i === currentQuestionIdx ? 'w-16 bg-m2m-green shadow-[0_0_20px_rgba(0,200,5,0.4)]' : 
                  i < currentQuestionIdx ? 'w-6 bg-m2m-green/30' : 'w-6 bg-zinc-800'
                }`} 
              />
            ))}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-black text-m2m-green uppercase italic tracking-widest">Main Menu</span>
            <button 
              onClick={handleReset}
              className="p-4 bg-zinc-900 border-2 border-m2m-green rounded-2xl shadow-sm active:scale-90 transition-transform"
            >
              <Home className="w-6 h-6 text-m2m-green" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full space-y-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={showYearQuestion ? 'year' : currentQuestionIdx}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="text-center space-y-6"
            >
              <span className="text-m2m-green font-black uppercase tracking-[0.4em] text-sm">Step {currentQuestionIdx + 1} of 6</span>
              <h2 className={`font-black text-white leading-tight uppercase italic tracking-tight ${
                currentQuestionText.length > 20 ? 'text-5xl' : 'text-6xl'
              }`}>
                {currentQuestionText}
              </h2>
              <div className="h-1.5 w-32 bg-m2m-green rounded-full mx-auto" />
            </motion.div>
          </AnimatePresence>

          <AnswerTrail answers={selectedAnswers} />

          <AnimatePresence mode="wait">
            <motion.div 
              key={showYearQuestion ? 'year-options' : currentQuestionIdx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full grid grid-cols-1 gap-6"
            >
              {uniqueOptions.map((opt) => {
                return (
                  <div key={opt} className="space-y-4">
                    <button 
                      onClick={() => showYearQuestion ? handleYearAnswer(opt) : handleAnswer(opt)}
                      className="w-full h-28 p-10 bg-zinc-900 rounded-[2rem] shadow-2xl border-2 border-zinc-800 active:border-m2m-green hover:border-zinc-700 active:scale-[0.98] transition-all text-left font-black text-3xl flex justify-between items-center group text-white"
                    >
                      {opt}
                      <div className="p-4 bg-zinc-800 rounded-2xl group-hover:bg-m2m-green group-hover:text-black transition-all">
                        <ChevronRight className="w-10 h-10" />
                      </div>
                    </button>
                    {definitions && (definitions as any)[opt] && (
                      <div className="px-10 py-6 bg-zinc-900/30 rounded-3xl border border-zinc-800/50 max-w-3xl mx-auto">
                        <p className="text-lg text-zinc-400 italic leading-relaxed text-center">
                          { (definitions as any)[opt] }
                        </p>
                      </div>
                    )}
                    {/*
                      A card-fact question shown with one option is a disclosure, not a
                      choice: the button states the only way forward ("No", "Pack-pulled"),
                      and the surviving services' own details copy states why, at the
                      moment of choice rather than in the cart. Existing routing-sheet
                      copy only — see singleOptionDetails in flow.ts.
                    */}
                    {!showYearQuestion &&
                      uniqueOptions.length === 1 &&
                      isCardFactQuestion(currentQuestionIdx) &&
                      singleOptionDetails(remainingServices, currentQuestionIdx, opt).map((detail) => (
                        <div
                          key={detail}
                          className="px-10 py-6 bg-zinc-900/30 rounded-3xl border border-zinc-800/50 max-w-3xl mx-auto"
                        >
                          <p className="text-lg text-zinc-400 italic leading-relaxed text-center">{detail}</p>
                        </div>
                      ))}
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  };

  /**
   * The cards at the top of the results screen.
   *
   * Up to four services, EVERY service gets a card. It used to render exactly three no
   * matter what, picked as slowest / middle / fastest — so the four PSA ticket tiers
   * showed three and silently dropped PSA Regular Ticket ($84.99) from the chooser.
   *
   * No labels when everything is shown. VALUE / STANDARD / PRIORITY was assigned by
   * turnaround, which is only meaningful when the tiers ARE a speed ladder. On the comic
   * tiers — an era ladder — it labelled PSA Vintage Comic "VALUE" purely because it is
   * the slowest. If the customer can see every option, naming them adds nothing and can
   * only mislead.
   *
   * At five or more, fall back to summarising by turnaround, which is what the sort has
   * always actually been. No path currently reaches five.
   */
  // Summary logic lives in src/tiers.ts, pure and tested. It was inline here when it
  // silently dropped one of four services — see the regression test.
  const speedTiers = useMemo(() => summariseTiers(remainingServices), [remainingServices]);

  const scrollToTile = (index: number) => {
    const element = document.getElementById(`service-tile-${index}`);
    if (element && scrollRef.current) {
      const containerTop = scrollRef.current.getBoundingClientRect().top;
      const elementTop = element.getBoundingClientRect().top;
      const scrollOffset = elementTop - containerTop + scrollRef.current.scrollTop;
      
      scrollRef.current.scrollTo({
        top: scrollOffset,
        behavior: 'smooth'
      });
    }
  };

  const handleResultsBack = () => {
    if (scrollRef.current && scrollRef.current.scrollTop > 100 && remainingServices.length > 1) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      handleBack();
    }
  };

  const renderResults = () => (
    <div className="landscape-container p-8 lg:p-12 flex flex-col">
      {/* Header & Summary Bar */}
      <div className="flex justify-between items-center mb-10">
        <div className="flex items-center gap-6">
          <button 
            onClick={handleResultsBack}
            className="flex items-center gap-3 font-black text-xl text-white active:scale-90 transition-transform bg-zinc-900 px-6 py-3 rounded-2xl border border-zinc-800"
          >
            <ChevronLeft className="w-6 h-6" />
            Back
          </button>
          <div className="h-12 w-px bg-zinc-800" />
          {/*
            Was an italic uppercase black heading over a glowing green pill reading
            "N MATCHING SERVICE(S) FOUND". The glow communicated nothing, and "(S)" is
            programmer shorthand that reached a customer. Typography carries the hierarchy
            now: the count is the heading, and what it counts is the quiet line under it.
          */}
          <div>
            {/* The old screen carried this count as a green pill; the pill's glow and
                "(S)" are gone for good, but the GREEN returns here (2026-08-10) — the
                count is the one piece of state the customer just changed, so it takes
                the accent. Type only, no pill, no glow. */}
            <h2 className="text-3xl font-bold tracking-tight text-m2m-green">
              {remainingServices.length === 1
                ? 'One service matches'
                : `${remainingServices.length} services match`}
            </h2>
            <p className="text-base text-zinc-400">Pick the turnaround that suits you.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          {cart.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-3 flex items-center gap-6 shadow-xl">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Estimated Total</span>
                <span className="text-2xl font-black text-m2m-green">${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <button 
                onClick={() => setActiveModal('cart')}
                className="bg-m2m-green text-black font-black uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-m2m-green-ink hover:text-m2m-ivory transition-all active:scale-95 flex items-center gap-3"
              >
                <ShoppingBag className="w-5 h-5" />
                Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)})
              </button>
            </div>
          )}
          {/* Secondary action. The old green BORDER stays gone — it out-shouted the
              primary action beside it — but the green LABEL returned 2026-08-10: an
              escape hatch a customer has to find deserves the brand accent, on type
              only, quiet surface unchanged. */}
          <button
            onClick={handleReset}
            className="flex min-h-[44px] items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-3 text-base font-semibold text-m2m-green transition-colors hover:border-zinc-600 active:scale-95"
          >
            <Home className="h-5 w-5" />
            Main menu
          </button>
        </div>
      </div>

      {/* Main Results Area */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto space-y-8 pb-12 snap-y snap-mandatory scroll-smooth relative custom-scrollbar"
      >
        {remainingServices.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center space-y-8 text-center py-20">
            <div className="w-32 h-32 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800">
              <HelpCircle className="w-16 h-16 text-zinc-700" />
            </div>
            <div className="space-y-4">
              <h3 className="text-4xl font-black text-white uppercase italic">No Matches Found</h3>
              <p className="text-zinc-500 text-xl max-w-lg mx-auto">We couldn't find a service matching your exact criteria. Try adjusting your answers or starting over.</p>
            </div>
            <button onClick={handleReset} className="text-m2m-green font-black uppercase tracking-[0.3em] border-b-2 border-m2m-green pb-2 text-lg">Start Over</button>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto w-full space-y-12">
            {/* Speed Selection Intermediary Screen */}
            {remainingServices.length > 1 && (
              <div className="flex flex-col justify-start snap-start relative pt-4 pb-10">
                {/*
                  Was "CHOOSE A TIER..." in italic uppercase black, immediately followed by
                  "CHOOSE A TIER TO SEE FULL DETAILS BELOW" in green uppercase — the same
                  instruction twice, stacked. One heading now, sentence case, and the
                  second line does the job the first was only repeating: it says what
                  tapping actually DOES, which was never stated anywhere.

                  The fixed 72vh height with justify-center is also gone. It forced a large
                  dead gap between the cards and the bottom of the screen and pushed the
                  scroll hint through the viewport edge, where it was sliced mid-word.
                */}
                <div className="text-center mb-10">
                  <h3 className="text-4xl font-bold tracking-tight text-m2m-ivory">Choose a turnaround</h3>
                  <p className="mt-2 text-lg text-zinc-400">Tap one to see full details and add it to your order.</p>
                </div>

                <div className={`grid grid-cols-1 gap-6 mb-10 ${
                  speedTiers.length >= 4 ? 'md:grid-cols-4' : 'md:grid-cols-3'
                }`}>
                  {speedTiers.map((tier, idx) => (
                    <motion.button
                      key={`${tier.service.name}-${tier.index}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0, transition: { delay: idx * 0.1 } }}
                      onClick={() => scrollToTile(tier.index)}
                      className="flex h-56 flex-col justify-between rounded-3xl border-2 border-zinc-800 bg-zinc-900/60 p-7 text-left transition-all hover:border-zinc-600 hover:bg-zinc-900 active:scale-[0.99]"
                    >
                      {/*
                        THE NUMBERS ARE THE CONTENT. A customer at a counter is comparing
                        price and turnaround, so those are the two largest things here and
                        the price is the larger of them — it was the smallest before, under
                        a turnaround set twice its size.

                        Sentence case, no italics, no uppercase tracking. The service name
                        is a label; the figures are the decision.
                      */}
                      <div>
                        {/* The ONE structural accent on the cards (2026-08-10): the
                            eyebrow plus the price are green; name, turnaround and the
                            border stay quiet — all three green would mean nothing. */}
                        {tier.label && (
                          <span className="mb-3 block text-xs font-bold uppercase tracking-[0.2em] text-m2m-green">
                            {tier.label}
                          </span>
                        )}
                        <h4 className="text-xl font-semibold leading-tight text-zinc-300">{tier.service.name}</h4>
                      </div>
                      <div>
                        <p className="tabular-nums text-4xl font-bold leading-none text-m2m-green">
                          {cardShowMode && tier.service.name.toLowerCase().includes('pregrading')
                            ? `$${showPregradingPrice.toFixed(2)}`
                            : tier.service.cost}
                        </p>
                        <p className="mt-2 tabular-nums text-lg text-zinc-400">
                          {formatTurnaround(tier.service.businessDays).toLowerCase()}
                        </p>
                      </div>
                    </motion.button>
                  ))}
                </div>

                {/*
                  Scroll hint. Was absolutely positioned at -bottom-16 with a green glow and
                  0.5em tracking, which put it THROUGH the viewport edge — in the audit
                  screenshot the word "DETAILS" is sliced in half. A hint that is itself
                  unreadable is worse than no hint.

                  Now it sits in normal flow, so it cannot be cut by an edge it does not
                  reach. No glow: a glow communicates nothing. Normal tracking, because
                  0.5em on a 2xl uppercase string fights legibility for decoration.
                */}
                <AnimatePresence>
                  {showScrollIndicator && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, y: [0, 6, 0] }}
                      exit={{ opacity: 0 }}
                      transition={{
                        opacity: { duration: 0.3 },
                        y: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                      }}
                      className="flex flex-col items-center gap-1 pointer-events-none"
                    >
                      <span className="text-base font-medium text-zinc-400">
                        Scroll for full details
                      </span>
                      <ChevronDown className="h-6 w-6 text-zinc-500" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {remainingServices.map((service, i) => (
              <motion.div 
                key={service.name + i}
                id={`service-tile-${i}`}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0, transition: { delay: i * 0.1 } }}
                className="bg-zinc-900 rounded-[3rem] shadow-2xl overflow-hidden border border-zinc-800 group hover:border-zinc-600 transition-all snap-start h-[68vh] flex flex-col"
              >
                <div className="p-8 space-y-6 flex-1 overflow-hidden flex flex-col">
                  <div className="shrink-0 space-y-4">
                    <div className="flex justify-between items-center gap-10">
                      {/* Sentence case, no italics — the landing screen's standard. The
                          price stays the largest thing on the card because it is the
                          decision, but it no longer shouts in green at 6xl beside an
                          italic uppercase black heading competing with it. */}
                      <h3 className="text-4xl font-bold leading-tight tracking-tight text-m2m-ivory">{service.name}</h3>
                      <div className="text-right shrink-0">
                        <div className="tabular-nums text-6xl font-bold leading-none text-m2m-ivory">
                          {cardShowMode && service.name.toLowerCase().includes('pregrading')
                            ? `$${showPregradingPrice.toFixed(2)}`
                            : service.cost}
                        </div>
                        {service.priceIsMinimum && (
                          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-m2m-green">Minimum</p>
                        )}
                      </div>
                    </div>

                    {/*
                      Memorabilia authentication is costed per item AFTER assessment, so
                      the figure above is a floor, not the price. The customer has to
                      learn that before they add it to a cart, not when the invoice
                      arrives.
                    */}
                    {service.priceIsMinimum && (
                      <div className="rounded-2xl border border-m2m-green/40 bg-m2m-green/[0.08] px-6 py-4">
                        <p className="text-base leading-snug text-m2m-ivory">
                          <span className="font-bold">{service.cost} is a minimum, not the final price.</span>{' '}
                          What you pay today is the grader's minimum fee. The final cost depends on the
                          item and is only known once it has been assessed — we will quote it to you
                          before any further work, and today's payment is applied either way.
                        </p>
                      </div>
                    )}
                    
                    <div className="flex gap-4 w-full">
                      <div className="bg-zinc-950 px-6 py-3 rounded-2xl border border-zinc-800 flex-1 text-center whitespace-nowrap">
                        <p className="mb-1 text-[12px] font-bold uppercase tracking-widest text-zinc-500">Estimated turnaround</p>
                        <p className="tabular-nums text-lg font-semibold text-m2m-ivory">{formatTurnaround(service.businessDays).toLowerCase()}</p>
                      </div>
                      <div className="bg-zinc-950 px-6 py-3 rounded-2xl border border-zinc-800 flex-1 text-center whitespace-nowrap">
                        <p className="mb-1 text-[12px] font-bold uppercase tracking-widest text-zinc-500">Max insured value (if lost or damaged)</p>
                        <p className="tabular-nums text-lg font-semibold text-m2m-ivory">{service.maxValue}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-hidden">
                    <div className="space-y-4 flex flex-col overflow-hidden">
                      <h4 className="text-sm font-black uppercase tracking-[0.3em] text-m2m-green border-l-4 border-m2m-green pl-4 shrink-0 italic">Service Description</h4>
                      <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                        <p className="text-white text-lg leading-relaxed">
                          {service.description || "No description available."}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2 flex flex-col overflow-hidden">
                      <h4 className="text-xs font-black uppercase tracking-[0.3em] text-m2m-green border-l-4 border-m2m-green pl-4 shrink-0 italic">ESTIMATED COMPLETION DATE</h4>
                      <div className="bg-zinc-950 px-4 py-2.5 rounded-2xl border border-zinc-800 flex items-center justify-between shrink-0">
                        <div>
                          <p className="text-xl font-black text-white">{getEstimatedDate(service.turnaround)}</p>
                        </div>
                        <CheckCircle2 className="w-6 h-6 text-white opacity-100" />
                      </div>
                      
                      {service.details && (
                        <div className="p-4 bg-zinc-950/50 rounded-3xl border border-dashed border-zinc-800 flex-1 overflow-y-auto custom-scrollbar">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-m2m-green mb-2 italic">Additional Details</h4>
                          <p className="text-base text-white leading-relaxed italic">{service.details}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/*
                  Oversized is a per-card upcharge, not a separate service. It is chosen
                  here rather than in the cart so a customer can add two standard cards
                  and one oversized in the same order — the cart keys lines on the flag.
                */}
                {service.oversizedSurcharge !== null && (
                  <button
                    onClick={() => setOversizedSel((prev) => ({ ...prev, [service.name]: !prev[service.name] }))}
                    className={`mx-6 mb-2 flex items-center gap-4 rounded-2xl border-2 px-6 py-4 text-left transition-all active:scale-[0.99] shrink-0 ${
                      oversizedSel[service.name]
                        ? 'border-m2m-green bg-m2m-green/10'
                        : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 ${
                        oversizedSel[service.name] ? 'border-m2m-green bg-m2m-green' : 'border-zinc-700'
                      }`}
                    >
                      {oversizedSel[service.name] && <CheckCircle2 className="h-5 w-5 text-black" />}
                    </span>
                    <span className="text-base font-bold uppercase tracking-widest text-m2m-ivory">
                      Oversized card
                      <span className="ml-3 tabular-nums text-m2m-green">
                        +{formatUSD(service.oversizedSurcharge)} per card
                      </span>
                    </span>
                  </button>
                )}

                <div className="bg-zinc-950 p-6 flex gap-6 items-center border-t border-zinc-800 shrink-0">
                  {remainingServices.length > 1 && (
                    <button 
                      onClick={() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
                      className="p-5 bg-zinc-900 border border-zinc-800 rounded-[1.5rem] text-zinc-500 hover:text-white transition-all active:scale-90"
                      title="Back to Selection"
                    >
                      <ChevronUp className="w-6 h-6" />
                    </button>
                  )}
                  <div className="flex items-center bg-zinc-900 rounded-3xl p-2 border border-zinc-800 shrink-0">
                    {/* At either bound the button goes visibly dead — a press that
                        changes nothing must never look like a press that might have. */}
                    <button
                      onClick={() => updateQuantity(service.name, -1)}
                      disabled={(quantities[service.name] || 1) <= MIN_QUANTITY_PER_LINE}
                      className={`p-3 rounded-2xl transition-all ${
                        (quantities[service.name] || 1) <= MIN_QUANTITY_PER_LINE
                          ? 'text-zinc-700 cursor-not-allowed'
                          : 'text-m2m-green hover:bg-zinc-800 active:scale-90'
                      }`}
                    >
                      <Minus className="w-6 h-6" />
                    </button>
                    <button
                      onClick={() => openKeypad({ kind: 'results', name: service.name }, quantities[service.name] || 1)}
                      className="w-16 min-h-[44px] text-center font-black text-m2m-green text-3xl rounded-xl hover:bg-zinc-800 active:scale-95 transition-all tabular-nums"
                    >
                      {quantities[service.name] || 1}
                    </button>
                    <button
                      onClick={() => updateQuantity(service.name, 1)}
                      disabled={(quantities[service.name] || 1) >= MAX_QUANTITY_PER_LINE}
                      className={`p-3 rounded-2xl transition-all ${
                        (quantities[service.name] || 1) >= MAX_QUANTITY_PER_LINE
                          ? 'text-zinc-700 cursor-not-allowed'
                          : 'text-m2m-green hover:bg-zinc-800 active:scale-90'
                      }`}
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                  </div>

                  <button 
                    onClick={handleSelectAnother}
                    className="flex-1 flex items-center justify-center gap-3 bg-zinc-800 text-m2m-green py-5 rounded-[1.5rem] font-black text-lg uppercase tracking-[0.1em] hover:bg-zinc-700 transition-all shadow-2xl active:scale-95 border border-zinc-700"
                  >
                    <PlusCircle className="w-6 h-6" />
                    Another Service
                  </button>

                  <button 
                    onClick={() => addToCart(service)}
                    className="flex-1 flex items-center justify-center gap-4 bg-m2m-green text-black py-5 rounded-[1.5rem] font-black text-lg uppercase tracking-[0.1em] hover:bg-m2m-green-ink hover:text-m2m-ivory transition-all shadow-2xl active:scale-95"
                  >
                    Add to Cart
                    <ShoppingBag className="w-6 h-6" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  /*
   * The handoff is built HERE rather than inside renderHandoff because the countdown
   * effect has to know whether a QR was produced. An order too large to encode sends the
   * customer to fetch an attendant, and a 60-second timer wiping the screen while they
   * are doing that is the one thing that screen must not do.
   */
  const handoff = useMemo(() => {
    const formattedServices = cart.map(item => {
      // "— OVERSIZED" has to survive the trip. The shop is packing the card and the
      // grader is billing for it; a $10.00 upcharge in the total with nothing on the
      // order to explain it is a support call waiting to happen.
      const name = item.service.name + (item.oversized ? ' — OVERSIZED' : '');
      const unitCostVal = unitPriceOf(item.service);
      const rawSubtotal = lineTotal(unitCostVal, item.quantity, surchargeOf(item));
      let itemTotalStr = `$${rawSubtotal.toFixed(2)}`;
      
      if (cardShowMode && globalDiscount > 0 && !name.toLowerCase().includes('pregrading')) {
        // Discount the service, never the pass-through oversized upcharge.
        const itemDiscount = unitCostVal * item.quantity * (globalDiscount / 100);
        const finalItemTotal = rawSubtotal - itemDiscount;
        itemTotalStr = `$${rawSubtotal.toFixed(2)} / $${itemDiscount.toFixed(2)} / $${finalItemTotal.toFixed(2)}`;
      }
      
      const estDate = getEstimatedDate(item.service.turnaround);
      const val = item.service.questions[5];
      const variationStr = (val && val.toLowerCase() !== 'skip question' && val.toLowerCase() !== 'either' && val.toLowerCase() !== 'x')
        ? ` (${val})`
        : '';
      // MIN GRADE rides on the service line, next to OVERSIZED, for the same reason —
      // a term the customer is financially exposed to has to reach the shop legibly. It
      // deliberately does NOT go in `customerNotes` (brief §5.2b).
      const minGradeStr = minimumGradeHandoffFragment(item);
      // The shop invoices from this line. An assessed-after service must not reach them
      // looking settled, or the customer gets a second bill nobody who spoke to them
      // warned them about.
      const minPriceStr = item.service.priceIsMinimum ? ' — MINIMUM, FINAL PRICE AFTER ASSESSMENT' : '';
      const body = `• ${name}${variationStr}${minGradeStr}${minPriceStr} - ${itemTotalStr} (x${item.quantity})`;
      // Two forms of the same line. The estimated date is the first thing dropped if the
      // order will not fit in a QR — see fitHandoffUrl for why it is the safe one to lose.
      return { full: `${body} — EST: ${estDate}`, compact: body };
    });

    // Shipping & insurance is computed in exactly ONE place — the `shippingFee` memo above —
    // and reused here. It previously had a second, DIFFERENT implementation at this spot, which
    // meant a CGC+SGC cart (no PSA/BGS) charged $29 in the total while printing "$24.00" on the
    // handoff the customer scanned. Do not reintroduce a local calculation here.
    const shippingAndInsuranceLine = `• Shipping & Insurance - $${shippingFee.toFixed(2)}`;

    const savedStoreCode = (cardShowMode && showName.trim()) ? showName.trim() : (storeCode || 'NOT_SET');

    // Assembled in src/handoff.ts so the QR capacity test can encode the real URL rather
    // than a copy of its format that drifts. This URL carries the entire order — there is
    // no server between here and JotForm — so its length is a correctness constraint, not
    // a formatting detail: past the QR's capacity the encoder THROWS during render, and
    // with no error boundary that blanks the kiosk and loses the order. See handoff.test.ts.
    // The store code already travels as its own `storecode` parameter, but that maps to a
    // JotForm field that only reaches the email SUBJECT — so a shop processing the order
    // has to go back to the subject line to find it. Repeating it at the head of the
    // services blob puts it in the body, where MIN GRADE demonstrably lands.
    const storeHeaderLine = `STORE: ${savedStoreCode}`;

    const fit = fitHandoffUrl({
      lines: [{ full: storeHeaderLine, compact: storeHeaderLine }, ...formattedServices],
      shippingLine: shippingAndInsuranceLine,
      total: total.toFixed(2),
      storeCode: savedStoreCode,
      customerNotes,
      cashAtShow: cardShowMode && paymentMethod === 'cash',
      // Null until the box is ticked — and an unticked box cannot reach the handoff
      // screen, because Complete Order is gated on it. The three JotForm field names
      // this becomes are case-sensitive literals; see buildHandoffUrl.
      policy:
        policyAccepted && policyAcknowledgedAt
          ? { acknowledgedAt: policyAcknowledgedAt, version: POLICY_VERSION }
          : null,
    });

    return {
      ...fit,
      savedStoreCode,
      orderText: [storeHeaderLine, ...formattedServices.map((l) => l.full), shippingAndInsuranceLine].join('\n'),
    };
    // getEstimatedDate reads today's date, so this is not a pure function of its inputs.
    // That is harmless: the only way to sit on this screen across midnight is to leave a
    // finished order untouched, and the inactivity timer resets the kiosk long before then.
  }, [cart, cardShowMode, globalDiscount, showPregradingPrice, shippingFee, total, storeCode, showName, paymentMethod, customerNotes, policyAccepted, policyAcknowledgedAt]);

  // Handoff Screen Timer (60s)
  useEffect(() => {
    if (step !== 'handoff') {
      setHandoffCountdown(60);
      return;
    }
    // Suspended when the order was too large to encode. That screen asks the customer to
    // go and fetch a shop attendant; counting their order down to a reset while they do it
    // would destroy the only remaining copy of it. The 120-second global inactivity timer
    // is still the backstop, and any touch keeps the screen alive.
    if (handoff.url === null) return;

    const intervalId = setInterval(() => {
      setHandoffCountdown(prev => {
        if (prev <= 1) {
          clearInterval(intervalId);
          addLog('QR Screen Timeout');
          handleReset();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [step, handoff.url]);

  const renderHandoff = () => {
    const { url: jotformUrl, droppedDates, savedStoreCode, orderText } = handoff;
    const countdownColor = handoffCountdown <= 10 ? 'text-red-500' : 'text-zinc-500';
    const itemCount = cart.reduce((n, i) => n + i.quantity, 0);

    return (
      <div className="landscape-container bg-zinc-900 flex flex-col p-8 lg:p-12 overflow-y-auto relative">
        {/* Header */}
        <div className="flex justify-between items-center mb-10 shrink-0">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setStep('results')}
              className="flex items-center gap-3 font-black text-xl text-white active:scale-90 transition-transform bg-zinc-900 px-6 py-3 rounded-2xl border border-zinc-800"
            >
              <ChevronLeft className="w-6 h-6" />
              Back
            </button>
            <div className="h-12 w-px bg-m2m-green" />
            <div className="space-y-1">
              <h2 className="text-3xl font-black text-white uppercase italic tracking-tight">
                Order Completion
              </h2>
              <div className="inline-flex items-center bg-zinc-950 border border-m2m-green/50 px-8 py-3 rounded-full shadow-[0_0_20px_rgba(0,200,5,0.1)]">
                <p className="text-m2m-green font-black uppercase tracking-widest text-sm">
                  Store: {savedStoreCode}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm font-black text-m2m-green uppercase italic tracking-widest">Main Menu</span>
            <button 
              onClick={handleReset}
              className="p-4 bg-zinc-900 border-2 border-m2m-green rounded-2xl shadow-sm active:scale-90 transition-transform"
            >
              <Home className="w-6 h-6 text-m2m-green" />
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8">
          <div className="max-w-4xl w-full space-y-6">
          {jotformUrl === null ? (
            /*
              The order is larger than any QR code can carry. Rare, but it must not be a
              crash: the encoder throws from inside render and there is no error boundary,
              so the alternative is a blank kiosk and a customer whose order is gone.
              Nothing is discarded to force a fit — every remaining field is something the
              customer chose and is paying for. An attendant completes it at the counter.
            */
            <>
              <div className="space-y-4">
                <h2 className="text-5xl font-black text-white uppercase italic tracking-tight leading-none">
                  ONE MORE STEP <br />
                  <span className="text-m2m-green">AT THE COUNTER</span>
                </h2>
                <p className="text-zinc-300 text-xl max-w-2xl mx-auto leading-relaxed font-medium">
                  This order has too many separate services to finish on the tablet. Nothing
                  is lost — show this screen to a shop attendant and they will complete it
                  for you.
                </p>
              </div>
              <div className="rounded-[2rem] border border-m2m-green/40 bg-m2m-green/[0.08] px-8 py-6 text-left">
                <p className="text-sm font-black uppercase tracking-widest text-m2m-green mb-3">
                  Your order — {itemCount} {itemCount === 1 ? 'item' : 'items'}, {formatUSD(total)}
                </p>
                <pre className="whitespace-pre-wrap text-base leading-snug text-m2m-ivory font-medium">
                  {orderText}
                </pre>
              </div>
            </>
          ) : (
            <>
          <div className="space-y-4">
            <h2 className="text-5xl font-black text-white uppercase italic tracking-tight leading-none">
              SCAN TO FINISH <br />
              <span className="text-m2m-green">YOUR ORDER</span>
            </h2>
            <p className="text-zinc-400 text-xl max-w-2xl mx-auto leading-relaxed font-medium">
              Scan to upload photos and complete payment. Your services and total have been transferred.
            </p>
          </div>

          <div className="bg-white p-8 rounded-[3rem] shadow-[0_0_60px_rgba(0,200,5,0.2)] inline-block border-[10px] border-zinc-800 relative">
            <QRCodeSVG
              value={jotformUrl}
              size={320}
              level={QR_ERROR_CORRECTION_LEVEL}
              includeMargin={false}
            />
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-m2m-green text-black px-6 py-1.5 rounded-full font-black text-xs uppercase tracking-widest shadow-xl">
              Secure Link
            </div>
          </div>
          {droppedDates && (
            // Said out loud rather than left to be discovered. The dates are estimates the
            // customer has already seen on the cart screen; the services, quantities,
            // prices and minimum grades all made the trip intact.
            <p className="text-sm text-zinc-500 max-w-2xl mx-auto leading-snug">
              Estimated completion dates were left off the transfer to fit this order. Every
              service, quantity, price and minimum grade has been sent.
            </p>
          )}
            </>
          )}

          <div className="pt-4 space-y-6">
            <button 
              onClick={handleReset}
              className="px-12 py-6 bg-zinc-800 text-white rounded-[2rem] text-2xl font-black uppercase tracking-[0.2em] hover:bg-zinc-700 active:scale-95 transition-all shadow-2xl border-2 border-zinc-700 hover:border-m2m-green"
            >
              EXIT IPAD FORM
            </button>
            {jotformUrl !== null && (
              // Not shown on the attendant-assist screen: that countdown is suspended, so
              // printing one would be a promise the kiosk is deliberately not keeping.
              <p className={`text-sm font-black uppercase tracking-[0.2em] ${countdownColor} animate-pulse`}>
                Resetting to Home in {handoffCountdown} seconds...
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
    );
  };

  return (
    <div 
      className="min-h-screen bg-m2m-bg text-zinc-100 selection:bg-m2m-green/20 overflow-hidden"
      style={{ filter: `brightness(${brightness}%)` }}
    >
      {step === 'landing' && (
        <StoreSettings 
          onUpdate={({ storeCode, brightness, volume, cardShowMode, showPregradingPrice, globalDiscount, showName }) => {
            setStoreCode(storeCode);
            setBrightness(brightness);
            setVolume(volume);
            setCardShowMode(cardShowMode);
            setShowPregradingPrice(showPregradingPrice);
            setGlobalDiscount(globalDiscount);
            setShowName(showName);
          }} 
          onReset={handleReset} 
        />
      )}
      
      <main className="h-screen w-full flex flex-col">
        {step === 'landing' && cardShowMode && (
          <div className="fixed top-0 left-0 z-[60]">
            <div className="bg-m2m-green text-black px-5 py-2.5 rounded-br-2xl font-black text-[10px] uppercase tracking-widest shadow-lg flex items-center gap-2 border-r border-b border-black/10">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>SHOW MODE {showName ? `: ${showName.toUpperCase()}` : 'ENABLED'}</span>
            </div>
          </div>
        )}
        <AnimatePresence mode="wait">
          {step === 'landing' && (
            <motion.div 
              key="landing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full w-full"
            >
              {renderLanding()}
            </motion.div>
          )}
          {step === 'questions' && (
            <motion.div 
              key="questions"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full w-full"
            >
              {renderQuestions()}
            </motion.div>
          )}
          {step === 'results' && (
            <motion.div 
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full w-full"
            >
              {renderResults()}
            </motion.div>
          )}
          {step === 'handoff' && (
            <motion.div 
              key="handoff"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full w-full"
            >
              {renderHandoff()}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {activeModal === 'video' && (
          <Modal isOpen title="How It Works" onClose={() => setActiveModal(null)}>
            <div className="aspect-video w-full bg-black rounded-3xl overflow-hidden shadow-2xl border border-zinc-800">
              <iframe 
                id="m2m-video-player"
                width="100%" 
                height="100%" 
                src="https://www.youtube.com/embed/FWmpAfi1z8A?enablejsapi=1&autoplay=1&rel=0" 
                title="M2M Tutorial" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                allowFullScreen
              ></iframe>
            </div>
            <div className="mt-8 flex justify-center">
              <button 
                onClick={() => setActiveModal(null)}
                className="px-12 py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95"
              >
                Close Tutorial
              </button>
            </div>
          </Modal>
        )}
        {activeModal === 'terms' && (
          <Modal isOpen title="Terms of Use" onClose={() => setActiveModal(null)}>
            <div className="space-y-8 max-w-none text-zinc-300 leading-relaxed">
              {TERMS_OF_USE_SECTIONS.map((section, idx) => (
                <div key={idx} className="space-y-3">
                  <h3 className="text-m2m-green font-black uppercase italic tracking-tight text-xl">
                    {section.title}
                  </h3>
                  <div className="whitespace-pre-wrap text-zinc-400">
                    {section.content}
                  </div>
                </div>
              ))}
            </div>
          </Modal>
        )}
        {activeModal === 'privacy' && (
          <Modal isOpen title="Privacy Policy" onClose={() => setActiveModal(null)}>
            <div className="space-y-8 max-w-none text-zinc-300 leading-relaxed">
              {PRIVACY_POLICY_SECTIONS.map((section, idx) => (
                <div key={idx} className="space-y-3">
                  <h3 className="text-m2m-green font-black uppercase italic tracking-tight text-xl">
                    {section.title}
                  </h3>
                  <div className="whitespace-pre-wrap text-zinc-400">
                    {section.content}
                  </div>
                </div>
              ))}
            </div>
          </Modal>
        )}

        {activeModal === 'submission' && (
          <Modal isOpen title="Submission Policy" onClose={() => setActiveModal(null)}>
            <div className="space-y-8 max-w-none text-zinc-300 leading-relaxed">
              {SUBMISSION_POLICY_SECTIONS.map((section, idx) => (
                <div key={idx} className="space-y-3">
                  <h3 className="text-m2m-green font-black uppercase italic tracking-tight text-xl">
                    {section.title}
                  </h3>
                  <div className="whitespace-pre-wrap text-zinc-400">
                    {section.content}
                  </div>
                </div>
              ))}
            </div>
          </Modal>
        )}
        {activeModal === 'cart' && (
          <Modal
            isOpen
            title="Checkout Cart"
            onClose={() => setActiveModal(null)}
            showMainMenu
            onMainMenuClick={handleReset}
            footer={
              cart.length > 0 ? (
                <div className="space-y-5">
                  {/*
                    The acknowledgement lives in the PINNED footer so completing an
                    order never requires scrolling to act — Phase 1 measured this
                    checkbox arriving below the fold on every single order. The policy
                    list it refers to sits in the scrolling body at the TOP of the
                    summary card, directly under the order lines — first thing offered,
                    though a long cart can still push it below the fold. That is the
                    same trade the old layout made in the other direction, minus the
                    forced swipe.
                  */}
                  {cardShowMode && (
                    <div className="flex items-center gap-4">
                      <span className="shrink-0 text-sm font-black uppercase tracking-widest text-m2m-green">Paying by</span>
                      <button
                        onClick={() => setPaymentMethod('card')}
                        className={`min-h-[44px] flex-1 rounded-2xl border-2 py-3 font-black uppercase tracking-widest transition-all active:scale-95 ${
                          paymentMethod === 'card'
                            ? 'border-m2m-green bg-m2m-green text-black shadow-[0_0_20px_rgba(0,200,5,0.3)]'
                            : 'border-zinc-700 bg-zinc-800 text-white hover:border-zinc-600'
                        }`}
                      >
                        Card
                      </button>
                      <button
                        onClick={() => setPaymentMethod('cash')}
                        className={`min-h-[44px] flex-1 rounded-2xl border-2 py-3 font-black uppercase tracking-widest transition-all active:scale-95 ${
                          paymentMethod === 'cash'
                            ? 'border-m2m-green bg-m2m-green text-black shadow-[0_0_20px_rgba(0,200,5,0.3)]'
                            : 'border-zinc-700 bg-zinc-800 text-white hover:border-zinc-600'
                        }`}
                      >
                        Cash
                      </button>
                    </div>
                  )}
                  <label className="flex items-center gap-5 p-5 bg-zinc-950/60 rounded-2xl cursor-pointer transition-all active:scale-[0.99] border-2 border-transparent has-[:checked]:border-m2m-green">
                    <input
                      type="checkbox"
                      checked={policyAccepted}
                      onChange={(e) => {
                        setPolicyAccepted(e.target.checked);
                        // The record of WHEN — at the tick itself. Unticking
                        // clears it; re-ticking stamps the last tick.
                        setPolicyAcknowledgedAt(e.target.checked ? new Date().toISOString() : null);
                      }}
                      className="h-11 w-11 shrink-0 accent-m2m-green rounded-lg bg-zinc-900 border-zinc-700"
                    />
                    <span className="text-base md:text-lg font-black select-none text-zinc-100 uppercase italic tracking-tight leading-tight">
                      I acknowledge and agree to all <span className="whitespace-nowrap">Market2Mint</span> service policies
                    </span>
                  </label>
                  <div className="flex gap-6">
                    {/*
                      A second card is ONE press from here (Phase 2 P3): this restarts
                      the questions across the whole menu, Pregrading included. Plain
                      "close and look again" stays on the modal's X.
                    */}
                    <button
                      onClick={() => {
                        setActiveModal(null);
                        handleSelectAnother();
                      }}
                      className="flex-1 flex items-center justify-center gap-3 bg-zinc-800 text-m2m-green py-5 rounded-[1.5rem] font-black text-lg uppercase tracking-[0.1em] hover:bg-zinc-700 transition-all shadow-2xl active:scale-95"
                    >
                      <PlusCircle className="w-6 h-6" />
                      Another Service
                    </button>
                    <button
                      disabled={!policyAccepted}
                      className={`flex-[2] py-5 rounded-[1.5rem] font-black text-lg uppercase tracking-[0.1em] transition-all shadow-2xl ${
                        policyAccepted
                          ? 'bg-m2m-green text-black hover:bg-m2m-green-ink hover:text-m2m-ivory active:scale-95'
                          : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                      }`}
                      onClick={() => {
                        if (!policyAccepted) return;
                        // The confirm sound — a committed action, the only other one
                        // besides changing the order itself.
                        playUIAudio(880, 0.2);
                        setStep('handoff');
                        setActiveModal(null);
                      }}
                    >
                      {/* The figure rides on the button: with the checkout opening
                          straight from Add to Cart and nothing forcing a scroll
                          through the summary, this is the one place the customer is
                          GUARANTEED to see what they are committing to. "so far"
                          whenever a minimum-priced line makes the total a floor. */}
                      {policyAccepted
                        ? `Complete Order — $${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${cartHasMinimumPricedItem ? ' so far' : ''}`
                        : 'Acknowledge to continue'}
                    </button>
                  </div>
                </div>
              ) : undefined
            }
          >
            <div className="flex flex-col h-full">
              {cart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-8 py-12">
                  <div className="w-32 h-32 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800 shadow-2xl">
                    <ShoppingBag className="w-16 h-16 text-zinc-700" />
                  </div>
                  <div className="space-y-4 text-center">
                    <h3 className="text-4xl font-black text-white uppercase italic tracking-tight">Your cart is empty</h3>
                    <p className="text-zinc-500 text-xl max-w-lg mx-auto">Add some services to your cart to proceed with checkout.</p>
                  </div>
                  <button 
                    onClick={() => setActiveModal(null)}
                    className="w-full max-w-md bg-zinc-800 text-white py-5 rounded-[1.5rem] font-black text-lg uppercase tracking-[0.1em] hover:bg-zinc-700 transition-all shadow-2xl active:scale-95"
                  >
                    Continue Browsing
                  </button>
                </div>
              ) : (
                <div className="flex flex-col h-full space-y-8">
                  {/* Cart Items List */}
                  <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-6 min-h-0">
                    {cart.map((item) => (
                      // Keyed on the line's own id, not on its index: removing a line
                      // otherwise hands its open/closed state to whichever line moves up.
                      // `items-start` so the delete button stays beside the service name
                      // instead of drifting down the row when a minimum grade is opened.
                      <div key={item.id} className="bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800 flex justify-between items-start gap-8 shadow-2xl group hover:border-zinc-600 transition-all">
                        <div className="flex-1 min-w-0 space-y-4">
                          <h4 className="font-black text-white text-3xl uppercase italic tracking-tight truncate">
                            {item.service.name}
                            {item.oversized && <span className="text-m2m-green"> — Oversized</span>}
                          </h4>
                          <div className="flex items-center gap-6">
                            <div className="flex flex-col">
                              <span className="tabular-nums text-3xl font-black text-white">
                                {formatUSD(lineTotal(unitPriceOf(item.service), item.quantity, surchargeOf(item)))}
                              </span>
                              {item.oversized && item.service.oversizedSurcharge !== null && (
                                <span className="mt-1 text-sm font-bold uppercase tracking-widest text-zinc-400">
                                  includes {formatUSD(item.service.oversizedSurcharge)} oversized × {item.quantity}
                                </span>
                              )}
                              {item.service.priceIsMinimum && (
                                // The results screen already explains this in full, but a
                                // figure sitting in a cart reads as A PRICE — that is what
                                // a cart is for. Without this line, the customer's last
                                // sight of it before paying says the opposite of the truth.
                                <span className="mt-1 text-sm font-bold uppercase tracking-widest text-m2m-green">
                                  Minimum — final price set after assessment
                                </span>
                              )}
                              {cardShowMode && globalDiscount > 0 && !item.service.name.toLowerCase().includes('pregrading') && (() => {
                                const cost = unitPriceOf(item.service);
                                const originalTotal = cost * item.quantity;
                                const discountAmount = originalTotal * (globalDiscount / 100);
                                const finalTotal = originalTotal - discountAmount;
                                return (
                                  <div className="text-m2m-green font-black text-lg uppercase tracking-wider mt-1.5 flex items-center gap-1.5">
                                    <span>CALC:</span>
                                    <span>${originalTotal.toFixed(2)} / ${discountAmount.toFixed(2)} / ${finalTotal.toFixed(2)}</span>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                          <div className="flex gap-4">
                            <div className="flex items-center gap-2 bg-zinc-950 px-4 py-1.5 rounded-full border border-zinc-800 shrink-0">
                              <span className="text-zinc-400 text-xs font-black uppercase tracking-widest">Est.</span>
                              <span className="text-white text-xs font-black uppercase tracking-widest">
                                {getEstimatedDate(item.service.turnaround)}
                              </span>
                            </div>
                            <span className="bg-zinc-950 px-4 py-1.5 rounded-full border border-zinc-800 text-white text-xs font-black uppercase tracking-widest">
                              MAX INSURED VALUE: {item.service.maxValue}
                            </span>
                          </div>

                          {/*
                            ── MINIMUM GRADE (PSA card services only) — brief §5.2b–d ──

                            Collapsed, small and secondary on purpose. The feature has a
                            real financial downside — pay the full fee, receive an
                            unslabbed card — and the best protection is that a customer
                            who does not understand it never opens it. So it must
                            self-select for people who already know what it is: spotted
                            immediately by someone who does, and skippable without a
                            second thought by someone who does not.

                            That is why it is not a green button, not a card, and carries
                            no badge, count or asterisk that could read as an unanswered
                            step. If the collapsed state ever creates doubt about whether
                            it needs answering, it is too loud.
                          */}
                          {supportsMinimumGrade(item.service) && (
                            isMinGradeOpen(item) ? (
                              <div className="space-y-5 rounded-3xl border border-zinc-700 bg-zinc-950/60 p-6">
                                <p className="text-base leading-snug text-zinc-300">
                                  <span className="font-black text-white">{MIN_GRADE_LEAD_STRONG}</span>{' '}
                                  {MIN_GRADE_LEAD_REST}
                                </p>

                                <select
                                  value={item.minimumGrade === null ? '' : String(item.minimumGrade)}
                                  onChange={(e) =>
                                    updateCartLine(item.id, {
                                      minimumGrade: e.target.value === '' ? null : Number(e.target.value),
                                    })
                                  }
                                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-5 py-4 text-lg font-bold text-white focus:border-m2m-green focus:outline-none"
                                >
                                  {/* Default, and the only default. Never pre-select a grade. */}
                                  <option value="">{NO_MINIMUM_LABEL}</option>
                                  {MINIMUM_GRADES.map((g) => (
                                    <option key={g} value={g}>
                                      Minimum grade {formatGrade(g)}
                                    </option>
                                  ))}
                                </select>

                                {item.minimumGrade === null ? (
                                  // A statement of what will happen, not a warning and not
                                  // an obstacle. Deliberately not red and not a dialog.
                                  <p className="text-base leading-snug text-zinc-400">
                                    {NO_MINIMUM_DISCLOSURE}
                                  </p>
                                ) : (
                                  // Inset and bordered, the way the $24.00 disclosure is
                                  // treated on the home screen — unmissable once open,
                                  // without pretending a legitimate service is a hazard.
                                  <div className="rounded-2xl border border-m2m-green/40 bg-m2m-green/[0.08] px-6 py-5">
                                    <p className="text-lg leading-snug text-m2m-ivory">
                                      <span className="font-black">
                                        {minimumGradeConsequenceLead(item.minimumGrade)}
                                      </span>{' '}
                                      {MIN_GRADE_CONSEQUENCE_REST}
                                    </p>
                                  </div>
                                )}

                                <div className="space-y-2">
                                  <label
                                    htmlFor={`card-ref-${item.id}`}
                                    className="block text-sm font-bold text-zinc-400"
                                  >
                                    {CARD_REFERENCE_LABEL}
                                  </label>
                                  <input
                                    id={`card-ref-${item.id}`}
                                    type="text"
                                    value={item.cardReference}
                                    maxLength={CARD_REFERENCE_MAX_LENGTH}
                                    placeholder={CARD_REFERENCE_PLACEHOLDER}
                                    onChange={(e) =>
                                      updateCartLine(item.id, {
                                        cardReference: sanitizeCardReference(e.target.value),
                                      })
                                    }
                                    className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-5 py-4 text-lg text-white placeholder:text-zinc-600 focus:border-m2m-green focus:outline-none"
                                  />
                                </div>
                              </div>
                            ) : (
                              <button
                                onClick={() => setOpenMinGradeLines((prev) => [...prev, item.id])}
                                // -mx-3 keeps it visually the same quiet line while giving
                                // it a real 44px target. It must stay easy to ignore AND
                                // possible to hit.
                                className="-mx-3 flex min-h-[44px] items-center gap-2 rounded-xl px-3 text-sm font-bold text-zinc-500 hover:text-zinc-300 active:scale-95 transition-all"
                              >
                                <Plus className="h-4 w-4" />
                                {MIN_GRADE_COLLAPSED_LABEL}
                              </button>
                            )
                          )}
                        </div>
                        <div className="flex flex-col items-center gap-4 shrink-0">
                          {/*
                            One more card of a service already chosen is ONE press
                            (Phase 2 P3a) — nothing about the six answers changes when
                            the count does. Both directions change what the customer
                            pays, so both carry the commit sounds. Tapping the NUMBER
                            opens the keypad for bulk counts.
                          */}
                          <div className="flex items-center bg-zinc-950 rounded-3xl p-2 border border-zinc-800">
                            <button
                              onClick={() => {
                                if (item.quantity <= MIN_QUANTITY_PER_LINE) return;
                                playUIAudio(450, 0.08);
                                updateCartLine(item.id, { quantity: stepQuantity(item.quantity, -1) });
                              }}
                              disabled={item.quantity <= MIN_QUANTITY_PER_LINE}
                              className={`p-3 rounded-2xl transition-all ${
                                item.quantity <= MIN_QUANTITY_PER_LINE
                                  ? 'text-zinc-700 cursor-not-allowed'
                                  : 'text-m2m-green hover:bg-zinc-800 active:scale-90'
                              }`}
                            >
                              <Minus className="w-6 h-6" />
                            </button>
                            <button
                              onClick={() => openKeypad({ kind: 'line', id: item.id }, item.quantity)}
                              className="w-16 min-h-[44px] text-center font-black text-m2m-green text-3xl rounded-xl hover:bg-zinc-800 active:scale-95 transition-all tabular-nums"
                            >
                              {item.quantity}
                            </button>
                            <button
                              onClick={() => {
                                if (item.quantity >= MAX_QUANTITY_PER_LINE) return;
                                playUIAudio(700, 0.08);
                                updateCartLine(item.id, { quantity: stepQuantity(item.quantity, 1) });
                              }}
                              disabled={item.quantity >= MAX_QUANTITY_PER_LINE}
                              className={`p-3 rounded-2xl transition-all ${
                                item.quantity >= MAX_QUANTITY_PER_LINE
                                  ? 'text-zinc-700 cursor-not-allowed'
                                  : 'text-m2m-green hover:bg-zinc-800 active:scale-90'
                              }`}
                            >
                              <Plus className="w-6 h-6" />
                            </button>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="p-6 bg-zinc-950 hover:bg-red-500/10 rounded-3xl transition-all group/del active:scale-90 border border-zinc-800"
                          >
                            <Trash2 className="w-8 h-8 text-zinc-700 group-hover/del:text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/*
                      SELLING MORE, as ruled 2026-08-10: the natural next thing, at the
                      moment it is relevant, ONCE — a quiet row, never a popup, nothing
                      pre-ticked, and declining is simply ignoring it. It disappears
                      the moment the order has a pregrade. The year-2000 restriction is
                      the one consequence a pregrade carries, so it rides on the button.
                    */}
                    {pregradeService && !cart.some((item) => item.service.questions[0] === PREGRADE_CATEGORY) && (
                      <button
                        onClick={() => addToCart(pregradeService, 1)}
                        className="flex w-full min-h-[56px] items-center gap-4 rounded-[2rem] border-2 border-dashed border-zinc-700 bg-zinc-900/40 px-8 py-5 text-left transition-all hover:border-m2m-green/60 active:scale-[0.99]"
                      >
                        <PlusCircle className="h-7 w-7 shrink-0 text-m2m-green" />
                        <span className="text-lg font-bold text-zinc-200">
                          Add a pregrade — <span className="tabular-nums text-m2m-green">{formatUSD(unitPriceOf(pregradeService))}</span> per card
                          <span className="ml-3 text-sm font-semibold uppercase tracking-widest text-zinc-500">cards from 2000 or newer</span>
                        </span>
                      </button>
                    )}
                  </div>

                  {/* Order Summary Section */}
                  <div className="bg-zinc-900 rounded-[2.5rem] p-10 border border-zinc-800 shadow-2xl space-y-8 shrink-0">
                    <div className="space-y-8">
                      {/*
                        SUBMISSION ESSENTIALS — moved here from the landing screen on
                        2026-08-05, and to the TOP of this card on 2026-08-10: the
                        acknowledgement checkbox now lives in the always-visible pinned
                        footer, so the list it refers to must be the first thing the
                        scrolling body offers after the order lines — not the last
                        thing below the notes box, where only customers who scroll to
                        the very bottom would ever meet it.
                      */}
                      <div className="space-y-5">
                        <h3 className="flex items-center gap-3 text-xl font-black uppercase italic tracking-tight text-white">
                          <Shield className="w-6 h-6 text-m2m-green" />
                          Submission Essentials
                        </h3>
                        <div className="space-y-3">
                          {POLICY.map((item, i) => (
                            <div key={i} className="flex gap-3 text-base leading-snug text-zinc-300 items-start">
                              <CheckCircle2 className="w-5 h-5 text-m2m-green shrink-0 mt-0.5" />
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <h3 className="text-3xl font-black uppercase italic text-white border-b border-zinc-800 pb-6 tracking-tight pt-2">Order Summary</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-m2m-green font-black uppercase tracking-widest text-lg">Subtotal</span>
                          <span className="text-2xl font-black text-white">
                            ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        {cardShowMode && showDiscount > 0 && (
                          <div className="flex justify-between items-center">
                            <span className="text-m2m-green font-black uppercase tracking-widest text-lg">SHOW DISCOUNT ({globalDiscount}%)</span>
                            <span className="text-2xl font-black text-m2m-green">
                              -${showDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between items-center">
                          <div className="space-y-1">
                            <span className="text-m2m-green font-black uppercase tracking-widest text-lg">Shipping &amp; Insurance</span>
                            <p className="text-xs text-white leading-tight uppercase font-black tracking-widest">{SHIPPING_DISCLOSURE}</p>
                          </div>
                          <span className="text-2xl font-black text-white">
                            ${shippingFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="pt-8 border-t border-zinc-800 flex justify-between items-end">
                          <span className="text-m2m-green font-black uppercase tracking-[0.2em] text-2xl">
                            {cartHasMinimumPricedItem ? 'Total so far' : 'Total'}
                          </span>
                          <span className="text-5xl font-black text-white">
                            ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        {cartHasMinimumPricedItem && (
                          // One minimum-priced line makes the WHOLE total a minimum. A
                          // customer reading "Total $49.00" reasonably believes that is
                          // what they owe; saying "Total so far" and why is the difference
                          // between an expected invoice and a dispute.
                          <p className="text-sm leading-snug text-m2m-ivory">
                            This order includes an authentication service priced from a minimum. The
                            final cost depends on the item and is set once it has been assessed — we
                            will quote it to you before any further work, and today's payment is
                            applied either way.
                          </p>
                        )}
                      </div>

                      {/* Customer Notes Section */}
                      <div className="space-y-4 pt-6 border-t border-zinc-800">
                        <div className="space-y-1">
                          <label className="text-m2m-green font-black uppercase tracking-widest text-lg">Additional Instructions</label>
                          <p className="text-xs text-white leading-tight uppercase font-black tracking-widest">
                            Provide any additional details to help us accurately process your order (e.g., which cards belong to which services).
                          </p>
                        </div>
                        {/*
                          Capped because this field travels inside the handoff QR with the
                          rest of the order. It was unbounded, and a long enough note alone
                          could push the payload past what a QR can hold — which throws
                          during render and blanks the kiosk. 400 characters is several
                          sentences and leaves room for the order itself.
                        */}
                        <textarea
                          value={customerNotes}
                          maxLength={CUSTOMER_NOTES_MAX_LENGTH}
                          onChange={(e) => setCustomerNotes(e.target.value)}
                          placeholder="Enter any special instructions or details about your items..."
                          className="w-full h-32 bg-zinc-950 border border-m2m-green rounded-lg p-6 text-white text-lg focus:ring-1 focus:ring-m2m-green focus:outline-none transition-all resize-none custom-scrollbar placeholder:text-white"
                        />
                      </div>

                      {/* The payment-method choice (show mode) moved to the pinned
                          footer with the acknowledgement — a cash payer routes to a
                          different form, and a consequence that changes where the
                          order goes must not be skippable by not scrolling. */}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/*
        ── QUANTITY KEYPAD (Phase 2 P5) ──
        Opens from either quantity number. Keys are 64px — the 44px rule is a floor,
        not a target. Tapping outside cancels; Done stays disabled until the entry is
        a real quantity (1–99), so invalid input is refused at the moment of entry
        rather than silently corrected after it.
      */}
      {keypadTarget !== null && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm p-8"
          onClick={() => setKeypadTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-[2.5rem] border border-zinc-700 bg-zinc-900 p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-2 text-center text-sm font-black uppercase tracking-[0.3em] text-zinc-500">
              How many cards?
            </p>
            <div className="mb-6 flex h-20 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950">
              <span className={`text-5xl font-black tabular-nums ${keypadState.entry ? 'text-m2m-green' : 'text-zinc-700'}`}>
                {keypadState.entry || '·'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                <button
                  key={d}
                  onClick={() => setKeypadState((s) => keypadDigitPressed(s, d))}
                  className="h-16 rounded-2xl bg-zinc-800 text-3xl font-black text-white transition-all hover:bg-zinc-700 active:scale-90 active:bg-zinc-600"
                >
                  {d}
                </button>
              ))}
              <button
                onClick={() => setKeypadState(keypadBackspacePressed)}
                className="h-16 rounded-2xl bg-zinc-800 text-2xl font-black text-zinc-400 transition-all hover:bg-zinc-700 active:scale-90 active:bg-zinc-600"
              >
                ⌫
              </button>
              <button
                onClick={() => setKeypadState((s) => keypadDigitPressed(s, '0'))}
                className="h-16 rounded-2xl bg-zinc-800 text-3xl font-black text-white transition-all hover:bg-zinc-700 active:scale-90 active:bg-zinc-600"
              >
                0
              </button>
              <button
                onClick={() => setKeypadTarget(null)}
                className="h-16 rounded-2xl bg-zinc-800 text-base font-black uppercase tracking-widest text-zinc-400 transition-all hover:bg-zinc-700 active:scale-90"
              >
                Cancel
              </button>
            </div>
            <button
              disabled={keypadQuantity(keypadState.entry) === null}
              onClick={commitKeypad}
              className={`mt-4 h-16 w-full rounded-2xl text-lg font-black uppercase tracking-[0.1em] transition-all ${
                keypadQuantity(keypadState.entry) !== null
                  ? 'bg-m2m-green text-black hover:bg-m2m-green-ink hover:text-m2m-ivory active:scale-95'
                  : 'cursor-not-allowed bg-zinc-800 text-zinc-600'
              }`}
            >
              {keypadQuantity(keypadState.entry) !== null
                ? `Done — ${keypadQuantity(keypadState.entry)} ${keypadQuantity(keypadState.entry) === 1 ? 'card' : 'cards'}`
                : 'Enter 1–99'}
            </button>
          </div>
        </div>
      )}

      {/*
        ── "STILL THERE?" — the last 30 seconds before an inactivity reset. ──

        Sits above everything except the brightness dimmer so it cannot be missed, but it
        does NOT block the screen behind it: a customer who was mid-thought should be able
        to see what they were looking at while they decide.

        Any touch anywhere already resets the timer, so this is belt-and-braces for someone
        who is reading rather than touching. The button is oversized because the whole point
        is that a person who is struggling can dismiss it without aiming.
      */}
      {idleWarning && (
        <div className="fixed inset-x-0 bottom-0 z-[9998] flex justify-center p-6 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-8 rounded-[2rem] border border-m2m-green/40 bg-m2m-bg/95 px-10 py-6 shadow-2xl backdrop-blur">
            <div>
              <p className="text-2xl font-bold leading-tight text-m2m-ivory">Are you still there?</p>
              <p className="mt-1 text-base leading-tight text-zinc-400">
                We'll clear this order shortly so the next person starts fresh.
              </p>
            </div>
            <button
              onClick={() => setIdleWarning(false)}
              className="min-h-[64px] shrink-0 rounded-2xl bg-m2m-green px-10 py-4 text-lg font-bold uppercase tracking-widest text-m2m-bg active:scale-95 transition-transform"
            >
              I need more time
            </button>
          </div>
        </div>
      )}
      {brightness < 100 && (
        <div 
          id="screen-brightness-dimmer"
          className="fixed inset-0 pointer-events-none z-[99999] bg-black transition-opacity duration-200"
          style={{ opacity: ((100 - brightness) / 100) * 0.85 }}
        />
      )}
    </div>
  );
}
