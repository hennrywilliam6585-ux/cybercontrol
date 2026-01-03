
import React, { useState, useEffect, useRef } from 'react';
import { db } from './firebaseConfig';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Terminal, X, Power, ShieldCheck, Lock, Bell, AlertTriangle, Clock } from 'lucide-react';

// Prevent TS Error for Electron API
declare global {
  interface Window {
    electronAPI?: {
      sendNotification: (data: any) => void;
      onShowToast: (callback: (data: any) => void) => void;
      setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) => void;
    };
  }
}

// Types
interface ToastData {
  id: number;
  title: string;
  message: string;
  logo: string;
  isUrgent: boolean;
  duration: number;
  x?: number;
  y?: number;
  timestamp: number;
}

// Sub-component for individual toasts to handle their own timers
const ToastNotification: React.FC<{
    data: ToastData;
    onClose: (id: number, isUrgent: boolean, original: ToastData) => void;
    onAutoDismiss: (id: number) => void;
}> = ({ data, onClose, onAutoDismiss }) => {
    const [timeLeft, setTimeLeft] = useState(data.duration);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        if (data.duration <= 0) return;

        // Countdown interval for UI
        const interval = setInterval(() => {
            setTimeLeft((prev) => Math.max(0, prev - 1));
        }, 1000);

        // Removal timer
        const timer = setTimeout(() => {
            setIsExiting(true);
            // Allow animation to play before actual removal (optional, but good for UX)
            setTimeout(() => onAutoDismiss(data.id), 500); 
        }, data.duration * 1000);

        return () => {
            clearInterval(interval);
            clearTimeout(timer);
        };
    }, [data.duration, data.id, onAutoDismiss]);

    const handleManualClose = () => {
        setIsExiting(true);
        setTimeout(() => onClose(data.id, data.isUrgent, data), 300);
    };

    return (
        <div 
            className={`
                pointer-events-auto w-[360px] rounded-lg shadow-2xl flex flex-col overflow-hidden transition-all duration-500
                ${isExiting ? 'opacity-0 translate-x-full' : 'animate-in slide-in-from-right-full'}
                ${data.isUrgent 
                    ? 'bg-[#1a0505] border border-red-900/50 shadow-[0_0_15px_rgba(220,38,38,0.2)]' 
                    : 'bg-[#0F172A]/95 border border-slate-700/50 backdrop-blur-md shadow-[0_0_15px_rgba(0,0,0,0.5)]'
                }
            `}
        >
            {/* Header */}
            <div className={`flex items-center px-4 py-2.5 border-b ${data.isUrgent ? 'bg-red-950/50 border-red-900/30' : 'bg-slate-900/50 border-slate-700/30'}`}>
                {data.isUrgent ? <AlertTriangle size={14} className="mr-2 text-red-500" /> : <Bell size={14} className="mr-2 text-cyan-400" />}
                <span className="text-xs font-bold text-slate-200 tracking-wide mr-auto uppercase">{data.title}</span>
                
                {data.duration === 0 ? (
                    <button 
                        onClick={handleManualClose}
                        className="text-slate-400 hover:text-white p-1 transition-colors"
                    >
                        <X size={14} />
                    </button>
                ) : (
                    <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 bg-black/20 px-1.5 py-0.5 rounded">
                        <Clock size={10} /> {timeLeft}s
                    </span>
                )}
            </div>
            
            {/* Body */}
            <div className="p-4 flex gap-4">
                {/* Large Logo in Body */}
                {data.logo && (
                    <div className="shrink-0">
                        <img 
                            src={data.logo} 
                            className="w-12 h-12 object-contain rounded bg-black/20 p-1 border border-white/5" 
                            alt="icon"
                        />
                    </div>
                )}
                
                <div className="flex-1 min-w-0 flex items-center">
                    <p className="text-sm text-slate-300 leading-snug whitespace-pre-wrap font-medium">
                        {data.message}
                    </p>
                </div>
            </div>
        </div>
    );
};

const ClientApp: React.FC = () => {
  // Execution Mode: 'worker' (Background Logic) vs 'overlay' (Foreground UI)
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode'); 

  // --- STATE ---
  const [stationId, setStationId] = useState<string | null>(localStorage.getItem('cyber_station_id'));
  const [stationName, setStationName] = useState<string | null>(localStorage.getItem('cyber_station_name'));
  const [isActive, setIsActive] = useState(mode === 'worker' || mode === 'overlay'); 
  const [statusText, setStatusText] = useState("WAITING FOR ACTIVATION...");
  const [toasts, setToasts] = useState<ToastData[]>([]);
  
  // Refs for logic
  const lastLogIdRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const stationIdRef = useRef<string | null>(stationId); 
  const wakeLockRef = useRef<any>(null);

  // --- AUDIO ENGINE ---
  const initAudio = () => {
    if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) audioContextRef.current = new AudioCtx();
    }
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
    }
  };

  const playPing = (isUrgent: boolean) => {
    try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        const now = ctx.currentTime;
        
        if (isUrgent) {
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.linearRampToValueAtTime(400, now + 0.1);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
        } else {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1200, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.3);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.4);
        }
    } catch(e) {
        console.error("Audio error:", e);
    }
  };

  // --- TOAST LOGIC ---
  const addToast = (title: string, message: string, logo: string, isUrgent: boolean, duration: number, x?: number, y?: number) => {
    const newToast: ToastData = {
        id: Date.now() + Math.random(),
        title,
        message,
        logo,
        isUrgent,
        duration,
        x,
        y,
        timestamp: Date.now()
    };
    
    setToasts(prev => [...prev, newToast]);
    
    // In Overlay Mode, ensure we capture mouse events for the new toast
    if (mode === 'overlay' && window.electronAPI) {
        window.electronAPI.setIgnoreMouseEvents(false);
    }
    
    // Note: Timer logic moved to ToastNotification component for better visual sync
  };

  // Called when manual X is clicked
  const handleToastClose = (id: number, isUrgent: boolean, original: ToastData) => {
      setToasts(prev => {
          const updated = prev.filter(t => t.id !== id);
          if (updated.length === 0 && mode === 'overlay' && window.electronAPI) {
              window.electronAPI.setIgnoreMouseEvents(true, { forward: true });
          }
          return updated;
      });

      // Hydra Effect for Urgent/Persistent messages
      if (isUrgent) {
          playPing(true);
          const maxX = window.innerWidth - 360; 
          const maxY = window.innerHeight - 150; 

          for (let i = 0; i < 2; i++) {
              const rx = Math.max(20, Math.floor(Math.random() * maxX));
              const ry = Math.max(20, Math.floor(Math.random() * maxY));
              setTimeout(() => {
                  addToast(original.title, original.message, original.logo, true, original.duration, rx, ry);
              }, i * 150);
          }
      }
  };

  // Called when timer runs out
  const handleAutoDismiss = (id: number) => {
      setToasts(prev => {
          const updated = prev.filter(t => t.id !== id);
          if (updated.length === 0 && mode === 'overlay' && window.electronAPI) {
              window.electronAPI.setIgnoreMouseEvents(true, { forward: true });
          }
          return updated;
      });
  };

  // --- WORKER: FIRESTORE LISTENER ---
  useEffect(() => {
      if (mode !== 'worker') return;
      console.log("[Worker] Service Active. Listening...");

      let currentId = stationId;
      if (!currentId) {
          const os = "WIN"; 
          currentId = `STATION-${os}-${Math.floor(Math.random()*10000)}`;
          localStorage.setItem('cyber_station_id', currentId);
          localStorage.setItem('cyber_station_name', "Desktop Client");
          setStationId(currentId);
      }
      stationIdRef.current = currentId;

      try {
        const stationRef = doc(db, "stations", currentId);
        updateDoc(stationRef, { status: 'ONLINE', ip: 'DESKTOP-APP' }).catch(() => {});
      } catch(e) {}

      const q = query(collection(db, "notification_logs"), orderBy("timestamp", "desc"), limit(1));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
          if (snapshot.empty) return;
          const docSnap = snapshot.docs[0];
          const data = docSnap.data();
          const logId = docSnap.id;

          if (lastLogIdRef.current === null) {
              lastLogIdRef.current = logId;
              return;
          }

          if (logId !== lastLogIdRef.current) {
              lastLogIdRef.current = logId;
              
              const targets = data.targets || [];
              const myId = stationIdRef.current;

              if (targets.includes('ALL') || (myId && targets.includes(myId))) {
                   console.log("[Worker] Alert detected:", data);
                   
                   const payload = {
                       title: data.title || "System Alert",
                       message: data.message || "",
                       logo: data.logo || "",
                       type: data.type || "BROADCAST",
                       duration: data.duration || 0,
                       isUrgent: data.type === 'PERSISTENT'
                   };
                   
                   if (window.electronAPI) {
                       window.electronAPI.sendNotification(payload);
                   }
              }
          }
      });

      return () => unsubscribe();
  }, [mode]);

  // --- OVERLAY: IPC LISTENER ---
  useEffect(() => {
      if (mode !== 'overlay') return;
      
      if (window.electronAPI) {
          window.electronAPI.onShowToast((data: any) => {
              playPing(data.isUrgent);
              addToast(data.title, data.message, data.logo, data.isUrgent, data.duration);
          });
      }
  }, [mode]);

  // --- BROWSER CLIENT (Legacy) ---
  useEffect(() => {
      if (mode === 'worker' || mode === 'overlay') return; 
      if (!isActive) return;

      const q = query(collection(db, "notification_logs"), orderBy("timestamp", "desc"), limit(1));
      const unsubscribe = onSnapshot(q, (snapshot) => {
          if (snapshot.empty) return;
          const docSnap = snapshot.docs[0];
          const data = docSnap.data();
          const logId = docSnap.id;

          if (lastLogIdRef.current === null) {
              lastLogIdRef.current = logId;
              return;
          }

          if (logId !== lastLogIdRef.current) {
              lastLogIdRef.current = logId;
              const targets = data.targets || [];
              const currentStationId = stationIdRef.current;

              if (targets.includes('ALL') || (currentStationId && targets.includes(currentStationId))) {
                   const payload = {
                       title: data.title || "System Alert",
                       message: data.message || "",
                       logo: data.logo || "",
                       isUrgent: data.type === 'PERSISTENT',
                       duration: data.duration || 0
                   };

                   playPing(payload.isUrgent);
                   if ("Notification" in window && Notification.permission === "granted") {
                       try { 
                           new Notification(payload.title, { 
                               body: payload.message, 
                               icon: payload.logo,
                               requireInteraction: payload.duration === 0
                           }); 
                       } catch(e) {}
                   }
                   addToast(payload.title, payload.message, payload.logo, payload.isUrgent, payload.duration);
              }
          }
      });
      return () => unsubscribe();
  }, [isActive, mode]);

  // --- HANDLERS ---
  const handleStationSelect = (id: string, name: string) => {
      setStationId(id);
      setStationName(name);
      localStorage.setItem('cyber_station_id', id);
      localStorage.setItem('cyber_station_name', name);
      stationIdRef.current = id;
  };

  const handleActivate = async () => {
      initAudio();
      if ("Notification" in window) await Notification.requestPermission();
      if ('wakeLock' in navigator) {
          try { wakeLockRef.current = await (navigator as any).wakeLock.request('screen'); } catch (err) {}
      }
      if (stationId) {
          try { await updateDoc(doc(db, "stations", stationId), { status: 'ONLINE' }); } catch (e) {}
      }
      setIsActive(true);
      setStatusText("CONNECTED [LISTENING FOR PACKETS]");
  };

  const handleReset = () => {
      setIsActive(false);
      setStationId(null);
      setStationName(null);
      localStorage.removeItem('cyber_station_id');
      localStorage.removeItem('cyber_station_name');
      stationIdRef.current = null;
      setToasts([]);
      lastLogIdRef.current = null;
  };

  // --- RENDER: WORKER ---
  if (mode === 'worker') {
      return (
          <div className="h-screen w-full bg-black text-green-500 font-mono p-4 text-xs">
              <h1 className="font-bold mb-2">CYBER CORP BACKGROUND WORKER</h1>
              <div className="flex flex-col gap-1">
                 <div>STATUS: <span className="text-white">ACTIVE</span></div>
                 <div>STATION ID: <span className="text-white">{stationId}</span></div>
                 <div className="animate-pulse mt-2">Listening for secure packets...</div>
              </div>
          </div>
      );
  }

  // --- RENDER: OVERLAY ---
  if (mode === 'overlay') {
      return (
          <div className="w-screen h-screen overflow-hidden flex flex-col items-end justify-end p-8 pointer-events-none">
              <div className="flex flex-col gap-4 items-end w-full max-w-md">
                  {toasts.map((toast) => (
                      <ToastNotification 
                          key={toast.id} 
                          data={toast} 
                          onClose={handleToastClose} 
                          onAutoDismiss={handleAutoDismiss}
                      />
                  ))}
              </div>
          </div>
      );
  }

  // --- RENDER: BROWSER CLIENT ---
  if (!stationId) {
      return (
          <div className="flex flex-col items-center justify-center h-screen w-full bg-[#0b1120] text-slate-300 animate-in fade-in duration-500">
              <div className="mb-8 text-center">
                  <h1 className="text-3xl font-bold text-cyan-400 tracking-[0.2em] mb-2">CYBER CORP</h1>
                  <p className="font-mono text-slate-500 text-sm">SECURE TERMINAL ACCESS v3.0</p>
              </div>
              <div className="w-full max-w-md px-4">
                  <p className="text-xs font-bold text-slate-500 mb-4 px-1">SELECT TERMINAL IDENTITY:</p>
                  <div className="grid grid-cols-2 gap-3">
                      {['Station-1', 'Station-2', 'Station-3', 'Station-4', 'Station-5', 'Station-6'].map(name => {
                          const id = name.toUpperCase();
                          return (
                              <button 
                                key={id}
                                onClick={() => handleStationSelect(id, name)}
                                className="group bg-slate-800/50 border border-slate-700 hover:bg-slate-700 hover:border-cyan-500/50 p-4 rounded-lg text-left transition-all hover:shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                              >
                                  <strong className="block text-sm text-slate-300 group-hover:text-white mb-1">{name}</strong>
                                  <code className="text-[10px] text-slate-600 font-mono group-hover:text-cyan-400">ID: {id}</code>
                              </button>
                          )
                      })}
                  </div>
              </div>
          </div>
      );
  }

  return (
      <div className="relative h-screen w-full bg-[#0b1120] text-slate-300 overflow-hidden flex flex-col items-center justify-center">
          <div className="z-10 bg-[#0f172a] border border-slate-800 rounded-xl p-8 w-[90%] max-w-sm shadow-2xl text-center animate-in slide-in-from-bottom-8 duration-500">
              <h2 className="text-xl font-bold text-white mb-1">{stationName}</h2>
              <div className="flex items-center justify-center gap-2 mb-6">
                  <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded font-mono">ID: {stationId}</span>
              </div>
              <div className="bg-slate-900/50 border border-slate-800 rounded p-4 mb-6 text-left">
                  <div className="flex items-start gap-3">
                      <Terminal size={16} className="text-slate-500 mt-0.5" />
                      <div>
                          <p className="text-xs font-bold text-slate-400 mb-1">SYSTEM STATUS</p>
                          <p className="text-xs text-slate-600 leading-relaxed">
                              {isActive ? "Terminal active." : "Terminal standing by."}
                          </p>
                      </div>
                  </div>
              </div>
              {!isActive ? (
                  <button onClick={handleActivate} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded text-sm transition-all flex items-center justify-center gap-2">
                      <Power size={16} /> ACTIVATE RECEIVER
                  </button>
              ) : (
                  <div className="space-y-3">
                      <div className="relative overflow-hidden w-full bg-emerald-900/20 border border-emerald-500/30 text-emerald-400 font-bold py-3 rounded text-xs flex items-center justify-center gap-2">
                          <ShieldCheck size={14} className="relative z-10" /> <span className="relative z-10">SYSTEM ONLINE</span>
                      </div>
                  </div>
              )}
              <div className={`mt-6 font-mono text-[10px] py-2 rounded border transition-colors duration-500 ${isActive ? 'bg-slate-900 text-emerald-500 border-slate-800' : 'bg-slate-900 text-slate-500 border-transparent'}`}>
                  {statusText}
              </div>
              <button onClick={handleReset} className="mt-6 text-[10px] text-slate-600 hover:text-slate-400 underline decoration-slate-700 underline-offset-2">TERMINATE SESSION</button>
          </div>
          <div className="fixed bottom-5 right-5 z-50 flex flex-col-reverse gap-3 pointer-events-none">
              {toasts.map(toast => (
                   <ToastNotification 
                      key={toast.id} 
                      data={toast} 
                      onClose={handleToastClose} 
                      onAutoDismiss={handleAutoDismiss}
                   />
              ))}
          </div>
      </div>
  );
};

export default ClientApp;
