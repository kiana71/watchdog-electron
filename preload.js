const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

// Read version from package.json
let appVersion = '1.0.0'; // Default fallback version
try {
  const packageJsonPath = path.join(__dirname, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  appVersion = packageJson.version;
  console.log(`App Version: ${appVersion}`);
} catch (error) {
  console.error('Failed to read package.json version:', error);
}

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