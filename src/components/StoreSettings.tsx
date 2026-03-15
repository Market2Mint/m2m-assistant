import React, { useState, useEffect } from 'react';
import { Settings, X, Shield, CheckCircle2, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface StoreSettingsProps {
  onUpdate: (newCode: string) => void;
}

const StoreSettings: React.FC<StoreSettingsProps> = ({ onUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [storeCode, setStoreCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('storeCode') || '';
    setStoreCode(saved);
    onUpdate(saved);
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
    const trimmed = storeCode.trim();
    localStorage.setItem('storeCode', trimmed);
    onUpdate(trimmed);
    setIsOpen(false);
    setIsAuthorized(false);
    setPassword('');
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsAuthorized(false);
    setPassword('');
    setError('');
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
                  Store Settings
                </h2>
                <button 
                  onClick={handleClose} 
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-all text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 space-y-6">
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
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Store Location Code</label>
                      <input 
                        type="text"
                        value={storeCode}
                        onChange={(e) => setStoreCode(e.target.value)}
                        placeholder="Enter store code, e.g., HH - Escondido, CA"
                        autoFocus
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-m2m-green transition-colors"
                      />
                      <p className="text-[10px] text-zinc-500 italic">Format: [CODE] - [Location]</p>
                    </div>
                    <button 
                      onClick={handleSave}
                      className="w-full bg-m2m-green text-black font-black uppercase tracking-widest py-3 rounded-xl hover:bg-emerald-400 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Save className="w-5 h-5" />
                      Save Settings
                    </button>
                  </div>
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
