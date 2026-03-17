/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  ChevronRight, 
  ChevronLeft, 
  ChevronDown,
  Home,
  RotateCcw, 
  HelpCircle, 
  FileText, 
  Shield, 
  CheckCircle2, 
  X,
  ExternalLink,
  ShoppingBag,
  Plus,
  PlusCircle,
  Minus,
  Trash2,
  Search,
  Settings,
  Send,
  MessageSquare,
  Loader2,
  Save,
  Play
} from 'lucide-react';
import { CSV_DATA, POLICY, RECOMMENDATIONS, TERMS_OF_USE_SECTIONS, PRIVACY_POLICY_SECTIONS, SUBMISSION_POLICY_SECTIONS } from './data';
import { sendMessage, type Message } from './services/aiService';
import StoreSettings from './components/StoreSettings';
import { addLog } from './utils/logger';

// --- Types ---

interface Service {
  questions: string[]; // [Q1, Q2, Q3, Q4, Q5]
  name: string;
  cost: string;
  turnaround: string;
  maxValue: string;
  description: string;
  details: string;
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  showMainMenu?: boolean;
  onMainMenuClick?: () => void;
}

// --- Helpers ---

const parseCSV = (csv: string): Service[] => {
  const lines = csv.split('\n').filter(line => line.trim() !== '');
  const services: Service[] = [];
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    // Simple CSV parser that handles quotes
    const parts: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current.trim());

    if (parts.length >= 6) {
      services.push({
        questions: [parts[0], parts[1], parts[2], parts[3], parts[4]],
        name: parts[5],
        cost: parts[6] || 'N/A',
        turnaround: parts[7] || 'N/A',
        // Column 8 is the completion date, column 9 is the max insured value
        maxValue: parts[9] || 'N/A',
        description: parts[10] || '',
        details: ''
      });
    }
  }
  return services;
};

// --- Components ---

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, showMainMenu, onMainMenuClick }) => {
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
      </motion.div>
    </div>
  );
};

export default function App() {
  const allServices = useMemo(() => {
    const services = parseCSV(CSV_DATA);
    // Suspend JSA Services: Filter out any services that include 'JSA'
    return services.filter(s => !s.name.toUpperCase().includes('JSA'));
  }, []);
  
  const [step, setStep] = useState<'landing' | 'questions' | 'results' | 'handoff'>('landing');
  const [policyAccepted, setPolicyAccepted] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [history, setHistory] = useState<{ questionIdx: number; services: Service[] }[]>([]);
  const [remainingServices, setRemainingServices] = useState<Service[]>(allServices);
  
  const [storeCode, setStoreCode] = useState(() => localStorage.getItem('storeCode') || '');
  const [cart, setCart] = useState<{ service: Service; quantity: number }[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [customerNotes, setCustomerNotes] = useState('');
  const [activeModal, setActiveModal] = useState<'terms' | 'privacy' | 'cart' | 'video' | null>(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (scrollRef.current && scrollRef.current.scrollTop > 20) {
      setShowScrollIndicator(false);
    }
  };

  // AI Chat State
  const [chatMessages, setChatMessages] = useState<Message[]>([
    { role: 'model', text: 'Hello! I am your M2M Assistant. How can I help you with your grading submission today?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isTyping) return;

    const userMessage: Message = { role: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsTyping(true);

    try {
      const response = await sendMessage(chatInput, chatMessages);
      setChatMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (error) {
      console.error("Chat Error:", error);
      setChatMessages(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error. Please try again or contact support.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const cost = parseFloat(item.service.cost.replace(/[^0-9.]/g, '')) || 0;
      return sum + (cost * item.quantity);
    }, 0);
  }, [cart]);

  const shippingFee = useMemo(() => {
    if (cart.length === 0) return 0;
    
    // Shipping Rate Adjustment: Base rate $24.00
    // +$5.00 for each unique grading company beyond the first one
    const companies = new Set<string>();
    cart.forEach(item => {
      const name = item.service.name.toUpperCase();
      if (name.includes('PSA')) companies.add('PSA');
      else if (name.includes('BGS')) companies.add('BGS');
      else if (name.includes('CGC')) companies.add('CGC');
      else if (name.includes('SGC')) companies.add('SGC');
      else if (name.includes('M2M')) companies.add('M2M');
      else {
        // Fallback: use the first word as company name if not recognized
        const firstWord = name.split(' ')[0];
        if (firstWord) companies.add(firstWord);
      }
    });
    
    const companyCount = companies.size;
    return 24 + (Math.max(0, companyCount - 1) * 5);
  }, [cart]);

  const total = subtotal + shippingFee;

  const addBusinessDays = (startDate: Date, days: number) => {
    const holidays = [
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

  const updateQuantity = (serviceName: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [serviceName]: Math.max(1, (prev[serviceName] || 1) + delta)
    }));
  };

  const addToCart = (service: Service) => {
    addLog(`Added ${service.name} to Cart`);
    const qty = quantities[service.name] || 1;
    setCart(prev => {
      const existing = prev.find(item => item.service.name === service.name);
      if (existing) {
        return prev.map(item => 
          item.service.name === service.name 
            ? { ...item, quantity: item.quantity + qty }
            : item
        );
      }
      return [...prev, { service, quantity: qty }];
    });
    // Reset local quantity after adding
    setQuantities(prev => ({ ...prev, [service.name]: 1 }));
  };

  const removeFromCart = (serviceName: string) => {
    setCart(prev => prev.filter(item => item.service.name !== serviceName));
  };

  const questionTexts = [
    "What can we help you with today?",
    "Preferred grading company.",
    "Is the item autographed?",
    "Pack-Pulled or Aftermarket?",
    "Which variation?"
  ];

  const questionDefinitions = [
    null,
    null,
    null,
    {
      "Pack-pulled": "A hand-signed signature from an athlete or celebrity that is officially inserted into a sealed, commercial, or retail pack by the manufacturer.",
      "Aftermarket": "A signature added to a trading card or collectible by the signer after its initial release."
    },
    null
  ];

  // --- Logic ---

  const getOptionsForQuestion = (idx: number, services: Service[]) => {
    const options = new Set<string>();
    services.forEach(s => {
      const val = s.questions[idx];
      if (val && val.toUpperCase() !== 'X') {
        options.add(val);
      }
    });
    return Array.from(options);
  };

  const findNextValidQuestionIdx = (startIdx: number, services: Service[]): number => {
    for (let i = startIdx; i < 5; i++) {
      const options = getOptionsForQuestion(i, services);
      if (options.length > 0) return i;
    }
    return 5; // Results
  };

  const handleStart = () => {
    if (!policyAccepted) return;
    addLog('Started Submission');
    const firstIdx = findNextValidQuestionIdx(0, allServices);
    setCurrentQuestionIdx(firstIdx);
    setRemainingServices(allServices);
    setStep('questions');
    console.log("Starting flow. First question index:", firstIdx);
  };

  const handleAnswer = (answer: string) => {
    addLog(`Answered Q${currentQuestionIdx + 1}: ${answer}`);
    const nextServices = remainingServices.filter(s => {
      const val = s.questions[currentQuestionIdx];
      return val.toUpperCase() === 'X' || val.toLowerCase() === answer.toLowerCase();
    });

    setHistory([...history, { questionIdx: currentQuestionIdx, services: remainingServices }]);
    setSelectedAnswers([...selectedAnswers, answer]);
    
    const nextIdx = findNextValidQuestionIdx(currentQuestionIdx + 1, nextServices);
    
    console.log(`Answer: ${answer}. Remaining services: ${nextServices.length}. Next question index: ${nextIdx}`);
    
    if (nextIdx >= 5) {
      setRemainingServices(nextServices);
      setStep('results');
    } else {
      setRemainingServices(nextServices);
      setCurrentQuestionIdx(nextIdx);
    }
  };

  const handleBack = () => {
    if (history.length === 0) {
      setStep('landing');
      return;
    }
    const lastState = history[history.length - 1];
    setHistory(history.slice(0, -1));
    setSelectedAnswers(selectedAnswers.slice(0, -1));
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
    setCurrentQuestionIdx(0);
    setSelectedAnswers([]);
    setHistory([]);
    setRemainingServices(allServices);
    setActiveModal(null);
    setCart([]);
    setQuantities({});
    setCustomerNotes('');
  };

  const handleSelectAnother = () => {
    const firstIdx = findNextValidQuestionIdx(0, allServices);
    setCurrentQuestionIdx(firstIdx);
    setSelectedAnswers([]);
    setHistory([]);
    setRemainingServices(allServices);
    setStep('questions');
  };

  // --- Render Helpers ---

  const renderLanding = () => (
    <div className="landscape-container p-8 lg:p-12 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-12 pt-8 pb-32">
        {/* Branding Section */}
        <div className="text-center space-y-6">
          <div className="space-y-4">
            <h1 className="text-white uppercase italic leading-none text-6xl">
              M2M Assistant
              <span className="block text-m2m-green not-italic text-4xl mt-4">Service Concierge</span>
            </h1>
            <p className="text-zinc-400 text-2xl font-medium">Market 2 Mint Grading Services</p>
          </div>
        </div>

        {/* Policy & Action Section */}
        <div className="bg-zinc-900/50 rounded-[3rem] p-12 border border-zinc-800 shadow-2xl space-y-10">
          <div className="space-y-6">
            <h2 className="text-3xl font-black uppercase italic text-white flex items-center justify-center gap-4 border-b border-zinc-800 pb-8">
              <Shield className="text-m2m-green w-10 h-10" />
              Submission Essentials
            </h2>
            
            <div className="grid grid-cols-1 gap-6 max-w-3xl mx-auto">
              {POLICY.map((item, i) => (
                <div key={i} className="flex gap-6 text-xl leading-relaxed text-zinc-300 items-start">
                  <CheckCircle2 className="w-8 h-8 text-m2m-green shrink-0 mt-1" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Video Tutorial Section */}
          <div className="max-w-3xl mx-auto w-full">
            <div className="bg-zinc-950/50 border-2 border-zinc-800 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center gap-8 hover:border-m2m-green/50 transition-colors group">
              <div className="flex-1 text-center md:text-left space-y-2">
                <h3 className="text-2xl font-black text-m2m-green uppercase italic tracking-tight">New to M2M?</h3>
                <p className="text-zinc-400 text-lg font-medium">Watch our 1-minute guide to get started.</p>
              </div>
              <button 
                onClick={() => setActiveModal('video')}
                className="w-full md:w-auto flex items-center justify-center gap-3 bg-zinc-800 hover:bg-zinc-700 text-white px-8 py-5 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 group-hover:bg-m2m-green group-hover:text-black"
              >
                <Play className="w-6 h-6 fill-current" />
                Watch How It Works
              </button>
            </div>
          </div>

          <div className="space-y-8 pt-6 border-t border-zinc-800">
            <label className="flex items-center gap-6 p-8 bg-zinc-950/50 rounded-3xl cursor-pointer transition-all active:scale-[0.99] border-2 border-transparent has-[:checked]:border-m2m-green group max-w-3xl mx-auto">
              <div className="relative flex items-center justify-center">
                <input 
                  type="checkbox" 
                  checked={policyAccepted}
                  onChange={(e) => setPolicyAccepted(e.target.checked)}
                  className="w-10 h-10 accent-m2m-green rounded-xl scale-150 bg-zinc-900 border-zinc-700"
                />
              </div>
              <span className="text-lg md:text-xl font-black select-none text-zinc-100 group-hover:text-white transition-colors uppercase italic tracking-tight leading-tight">
                I ACKNOWLEDGE AND AGREE TO ALL <span className="whitespace-nowrap">MARKET 2 MINT</span> SERVICE POLICIES
              </span>
            </label>

            <button 
              onClick={handleStart}
              disabled={!policyAccepted}
              className={`w-full max-w-3xl mx-auto h-24 rounded-3xl text-3xl font-black uppercase tracking-[0.2em] transition-all shadow-2xl flex items-center justify-center gap-4 ${
                policyAccepted 
                  ? 'bg-m2m-green text-black hover:bg-emerald-400 active:bg-emerald-500 active:scale-95 hover:shadow-m2m-green/40' 
                  : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              }`}
            >
              Start Submission
              <ChevronRight className="w-10 h-10" />
            </button>
          </div>

          <div className="pt-10 border-t border-zinc-800">
            <div className="bg-zinc-950/80 border border-zinc-800 rounded-[2rem] overflow-hidden flex flex-col h-[500px] shadow-2xl max-w-3xl mx-auto w-full">
              <div className="p-6 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-zinc-800 rounded-xl">
                    <MessageSquare className="w-6 h-6 text-m2m-green" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black uppercase italic text-white leading-none">Hobby Reference Tool</h3>
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">Knowledge Base v5.0</p>
                  </div>
                </div>
                <button 
                  onClick={() => setChatMessages([{ role: 'model', text: 'Hello! I am your Hobby Reference Assistant. How can I help you with industry info or terminology today?' }])}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl transition-all text-zinc-400 hover:text-m2m-green active:scale-95 flex items-center gap-2 group"
                >
                  <RotateCcw className="w-4 h-4 group-hover:rotate-[-45deg] transition-transform" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Reset Tool</span>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-4 rounded-2xl text-lg ${
                      msg.role === 'user' 
                        ? 'bg-m2m-green text-black font-bold rounded-tr-none' 
                        : 'bg-zinc-800 text-zinc-100 rounded-tl-none border border-zinc-700'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-zinc-800 text-zinc-400 p-4 rounded-2xl rounded-tl-none border border-zinc-700 flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm font-bold uppercase tracking-widest">Assistant is thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 bg-zinc-900/50 border-t border-zinc-800">
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                  className="flex gap-3"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about industry terms, grading standards, or hobby info..."
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-6 py-4 text-white focus:outline-none focus:border-m2m-green transition-colors text-lg"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isTyping}
                    className="p-4 bg-m2m-green text-black rounded-xl hover:bg-emerald-400 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                  >
                    <Send className="w-6 h-6" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-12 text-xl font-black text-zinc-500 uppercase tracking-[0.1em] pt-8">
          <button onClick={() => setActiveModal('terms')} className="hover:text-m2m-green transition-colors">Terms of Use</button>
          <button onClick={() => setActiveModal('privacy')} className="hover:text-m2m-green transition-colors">Privacy Policy</button>
          <button onClick={() => setActiveModal('submission')} className="hover:text-m2m-green transition-colors">Submission Policy</button>
        </div>
      </div>
    </div>
  );

  const renderQuestions = () => {
    const options = getOptionsForQuestion(currentQuestionIdx, remainingServices);
    const definitions = questionDefinitions[currentQuestionIdx];

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
            {[0, 1, 2, 3, 4].map(i => (
              <div 
                key={i} 
                className={`h-3 rounded-full transition-all duration-500 ${
                  i === currentQuestionIdx ? 'w-16 bg-m2m-green shadow-[0_0_20px_rgba(34,197,94,0.4)]' : 
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
              key={currentQuestionIdx}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="text-center space-y-6"
            >
              <span className="text-m2m-green font-black uppercase tracking-[0.4em] text-sm">Step {currentQuestionIdx + 1} of 5</span>
              <h2 className={`font-black text-white leading-tight uppercase italic tracking-tight ${
                questionTexts[currentQuestionIdx].length > 20 ? 'text-5xl' : 'text-6xl'
              }`}>
                {questionTexts[currentQuestionIdx]}
              </h2>
              <div className="h-1.5 w-32 bg-m2m-green rounded-full mx-auto" />
            </motion.div>
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div 
              key={currentQuestionIdx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full grid grid-cols-1 gap-6"
            >
              {options.map((opt) => (
                <div key={opt} className="space-y-4">
                  <button 
                    onClick={() => handleAnswer(opt)}
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
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  };

  const renderResults = () => (
    <div className="landscape-container p-8 lg:p-12 flex flex-col">
      {/* Header & Summary Bar */}
      <div className="flex justify-between items-center mb-10">
        <div className="flex items-center gap-6">
          <button 
            onClick={handleBack}
            className="flex items-center gap-3 font-black text-xl text-white active:scale-90 transition-transform bg-zinc-900 px-6 py-3 rounded-2xl border border-zinc-800"
          >
            <ChevronLeft className="w-6 h-6" />
            Back
          </button>
          <div className="h-12 w-px bg-zinc-800" />
          <div className="space-y-1">
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tight">
              Recommended Services
            </h2>
            <div className="inline-flex items-center bg-zinc-950 border border-m2m-green/50 px-8 py-3 rounded-full shadow-[0_0_20px_rgba(34,197,94,0.1)]">
              <p className="text-m2m-green font-black uppercase tracking-widest text-sm">
                {remainingServices.length} Matching Service(s) Found
              </p>
            </div>
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
                className="bg-m2m-green text-black font-black uppercase tracking-widest px-6 py-3 rounded-xl hover:bg-emerald-400 transition-all active:scale-95 flex items-center gap-3"
              >
                <ShoppingBag className="w-5 h-5" />
                Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)})
              </button>
            </div>
          )}
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
      </div>

      {/* Main Results Area */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto space-y-8 pb-12 snap-y snap-mandatory scroll-smooth relative"
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
            {remainingServices.map((service, i) => (
              <motion.div 
                key={service.name + i}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0, transition: { delay: i * 0.1 } }}
                className="bg-zinc-900 rounded-[3rem] shadow-2xl overflow-hidden border border-zinc-800 group hover:border-zinc-600 transition-all snap-start h-[72vh] flex flex-col"
              >
                <div className="p-10 space-y-8 flex-1 overflow-hidden flex flex-col">
                  <div className="shrink-0 space-y-6">
                    <div className="flex justify-between items-center gap-12">
                      <h3 className="text-4xl font-black leading-tight text-white uppercase italic tracking-tight">{service.name}</h3>
                      <div className="text-m2m-green font-black text-6xl leading-none">
                        {service.cost}
                      </div>
                    </div>
                    
                    <div className="flex gap-4 w-full">
                      <div className="bg-zinc-950 px-6 py-3 rounded-2xl border border-zinc-800 flex-1 text-center whitespace-nowrap">
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Turnaround Time</p>
                        <p className="text-lg font-black text-white uppercase italic">{service.turnaround} Business Days</p>
                      </div>
                      <div className="bg-zinc-950 px-6 py-3 rounded-2xl border border-zinc-800 flex-1 text-center whitespace-nowrap">
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Max Insured Value (If Lost/Damaged)</p>
                        <p className="text-lg font-black text-white uppercase italic">{service.maxValue}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 overflow-hidden">
                    <div className="space-y-4 flex flex-col overflow-hidden">
                      <h4 className="text-sm font-black uppercase tracking-[0.3em] text-zinc-500 border-l-4 border-m2m-green pl-4 shrink-0 italic">Service Description</h4>
                      <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                        <p className="text-zinc-300 text-lg leading-relaxed">
                          {service.description || "No description available."}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-4 flex flex-col">
                      <h4 className="text-sm font-black uppercase tracking-[0.3em] text-zinc-500 border-l-4 border-m2m-green pl-4 shrink-0 italic">ESTIMATED COMPLETION DATE</h4>
                      <div className="bg-zinc-950 p-6 rounded-3xl border border-zinc-800 flex items-center justify-between shrink-0">
                        <div>
                          <p className="text-3xl font-black text-white">{getEstimatedDate(service.turnaround)}</p>
                        </div>
                        <CheckCircle2 className="w-10 h-10 text-m2m-green/20" />
                      </div>
                      
                      {service.details && (
                        <div className="p-6 bg-zinc-950/50 rounded-3xl border border-dashed border-zinc-800 flex-1 overflow-y-auto custom-scrollbar">
                          <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-2 italic">Additional Details</h4>
                          <p className="text-base text-zinc-500 leading-relaxed italic">{service.details}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="bg-zinc-950 p-8 flex gap-6 items-center border-t border-zinc-800 shrink-0">
                  <div className="flex items-center bg-zinc-900 rounded-3xl p-2 border border-zinc-800 shrink-0">
                    <button 
                      onClick={() => updateQuantity(service.name, -1)}
                      className="p-3 hover:bg-zinc-800 rounded-2xl transition-all text-zinc-400 active:scale-90"
                    >
                      <Minus className="w-6 h-6" />
                    </button>
                    <span className="w-16 text-center font-black text-white text-3xl">
                      {quantities[service.name] || 1}
                    </span>
                    <button 
                      onClick={() => updateQuantity(service.name, 1)}
                      className="p-3 hover:bg-zinc-800 rounded-2xl transition-all text-zinc-400 active:scale-90"
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
                    className="flex-1 flex items-center justify-center gap-4 bg-m2m-green text-black py-5 rounded-[1.5rem] font-black text-lg uppercase tracking-[0.1em] hover:bg-emerald-400 transition-all shadow-2xl active:scale-95"
                  >
                    Add to Cart
                    <ShoppingBag className="w-6 h-6" />
                  </button>
                </div>
              </motion.div>
            ))}

            {/* Scroll Indicator */}
            <AnimatePresence>
              {showScrollIndicator && remainingServices.length > 1 && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none"
                >
                  <p className="text-m2m-green font-black uppercase tracking-[0.3em] text-[10px] italic drop-shadow-lg">Scroll for More</p>
                  <motion.div
                    animate={{ y: [0, 8, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <ChevronDown className="w-8 h-8 text-m2m-green drop-shadow-lg" />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );

  const renderHandoff = () => {
    const serviceList = encodeURIComponent(cart.map(item => item.service.name).join(', '));
    const cartTotal = total.toFixed(2);
    const savedStoreCode = storeCode || 'NOT_SET';
    const notes = encodeURIComponent(customerNotes);
    const jotformUrl = `https://form.jotform.com/260667434445159?totalAmount=${cartTotal}&servicesOrdered=${serviceList}&storecode=${encodeURIComponent(savedStoreCode)}&customernotes=${notes}`;

    return (
      <div className="landscape-container bg-zinc-900 flex flex-col p-8 lg:p-12 overflow-hidden relative">
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
            <div className="h-12 w-px bg-zinc-800" />
            <div className="space-y-1">
              <h2 className="text-3xl font-black text-white uppercase italic tracking-tight">
                Order Completion
              </h2>
              <div className="inline-flex items-center bg-zinc-950 border border-m2m-green/50 px-8 py-3 rounded-full shadow-[0_0_20px_rgba(34,197,94,0.1)]">
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
          <div className="space-y-4">
            <h2 className="text-5xl font-black text-white uppercase italic tracking-tight leading-none">
              SCAN TO FINISH <br />
              <span className="text-m2m-green">YOUR ORDER</span>
            </h2>
            <p className="text-zinc-400 text-xl max-w-2xl mx-auto leading-relaxed font-medium">
              Scan to upload photos and complete payment. Your services and total have been transferred.
            </p>
          </div>

          <div className="bg-white p-8 rounded-[3rem] shadow-[0_0_60px_rgba(34,197,94,0.2)] inline-block border-[10px] border-zinc-800 relative">
            <QRCodeSVG 
              value={jotformUrl} 
              size={320}
              level="H"
              includeMargin={false}
            />
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-m2m-green text-black px-6 py-1.5 rounded-full font-black text-xs uppercase tracking-widest shadow-xl">
              Secure Link
            </div>
          </div>

          <div className="pt-4">
            <button 
              onClick={handleReset}
              className="px-12 py-6 bg-zinc-800 text-white rounded-[2rem] text-2xl font-black uppercase tracking-[0.2em] hover:bg-zinc-700 active:scale-95 transition-all shadow-2xl border-2 border-zinc-700 hover:border-m2m-green"
            >
              EXIT IPAD FORM
            </button>
          </div>
        </div>
      </div>
    </div>
    );
  };

  return (
    <div className="min-h-screen bg-m2m-bg text-zinc-100 selection:bg-m2m-green/20 overflow-hidden">
      {step === 'landing' && <StoreSettings onUpdate={setStoreCode} onReset={handleReset} />}
      
      <main className="h-screen w-full flex flex-col">
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
                width="100%" 
                height="100%" 
                src="https://www.youtube.com/embed/FWmpAfi1z8A?autoplay=1&rel=0" 
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
                    {cart.map((item, i) => (
                      <div key={i} className="bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800 flex justify-between items-center gap-8 shadow-2xl group hover:border-zinc-600 transition-all">
                        <div className="flex-1 min-w-0 space-y-4">
                          <h4 className="font-black text-white text-3xl uppercase italic tracking-tight truncate">{item.service.name}</h4>
                          <div className="flex items-center gap-6">
                            <span className="text-lg text-zinc-500 font-bold uppercase tracking-widest">{item.service.cost} × {item.quantity}</span>
                            <span className="text-3xl font-black text-m2m-green">
                              ${(parseFloat(item.service.cost.replace(/[^0-9.]/g, '')) * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex gap-4">
                            <span className="bg-zinc-950 px-4 py-1.5 rounded-full border border-zinc-800 text-zinc-400 text-[10px] font-black uppercase tracking-widest">
                              {getEstimatedDate(item.service.turnaround)}
                            </span>
                            <span className="bg-zinc-950 px-4 py-1.5 rounded-full border border-zinc-800 text-zinc-400 text-[10px] font-black uppercase tracking-widest">
                              MAX INSURED VALUE: {item.service.maxValue}
                            </span>
                          </div>
                        </div>
                        <button 
                          onClick={() => removeFromCart(item.service.name)}
                          className="p-6 bg-zinc-950 hover:bg-red-500/10 rounded-3xl transition-all group/del active:scale-90 border border-zinc-800"
                        >
                          <Trash2 className="w-8 h-8 text-zinc-700 group-hover/del:text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Order Summary Section */}
                  <div className="bg-zinc-900 rounded-[2.5rem] p-10 border border-zinc-800 shadow-2xl space-y-8 shrink-0">
                    <div className="space-y-8">
                      <h3 className="text-3xl font-black uppercase italic text-white border-b border-zinc-800 pb-6 tracking-tight">Order Summary</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-500 font-black uppercase tracking-widest text-sm">Subtotal</span>
                          <span className="text-2xl font-black text-white">
                            ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="space-y-1">
                            <span className="text-zinc-500 font-black uppercase tracking-widest text-sm">Shipping & Insurance</span>
                            <p className="text-[10px] text-zinc-600 leading-tight uppercase font-black tracking-widest">Base rate + $5 per additional company</p>
                          </div>
                          <span className="text-2xl font-black text-white">
                            ${shippingFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="pt-8 border-t border-zinc-800 flex justify-between items-end">
                          <span className="text-zinc-400 font-black uppercase tracking-[0.2em] text-lg">Total</span>
                          <span className="text-5xl font-black text-m2m-green">
                            ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {/* Customer Notes Section */}
                      <div className="space-y-4 pt-6 border-t border-zinc-800">
                        <div className="space-y-1">
                          <label className="text-zinc-500 font-black uppercase tracking-widest text-sm">Additional Instructions</label>
                          <p className="text-[10px] text-zinc-600 leading-tight uppercase font-black tracking-widest">
                            Provide any additional details to help us accurately process your order (e.g., which cards belong to which services).
                          </p>
                        </div>
                        <textarea
                          value={customerNotes}
                          onChange={(e) => setCustomerNotes(e.target.value)}
                          placeholder="Enter any special instructions or details about your items..."
                          className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-lg p-6 text-white text-lg focus:border-m2m-green focus:outline-none transition-all resize-none custom-scrollbar"
                        />
                      </div>
                    </div>

                    <div className="flex gap-6 pt-4">
                      <button 
                        onClick={() => setActiveModal(null)}
                        className="flex-1 bg-zinc-800 text-white py-5 rounded-[1.5rem] font-black text-lg uppercase tracking-[0.1em] hover:bg-zinc-700 transition-all shadow-2xl active:scale-95"
                      >
                        Back
                      </button>
                      <button 
                        className="flex-[2] bg-m2m-green text-black py-5 rounded-[1.5rem] font-black text-lg uppercase tracking-[0.1em] hover:bg-emerald-400 transition-all shadow-2xl active:scale-95"
                        onClick={() => {
                          setStep('handoff');
                          setActiveModal(null);
                        }}
                      >
                        Complete Order
                      </button>
                    </div>
                    <p className="text-center text-[10px] text-zinc-600 uppercase font-black tracking-[0.3em]">Secure Checkout Powered by M2M</p>
                  </div>
                </div>
              )}
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
