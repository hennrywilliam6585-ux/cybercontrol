
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Send notification request from Worker to Main
  sendNotification: (data) => ipcRenderer.send('TRIGGER_NOTIFICATION', data),
  
  // Listen for display requests in Overlay
  onShowToast: (callback) => ipcRenderer.on('SHOW_TOAST', (_event, value) => callback(value)),
  
  // Control mouse pass-through
  setIgnoreMouseEvents: (ignore, options) => ipcRenderer.send('SET_IGNORE_MOUSE_EVENTS', ignore, options)
});
