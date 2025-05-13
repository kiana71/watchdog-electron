const { contextBridge, ipcRenderer } = require('electron');

// Hardcode version for testing
const appVersion = '1.0.0';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', 
  {
    send: (channel, data) => {
      // whitelist channels
      const validChannels = ['app-quit', 'app-minimize', 'restart-service'];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      }
    },
    receive: (channel, func) => {
      const validChannels = ['client-log', 'client-error', 'client-status'];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender` 
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    },
    getVersion: () => appVersion
  }
); 