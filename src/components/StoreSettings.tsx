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
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getLogs, clearLogs, addLog, type LogEntry } from '../utils/logger';

interface StoreSettingsProps {
  onUpdate: (settings: { storeCode: string; brightness: number; volume: number }) => void;
  onReset?: () => void;
}

const StoreSettings: React.FC<StoreSettingsProps> = ({ onUpdate, onReset }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [storeCode, setStoreCode] = useState('');
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
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showLog, setShowLog] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

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

    setStoreCode(savedCode);
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
    onUpdate({ 
      storeCode: savedCode, 
      brightness: parseInt(savedBrightness), 
      volume: parseInt(savedVolume) 
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

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'StoreCode') {
      setIsAuthorized(true);
      setError('');
    } else {
      setError('Incorrect password');
      setPassword('');
    }
  };

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
      employees: employees.trim()
    };
    
    addLog(`STORE_PROFILE_CHECKIN: ${JSON.stringify(profileData)}`);
    
    onUpdate({ storeCode: trimmedCode, brightness, volume });
    setIsOpen(false);
    setIsAuthorized(false);
    setPassword('');
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsAuthorized(false);
    setPassword('');
    setError('');
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
                {!isAuthorized ? (
                  <form onSubmit={handlePasswordSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Admin Password</label>
                      <input 
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        autoFocus
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-m2m-green transition-colors"
                      />
                      {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
                    </div>
                    <button 
                      type="submit"
                      className="w-full bg-m2m-green text-black font-black uppercase tracking-widest py-3 rounded-xl hover:bg-emerald-400 transition-all active:scale-95"
                    >
                      Authenticate
                    </button>
                  </form>
                ) : (
                  <div className="space-y-10">
                    {/* Store Identity */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-black text-white uppercase italic tracking-widest flex items-center gap-2">
                        <Home className="w-4 h-4 text-m2m-green" />
                        Store Identity
                      </h3>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Shop Name</label>
                        <input 
                          type="text"
                          value={shopName}
                          onChange={(e) => setShopName(e.target.value)}
                          placeholder="e.g., Market 2 Mint HQ"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-m2m-green transition-colors"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Store Location Code</label>
                        <input 
                          type="text"
                          value={storeCode}
                          onChange={(e) => setStoreCode(e.target.value)}
                          placeholder="Enter store code, e.g., HH - Escondido, CA"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-m2m-green transition-colors"
                        />
                        <p className="text-[10px] text-zinc-500 italic">Format: [CODE] - [Location]</p>
                      </div>
                    </div>

                    {/* Store Profile */}
                    <div className="space-y-6 pt-6 border-t border-zinc-800">
                      <h3 className="text-sm font-black text-white uppercase italic tracking-widest flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-m2m-green" />
                        Store Profile
                      </h3>
                      
                      {/* Identity Details */}
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                            <MapPin className="w-3 h-3" />
                            Store Physical Address
                          </label>
                          <textarea 
                            value={storeAddress}
                            onChange={(e) => setStoreAddress(e.target.value)}
                            placeholder="Enter full physical address"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-m2m-green transition-colors h-20 resize-none text-sm"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                            <Phone className="w-3 h-3" />
                            Store Public Phone
                          </label>
                          <input 
                            type="tel"
                            value={storePhone}
                            onChange={(e) => setStorePhone(e.target.value)}
                            placeholder="(555) 000-0000"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-m2m-green transition-colors"
                          />
                        </div>
                      </div>

                      {/* Owner Info */}
                      <div className="space-y-4 pt-4 border-t border-zinc-800/50">
                        <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                          <User className="w-3 h-3" />
                          Owner Information
                        </h4>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Owner Name</label>
                            <input 
                              type="text"
                              value={ownerName}
                              onChange={(e) => setOwnerName(e.target.value)}
                              placeholder="Full Name"
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-m2m-green transition-colors"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                <Mail className="w-3 h-3" />
                                Owner Email
                              </label>
                              <input 
                                type="email"
                                value={ownerEmail}
                                onChange={(e) => setOwnerEmail(e.target.value)}
                                placeholder="email@example.com"
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-m2m-green transition-colors text-xs"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                <Phone className="w-3 h-3" />
                                Owner Mobile
                              </label>
                              <input 
                                type="tel"
                                value={ownerMobile}
                                onChange={(e) => setOwnerMobile(e.target.value)}
                                placeholder="(555) 000-0000"
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-m2m-green transition-colors text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Authorized Employees */}
                      <div className="space-y-4 pt-4 border-t border-zinc-800/50">
                        <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                          <Users className="w-3 h-3" />
                          Authorized Employees
                        </h4>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Employee Names & Emails</label>
                          <textarea 
                            value={employees}
                            onChange={(e) => setEmployees(e.target.value)}
                            placeholder="e.g., John Doe (john@example.com), Jane Smith (jane@example.com)"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-m2m-green transition-colors h-24 resize-none text-sm"
                          />
                          <p className="text-[10px] text-zinc-500 italic">Enter one per line or separated by commas.</p>
                        </div>
                      </div>
                    </div>

                    {/* Network & Connectivity */}
                    <div className="space-y-4 pt-6 border-t border-zinc-800">
                      <h3 className="text-sm font-black text-white uppercase italic tracking-widest flex items-center gap-2">
                        <Wifi className="w-4 h-4 text-m2m-green" />
                        Network & Connectivity
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Store Wi-Fi Name</label>
                          <input 
                            type="text"
                            value={wifiName}
                            onChange={(e) => setWifiName(e.target.value)}
                            placeholder="SSID"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-m2m-green transition-colors"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Wi-Fi Password</label>
                          <div className="relative">
                            <input 
                              type={showWifiPassword ? "text" : "password"}
                              value={wifiPassword}
                              onChange={(e) => setWifiPassword(e.target.value)}
                              placeholder="Password"
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-m2m-green transition-colors pr-12"
                            />
                            <button 
                              onClick={() => setShowWifiPassword(!showWifiPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                            >
                              {showWifiPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          <button 
                            onClick={handleTestConnectivity}
                            disabled={testStatus === 'loading'}
                            className={`w-full font-black uppercase tracking-widest py-3 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 border ${
                              testStatus === 'loading' ? 'bg-zinc-800 text-zinc-500 border-zinc-700' :
                              testStatus === 'success' ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/50' :
                              testStatus === 'error' ? 'bg-red-500/20 text-red-500 border-red-500/50' :
                              'bg-zinc-800 text-white border-zinc-700 hover:bg-zinc-700'
                            }`}
                          >
                            {testStatus === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                            {testStatus === 'loading' ? 'Testing...' : 
                             testStatus === 'success' ? 'System Connectivity Verified' : 
                             testStatus === 'error' ? 'Connectivity Test Failed' : 
                             'Test System Connectivity'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Diagnostics & Hardware */}
                    <div className="space-y-6 pt-6 border-t border-zinc-800">
                      <h3 className="text-sm font-black text-white uppercase italic tracking-widest flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-m2m-green" />
                        Diagnostics & Hardware
                      </h3>
                      
                      <div className="space-y-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                              <Sun className="w-3 h-3" />
                              Brightness
                            </label>
                            <span className="text-[10px] font-black text-white">{brightness}%</span>
                          </div>
                          <input 
                            type="range"
                            min="0"
                            max="100"
                            value={brightness}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setBrightness(val);
                              onUpdate({ storeCode, brightness: val, volume });
                            }}
                            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-m2m-green"
                          />
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                              <Volume2 className="w-3 h-3" />
                              Volume
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
                              onUpdate({ storeCode, brightness, volume: val });
                            }}
                            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-m2m-green"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={handleViewLog}
                          className="bg-zinc-800 text-white font-black uppercase tracking-widest py-3 rounded-xl hover:bg-zinc-700 transition-all active:scale-95 flex items-center justify-center gap-2 border border-zinc-700"
                        >
                          <ClipboardList className="w-4 h-4 text-m2m-green" />
                          System Log
                        </button>
                        <button 
                          onClick={handleForceReload}
                          className="bg-zinc-800 text-red-500 font-black uppercase tracking-widest py-3 rounded-xl hover:bg-zinc-700 transition-all active:scale-95 flex items-center justify-center gap-2 border border-zinc-700"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Reload App
                        </button>
                      </div>
                    </div>

                    <button 
                      onClick={handleSave}
                      className="w-full bg-m2m-green text-black font-black uppercase tracking-widest py-4 rounded-xl hover:bg-emerald-400 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl"
                    >
                      <Save className="w-5 h-5" />
                      Save & Close
                    </button>

                    <div className="pt-8 text-center">
                      <p className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.2em]">M2M Kiosk v1.0.6</p>
                    </div>
                  </div>
                )}
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
