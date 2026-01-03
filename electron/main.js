
const { app, BrowserWindow, ipcMain, Notification, Tray, Menu, screen } = require('electron');
const path = require('path');

// Prevent garbage collection
let workerWindow;
let overlayWindow;
let tray;

// Environment check
const isDev = !app.isPackaged;

function createWorkerWindow() {
  // 1. WORKER WINDOW: Hidden renderer that runs the React App in 'worker' mode.
  // This handles Firestore listeners and logic without requiring a UI.
  workerWindow = new BrowserWindow({
    show: false, 
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const startUrl = isDev 
    ? 'http://localhost:5173?mode=worker' 
    : `file://${path.join(__dirname, '../dist/index.html')}?mode=worker`;
    
  workerWindow.loadURL(startUrl);
  
  // Debugging: Uncomment to see worker console logs in terminal
  // workerWindow.webContents.openDevTools({ mode: 'detach' });
}

function createOverlayWindow() {
  // 2. OVERLAY WINDOW: Transparent, click-through, always-on-top window for Popups.
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  overlayWindow = new BrowserWindow({
    width: width,
    height: height,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    resizable: false,
    movable: false,
    focusable: false, // Start unfocused
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Start by ignoring all mouse events (click-through)
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });

  const startUrl = isDev 
    ? 'http://localhost:5173?mode=overlay' 
    : `file://${path.join(__dirname, '../dist/index.html')}?mode=overlay`;

  overlayWindow.loadURL(startUrl);
}

app.whenReady().then(() => {
  // Setup System Tray
  // Note: Ensure you have an 'icon.png' in this folder or remove the icon property
  try {
      tray = new Tray(path.join(__dirname, 'icon.png'));
  } catch (e) {
      tray = new Tray(path.join(__dirname, '..', 'public', 'vite.svg')); // Fallback
  }
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Cyber Corp Client: Active', enabled: false },
    { type: 'separator' },
    { label: 'Reset Connection', click: () => workerWindow.webContents.reload() },
    { label: 'Quit', click: () => app.quit() }
  ]);
  
  tray.setToolTip('Cyber Corp Secure Terminal');
  tray.setContextMenu(contextMenu);

  // Configure Auto-Start
  app.setLoginItemSettings({
    openAtLogin: true,
    path: app.getPath('exe')
  });

  createWorkerWindow();
  createOverlayWindow();
});

// IPC: Worker -> Main
// Received when Firestore detects a new alert
ipcMain.on('TRIGGER_NOTIFICATION', (event, data) => {
  // 1. Native System Notification (Windows/Mac Toast)
  // Does not require browser permissions
  new Notification({
    title: data.title || 'System Alert',
    body: data.message,
    silent: false // We can handle sound in renderer or here
  }).show();

  // 2. Show Fullscreen Overlay
  if (overlayWindow) {
    // Send data to overlay renderer
    overlayWindow.webContents.send('SHOW_TOAST', data);
    
    // Ensure window is visible/top
    overlayWindow.showInactive(); 
    overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  }
});

// IPC: Overlay -> Main 
// Toggle "Click-through" behavior. 
// When a popup is visible, we capture mouse. When gone, we ignore mouse.
ipcMain.on('SET_IGNORE_MOUSE_EVENTS', (event, ignore, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
      win.setIgnoreMouseEvents(ignore, options);
  }
});

// Prevent app from quitting when all windows close (background service behavior)
app.on('window-all-closed', (e) => {
  e.preventDefault(); 
});
