
const { app, BrowserWindow, ipcMain, Notification, Tray, Menu, screen } = require('electron');
const path = require('path');

// 1. Force audio autoplay (no user gesture required) for alerts
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required-ui-only');

let workerWindow;
let overlayWindow;
let tray;

const isDev = !app.isPackaged;

// Prevent multiple instances (Singleton)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance.
    // We stay silent/background.
  });

  app.whenReady().then(() => {
    setupTray();
    createWorkerWindow();
    createOverlayWindow();
    
    // Auto-start on login (Only in production to avoid dev annoyance)
    if (!isDev) {
      app.setLoginItemSettings({
        openAtLogin: true,
        path: app.getPath('exe'),
        args: ['--hidden']
      });
    }
  });
}

function setupTray() {
  try {
    const iconPath = isDev ? path.join(__dirname, '..', 'public', 'vite.svg') : path.join(__dirname, 'icon.png');
    tray = new Tray(iconPath);
    
    const contextMenu = Menu.buildFromTemplate([
      { label: 'STATUS: ONLINE', enabled: false },
      { label: 'Connected to CyberCorp Net', enabled: false },
      { type: 'separator' },
      { label: 'Reconnect Network', click: () => workerWindow && workerWindow.webContents.reload() },
      { label: 'Terminate Link', click: () => app.quit() }
    ]);
    
    tray.setToolTip('Cyber Corp: Background Service');
    tray.setContextMenu(contextMenu);
  } catch (e) {
    console.error("Tray icon error:", e);
  }
}

function createWorkerWindow() {
  // HIDDEN WORKER: logic, firestore listener, audio engine source
  workerWindow = new BrowserWindow({
    show: false, 
    skipTaskbar: true, // Ensure it doesn't show in taskbar even if glitched
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling: false // Keep running in background
    }
  });

  const startUrl = isDev 
    ? 'http://localhost:5173?mode=worker' 
    : `file://${path.join(__dirname, '../dist/index.html')}?mode=worker`;
    
  workerWindow.loadURL(startUrl);
}

function createOverlayWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  // OVERLAY WINDOW: Visuals only
  overlayWindow = new BrowserWindow({
    width: width,
    height: height,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    alwaysOnTop: true, // Crucial for notifications
    skipTaskbar: true, // Don't show in taskbar
    hasShadow: false,
    resizable: false,
    movable: false,
    focusable: false, // Don't steal focus on launch, prevents Alt-Tab appearance
    type: 'toolbar', // Helps hide from task switcher on Windows
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Default: Click-through (ignore mouse)
  overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  
  // Use 'screen-saver' level to stay above full-screen apps/games
  overlayWindow.setAlwaysOnTop(true, 'screen-saver'); 

  const startUrl = isDev 
    ? 'http://localhost:5173?mode=overlay' 
    : `file://${path.join(__dirname, '../dist/index.html')}?mode=overlay`;

  overlayWindow.loadURL(startUrl);
}

// IPC: Worker detected an alert -> Tell Main -> Show Overlay
ipcMain.on('TRIGGER_NOTIFICATION', (event, data) => {
  // 1. Native Windows Notification (System Tray Toast)
  if (Notification.isSupported()) {
    new Notification({
      title: data.title || 'System Alert',
      body: data.message,
      silent: true // We use custom audio in renderer
    }).show();
  }

  // 2. Custom Fullscreen Overlay
  if (overlayWindow) {
    overlayWindow.webContents.send('SHOW_TOAST', data);
    // Bring to front without stealing focus immediately (unless configured otherwise)
    overlayWindow.showInactive(); 
    overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  }
});

// IPC: Overlay requests mouse interaction (e.g. user needs to click a button)
ipcMain.on('SET_IGNORE_MOUSE_EVENTS', (event, ignore, options) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
      win.setIgnoreMouseEvents(ignore, options);
  }
});

// Prevent app from quitting when all windows close (background service)
app.on('window-all-closed', (e) => {
  e.preventDefault(); 
});
