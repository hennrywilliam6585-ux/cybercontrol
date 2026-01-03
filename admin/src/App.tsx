
import React, { useState, useEffect } from 'react';
import { 
  Monitor, LayoutGrid, Terminal, Send, Trash2, ShieldAlert, Image as ImageIcon, Type, AlertTriangle, X, Eye, Wifi, Link as LinkIcon, Clock, Plus, Globe, ExternalLink, Copy, Check, Download, Server, HardDrive
} from 'lucide-react';
import { saveBroadcastToHistory, getBroadcastHistory, clearBroadcastHistory, NotificationLog, addNewStation, subscribeToStations, deleteStation, Station } from './services/firestoreService';

const App: React.FC = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStations, setSelectedStations] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  
  const [title, setTitle] = useState('System Alert');
  const companyName = 'CYBER CORP'; 
  const [logoUrl, setLogoUrl] = useState('https://cdn-icons-png.flaticon.com/512/3119/3119338.png');
  const [persistentDuration, setPersistentDuration] = useState(0); 

  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [isClearingLogs, setIsClearingLogs] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewStation, setPreviewStation] = useState<Station | null>(null);

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
    const localIcons = localStorage.getItem('cyber_icons');
    if (localIcons) setSavedIcons(JSON.parse(localIcons));
    
    const unsubscribe = subscribeToStations((data) => {
        const defaults = ['Station-1', 'Station-2', 'Station-3', 'Station-4', 'Station-5', 'Station-6'];
        defaults.forEach(defaultName => {
            const expectedId = defaultName.toUpperCase().replace(/[^A-Z0-9-]/g, '-');
            if (!data.some(s => s.id === expectedId)) addNewStation(defaultName); 
        });

        const legacyIds = ['CAFETERIA-DISPLAY', 'EXECUTIVE-WING', 'IT-SUPPORT', 'KK', 'MAIN-LOBBY', 'SECURITY-OPS'];
        data.forEach(s => {
            if (legacyIds.includes(s.id)) deleteStation(s.id);
        });

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
        setLogs([]);
        try {
            await clearBroadcastHistory();
            await loadLogs();
        } catch (error) {
            console.error(error);
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
    const msgType = durationToSend > 0 ? 'PERSISTENT' : 'BROADCAST';
    
    await saveBroadcastToHistory(companyName, title, message, logoUrl, "", selectedStations, msgType, durationToSend);
    await loadLogs();
    setMessage('');
    setIsSending(false);
    setSentSuccess(true);
    setTimeout(() => setSentSuccess(false), 2000);
  };
  
  const handleAddIcon = () => {
      if (!newIconUrl.trim()) return;
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

  const getClientUrl = (stationId?: string) => {
      // FIX: Use query parameter mode instead of nested path
      // This ensures the client loads from the same build deployment
      const baseUrl = `${window.location.origin}/?mode=client`; 
      if (stationId) return `${baseUrl}&station=${stationId}`;
      return baseUrl;
  };

  const handleCopyUrl = (url: string, id: string) => {
      navigator.clipboard.writeText(url).then(() => {
          setCopiedId(id);
          setTimeout(() => setCopiedId(null), 2000);
      });
  };

  const openWebClient = () => window.open(getClientUrl(), '_blank');
  const openClientPreview = (station: Station) => window.open(getClientUrl(station.id), '_blank');
  
  const handleDownloadClient = () => {
      const fakeUrl = "data:text/plain;charset=utf-8,CyberCorp%20Terminal%20Installer%20placeholder.";
      const link = document.createElement('a');
      link.href = fakeUrl; 
      link.download = 'CyberCorp-Terminal-Setup-v3.0.0.exe';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert("INITIATING SECURE DOWNLOAD...\n\nFile: CyberCorp-Terminal-Setup-v3.0.0.exe\nSize: 48.2 MB\n\nPlease run this installer on client machines.");
  };

  const handleDownloadConfig = () => {
    const configData = {
        api_endpoint: "https://firestore.googleapis.com",
        project_id: "pop-up-cf9ca",
        stations: stations.map(s => ({ id: s.id, name: s.name })),
        generated_at: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(configData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'cyber_corp_client_config.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTwoDigits = (num: number) => num.toString().padStart(2, '0');
  const totalStations = stations.length;
  const onlineStations = stations.filter(s => s.status === 'ONLINE').length;
  const selectedCount = selectedStations.length;

  return (
    <div className="flex h-screen bg-[#0B1120] text-slate-300 font-sans overflow-hidden selection:bg-cyan-500/30">
      <aside className="w-16 border-r border-slate-800 flex flex-col items-center py-6 gap-6 bg-[#0B1120] z-20">
        <div className="flex-1 flex flex-col gap-4 w-full px-2">
            <button title="Dashboard" className="p-3 rounded-lg bg-slate-800/50 text-cyan-400 border-l-2 border-cyan-400 hover:bg-slate-800 transition-all"><LayoutGrid size={20} /></button>
            <button title="Icon Library" className="p-3 rounded-lg hover:bg-slate-800/50 text-slate-500 hover:text-cyan-400 transition-all" onClick={() => setShowIconLibrary(true)}><ImageIcon size={20} /></button>
            <button title="Deployment Center" className="p-3 rounded-lg hover:bg-slate-800/50 text-slate-500 hover:text-cyan-400 transition-all" onClick={() => setShowSetup(true)}><Server size={20} /></button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col relative">
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-[#0B1120]/95 backdrop-blur z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-white tracking-widest flex items-center gap-2">
              CYBERCONTROL <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/30 font-mono">Lucifer</span>
            </h1>
          </div>
        </header>

        <div className="flex-1 p-8 grid grid-cols-12 gap-6 overflow-y-auto custom-scrollbar">
            <div className="col-span-8 space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  {stations.map((station) => {
                    const isSelected = selectedStations.includes(station.id);
                    const isOnline = station.status === 'ONLINE';
                    const isLockedStatus = station.status === 'LOCKED';

                    return (
                      <div key={station.id} onClick={() => toggleStation(station.id)} className={`relative group cursor-pointer border rounded-xl p-6 transition-all duration-200 ${isSelected ? 'bg-emerald-500/5 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'bg-[#0F1623] border-slate-800 hover:border-slate-700 hover:bg-[#131b2b]'}`}>
                         <div className={`absolute top-3 right-3 z-30 transition-opacity flex gap-1 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} onClick={(e) => e.stopPropagation()}>
                             <button type="button" onClick={(e) => { e.stopPropagation(); openClientPreview(station); }} className="bg-slate-800 hover:bg-cyan-900/80 text-slate-400 hover:text-cyan-200 p-1.5 rounded-full border border-slate-700 transition-all">
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

                <div className="bg-[#0F1623] border border-slate-800 rounded-xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500"></div>
                    <div className="mb-4 flex justify-between items-center">
                        <label className="text-xs font-bold text-cyan-400 tracking-widest flex items-center gap-2"><Terminal size={14} /> COMMAND CENTER</label>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="relative group">
                            <span className="absolute left-3 top-2.5 text-slate-600"><Type size={12} /></span>
                            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification Title" className="w-full bg-slate-900/50 border border-slate-700 text-slate-300 text-xs pl-8 pr-3 py-2.5 rounded focus:border-cyan-500/50 outline-none transition-colors" />
                        </div>
                        <div className="relative group">
                            <span className="absolute left-3 top-2.5 text-slate-600"><ImageIcon size={12} /></span>
                            <input type="text" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="Icon URL" className="w-full bg-slate-900/50 border border-slate-700 text-slate-300 text-xs pl-8 pr-3 py-2.5 rounded focus:border-cyan-500/50 outline-none transition-colors" />
                        </div>
                    </div>
                    <div className="flex gap-0 mb-4">
                        <div className="bg-slate-900/50 border border-slate-700 border-r-0 rounded-l-lg px-4 flex items-center justify-center text-slate-500 font-mono text-sm">$ msg</div>
                        <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleBroadcast()} placeholder='type secure payload...' className="flex-1 bg-slate-900/50 border border-slate-700 text-white px-4 py-4 font-mono text-sm outline-none focus:border-cyan-500/50 transition-colors" />
                        <button onClick={handleBroadcast} disabled={isSending} className={`text-white px-6 font-bold text-sm rounded-r-lg border transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${sentSuccess ? 'bg-emerald-600 border-emerald-500' : 'bg-cyan-600 hover:bg-cyan-500 border-cyan-500'}`}>
                            {isSending ? 'SENDING...' : (sentSuccess ? <><Check size={16} /> SENT</> : <><Send size={16} /> SEND</>)}
                        </button>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-800 pt-3">
                        <div className="flex gap-2 items-center overflow-hidden">
                           {selectedStations.length === 0 ? (<span className="text-[10px] text-slate-600 font-mono">NO TARGETS SELECTED</span>) : (selectedStations.map(id => (<span key={id} className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded font-mono truncate max-w-[100px]">@{id}</span>)))}
                        </div>
                        <div className="flex items-center gap-2">
                             <div className="flex items-center gap-1 ml-2 bg-slate-900/80 border border-slate-700 rounded px-2 py-0.5">
                                <Clock size={10} className="text-slate-400" />
                                <select value={persistentDuration} onChange={(e) => setPersistentDuration(Number(e.target.value))} className="bg-transparent text-[9px] text-slate-200 outline-none font-mono cursor-pointer">
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

            <div className="col-span-4 space-y-6">
                <div className="bg-[#0F1623] border border-slate-800 rounded-xl p-5">
                   <h4 className="text-xs font-bold text-cyan-400 mb-4 tracking-widest uppercase">Live Analytics</h4>
                   <div className="grid grid-cols-2 gap-4">
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

                <div className="bg-[#0F1623] border border-slate-800 rounded-xl p-5 relative overflow-hidden flex flex-col items-center justify-center min-h-[200px]">
                  <h4 className="w-full text-xs font-bold text-cyan-400 mb-4 tracking-widest uppercase flex items-center gap-2">
                      <Eye size={12} /> PREVIEW POPUP
                  </h4>
                  <div className="w-full max-w-[320px] bg-[#202020]/95 backdrop-blur-md border border-white/10 rounded-lg shadow-2xl overflow-hidden font-sans select-none transform scale-90 sm:scale-100 transition-transform origin-top">
                     <div className="flex justify-between items-center px-4 py-3 border-b border-white/5">
                        <div className="flex items-center gap-2">
                            {logoUrl ? <img src={logoUrl} className="w-4 h-4 object-contain rounded-sm" alt="" onError={(e) => e.currentTarget.style.display='none'} /> : <AlertTriangle size={16} className="text-amber-500" />}
                            <span className="text-[13px] font-semibold text-white tracking-wide">{title || 'System Message'}</span>
                        </div>
                        <div className="text-gray-500 hover:text-white cursor-pointer"><X size={14} /></div>
                     </div>
                     <div className="p-4 pb-4"><p className="text-[13px] text-gray-200 leading-relaxed break-words">{message || 'Message content will appear here...'}</p></div>
                     <div className="bg-black/20 px-4 py-3 flex justify-end gap-2 border-t border-white/5">
                         <button className="bg-[#2d2d2d] hover:bg-[#3d3d3d] border border-white/10 text-white px-4 py-1.5 rounded text-[11px] transition-colors">Dismiss</button>
                         <button className="bg-[#0078d4] hover:bg-[#1084e3] border border-white/10 text-white px-4 py-1.5 rounded text-[11px] transition-colors">Details</button>
                     </div>
                  </div>
                </div>

                <div className="bg-[#0F1623] border border-slate-800 rounded-xl p-5 flex-1 min-h-[200px] flex flex-col">
                   <div className="flex justify-between items-center mb-4">
                      <h4 className="text-xs font-bold text-slate-500 tracking-widest uppercase">System Logs</h4>
                      <button onClick={handleClearLogs} disabled={isClearingLogs} className={`text-[10px] flex items-center gap-1 transition-colors ${isClearingLogs ? 'text-slate-700 cursor-not-allowed' : 'text-slate-600 hover:text-red-400 cursor-pointer'}`} title="Purge all logs"><Trash2 size={10} /> {isClearingLogs ? 'PURGING...' : 'CLEAR'}</button>
                   </div>
                   <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2 max-h-[200px]">
                      {logs.length === 0 ? (<div className="text-[10px] text-slate-700 italic text-center py-4">No recent activity logs.</div>) : logs.map(log => (
                          <div key={log.id} className="text-[10px] border-l-2 border-slate-700 pl-3 py-1">
                              <div className="flex justify-between text-slate-500 mb-0.5 font-mono">
                                  <span>{new Date(log.timestamp?.seconds * 1000).toLocaleTimeString()}</span>
                                  <span className={`font-bold ${log.type === 'LOCK_INPUT' || log.type === 'KILL_ALERTS' ? 'text-red-500' : (log.type === 'PERSISTENT' ? 'text-amber-500' : 'text-cyan-600')}`}>{log.type}</span>
                              </div>
                              <div className="text-slate-300 truncate font-mono">{log.title ? `[${log.title}] ` : ''}{log.message}</div>
                              <div className="text-slate-600 mt-0.5">Targets: {log.targets ? log.targets.join(', ') : 'ALL'}</div>
                          </div>
                      ))}
                   </div>
                </div>
            </div>
        </div>
      </div>

      {showIconLibrary && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center" onClick={() => setShowIconLibrary(false)}>
            <div className="bg-[#0F1623] border border-slate-700 w-full max-w-xl rounded-xl p-6 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setShowIconLibrary(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X size={20}/></button>
                <h2 className="text-lg font-bold text-white mb-1 flex items-center gap-2"><ImageIcon size={18} className="text-cyan-400"/> Icon Library</h2>
                <p className="text-slate-500 text-xs mb-6">Manage and select quick-access icons for your broadcasts.</p>
                <div className="flex gap-2 mb-6">
                    <div className="flex-1 bg-slate-900 border border-slate-700 rounded flex items-center px-3">
                        <LinkIcon size={14} className="text-slate-500 mr-2" />
                        <input type="text" value={newIconUrl} onChange={(e) => setNewIconUrl(e.target.value)} placeholder="Paste image URL here..." className="flex-1 bg-transparent text-white text-xs py-3 outline-none" onKeyDown={(e) => e.key === 'Enter' && handleAddIcon()} />
                    </div>
                    <button onClick={handleAddIcon} className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 rounded font-bold text-xs transition-colors flex items-center gap-2"><Plus size={14} /> ADD</button>
                </div>
                <div className="grid grid-cols-5 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar p-1">
                    {savedIcons.map((url, index) => (
                        <div key={index} onClick={() => handleSelectIcon(url)} className="aspect-square bg-slate-800/50 border border-slate-700 rounded-lg flex items-center justify-center relative group cursor-pointer hover:border-cyan-500 hover:bg-slate-800 transition-all">
                            <img src={url} alt="icon" className="w-8 h-8 object-contain" onError={(e) => e.currentTarget.style.display='none'} />
                            <button onClick={(e) => handleDeleteIcon(e, url)} className="absolute -top-1.5 -right-1.5 bg-red-900 text-red-200 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity border border-red-500"><X size={10} /></button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}

      {showSetup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center cursor-default" onClick={() => setShowSetup(false)}>
            <div className="bg-[#0F1623] border border-slate-700 w-full max-w-2xl rounded-2xl p-8 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setShowSetup(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><ShieldAlert size={20}/></button>
                <div className="flex items-end gap-3 mb-6">
                    <h2 className="text-2xl font-bold text-white">DEPLOYMENT CENTER</h2>
                    <span className="text-xs text-cyan-400 font-mono mb-1.5 px-2 py-0.5 bg-cyan-900/30 rounded border border-cyan-800">SECURE DOWNLOAD</span>
                </div>
                <div className="grid grid-cols-1 gap-6">
                    <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-800 flex flex-col gap-4">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-cyan-900/20 rounded-full flex items-center justify-center shrink-0 border border-cyan-500/30 text-cyan-400"><Globe size={32} /></div>
                            <div className="flex-1">
                                <h3 className="text-white font-bold text-lg mb-1">UNIVERSAL TERMINAL PORTAL</h3>
                                <p className="text-xs text-slate-400 leading-relaxed">Access the secure client portal via web browser.</p>
                            </div>
                            <button onClick={openWebClient} className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded font-bold text-sm shadow-lg shadow-cyan-900/20 transition-all flex items-center gap-2"><ExternalLink size={16} /> OPEN PORTAL</button>
                        </div>
                        <div className="w-full bg-slate-950 border border-slate-800 rounded flex items-center p-1.5 pl-3">
                             <div className="text-slate-500 mr-2"><LinkIcon size={14} /></div>
                             <input readOnly value={getClientUrl()} className="flex-1 bg-transparent text-xs text-cyan-400 outline-none font-mono" />
                             <button onClick={() => handleCopyUrl(getClientUrl(), 'general')} className={`px-3 py-1.5 rounded text-[10px] font-bold transition-all flex items-center gap-1.5 ml-2 ${copiedId === 'general' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'}`}>{copiedId === 'general' ? <Check size={12} /> : <Copy size={12} />}{copiedId === 'general' ? 'COPIED' : 'COPY LINK'}</button>
                        </div>
                    </div>

                    <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-800 flex flex-col gap-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none"></div>
                        <div className="flex items-center gap-6 relative z-10">
                            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center shrink-0 border border-slate-700 text-slate-400">
                                <HardDrive size={32} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-white font-bold text-lg mb-1">WINDOWS NATIVE CLIENT</h3>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    Standalone Electron executable. Auto-starts with Windows, full background service, overlay notifications.
                                </p>
                            </div>
                            <div className="flex flex-col gap-2">
                                <button 
                                    onClick={handleDownloadClient}
                                    className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded font-bold text-sm shadow-lg border border-slate-600 transition-all flex items-center gap-2"
                                >
                                    <Download size={16} /> DOWNLOAD .EXE
                                </button>
                                <button 
                                    onClick={handleDownloadConfig}
                                    className="text-[10px] text-slate-500 hover:text-cyan-400 underline decoration-slate-700 underline-offset-2 flex items-center justify-end gap-1"
                                >
                                    Download Config.json
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-8 pt-6 border-t border-slate-800 flex justify-end"><button onClick={() => setShowSetup(false)} className="text-slate-500 hover:text-white text-sm">CLOSE PANEL</button></div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;
