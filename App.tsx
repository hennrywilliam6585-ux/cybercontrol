
import React, { useState, useEffect } from 'react';
import { 
  Monitor, 
  LayoutGrid, 
  Terminal, 
  Send,
  Trash2, 
  ShieldAlert,
  Image as ImageIcon,
  Type,
  AlertTriangle,
  X,
  Eye,
  Wifi,
  Link as LinkIcon,
  Clock,
  Plus,
  Globe,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { saveBroadcastToHistory, getBroadcastHistory, clearBroadcastHistory, NotificationLog, addNewStation, subscribeToStations, deleteStation, Station } from './services/firestoreService';

const App: React.FC = () => {
  // State
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStations, setSelectedStations] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  
  // Extended Config State
  const [title, setTitle] = useState('System Alert');
  const companyName = 'CYBER CORP'; 
  const [logoUrl, setLogoUrl] = useState('https://cdn-icons-png.flaticon.com/512/3119/3119338.png');
  const [persistentDuration, setPersistentDuration] = useState(0); // 0 = Infinite, >0 = Seconds

  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false); // New success state
  const [isClearingLogs, setIsClearingLogs] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Preview State
  const [previewStation, setPreviewStation] = useState<Station | null>(null);

  // Icon Library State
  const [showIconLibrary, setShowIconLibrary] = useState(false);
  const [savedIcons, setSavedIcons] = useState<string[]>([
      'https://cdn-icons-png.flaticon.com/512/3119/3119338.png',
      'https://cdn-icons-png.flaticon.com/512/1042/1042680.png',
      'https://cdn-icons-png.flaticon.com/512/564/564619.png',
      'https://cdn-icons-png.flaticon.com/512/2991/2991148.png'
  ]);
  const [newIconUrl, setNewIconUrl] = useState('');

  useEffect(() => {
    loadLogs();
    
    // Load icons from local storage
    const localIcons = localStorage.getItem('cyber_icons');
    if (localIcons) {
        setSavedIcons(JSON.parse(localIcons));
    }
    
    // Subscribe to Stations & Enforce Defaults
    const unsubscribe = subscribeToStations((data) => {
        // Updated defaults to generic Station-1...Station-6
        const defaults = ['Station-1', 'Station-2', 'Station-3', 'Station-4', 'Station-5', 'Station-6'];
        
        // 1. Ensure Defaults Exist
        defaults.forEach(defaultName => {
            const expectedId = defaultName.toUpperCase().replace(/[^A-Z0-9-]/g, '-');
            const exists = data.some(s => s.id === expectedId);
            
            if (!exists) {
                addNewStation(defaultName); 
            }
        });

        // 2. Auto-Delete Legacy Stations
        const legacyIds = [
            'CAFETERIA-DISPLAY', 
            'EXECUTIVE-WING', 
            'IT-SUPPORT', 
            'KK', 
            'MAIN-LOBBY', 
            'SECURITY-OPS'
        ];
        
        data.forEach(s => {
            if (legacyIds.includes(s.id)) {
                console.log("Auto-deleting legacy station:", s.id);
                deleteStation(s.id);
            }
        });

        // Filter out legacy from UI immediately to avoid flicker
        setStations(data.filter(s => !legacyIds.includes(s.id)).sort((a,b) => a.id.localeCompare(b.id)));
    });
    return () => unsubscribe();
  }, []);

  const loadLogs = async () => {
    const history = await getBroadcastHistory();
    setLogs(history);
  };

  const handleClearLogs = async () => {
    if (window.confirm("CONFIRM: Purge all system logs?")) {
        setIsClearingLogs(true);
        // Optimistically clear local state immediately so UI feels responsive
        setLogs([]);
        
        try {
            await clearBroadcastHistory();
            // Reload just to be safe and ensure server state matches
            await loadLogs();
        } catch (error) {
            console.error("Failed to delete from database", error);
            alert("Failed to purge logs. Check console/network.");
            // Reload logs if delete failed so user knows state
            loadLogs(); 
        } finally {
            setIsClearingLogs(false);
        }
    }
  };

  const toggleStation = (id: string) => {
    if (selectedStations.includes(id)) {
      setSelectedStations(selectedStations.filter(s => s !== id));
    } else {
      setSelectedStations([...selectedStations, id]);
    }
  };

  const handleBroadcast = async () => {
    if (!message.trim()) return;
    if (selectedStations.length === 0) {
      alert("SELECT A TARGET STATION FIRST");
      return;
    }

    setIsSending(true);
    setSentSuccess(false);
    
    const durationToSend = persistentDuration;
    // If a timer is set (>0), we switch to PERSISTENT mode to enable the "Hydra" behavior.
    // If no timer (0), we use BROADCAST mode for standard infinite persistence.
    const msgType = durationToSend > 0 ? 'PERSISTENT' : 'BROADCAST';
    
    await saveBroadcastToHistory(companyName, title, message, logoUrl, "", selectedStations, msgType, durationToSend);
    
    // REMOVED SOUND EFFECT to prevents confusion if admin is running on same machine as client
    // const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-sci-fi-system-check-alert-3176.mp3');
    // audio.volume = 0.5;
    // audio.play().catch(() => {});

    await loadLogs();
    setMessage('');
    setIsSending(false);
    
    // Show brief success indicator
    setSentSuccess(true);
    setTimeout(() => setSentSuccess(false), 2000);
  };
  
  // --- ICON LIBRARY LOGIC ---
  const handleAddIcon = () => {
      if (!newIconUrl.trim()) return;
      // Prevent duplicates
      if (savedIcons.includes(newIconUrl.trim())) {
          setNewIconUrl('');
          return;
      }
      
      const updated = [newIconUrl.trim(), ...savedIcons];
      setSavedIcons(updated);
      localStorage.setItem('cyber_icons', JSON.stringify(updated));
      setNewIconUrl('');
  };
  
  const handleDeleteIcon = (e: React.MouseEvent, urlToDelete: string) => {
      e.stopPropagation();
      const updated = savedIcons.filter(url => url !== urlToDelete);
      setSavedIcons(updated);
      localStorage.setItem('cyber_icons', JSON.stringify(updated));
  };
  
  const handleSelectIcon = (url: string) => {
      setLogoUrl(url);
      setShowIconLibrary(false);
  };

  // --- CLIENT URL LOGIC ---
  const getClientUrl = (stationId?: string) => {
      const baseUrl = `${window.location.origin}${window.location.pathname}?mode=client`;
      if (stationId) {
          return `${baseUrl}&station=${stationId}`;
      }
      return baseUrl;
  };

  const handleCopyUrl = (url: string, id: string) => {
      navigator.clipboard.writeText(url).then(() => {
          setCopiedId(id);
          setTimeout(() => setCopiedId(null), 2000);
      });
  };

  const openWebClient = () => {
      window.open(getClientUrl(), '_blank');
  };

  const openClientPreview = (station: Station) => {
     window.open(getClientUrl(station.id), '_blank');
  };

  // --- ANALYTICS CALCULATIONS ---
  const formatTwoDigits = (num: number) => num.toString().padStart(2, '0');
  const totalStations = stations.length;
  const onlineStations = stations.filter(s => s.status === 'ONLINE').length;
  const selectedCount = selectedStations.length;

  // --- RENDER ---
  return (
    <div 
        className="flex h-screen bg-[#0B1120] text-slate-300 font-sans overflow-hidden selection:bg-cyan-500/30"
    >
      
      {/* SIDEBAR */}
      <aside className="w-16 border-r border-slate-800 flex flex-col items-center py-6 gap-6 bg-[#0B1120] z-20">
        
        <div className="flex-1 flex flex-col gap-4 w-full px-2">
            <button title="Dashboard" className="p-3 rounded-lg bg-slate-800/50 text-cyan-400 border-l-2 border-cyan-400 hover:bg-slate-800 transition-all"><LayoutGrid size={20} /></button>
            <button title="Icon Library" className="p-3 rounded-lg hover:bg-slate-800/50 text-slate-500 hover:text-cyan-400 transition-all" onClick={() => setShowIconLibrary(true)}><ImageIcon size={20} /></button>
            <button title="Open Client Portal" className="p-3 rounded-lg hover:bg-slate-800/50 text-slate-500 hover:text-cyan-400 transition-all" onClick={() => setShowSetup(true)}><Globe size={20} /></button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col relative">
        {/* HEADER */}
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-[#0B1120]/95 backdrop-blur z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-white tracking-widest flex items-center gap-2">
              CYBERCONTROL <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/30 font-mono">Lucifer</span>
            </h1>
          </div>
        </header>

        <div className="flex-1 p-8 grid grid-cols-12 gap-6 overflow-y-auto custom-scrollbar">
            
            {/* LEFT: GRID */}
            <div className="col-span-8 space-y-6">
                
                {/* STATION GRID */}
                <div className="grid grid-cols-3 gap-4">
                  {stations.map((station) => {
                    const isSelected = selectedStations.includes(station.id);
                    const isOnline = station.status === 'ONLINE';
                    const isLockedStatus = station.status === 'LOCKED';

                    return (
                      <div 
                        key={station.id}
                        onClick={() => toggleStation(station.id)}
                        className={`
                          relative group cursor-pointer border rounded-xl p-6 transition-all duration-200
                          ${isSelected 
                            ? 'bg-emerald-500/5 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
                            : 'bg-[#0F1623] border-slate-800 hover:border-slate-700 hover:bg-[#131b2b]'}
                        `}
                      >
                         <div 
                            className={`absolute top-3 right-3 z-30 transition-opacity flex gap-1 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                            onClick={(e) => e.stopPropagation()}
                         >
                             <button 
                                 type="button"
                                 onClick={(e) => { e.stopPropagation(); openClientPreview(station); }}
                                 className="bg-slate-800 hover:bg-cyan-900/80 text-slate-400 hover:text-cyan-200 p-1.5 rounded-full border border-slate-700 transition-all"
                                 title="Launch This Client"
                             >
                                 <ExternalLink size={12} />
                             </button>
                         </div>
                        
                        <div className="flex justify-between items-start mb-4">
                          <div className="relative">
                              <Monitor size={32} className={isLockedStatus ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' : (isOnline ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]' : 'text-slate-700')} />
                          </div>
                          
                          <div className="flex flex-col items-end gap-1">
                               <div className={`w-2 h-2 rounded-full ${isLockedStatus ? 'bg-red-500 shadow-[0_0_8px_red] animate-pulse' : (isOnline ? 'bg-cyan-500 shadow-[0_0_8px_#06b6d4] animate-pulse' : 'bg-slate-700')}`}></div>
                               {isSelected && <div className="text-[9px] text-emerald-500 font-bold tracking-wider">TARGET</div>}
                          </div>
                        </div>

                        <h3 className={`font-bold text-lg tracking-wide ${isSelected ? 'text-white' : 'text-slate-400'}`}>{station.name}</h3>
                        
                        <div className="flex justify-between items-center mt-2">
                            <code className="text-[10px] text-slate-600 bg-black/30 px-1 rounded">{station.ip || '0.0.0.0'}</code>
                            <span className={`text-[10px] font-bold ${isLockedStatus ? 'text-red-500 animate-pulse' : (isOnline ? 'text-cyan-400' : 'text-slate-600')}`}>
                                {station.status || 'OFFLINE'}
                            </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* COMMAND CENTER (INPUT) */}
                <div className="bg-[#0F1623] border border-slate-800 rounded-xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500"></div>
                    <div className="mb-4 flex justify-between items-center">
                        <label className="text-xs font-bold text-cyan-400 tracking-widest flex items-center gap-2">
                           <Terminal size={14} /> COMMAND CENTER
                        </label>
                    </div>
                    
                    {/* CONFIG GRID */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        {/* Title */}
                        <div className="relative group">
                            <span className="absolute left-3 top-2.5 text-slate-600"><Type size={12} /></span>
                            <input 
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Notification Title"
                                className="w-full bg-slate-900/50 border border-slate-700 text-slate-300 text-xs pl-8 pr-3 py-2.5 rounded focus:border-cyan-500/50 outline-none transition-colors"
                            />
                        </div>
                        {/* Icon */}
                        <div className="relative group">
                            <span className="absolute left-3 top-2.5 text-slate-600"><ImageIcon size={12} /></span>
                            <input 
                                type="text"
                                value={logoUrl}
                                onChange={(e) => setLogoUrl(e.target.value)}
                                placeholder="Icon URL"
                                className="w-full bg-slate-900/50 border border-slate-700 text-slate-300 text-xs pl-8 pr-3 py-2.5 rounded focus:border-cyan-500/50 outline-none transition-colors"
                            />
                        </div>
                    </div>

                    {/* MESSAGE INPUT ROW */}
                    <div className="flex gap-0 mb-4">
                        <div className="bg-slate-900/50 border border-slate-700 border-r-0 rounded-l-lg px-4 flex items-center justify-center text-slate-500 font-mono text-sm">
                            $ msg
                        </div>
                        <input 
                            type="text" 
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleBroadcast()}
                            placeholder='type secure payload...'
                            className="flex-1 bg-slate-900/50 border border-slate-700 text-white px-4 py-4 font-mono text-sm outline-none focus:border-cyan-500/50 transition-colors"
                        />
                        <button 
                            onClick={handleBroadcast}
                            disabled={isSending}
                            className={`
                                text-white px-6 font-bold text-sm rounded-r-lg border transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed
                                ${sentSuccess ? 'bg-emerald-600 border-emerald-500' : 'bg-cyan-600 hover:bg-cyan-500 border-cyan-500'}
                            `}
                        >
                            {isSending ? 'SENDING...' : (sentSuccess ? <><Check size={16} /> SENT</> : <><Send size={16} /> SEND</>)}
                        </button>
                    </div>

                    {/* SYSTEM OVERRIDE CONTROLS */}
                    <div className="flex items-center justify-between border-t border-slate-800 pt-3">
                        <div className="flex gap-2 items-center overflow-hidden">
                           {selectedStations.length === 0 ? (
                               <span className="text-[10px] text-slate-600 font-mono">NO TARGETS SELECTED</span>
                           ) : (
                               selectedStations.map(id => (
                                   <span key={id} className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded font-mono truncate max-w-[100px]">
                                       @{id}
                                   </span>
                               ))
                           )}
                        </div>
                        
                        {/* TIMER SELECTOR */}
                        <div className="flex items-center gap-2">
                             <div className="flex items-center gap-1 ml-2 bg-slate-900/80 border border-slate-700 rounded px-2 py-0.5">
                                <Clock size={10} className="text-slate-400" />
                                <select 
                                    value={persistentDuration}
                                    onChange={(e) => setPersistentDuration(Number(e.target.value))}
                                    className="bg-transparent text-[9px] text-slate-200 outline-none font-mono cursor-pointer"
                                >
                                    <option value={0} className="bg-slate-900 text-slate-200">∞ NO TIMER (PERSISTENT)</option>
                                    <option value={10} className="bg-slate-900 text-slate-200">10s (HYDRA DEBUG)</option>
                                    <option value={60} className="bg-slate-900 text-slate-200">1 MINUTE</option>
                                    <option value={120} className="bg-slate-900 text-slate-200">2 MINUTES</option>
                                    <option value={300} className="bg-slate-900 text-slate-200">5 MINUTES</option>
                                </select>
                            </div>
                        </div>
                    </div>

                </div>

            </div>

            {/* RIGHT: ANALYTICS */}
            <div className="col-span-4 space-y-6">
                
                {/* ANALYTICS BOX */}
                <div className="bg-[#0F1623] border border-slate-800 rounded-xl p-5">
                   <h4 className="text-xs font-bold text-cyan-400 mb-4 tracking-widest uppercase">Live Analytics</h4>
                   <div className="grid grid-cols-2 gap-4">
                      {/* CARD 1: ONLINE / TOTAL */}
                      <div className="bg-slate-900/50 p-4 rounded border border-slate-800">
                          <div className="text-[10px] text-slate-500 mb-1 flex items-center gap-1"><Wifi size={10} /> ONLINE / TOTAL</div>
                          <div className="text-2xl font-bold text-white flex items-baseline gap-1">
                              <span className={onlineStations > 0 ? "text-emerald-400" : "text-slate-500"}>{formatTwoDigits(onlineStations)}</span>
                              <span className="text-slate-600 text-lg">/</span>
                              <span className="text-slate-400">{formatTwoDigits(totalStations)}</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1 mt-2 rounded-full overflow-hidden">
                             <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${totalStations ? (onlineStations/totalStations)*100 : 0}%` }}></div>
                          </div>
                      </div>
                      
                      {/* CARD 2: SELECTED TARGETS */}
                      <div className="bg-slate-900/50 p-4 rounded border border-slate-800">
                          <div className="text-[10px] text-slate-500 mb-1 flex items-center gap-1"><Monitor size={10} /> TARGETS LOCKED</div>
                          <div className="text-2xl font-bold text-white flex items-baseline gap-1">
                              <span className="text-purple-400">{formatTwoDigits(selectedCount)}</span>
                              <span className="text-slate-600 text-lg">/</span>
                              <span className="text-slate-400">{formatTwoDigits(totalStations)}</span>
                          </div>
                          <div className="w-full bg-slate-800 h-1 mt-2 rounded-full overflow-hidden">
                             <div className="bg-purple-500 h-full transition-all duration-500" style={{ width: `${totalStations ? (selectedCount/totalStations)*100 : 0}%` }}></div>
                          </div>
                      </div>
                   </div>
                </div>

                {/* PREVIEW POPUP */}
                <div className="bg-[#0F1623] border border-slate-800 rounded-xl p-5 relative overflow-hidden flex flex-col items-center justify-center min-h-[200px]">
                  <h4 className="w-full text-xs font-bold text-cyan-400 mb-4 tracking-widest uppercase flex items-center gap-2">
                      <Eye size={12} /> PREVIEW POPUP
                  </h4>
                  
                  {/* The Preview Card */}
                  <div className="w-full max-w-[320px] bg-[#202020]/95 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl overflow-hidden font-sans select-none transform scale-90 sm:scale-100 transition-transform origin-top">
                     {/* Header */}
                     <div className="flex justify-between items-center px-4 py-3 border-b border-white/5">
                        <div className="flex items-center gap-2">
                            {logoUrl ? (
                                <img src={logoUrl} className="w-4 h-4 object-contain rounded-sm" alt="" onError={(e) => e.currentTarget.style.display='none'} />
                            ) : <AlertTriangle size={16} className="text-amber-500" />}
                            <span className="text-[13px] font-semibold text-white tracking-wide">{title || 'System Message'}</span>
                        </div>
                        <div className="text-gray-500 hover:text-white cursor-pointer"><X size={14} /></div>
                     </div>
                     
                     {/* Content */}
                     <div className="p-4 pb-4">
                        <p className="text-[13px] text-gray-200 leading-relaxed break-words">
                            {message || 'Message content will appear here...'}
                        </p>
                     </div>

                     {/* Actions */}
                     <div className="bg-black/20 px-4 py-3 flex justify-end gap-2 border-t border-white/5">
                         <button className="bg-[#2d2d2d] hover:bg-[#3d3d3d] border border-white/10 text-white px-4 py-1.5 rounded text-[11px] transition-colors">Dismiss</button>
                         <button className="bg-[#0078d4] hover:bg-[#1084e3] border border-white/10 text-white px-4 py-1.5 rounded text-[11px] transition-colors">Details</button>
                     </div>
                  </div>
                </div>

                {/* SYSTEM LOGS */}
                <div className="bg-[#0F1623] border border-slate-800 rounded-xl p-5 flex-1 min-h-[200px] flex flex-col">
                   <div className="flex justify-between items-center mb-4">
                      <h4 className="text-xs font-bold text-slate-500 tracking-widest uppercase">System Logs</h4>
                      <button 
                          onClick={handleClearLogs}
                          disabled={isClearingLogs}
                          className={`text-[10px] flex items-center gap-1 transition-colors ${isClearingLogs ? 'text-slate-700 cursor-not-allowed' : 'text-slate-600 hover:text-red-400 cursor-pointer'}`}
                          title="Purge all logs"
                      >
                          <Trash2 size={10} /> {isClearingLogs ? 'PURGING...' : 'CLEAR'}
                      </button>
                   </div>
                   <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2 max-h-[200px]">
                      {logs.length === 0 ? (
                          <div className="text-[10px] text-slate-700 italic text-center py-4">No recent activity logs.</div>
                      ) : logs.map(log => (
                          <div key={log.id} className="text-[10px] border-l-2 border-slate-700 pl-3 py-1">
                              <div className="flex justify-between text-slate-500 mb-0.5 font-mono">
                                  <span>{new Date(log.timestamp?.seconds * 1000).toLocaleTimeString()}</span>
                                  <span className={`font-bold ${log.type === 'LOCK_INPUT' || log.type === 'KILL_ALERTS' ? 'text-red-500' : (log.type === 'PERSISTENT' ? 'text-amber-500' : 'text-cyan-600')}`}>
                                      {log.type}
                                  </span>
                              </div>
                              <div className="text-slate-300 truncate font-mono">{log.title ? `[${log.title}] ` : ''}{log.message}</div>
                              <div className="text-slate-600 mt-0.5">
                                 Targets: {log.targets ? log.targets.join(', ') : 'ALL'}
                              </div>
                          </div>
                      ))}
                   </div>
                </div>

            </div>

        </div>
      </div>

      {/* ICON LIBRARY MODAL */}
      {showIconLibrary && (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
            onClick={() => setShowIconLibrary(false)}
        >
            <div 
                className="bg-[#0F1623] border border-slate-700 w-full max-w-xl rounded-xl p-6 shadow-2xl relative"
                onClick={(e) => e.stopPropagation()}
            >
                <button onClick={() => setShowIconLibrary(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20}/></button>
                
                <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2"><ImageIcon size={18} className="text-cyan-400"/> Icon Library</h2>
                <p className="text-slate-500 text-xs mb-6">Manage and select quick-access icons for your broadcasts.</p>

                {/* ADD NEW ICON */}
                <div className="flex gap-2 mb-6">
                    <div className="flex-1 bg-slate-900 border border-slate-700 rounded flex items-center px-3">
                        <LinkIcon size={14} className="text-slate-500 mr-2" />
                        <input 
                            type="text" 
                            value={newIconUrl}
                            onChange={(e) => setNewIconUrl(e.target.value)}
                            placeholder="Paste image URL here..."
                            className="flex-1 bg-transparent text-white text-xs py-3 outline-none"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddIcon()}
                        />
                    </div>
                    <button 
                        onClick={handleAddIcon}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 rounded font-bold text-xs transition-colors flex items-center gap-2"
                    >
                        <Plus size={14} /> ADD
                    </button>
                </div>

                {/* ICON GRID */}
                <div className="grid grid-cols-5 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                    {savedIcons.map((url, index) => (
                        <div 
                            key={index} 
                            onClick={() => handleSelectIcon(url)}
                            className="aspect-square bg-slate-800/50 border border-slate-700 rounded-lg flex items-center justify-center relative group cursor-pointer hover:border-cyan-500 hover:bg-slate-800 transition-all"
                        >
                            <img src={url} alt="icon" className="w-8 h-8 object-contain" onError={(e) => e.currentTarget.style.display='none'} />
                            
                            <button 
                                onClick={(e) => handleDeleteIcon(e, url)}
                                className="absolute -top-1.5 -right-1.5 bg-red-900 text-red-200 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity border border-red-500"
                            >
                                <X size={10} />
                            </button>
                            
                            <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="bg-cyan-500/20 text-cyan-300 text-[8px] px-1 rounded border border-cyan-500/30">SELECT</div>
                            </div>
                        </div>
                    ))}
                    {savedIcons.length === 0 && (
                        <div className="col-span-5 text-center py-8 text-slate-600 text-xs italic">
                            No icons saved. Add a URL above to build your library.
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* SETUP MODAL */}
      {showSetup && (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center cursor-default"
            onClick={() => setShowSetup(false)}
        >
            <div 
                className="bg-[#0F1623] border border-slate-700 w-full max-w-2xl rounded-2xl p-8 shadow-2xl relative"
                onClick={(e) => e.stopPropagation()}
            >
                <button onClick={() => setShowSetup(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><ShieldAlert size={20}/></button>
                
                <div className="flex items-end gap-3 mb-6">
                    <h2 className="text-2xl font-bold text-white">DEPLOYMENT CENTER</h2>
                    <span className="text-xs text-cyan-400 font-mono mb-1.5 px-2 py-0.5 bg-cyan-900/30 rounded border border-cyan-800">WEB CLIENTS</span>
                </div>

                <div className="grid grid-cols-1 gap-8">
                    
                    {/* PRIMARY ACTION: OPEN WEB CLIENT & COPY LINK */}
                    <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-800 flex flex-col gap-4">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-cyan-900/20 rounded-full flex items-center justify-center shrink-0 border border-cyan-500/30 text-cyan-400">
                                <Globe size={32} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-white font-bold text-lg mb-1">UNIVERSAL TERMINAL PORTAL</h3>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    Access the secure client portal via web browser. Share the link below with your team.
                                </p>
                            </div>
                            <button 
                                onClick={openWebClient}
                                className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded font-bold text-sm shadow-lg shadow-cyan-900/20 transition-all flex items-center gap-2"
                            >
                                <ExternalLink size={16} /> OPEN PORTAL
                            </button>
                        </div>

                        {/* COPY LINK BAR */}
                        <div className="w-full bg-slate-950 border border-slate-800 rounded flex items-center p-1.5 pl-3">
                             <div className="text-slate-500 mr-2"><LinkIcon size={14} /></div>
                             <input 
                                readOnly 
                                value={getClientUrl()} 
                                className="flex-1 bg-transparent text-xs text-cyan-400 outline-none font-mono"
                             />
                             <button 
                                onClick={() => handleCopyUrl(getClientUrl(), 'general')}
                                className={`
                                    px-3 py-1.5 rounded text-[10px] font-bold transition-all flex items-center gap-1.5 ml-2
                                    ${copiedId === 'general' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'}
                                `}
                             >
                                {copiedId === 'general' ? <Check size={12} /> : <Copy size={12} />}
                                {copiedId === 'general' ? 'COPIED' : 'COPY LINK'}
                             </button>
                        </div>
                    </div>

                    {/* CLIENTS LIST */}
                    <div className="flex flex-col h-[280px] overflow-hidden">
                        <div className="flex items-center gap-2 mb-4 text-slate-200 font-bold tracking-wider text-sm border-t border-slate-800 pt-6">
                            <Monitor size={16} /> NETWORK STATUS
                        </div>
                        
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                            {stations.map(station => (
                                <div key={station.id} className="bg-slate-900/30 p-3 rounded border border-slate-800 group relative flex justify-between items-center">
                                    <div className="flex flex-col">
                                        <div className="text-xs font-bold text-slate-300">{station.name}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[9px] text-slate-500 font-mono">ID: {station.id}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleCopyUrl(getClientUrl(station.id), station.id)}
                                            className={`
                                                p-2 rounded text-[10px] font-bold transition-all border flex items-center gap-1
                                                ${copiedId === station.id ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border-slate-700'}
                                            `}
                                            title="Copy Auto-Login Link"
                                        >
                                            {copiedId === station.id ? <Check size={14} /> : <Copy size={14} />}
                                        </button>

                                        <button 
                                            onClick={() => openClientPreview(station)}
                                            className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white p-2 rounded text-[10px] font-bold transition-all border border-slate-700"
                                            title="Launch Specific Client"
                                        >
                                            <ExternalLink size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                
                <div className="mt-8 pt-6 border-t border-slate-800 flex justify-end">
                    <button onClick={() => setShowSetup(false)} className="text-slate-500 hover:text-white text-sm">CLOSE PANEL</button>
                </div>
            </div>
        </div>
      )}

      {/* CLIENT PREVIEW MODAL (IFRAME) - Kept for quick preview within admin */}
      {previewStation && (
          <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col">
             <div className="h-12 border-b border-slate-800 bg-[#0B1120] flex items-center justify-between px-4">
                <div className="flex items-center gap-2 text-white font-bold">
                   <Monitor size={16} className="text-cyan-400"/>
                   <span>PREVIEW: {previewStation.name}</span>
                </div>
                <button 
                   onClick={() => setPreviewStation(null)}
                   className="bg-red-900/50 hover:bg-red-600 text-white px-3 py-1 rounded text-xs flex items-center gap-1 border border-red-700 transition-colors"
                >
                   <X size={14} /> CLOSE PREVIEW
                </button>
             </div>
             <iframe 
                title="Client Preview"
                src={`${window.location.origin}?mode=client&station=${previewStation.id}`}
                className="flex-1 w-full bg-black border-none"
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups" 
             />
          </div>
      )}

    </div>
  );
};

export default App;
