
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  sendNotification: (data) => ipcRenderer.send('TRIGGER_NOTIFICATION', data),
  onShowToast: (callback) => ipcRenderer.on('SHOW_TOAST', (_event, value) => callback(value)),
  setIgnoreMouseEvents: (ignore, options) => ipcRenderer.send('SET_IGNORE_MOUSE_EVENTS', ignore, options)
});
