import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  X, 
  Shield, 
  CheckCircle2, 
  Save, 
  Home, 
  Wifi, 
  WifiOff, 
  Activity, 
  Cpu, 
  Volume2, 
  Sun, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  ClipboardList,
  Users,
  MapPin,
  Phone,
  Mail,
  User,
  Trash2,
  Loader2,
  ShoppingBag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getLogs, clearLogs, addLog, type LogEntry } from '../utils/logger';

const STORE_OPTIONS = [
  "HH - Escondido, CA.",
  "PET - Petco Park, CA.",
  "MV - Mission Valley, CA.",
  "TEM - Temecula, CA.",
  "CC - Carlsbad, CA.", 
  "BOI - Meridian, ID.",
  "TCS - El Cajon, CA.",
  "CBD - Carlsbad, CA.",
  "BOX - Frisco, TX.",
  "MEX - Albuquerque, NM.",
  "LBC - Signal Hill, CA.",
  "AIR - Clairemont, CA.",
  "WAX - Linwood, NJ.",
  "ALL - Greenville, SC",
  "AND - Anderson, SC",
  "B&B - Laurens, SC.",
  "NJA - Carlsbad, CA.",
  "HOC - Metairie, LA.",
  "P&P - New Orleans, LA.",
  "RJD - McKinney, TX.",
  "XPs - Flowery Branch, GA."
];

const playVolumePreview = (volValue: number) => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08); // A5
    
    gainNode.gain.setValueAtTime((volValue / 100) * 0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch (err) {
    console.warn('Audio play failed:', err);
  }
};

interface StoreSettingsProps {
  onUpdate: (settings: { 
    storeCode: string; 
    brightness: number; 
    volume: number;
    cardShowMode: boolean;
    showPregradingPrice: number;
    globalDiscount: number;
    showName: string;
  }) => void;
  onReset?: () => void;
}

const StoreSettings: React.FC<StoreSettingsProps> = ({ onUpdate, onReset }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [storeCode, setStoreCode] = useState('');
  const [isManual, setIsManual] = useState(false);
  const [shopName, setShopName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerMobile, setOwnerMobile] = useState('');
  const [employees, setEmployees] = useState('');
  const [wifiName, setWifiName] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [showWifiPassword, setShowWifiPassword] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [volume, setVolume] = useState(80);
  const [cardShowMode, setCardShowMode] = useState(false);
  const [showPregradingPrice, setShowPregradingPrice] = useState(5.00);
  const [globalDiscount, setGlobalDiscount] = useState(10);
  const [showName, setShowName] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showLog, setShowLog] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Advanced settings password protection (232323)
  const [advancedPassword, setAdvancedPassword] = useState('');
  const [isAdvancedAuthorized, setIsAdvancedAuthorized] = useState(false);
  const [advancedError, setAdvancedError] = useState('');

  useEffect(() => {
    const savedCode = localStorage.getItem('storeCode') || '';
    const savedName = localStorage.getItem('shopName') || '';
    const savedAddress = localStorage.getItem('storeAddress') || '';
    const savedPhone = localStorage.getItem('storePhone') || '';
    const savedOwnerName = localStorage.getItem('ownerName') || '';
    const savedOwnerEmail = localStorage.getItem('ownerEmail') || '';
    const savedOwnerMobile = localStorage.getItem('ownerMobile') || '';
    const savedEmployees = localStorage.getItem('employees') || '';
    const savedWifiName = localStorage.getItem('wifiName') || '';
    const savedWifiPass = localStorage.getItem('wifiPassword') || '';
    const savedBrightness = localStorage.getItem('brightness') || '100';
    const savedVolume = localStorage.getItem('volume') || '80';
    const savedCardShowMode = localStorage.getItem('cardShowMode') === 'true';
    const savedShowPregradingPrice = localStorage.getItem('showPregradingPrice') || '5.00';
    const savedGlobalDiscount = localStorage.getItem('globalDiscount') || '10';
    const savedShowName = localStorage.getItem('showName') || '';

    setStoreCode(savedCode);
    if (savedCode && !STORE_OPTIONS.includes(savedCode)) {
      setIsManual(true);
    }
    setShopName(savedName);
    setStoreAddress(savedAddress);
    setStorePhone(savedPhone);
    setOwnerName(savedOwnerName);
    setOwnerEmail(savedOwnerEmail);
    setOwnerMobile(savedOwnerMobile);
    setEmployees(savedEmployees);
    setWifiName(savedWifiName);
    setWifiPassword(savedWifiPass);
    setBrightness(parseInt(savedBrightness));
    setVolume(parseInt(savedVolume));
    setCardShowMode(savedCardShowMode);
    setShowPregradingPrice(parseFloat(savedShowPregradingPrice));
    setGlobalDiscount(parseFloat(savedGlobalDiscount));
    setShowName(savedShowName);

    onUpdate({ 
      storeCode: savedCode, 
      brightness: parseInt(savedBrightness), 
      volume: parseInt(savedVolume),
      cardShowMode: savedCardShowMode,
      showPregradingPrice: parseFloat(savedShowPregradingPrice),
      globalDiscount: parseFloat(savedGlobalDiscount),
      showName: savedShowName
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [onUpdate]);

  const handleSave = () => {
    const trimmedCode = storeCode.trim();
    localStorage.setItem('storeCode', trimmedCode);
    localStorage.setItem('shopName', shopName.trim());
    localStorage.setItem('storeAddress', storeAddress.trim());
    localStorage.setItem('storePhone', storePhone.trim());
    localStorage.setItem('ownerName', ownerName.trim());
    localStorage.setItem('ownerEmail', ownerEmail.trim());
    localStorage.setItem('ownerMobile', ownerMobile.trim());
    localStorage.setItem('employees', employees.trim());
    localStorage.setItem('wifiName', wifiName.trim());
    localStorage.setItem('wifiPassword', wifiPassword.trim());
    localStorage.setItem('brightness', brightness.toString());
    localStorage.setItem('volume', volume.toString());
    localStorage.setItem('cardShowMode', cardShowMode.toString());
    localStorage.setItem('showPregradingPrice', showPregradingPrice.toString());
    localStorage.setItem('globalDiscount', globalDiscount.toString());
    
    localStorage.setItem('showName', showName.trim());
    
    // Reporting Logic: Log data to System Log
    const profileData = {
      storeCode: trimmedCode,
      shopName: shopName.trim(),
      address: storeAddress.trim(),
      phone: storePhone.trim(),
      owner: {
        name: ownerName.trim(),
        email: ownerEmail.trim(),
        mobile: ownerMobile.trim()
      },
      employees: employees.trim(),
      cardShowMode,
      showPregradingPrice,
      globalDiscount,
      showName: showName.trim()
    };
    
    addLog(`STORE_PROFILE_CHECKIN: ${JSON.stringify(profileData)}`);
    
    onUpdate({ 
      storeCode: trimmedCode, 
      brightness, 
      volume,
      cardShowMode,
      showPregradingPrice,
      globalDiscount,
      showName: showName.trim()
    });
    setIsOpen(false);
    setIsAdvancedAuthorized(false);
    setAdvancedPassword('');
    setAdvancedError('');
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsAdvancedAuthorized(false);
    setAdvancedPassword('');
    setAdvancedError('');
    setShowLog(false);
  };

  const handleForceReload = () => {
    if (confirm('Force reload application? This will refresh all data.')) {
      window.location.reload();
    }
  };

  const handleViewLog = () => {
    setLogs(getLogs());
    setShowLog(true);
  };

  const handleClearLog = () => {
    if (confirm('Clear system log?')) {
      clearLogs();
      setLogs([]);
    }
  };

  const handleTestConnectivity = async () => {
    setTestStatus('loading');
    try {
      await fetch('https://form.jotform.com', { mode: 'no-cors' });
      setTestStatus('success');
      addLog('SYSTEM_CONNECTIVITY_TEST: SUCCESS');
      setTimeout(() => setTestStatus('idle'), 3000);
    } catch (err) {
      setTestStatus('error');
      addLog('SYSTEM_CONNECTIVITY_TEST: FAILED');
      setTimeout(() => setTestStatus('idle'), 5000);
    }
  };

  return (
    <>
      {/* Cog Icon */}
      <div className="fixed top-8 right-8 z-[60]">
        <button 
          onClick={() => setIsOpen(true)}
          className="text-zinc-500 hover:text-black transition-colors p-2 bg-white/5 hover:bg-white/10 rounded-full backdrop-blur-sm"
          title="Store Settings"
          id="store-settings-trigger"
        >
          <Settings className="w-6 h-6" />
        </button>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-zinc-900 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-zinc-800"
            >
              <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
                <h2 className="text-xl font-black text-white uppercase italic tracking-tight flex items-center gap-3">
                  <Settings className="w-6 h-6 text-m2m-green" />
                  Kiosk Management
                </h2>
                <div className="flex items-center gap-4">
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${isOnline ? 'border-m2m-green/30 bg-m2m-green/10 text-m2m-green' : 'border-red-500/30 bg-red-500/10 text-red-500'}`}>
                    <Activity className={`w-3 h-3 ${isOnline ? 'animate-pulse' : ''}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest">{isOnline ? 'Online' : 'Offline'}</span>
                  </div>
                  {onReset && (
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-m2m-green uppercase italic tracking-widest">Main Menu</span>
                      <button 
                        onClick={() => {
                          onReset();
                          handleClose();
                        }}
                        className="p-2 bg-zinc-900 border-2 border-m2m-green rounded-xl shadow-sm active:scale-90 transition-transform"
                      >
                        <Home className="w-4 h-4 text-m2m-green" />
                      </button>
                    </div>
                  )}
                  <button 
                    onClick={handleClose} 
                    className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-all text-zinc-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

               <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
                <div className="space-y-10">
                  {/* Store Identity */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-black text-white uppercase italic tracking-widest flex items-center gap-2">
                        <Home className="w-4 h-4 text-m2m-green" />
                        Store Identity
                      </h3>
                      <button 
                        type="button"
                        onClick={() => {
                          const nextManual = !isManual;
                          setIsManual(nextManual);
                          if (!nextManual) {
                            if (!STORE_OPTIONS.includes(storeCode)) {
                              setStoreCode('');
                              localStorage.setItem('storeCode', '');
                              onUpdate({ 
                                storeCode: '', 
                                brightness, 
                                volume,
                                cardShowMode,
                                showPregradingPrice,
                                globalDiscount,
                                showName
                              });
                            }
                          }
                        }}
                        className="text-[10px] font-black uppercase tracking-widest text-m2m-green hover:text-m2m-green-ink transition-colors focus:outline-none flex items-center gap-1 bg-zinc-800/50 hover:bg-zinc-800 px-2 py-1 rounded-md"
                      >
                        {isManual ? "Use List" : "Manual Entry"}
                      </button>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                        {isManual ? "Custom Store Name (Manual)" : "Store Location Code"}
                      </label>
                      {isManual ? (
                        <input 
                          type="text"
                          value={storeCode}
                          placeholder="e.g., XPs - Flowery Branch, GA."
                          onChange={(e) => {
                            const val = e.target.value;
                            setStoreCode(val);
                            localStorage.setItem('storeCode', val);
                            onUpdate({ 
                              storeCode: val, 
                              brightness, 
                              volume,
                              cardShowMode,
                              showPregradingPrice,
                              globalDiscount,
                              showName
                            });
                          }}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-m2m-green transition-colors text-sm"
                        />
                      ) : (
                        <select 
                          value={storeCode}
                          onChange={(e) => {
                            const val = e.target.value;
                            setStoreCode(val);
                            localStorage.setItem('storeCode', val);
                            onUpdate({ 
                              storeCode: val, 
                              brightness, 
                              volume,
                              cardShowMode,
                              showPregradingPrice,
                              globalDiscount,
                              showName
                            });
                          }}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-m2m-green transition-colors text-sm"
                        >
                          <option value="">Select Store Location...</option>
                          {STORE_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Device Adjustments */}
                  <div className="space-y-6 pt-6 border-t border-zinc-800">
                    <h3 className="text-sm font-black text-white uppercase italic tracking-widest flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-m2m-green" />
                      Device Adjustments
                    </h3>
                    
                    <div className="space-y-4">
                      {/* Brightness Adjuster */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                            <Sun className="w-3.5 h-3.5 text-zinc-400" />
                            Screen Brightness
                          </label>
                          <span className="text-[10px] font-black text-white">{brightness}%</span>
                        </div>
                        <input 
                          type="range"
                          min="10"
                          max="100"
                          value={brightness}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setBrightness(val);
                            localStorage.setItem('brightness', val.toString());
                            onUpdate({ 
                              storeCode, 
                              brightness: val, 
                              volume, 
                              cardShowMode, 
                              showPregradingPrice, 
                              globalDiscount,
                              showName
                            });
                          }}
                          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-m2m-green"
                        />
                      </div>

                      {/* Volume Adjuster */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                            <Volume2 className="w-3.5 h-3.5 text-zinc-400" />
                            Kiosk Sound Volume
                          </label>
                          <span className="text-[10px] font-black text-white">{volume}%</span>
                        </div>
                        <input 
                          type="range"
                          min="0"
                          max="100"
                          value={volume}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setVolume(val);
                            localStorage.setItem('volume', val.toString());
                            onUpdate({ 
                              storeCode, 
                              brightness, 
                              volume: val, 
                              cardShowMode, 
                              showPregradingPrice, 
                              globalDiscount,
                              showName
                            });
                          }}
                          onPointerUp={(e) => {
                            const val = parseInt((e.target as HTMLInputElement).value);
                            playVolumePreview(val);
                          }}
                          className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-m2m-green"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Advanced Settings Protection */}
                  <div className="pt-6 border-t border-zinc-800 space-y-6">
                    {!isAdvancedAuthorized ? (
                      <div className="p-5 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-4">
                        <div className="flex items-center gap-2.5">
                          <Shield className="w-5 h-5 text-m2m-green" />
                          <h4 className="text-xs font-black uppercase tracking-widest text-white leading-none">Advanced Controls</h4>
                        </div>
                        <p className="text-[10px] text-zinc-500 leading-relaxed">Enter security credential key to edit diagnostics, hardware parameters, and system configs.</p>
                        <div className="space-y-3">
                          <input 
                            type="password"
                            placeholder="Enter advanced password"
                            value={advancedPassword}
                            onChange={(e) => setAdvancedPassword(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (advancedPassword === '232323') {
                                  setIsAdvancedAuthorized(true);
                                  setAdvancedError('');
                                } else {
                                  setAdvancedError('Incorrect advanced password');
                                  setAdvancedPassword('');
                                }
                              }
                            }}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-m2m-green transition-colors"
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              if (advancedPassword === '232323') {
                                setIsAdvancedAuthorized(true);
                                setAdvancedError('');
                              } else {
                                setAdvancedError('Incorrect advanced password');
                                setAdvancedPassword('');
                              }
                            }}
                            className="w-full bg-m2m-green text-black font-black uppercase tracking-widest py-3 rounded-xl hover:bg-m2m-green-ink hover:text-m2m-ivory transition-all active:scale-95 text-xs text-center"
                          >
                            Unlock Settings
                          </button>
                        </div>
                        {advancedError && <p className="text-red-500 text-[10px] font-bold">{advancedError}</p>}
                      </div>
                    ) : (
                      <div className="space-y-10">
                        {/* Diagnostics & Hardware */}
                        <div className="space-y-6">
                          <h3 className="text-sm font-black text-white uppercase italic tracking-widest flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-m2m-green" />
                            System Diagnostics
                          </h3>

                          <div className="grid grid-cols-2 gap-4">
                            <button 
                              type="button"
                              onClick={handleViewLog}
                              className="bg-zinc-800 text-white font-black uppercase tracking-widest py-3 rounded-xl hover:bg-zinc-700 transition-all active:scale-95 flex items-center justify-center gap-2 border border-zinc-700"
                            >
                              <ClipboardList className="w-4 h-4 text-m2m-green" />
                              System Log
                            </button>
                            <button 
                              type="button"
                              onClick={handleForceReload}
                              className="bg-zinc-800 text-red-500 font-black uppercase tracking-widest py-3 rounded-xl hover:bg-zinc-700 transition-all active:scale-95 flex items-center justify-center gap-2 border border-zinc-700"
                            >
                              <RefreshCw className="w-4 h-4" />
                              Reload App
                            </button>
                          </div>
                        </div>

                        {/* Card Show Mode */}
                        <div className="space-y-6 pt-6 border-t border-zinc-800">
                          <h3 className="text-sm font-black text-white uppercase italic tracking-widest flex items-center gap-2">
                            <ShoppingBag className="w-4 h-4 text-m2m-green" />
                            Card Show Mode
                          </h3>
                          
                          <div className="space-y-4">
                            <label className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-xl cursor-pointer group">
                              <span className="text-xs font-black uppercase tracking-widest text-zinc-400 group-hover:text-white transition-colors">Activate Card Show Mode</span>
                              <div className="relative inline-flex items-center cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={cardShowMode}
                                  onChange={(e) => {
                                    const val = e.target.checked;
                                    setCardShowMode(val);
                                    localStorage.setItem('cardShowMode', val.toString());
                                    onUpdate({ storeCode, brightness, volume, cardShowMode: val, showPregradingPrice, globalDiscount, showName });
                                  }}
                                  className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-m2m-green"></div>
                              </div>
                            </label>

                            {/* Show Name text field directly in Card Show Mode area */}
                            {cardShowMode && (
                              <div className="space-y-2 p-4 bg-zinc-950 border border-zinc-800 rounded-2xl animate-fade-in shadow-inner">
                                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
                                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-m2m-green"></span>
                                  Show Name
                                </label>
                                <input 
                                  type="text"
                                  value={showName}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setShowName(val);
                                    localStorage.setItem('showName', val);
                                    onUpdate({ 
                                      storeCode, 
                                      brightness, 
                                      volume, 
                                      cardShowMode, 
                                      showPregradingPrice, 
                                      globalDiscount,
                                      showName: val
                                    });
                                  }}
                                  placeholder="Enter custom show name (e.g., Dallas Card Show)"
                                  className="w-full bg-zinc-900 border border-zinc-805 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-m2m-green transition-colors font-medium placeholder:text-zinc-650"
                                />
                              </div>
                            )}

                            <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Show Pregrading Price ($)</label>
                              <input 
                                type="number"
                                step="0.01"
                                value={showPregradingPrice}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setShowPregradingPrice(val);
                                  localStorage.setItem('showPregradingPrice', val.toString());
                                  onUpdate({ storeCode, brightness, volume, cardShowMode, showPregradingPrice: val, globalDiscount, showName });
                                }}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-m2m-green transition-colors"
                              />
                            </div>

                            <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Global Percentage Discount (%)</label>
                              <input 
                                type="number"
                                step="0.1"
                                value={globalDiscount}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setGlobalDiscount(val);
                                  localStorage.setItem('globalDiscount', val.toString());
                                  onUpdate({ storeCode, brightness, volume, cardShowMode, showPregradingPrice, globalDiscount: val, showName });
                                }}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-m2m-green transition-colors"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={handleSave}
                    className="w-full bg-m2m-green text-black font-black uppercase tracking-widest py-4 rounded-xl hover:bg-m2m-green-ink hover:text-m2m-ivory transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl"
                  >
                    <Save className="w-5 h-5" />
                    Save & Close
                  </button>

                  <div className="pt-8 text-center">
                    <p className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.2em]">M2M Kiosk v1.0.7</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Log Modal */}
      <AnimatePresence>
        {showLog && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-8 bg-black/90 backdrop-blur-xl">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-zinc-900 rounded-[2.5rem] border border-zinc-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-8 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
                <h3 className="text-2xl font-black text-white uppercase italic flex items-center gap-3">
                  <ClipboardList className="w-6 h-6 text-m2m-green" />
                  System Event Log
                </h3>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={handleClearLog}
                    className="p-3 bg-zinc-800 text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                    title="Clear Logs"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => setShowLog(false)}
                    className="p-3 bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-8 space-y-2 custom-scrollbar bg-black/20">
                {logs.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4">
                    <Activity className="w-12 h-12 opacity-20" />
                    <p className="font-black uppercase tracking-widest text-sm">No events recorded</p>
                  </div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="flex gap-4 text-[10px] font-mono border-b border-zinc-800/50 py-2 hover:bg-white/5 px-2 rounded transition-colors">
                      <span className="text-zinc-500 shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                      <span className="text-m2m-green uppercase font-bold tracking-wider">{log.event}</span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default StoreSettings;
