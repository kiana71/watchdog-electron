const { app, BrowserWindow, Tray, Menu, ipcMain, shell, session, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const log = require('electron-log');
const Store = require('electron-store');


// Configure logging
log.transports.file.level = 'info';
log.info('Application starting...');
// Initialize settings store
const store = new Store();
// Keep a global reference of the window and tray objects
let mainWindow;
let tray;
let clientProcess;
let isQuitting = false;

// Path to the watchdog client executable
// const clientPath = path.join(path.dirname(app.getAppPath()), 'watchdog-client', 'index.js');
const clientPath = path.join(app.getAppPath(), 'watchdog-client', 'index.js');
log.info(`Client path: ${clientPath}`);

// Check if the client path exists
if (!fs.existsSync(clientPath)) {
  log.error(`Client not found at: ${clientPath}`);
}

function createWindow() {
  // Add Content Security Policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self'; script-src 'self'"]
      }
    });
  });

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 600,
    height: 500,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, 'assets', 'icons', 'icon.png'),
    frame: false,
    transparent: false,
    resizable: false,
    show: false
  });

  // Load the index.html file
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Open DevTools in development mode (but don't detach it)
  if (process.argv.includes('--dev')) {
    // Open DevTools in a separate window, specifying its mode
    mainWindow.webContents.openDevTools({
      mode: 'detach', // Open in a separate window
      activate: true  // Focus the DevTools window when it opens
    });
  }

  // Only show the window when it's ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle window close event
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });
  
  // Start the watchdog client service
  // Commented out for initial debugging
  // startClientService();
}

function createTray() {
  const trayIconPath = path.join(__dirname, 'assets', 'icons', 'tray-icon.png');
  
  // Check if tray icon exists and has content
  try {
    const stats = fs.statSync(trayIconPath);
    if (stats.size > 0) {
      // On macOS, create a colored icon
      if (process.platform === 'darwin') {
        // Create a template image - this will adapt to light/dark mode
        const image = nativeImage.createFromPath(trayIconPath);
        // Force the icon to be visible with a specific size
        const resizedImage = image.resize({ width: 22, height: 22 });
        tray = new Tray(resizedImage);
        // On macOS, setting a title can make it more visible
        tray.setTitle('WD');
      } else {
        tray = new Tray(trayIconPath);
      }
    } else {
      console.warn('Tray icon file exists but is empty (0 bytes). Using text-based tray item.');
      tray = new Tray(nativeImage.createEmpty());
      // On macOS, setting a title can make it more visible
      if (process.platform === 'darwin') {
        tray.setTitle('WD');
      }
    }
  } catch (error) {
    console.warn('Failed to load tray icon:', error.message);
    tray = new Tray(nativeImage.createEmpty());
    // On macOS, setting a title can make it more visible
    if (process.platform === 'darwin') {
      tray.setTitle('WD');
    }
  }
  
  const contextMenu = Menu.buildFromTemplate([
    { 
      label: 'Show App', 
      click: () => {
        if (mainWindow) {
          mainWindow.show();
        }
      } 
    },
    { 
      label: 'Restart Client Service', 
      click: () => {
        if (clientProcess) {
          stopClientService();
          startClientService();
        }
      } 
    },
    { type: 'separator' },
    { 
      label: 'Quit', 
      click: () => {
        isQuitting = true;
        app.quit();
      } 
    }
  ]);
  
  tray.setToolTip('Digital Signage Watchdog');
  tray.setContextMenu(contextMenu);
  
  tray.on('double-click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
      }
    }
  });
}

function startClientService() {
  log.info('Starting client service:', clientPath);
  
  try {
    // Spawn the Node.js process for the watchdog client
    clientProcess = spawn('node', [clientPath], {
      stdio: 'pipe',
      detached: false
    });
    
    clientProcess.stdout.on('data', (data) => {
      log.info(`Client stdout: ${data}`);
      if (mainWindow) {
        mainWindow.webContents.send('client-log', data.toString());
      }
    });
    
    clientProcess.stderr.on('data', (data) => {
      log.error(`Client stderr: ${data}`);
      if (mainWindow) {
        mainWindow.webContents.send('client-error', data.toString());
      }
    });
    
    clientProcess.on('close', (code) => {
      log.info(`Client process exited with code ${code}`);
      if (mainWindow) {
        mainWindow.webContents.send('client-status', { running: false, exitCode: code });
      }
    });
    
    if (mainWindow) {
      mainWindow.webContents.send('client-status', { running: true });
    }
    
  } catch (error) {
    log.error('Failed to start client service:', error);
    if (mainWindow) {
      mainWindow.webContents.send('client-error', error.message);
    }
  }
}

function stopClientService() {
  if (clientProcess) {
    log.info('Stopping client service');
    clientProcess.kill();
    clientProcess = null;
  }
}

// Create window when Electron app is ready
app.whenReady().then(() => {
  createWindow();
  
  // On Windows, create the tray icon (it's the primary target platform)
  // On macOS, only create it for development/testing
  if (process.platform === 'win32' || process.env.NODE_ENV === 'development') {
    createTray();
  }
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Handle app quit
app.on('before-quit', () => {
  isQuitting = true;
  stopClientService();
});

// Handle IPC messages from renderer process
ipcMain.on('app-quit', () => {
  isQuitting = true;
  app.quit();
});

ipcMain.on('app-minimize', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});

ipcMain.on('restart-service', () => {
  stopClientService();
  startClientService();
});

// Quit when all windows are closed except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
}); 