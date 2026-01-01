
import React, { useState, useEffect } from 'react';
import { 
  Monitor, 
  Activity, 
  LayoutGrid, 
  List, 
  Settings, 
  Download, 
  Zap, 
  Terminal, 
  Send,
  Trash2, 
  ShieldAlert,
  Cpu,
  Radio,
  Image as ImageIcon,
  Type,
  User,
  Plus,
  XCircle,
  AlertTriangle,
  X,
  Eye,
  Wifi,
  Link as LinkIcon,
  Save,
  Lock,
  Unlock,
  Bomb,
  Clock
} from 'lucide-react';
import { saveBroadcastToHistory, getBroadcastHistory, clearBroadcastHistory, NotificationLog, addNewStation, deleteStation, subscribeToStations, Station } from './services/firestoreService';
import { generateNotificationCopy } from './services/geminiService';

const App: React.FC = () => {
  // State
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStations, setSelectedStations] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  
  // Extended Config State
  const [title, setTitle] = useState('System Alert');
  const companyName = 'CYBER CORP'; 
  const [logoUrl, setLogoUrl] = useState('https://cdn-icons-png.flaticon.com/512/3119/3119338.png');
  const [isPersistent, setIsPersistent] = useState(false); 
  const [persistentDuration, setPersistentDuration] = useState(0); // 0 = Infinite, >0 = Seconds

  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isClearingLogs, setIsClearingLogs] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  
  // Icon Library State
  const [showIconLibrary, setShowIconLibrary] = useState(false);
  const [savedIcons, setSavedIcons] = useState<string[]>([
      'https://cdn-icons-png.flaticon.com/512/3119/3119338.png',
      'https://cdn-icons-png.flaticon.com/512/1042/1042680.png',
      'https://cdn-icons-png.flaticon.com/512/564/564619.png',
      'https://cdn-icons-png.flaticon.com/512/2991/2991148.png'
  ]);
  const [newIconUrl, setNewIconUrl] = useState('');
  
  // Station Creation State
  const [showCreateStation, setShowCreateStation] = useState(false);
  const [newStationName, setNewStationName] = useState('');
  const [newStationPassword, setNewStationPassword] = useState('');

  // Deletion State
  const [stationToDelete, setStationToDelete] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
    
    // Load icons from local storage
    const localIcons = localStorage.getItem('cyber_icons');
    if (localIcons) {
        setSavedIcons(JSON.parse(localIcons));
    }
    
    // Subscribe to Stations
    const unsubscribe = subscribeToStations((data) => {
        setStations(data.sort((a,b) => a.id.localeCompare(b.id)));
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

  const handleCreateStation = async () => {
      if(!newStationName.trim()) return;
      await addNewStation(newStationName, newStationPassword);
      setNewStationName('');
      setNewStationPassword('');
      setShowCreateStation(false);
  };

  const requestDelete = (e: React.MouseEvent, id: string) => {
      e.stopPropagation(); // CRITICAL: Stop grid click
      setStationToDelete(id);
  };

  const confirmDeleteStation = async () => {
      if (stationToDelete) {
          await deleteStation(stationToDelete);
          // Optimistically remove selection if it was selected
          if (selectedStations.includes(stationToDelete)) {
              setSelectedStations(prev => prev.filter(s => s !== stationToDelete));
          }
          setStationToDelete(null);
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
    // Send BROADCAST or PERSISTENT type
    const msgType = isPersistent ? 'PERSISTENT' : 'BROADCAST';
    // Always use selected duration regardless of mode
    const durationToSend = persistentDuration;
    
    await saveBroadcastToHistory(companyName, title, message, logoUrl, "", selectedStations, msgType, durationToSend);
    
    // Play subtle sound for admin confirmation
    const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-sci-fi-system-check-alert-3176.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {});

    await loadLogs();
    setMessage('');
    setIsSending(false);
  };
  
  const handleKillAlerts = async () => {
      // Determine targets: either selected stations OR 'ALL' if none selected (with confirmation)
      let targets = selectedStations;
      if (targets.length === 0) {
          if (window.confirm("NO TARGETS SELECTED. KILL ALL STATIONS?")) {
              targets = ['ALL'];
          } else {
              return;
          }
      } else {
          if(!window.confirm(`CONFIRM: Force remove active alerts on ${targets.length} stations?`)) {
              return;
          }
      }
      
      setIsSending(true);
      await saveBroadcastToHistory(companyName, "KILL COMMAND", "CLEAR_ALL", "", "", targets, 'KILL_ALERTS', 0);
      await loadLogs();
      setIsSending(false);
  };

  const handleAiAssist = async () => {
    const result = await generateNotificationCopy("Urgent security alert for employees");
    if (result && result.variations.length > 0) {
        const v = result.variations[0];
        setTitle(v.title);
        setMessage(v.body);
    }
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

  // --- GENERATE CLIENT FILE LOGIC ---
  const downloadClientFile = (station: Station) => {
    const content = generateReceiverHTML(station);
    const filename = `${station.id}_STATION_APP.html`;
    const mime = 'text/html';

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  const openClientPreview = (station: Station) => {
     const content = generateReceiverHTML(station);
     const blob = new Blob([content], { type: 'text/html' });
     const url = URL.createObjectURL(blob);
     window.open(url, '_blank');
  };

  const generateReceiverHTML = (station: Station) => {
      return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Station: ${station.name}</title>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Segoe+UI:wght@400;600&display=swap">
    <style>
        body { margin: 0; padding: 0; font-family: 'Consolas', 'Monaco', monospace; background-color: #050505; color: #0f0; height: 100vh; overflow: hidden; position: relative; }
        
        /* Dashboard Container */
        .container { 
            position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
            background: #111; padding: 40px; border-radius: 4px; border: 1px solid #333;
            box-shadow: 0 0 50px rgba(0, 255, 0, 0.05); text-align: center; width: 400px; z-index: 1;
        }
        h1 { font-size: 20px; color: #fff; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 2px; }
        p { color: #666; font-size: 12px; margin-bottom: 20px; }
        .status { padding: 5px 10px; background: #002200; border: 1px solid #004400; color: #00ff00; font-size: 11px; display: inline-block; margin-bottom: 20px; }
        
        /* Overlay for Click-to-Start (Audio Unlock) */
        #init-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(5, 5, 5, 0.95); z-index: 99999;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            backdrop-filter: blur(5px);
        }
        .init-btn {
            background: #004400; border: 1px solid #0f0; color: #0f0;
            padding: 15px 40px; font-family: 'Consolas', monospace; font-size: 14px;
            cursor: pointer; letter-spacing: 2px; transition: all 0.2s;
            text-transform: uppercase; margin-top: 20px;
        }
        .init-btn:hover { background: #0f0; color: #000; box-shadow: 0 0 20px #0f0; }

        /* REALISTIC WINDOWS 11 STYLE POPUP */
        .popup-window {
            position: absolute;
            width: 380px;
            background: rgba(32, 32, 32, 0.95);
            backdrop-filter: blur(30px);
            -webkit-backdrop-filter: blur(30px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: 0 25px 50px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,0,0,0.5);
            color: #fff;
            font-family: 'Segoe UI', sans-serif;
            border-radius: 8px;
            overflow: hidden;
            animation: popIn 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
            z-index: 10000;
            display: flex;
            flex-direction: column;
            user-select: none;
        }
        
        .popup-header {
            padding: 12px 16px 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .popup-title {
            font-size: 13px;
            font-weight: 600;
            color: #fff;
            display: flex;
            align-items: center;
            letter-spacing: 0.3px;
            gap: 10px;
        }

        .popup-icon-img {
            width: 20px; height: 20px; object-fit: contain; border-radius: 3px;
        }

        .popup-icon-alert {
            color: #f59e0b;
        }
        
        .close-icon {
            color: #888;
            cursor: pointer;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            transition: all 0.2s;
            font-size: 16px;
        }
        .close-icon:hover { background: #c42b1c; color: white; }
        
        /* Uncloseable Mode: Disable hover effect */
        .close-icon.locked:hover { background: transparent; color: #888; cursor: not-allowed; }

        .popup-content {
            padding: 4px 16px 16px;
        }
        
        .popup-message {
            font-size: 14px;
            color: #e5e5e5;
            line-height: 1.5;
            margin-bottom: 20px;
            font-weight: 400;
        }

        .popup-actions {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
            background: rgba(0,0,0,0.2);
            margin: 0 -16px -16px;
            padding: 12px 16px;
            border-top: 1px solid rgba(255,255,255,0.05);
            position: relative; 
        }

        .action-btn {
            background: #2d2d2d;
            border: 1px solid rgba(255,255,255,0.1);
            color: #fff;
            padding: 6px 20px;
            border-radius: 4px;
            font-size: 13px;
            cursor: pointer;
            transition: all 0.1s;
            font-family: 'Segoe UI', sans-serif;
            z-index: 2;
        }
        .action-btn:hover { background: #3a3a3a; border-color: rgba(255,255,255,0.2); }
        .action-btn:active { background: #252525; transform: translateY(1px); }
        
        /* Uncloseable Mode: Disabled buttons */
        .action-btn.locked { opacity: 0.5; cursor: not-allowed; }
        .action-btn.locked:hover { background: #2d2d2d; border-color: rgba(255,255,255,0.1); }
        
        .action-btn.primary {
            background: #0078d4;
            border-color: rgba(255,255,255,0.1);
        }
        .action-btn.primary:hover { background: #1084e3; }
        
        @keyframes popIn { 
            0% { transform: scale(0.95) translateY(10px); opacity: 0; } 
            100% { transform: scale(1) translateY(0); opacity: 1; } 
        }

        @keyframes shake {
            0% { transform: translateX(0); }
            25% { transform: translateX(5px); }
            50% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
            100% { transform: translateX(0); }
        }
        .shake { animation: shake 0.3s ease-in-out; }

        @keyframes fadeOut {
            to { opacity: 0; transform: scale(0.95); pointer-events: none; }
        }
        .fade-out { animation: fadeOut 0.5s forwards; }
    </style>
</head>
<body>
    <div id="init-overlay">
        <div style="font-size: 40px; margin-bottom: 10px;">🔒</div>
        <h1>SECURE TERMINAL ACCESS</h1>
        <p>STATION ID: ${station.id}</p>
        <button class="init-btn" onclick="initializeSystem()">ESTABLISH CONNECTION</button>
    </div>

    <div class="container">
        <h1>${station.name}</h1>
        <p>TERMINAL ID: ${station.id}</p>
        <div class="status">ONLINE - MONITORING</div>
        <div style="font-size: 10px; color: #444; margin-top: 10px;" id="log-display">WAITING FOR COMMAND...</div>
    </div>

    <script>
        const STATION_ID = "${station.id}";
        const API_KEY = "AIzaSyDIFEwrd8SoSY3VWohb1fK3FmlxDiL2tzA";
        const PROJECT_ID = "pop-up-cf9ca";
        const FIRESTORE_URL = \`https://firestore.googleapis.com/v1/projects/\${PROJECT_ID}/databases/(default)/documents/notification_logs?orderBy=timestamp desc&pageSize=1&key=\${API_KEY}\`;
        const STATION_URL = \`https://firestore.googleapis.com/v1/projects/\${PROJECT_ID}/databases/(default)/documents/stations/\${STATION_ID}?key=\${API_KEY}&updateMask.fieldPaths=status\`;
        
        let lastProcessedId = null;
        let systemActive = false;
        let audioCtx = null;
        let isKillActive = false;

        function initAudio() {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
        }

        function playSound(type) {
            if (!audioCtx) return;
            
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            const now = audioCtx.currentTime;
            
            if (type === 'start') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(200, now);
                osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);
                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.linearRampToValueAtTime(0.1, now + 0.2);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
            } 
            else if (type === 'pop') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(1200, now);
                osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);
                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
                osc.start(now);
                osc.stop(now + 0.15);
            }
            else if (type === 'error') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(100, now);
                osc.frequency.linearRampToValueAtTime(50, now + 0.2);
                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                osc.start(now);
                osc.stop(now + 0.2);
            }
        }

        function updateStatus(status) {
            fetch(STATION_URL, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fields: { status: { stringValue: status } }
                })
            }).catch(e => console.error("Status update failed", e));
        }
        
        function updateStatusUI(text, color, borderColor) {
            const el = document.querySelector('.status');
            if(el) {
                el.innerText = text;
                el.style.color = color;
                el.style.borderColor = borderColor;
                el.style.backgroundColor = borderColor.replace('44', '11');
            }
        }

        function checkAndSetStatus(currentPermission) {
            const perm = currentPermission || Notification.permission;
            if (perm === 'granted') {
                updateStatus('ONLINE');
                updateStatusUI('ONLINE - MONITORING', '#00ff00', '#004400');
            } else {
                updateStatus('OFFLINE');
                updateStatusUI('OFFLINE - PERMISSION ' + perm.toUpperCase(), '#ff0000', '#440000');
            }
        }

        async function setupPermissionListener() {
            if ("permissions" in navigator) {
                try {
                    const status = await navigator.permissions.query({ name: 'notifications' });
                    status.onchange = () => {
                        checkAndSetStatus(status.state);
                    };
                } catch (e) {
                    console.log("Permissions API check failed", e);
                }
            }
        }

        function initializeSystem() {
            document.getElementById('init-overlay').style.display = 'none';
            systemActive = true;
            initAudio();
            playSound('start');
            
            if ("Notification" in window) {
                Notification.requestPermission().then(permission => {
                    checkAndSetStatus(permission);
                    setupPermissionListener();
                });
            } else {
                 updateStatus('ONLINE');
            }
            
            // Initialization: Start polling only after we have established baseline
            setInterval(fetchMessages, 2000);
            
            window.addEventListener('beforeunload', () => {
                updateStatus('OFFLINE');
            });
        }

        function spawnPopup(title, message, logo, type, x, y, duration) {
            if (isKillActive) return; // Prevent spawning if kill switch was just hit

            playSound('pop');
            const el = document.createElement('div');
            el.className = 'popup-window';
            
            const randomX = Math.random() * (window.innerWidth - 380);
            const randomY = Math.random() * (window.innerHeight - 200);
            
            el.style.left = (x !== undefined ? x : randomX) + 'px';
            el.style.top = (y !== undefined ? y : randomY) + 'px';
            
            let iconHtml = '';
            if (logo && logo.startsWith('http')) {
                iconHtml = \`<img src="\${logo}" class="popup-icon-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                            <svg class="popup-icon-alert" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>\`;
            } else {
                iconHtml = \`<svg class="popup-icon-alert" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>\`;
            }

            const isLocked = type === 'PERSISTENT';
            const closeClass = isLocked ? 'close-icon locked' : 'close-icon';
            const btnClass = isLocked ? 'action-btn locked' : 'action-btn';

            // Report Status Locked if persistent
            if (isLocked) {
                updateStatus('LOCKED');
                updateStatusUI('SYSTEM LOCKED - ALERT ACTIVE', '#ff0000', '#440000');
            }

            el.innerHTML = \`
                <div class="popup-header">
                    <div class="popup-title">
                        \${iconHtml}
                        <span>\${title || 'System Message'}</span>
                    </div>
                    <div class="\${closeClass}" title="Close">✕</div>
                </div>
                <div class="popup-content">
                    <div class="popup-message">\${message}</div>
                    <div class="popup-actions">
                        <button class="\${btnClass} dismiss-btn">Dismiss</button>
                        <button class="\${btnClass} primary action-trigger">Details</button>
                    </div>
                </div>
            \`;

            const closeBtn = el.querySelector('.close-icon');
            const dismissBtn = el.querySelector('.dismiss-btn');
            const actionBtn = el.querySelector('.action-trigger');

            if (isLocked) {
                const denyAction = () => {
                    playSound('error');
                    el.classList.remove('shake');
                    void el.offsetWidth;
                    el.classList.add('shake');
                };
                closeBtn.onclick = denyAction;
                dismissBtn.onclick = denyAction;
                actionBtn.onclick = denyAction;
            } else {
                const triggerHydra = () => {
                    // Safety check against race conditions
                    if (isKillActive) return; 

                    playSound('error');
                    el.remove();
                    // Pass duration to children
                    setTimeout(() => spawnPopup(title, message, logo, 'BROADCAST', undefined, undefined, duration), 100);
                    setTimeout(() => spawnPopup(title, message, logo, 'BROADCAST', undefined, undefined, duration), 250);
                }
                closeBtn.onclick = triggerHydra;
                dismissBtn.onclick = triggerHydra;
                actionBtn.onclick = triggerHydra;
            }

            // Auto Close Timer
            if (duration && duration > 0) {
                setTimeout(() => {
                    if (el.parentNode) {
                        el.classList.add('fade-out');
                        setTimeout(() => {
                             el.remove();
                             // Reset status to ONLINE if it was locked
                             if (isLocked) {
                                 updateStatus('ONLINE');
                                 updateStatusUI('ONLINE - MONITORING', '#00ff00', '#004400');
                             }
                        }, 500);
                    }
                }, duration * 1000);
            }

            document.body.appendChild(el);
        }

        async function fetchMessages() {
            if (!systemActive) return;

            try {
                // CACHE BUSTING
                const bust = new Date().getTime();
                const response = await fetch(FIRESTORE_URL + "&t=" + bust);
                const data = await response.json();
                
                if (data.documents && data.documents.length > 0) {
                    const doc = data.documents[0];
                    const docId = doc.name.split('/').pop();
                    const fields = doc.fields;
                    
                    const targets = fields.targets?.arrayValue?.values?.map(v => v.stringValue) || [];
                    const type = fields.type?.stringValue || 'BROADCAST';
                    const title = fields.title?.stringValue || 'System Alert';
                    const message = fields.message?.stringValue || '';
                    const logo = fields.logo?.stringValue || '';
                    const duration = parseInt(fields.duration?.integerValue || fields.duration?.doubleValue || '0');
                    
                    if ((targets.includes('ALL') || targets.includes(STATION_ID))) {
                        // Check if this is a NEW message
                        const isNew = (lastProcessedId && docId !== lastProcessedId) || (lastProcessedId === "EMPTY");

                        if (isNew) {
                            if (type === 'KILL_ALERTS') {
                                isKillActive = true; // Block creation of new windows
                                
                                document.getElementById('log-display').innerText = "COMMAND EXECUTED: CLEAR ALL";
                                const popups = document.querySelectorAll('.popup-window');
                                popups.forEach(p => p.remove());
                                playSound('error'); 
                                
                                // Reset Status
                                updateStatus('ONLINE');
                                updateStatusUI('ONLINE - MONITORING', '#00ff00', '#004400');
                                
                                // Release kill lock after 2 seconds
                                setTimeout(() => { isKillActive = false; }, 2000);
                            } else {
                                document.getElementById('log-display').innerText = "INCOMING TRANSMISSION: " + title;
                                spawnPopup(title, message, logo, type, undefined, undefined, duration);
                                if (Notification.permission === "granted") {
                                    new Notification(title, { body: message, icon: logo });
                                }
                            }
                            // Update tracker
                            lastProcessedId = docId;
                        }
                    }
                }
            } catch (error) {
                console.error("Polling error:", error);
            }
        }

        // Initialize ID tracker
        const bustInit = new Date().getTime();
        fetch(FIRESTORE_URL + "&t=" + bustInit).then(r => r.json()).then(data => {
            if (data.documents && data.documents.length > 0) {
                lastProcessedId = data.documents[0].name.split('/').pop();
            } else {
                lastProcessedId = "EMPTY";
            }
        }).catch(() => {
             lastProcessedId = "EMPTY";
        });

    </script>
</body>
</html>
      `;
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
            <button title="Download Client App" className="p-3 rounded-lg hover:bg-slate-800/50 text-slate-500 hover:text-cyan-400 transition-all" onClick={() => setShowSetup(true)}><Download size={20} /></button>
        </div>
        <button className="p-3 rounded-lg hover:bg-slate-800/50 text-slate-500 hover:text-slate-300 transition-all"><Settings size={20} /></button>
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
                                 onClick={(e) => { e.stopPropagation(); downloadClientFile(station); }}
                                 className="bg-slate-800 hover:bg-cyan-900/80 text-slate-400 hover:text-cyan-200 p-1.5 rounded-full border border-slate-700 transition-all"
                                 title="Download Client"
                             >
                                 <Download size={12} />
                             </button>
                             <button 
                                 type="button"
                                 onClick={(e) => requestDelete(e, station.id)}
                                 className="bg-slate-800 hover:bg-red-900/80 text-slate-400 hover:text-red-200 p-1.5 rounded-full border border-slate-700 transition-all"
                                 title="Delete Client"
                             >
                                 <Trash2 size={12} />
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
                  
                  {/* ADD NEW STATION CARD */}
                  <div 
                    onClick={() => setShowCreateStation(true)}
                    className="border border-slate-800 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-900/50 hover:border-slate-700 transition-all group min-h-[140px]"
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-cyan-500/20 group-hover:text-cyan-400 transition-colors mb-2">
                        <Plus size={24} className="text-slate-500 group-hover:text-cyan-400" />
                    </div>
                    <span className="text-xs font-bold text-slate-500 group-hover:text-slate-300">NEW TARGET</span>
                  </div>
                </div>

                {/* COMMAND CENTER (INPUT) */}
                <div className="bg-[#0F1623] border border-slate-800 rounded-xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500"></div>
                    <div className="mb-4 flex justify-between items-center">
                        <label className="text-xs font-bold text-cyan-400 tracking-widest flex items-center gap-2">
                           <Terminal size={14} /> COMMAND CENTER
                        </label>
                        <div className="flex gap-2">
                            {/* KILL SWITCH BUTTON */}
                           <button onClick={handleKillAlerts} className="text-[10px] bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-800/50 px-3 py-1 rounded transition-colors flex items-center gap-1 font-bold animate-pulse">
                             <Bomb size={10} /> KILL SWITCH
                           </button>
                           <button onClick={handleAiAssist} className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded border border-slate-700 transition-colors flex items-center gap-1">
                             <Cpu size={10} /> AI FILL
                           </button>
                        </div>
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
                                ${isPersistent 
                                    ? 'bg-red-700 hover:bg-red-600 border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.3)]' 
                                    : 'bg-cyan-600 hover:bg-cyan-500 border-cyan-500'}
                            `}
                        >
                            {isSending ? 'SENDING...' : (isPersistent ? <><Lock size={16} /> LOCK</> : <><Send size={16} /> SEND</>)}
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
                        
                        {/* PERSISTENT MODE TOGGLE */}
                        <div className="flex items-center gap-2">
                             <span className={`text-[10px] font-bold tracking-wider ${isPersistent ? 'text-red-400' : 'text-slate-500'}`}>
                                 {isPersistent ? 'PERSISTENT MODE' : 'HYDRA MODE'}
                             </span>
                             <button 
                                onClick={() => setIsPersistent(!isPersistent)}
                                className={`w-8 h-4 rounded-full relative transition-colors ${isPersistent ? 'bg-red-900/80 border border-red-500' : 'bg-slate-700 border border-slate-600'}`}
                             >
                                 <div className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all ${isPersistent ? 'left-4 shadow-[0_0_5px_red]' : 'left-0.5'}`}></div>
                             </button>

                             <div className="flex items-center gap-1 ml-2 bg-slate-900/80 border border-slate-700 rounded px-2 py-0.5 animate-in fade-in slide-in-from-left-2">
                                <Clock size={10} className="text-slate-400" />
                                <select 
                                    value={persistentDuration}
                                    onChange={(e) => setPersistentDuration(Number(e.target.value))}
                                    className="bg-transparent text-[9px] text-slate-200 outline-none font-mono cursor-pointer"
                                >
                                    <option value={0} className="bg-slate-900 text-slate-200">∞ NO TIMER</option>
                                    <option value={10} className="bg-slate-900 text-slate-200">10s (DEBUG)</option>
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
                         <button className="bg-[#2d2d2d] hover:bg-[#3a3a3a] border border-white/10 text-white px-4 py-1.5 rounded text-[11px] transition-colors">Dismiss</button>
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

      {/* CREATE STATION MODAL */}
      {showCreateStation && (
        <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
            onClick={() => setShowCreateStation(false)}
        >
            <div 
                className="bg-[#0F1623] border border-slate-700 w-full max-w-sm rounded-xl p-6 shadow-2xl relative"
                onClick={(e) => e.stopPropagation()}
            >
                <button onClick={() => setShowCreateStation(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><Trash2 size={16}/></button>
                
                <h2 className="text-lg font-bold text-white mb-1">Create New Target</h2>
                <p className="text-slate-500 text-xs mb-4">Establish a new secure communication channel.</p>

                <div className="mb-3">
                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Station Identifier</label>
                    <input 
                        type="text" 
                        value={newStationName}
                        onChange={(e) => setNewStationName(e.target.value)}
                        placeholder="e.g. WORKSTATION-01"
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded p-3 text-sm focus:border-cyan-500 outline-none"
                    />
                </div>
                
                <div className="mb-4">
                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Access Password</label>
                    <input 
                        type="text" 
                        value={newStationPassword}
                        onChange={(e) => setNewStationPassword(e.target.value)}
                        placeholder="Leave empty to auto-generate"
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded p-3 text-sm focus:border-cyan-500 outline-none"
                    />
                </div>

                <button 
                    onClick={handleCreateStation}
                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-3 rounded text-sm font-bold tracking-wide transition-colors"
                >
                    INITIALIZE TARGET
                </button>
            </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {stationToDelete && (
        <div 
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center"
            onClick={() => setStationToDelete(null)}
        >
            <div 
                className="bg-[#0F1623] border border-red-900/50 w-full max-w-sm rounded-xl p-8 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mb-4 text-red-500 border border-red-900/50">
                        <AlertTriangle size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Delete Station?</h2>
                    <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                        Are you sure you want to delete <strong className="text-white">{stationToDelete}</strong>? This action cannot be undone and will remove all access credentials.
                    </p>
                    
                    <div className="flex gap-3 w-full">
                        <button 
                            onClick={() => setStationToDelete(null)}
                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-lg text-sm font-bold transition-colors border border-slate-700"
                        >
                            CANCEL
                        </button>
                        <button 
                            onClick={confirmDeleteStation}
                            className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-red-900/20"
                        >
                            DELETE
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
      
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
                    {/* CLIENTS LIST */}
                    <div className="flex flex-col h-[400px] overflow-hidden">
                        <div className="flex items-center gap-2 mb-4 text-slate-200 font-bold tracking-wider text-sm">
                            <Monitor size={16} /> TARGET CLIENTS
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed mb-4">
                            Launch client receivers in separate browser tabs to simulate different stations.
                        </p>

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
                            {stations.map(station => (
                                <div key={station.id} className="bg-slate-900/50 p-3 rounded border border-slate-800 group relative">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="text-xs font-bold text-slate-300">{station.name}</div>
                                        <button 
                                            type="button"
                                            onClick={(e) => requestDelete(e, station.id)}
                                            className="text-slate-600 hover:text-red-500 transition-colors"
                                        >
                                            <XCircle size={12} />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-[10px] text-slate-500 font-mono">PASS:</span>
                                        <code className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded text-emerald-400 font-mono">{station.password}</code>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => openClientPreview(station)}
                                            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white py-1.5 rounded text-[10px] font-bold transition-all border border-slate-700"
                                        >
                                            PREVIEW
                                        </button>
                                        <button 
                                            onClick={() => downloadClientFile(station)}
                                            className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white py-1.5 rounded text-[10px] font-bold transition-all border border-cyan-500 flex items-center justify-center gap-2"
                                        >
                                            <Download size={12} /> DOWNLOAD APP
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {stations.length === 0 && (
                                <div className="text-center py-10 text-slate-700 text-[10px] italic border border-slate-800 border-dashed rounded flex flex-col items-center gap-2">
                                    <span>No targets configured.</span>
                                    <button onClick={() => setShowCreateStation(true)} className="text-cyan-500 hover:underline">Create a target</button> 
                                    <span>to generate a download link.</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                <div className="mt-8 pt-6 border-t border-slate-800 flex justify-end">
                    <button onClick={() => setShowSetup(false)} className="text-slate-500 hover:text-white text-sm">CLOSE PANEL</button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};

export default App;
