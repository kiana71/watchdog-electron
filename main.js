const { app, BrowserWindow, Tray, Menu, ipcMain, shell, session, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const log = require('electron-log');
const Store = require('electron-store');
// Add remote module
const remote = require('@electron/remote/main');
const appInfo = {
  version: require('./package.json').version
};

//Configure logging
log.transports.file.level = 'debug'; // Set to debug to capture all WebSocket logs
log.info('Application starting...');
// Initialize settings store
const store = new Store();
// Keep a global reference of the window and tray objects
let mainWindow;
let tray;
let clientProcess;
let isQuitting = false;

// Initialize remote module
remote.initialize();

// Path to the watchdog client executable
// const clientPath = path.join(path.dirname(app.getAppPath()), 'watchdog-client', 'index.js');
// In development, use the local path. In production, use extraResources
const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');
let clientPath;

if (isDev) {
  // Development: use local path
  clientPath = path.join(app.getAppPath(), 'watchdog-client', 'index.js');
} else {
  // Production: use extraResources (outside ASAR)
  clientPath = path.join(process.resourcesPath, 'watchdog-client', 'index.js');
}

log.info(`Client path: ${clientPath}`);

// Check if the client path exists
if (!fs.existsSync(clientPath)) {
  log.error(`Client not found at: ${clientPath}`);
}

// Function to forward logs to renderer
function forwardLog(type, message) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('websocket-log', { type, message });
    log[type.toLowerCase()](message);
  }
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
    width: 800, 
    height: 600, 
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      worldSafeExecuteJavaScript: true,
      sandbox: false,
      devTools: true
    },
    icon: path.join(__dirname, 'assets', 'icons', 'icon.png'),
    frame: false,
    transparent: true,
    resizable: true,
    show: false
  });

  // Enable remote module for this window
  remote.enable(mainWindow.webContents);

  // Load the index.html file
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  
  // Set the app version in a global variable accessible to preload script
  global.appVersion = appInfo.version;
  console.log(`Main process app version: ${appInfo.version}`);

  // Open DevTools in development mode
  if (process.argv.includes('--dev')) {
    // Open DevTools in a detached window for better visibility
    setTimeout(() => {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
      console.log('DevTools opened in detached mode');
      log.info('DevTools opened in detached mode');
    }, 1000); // Short delay to ensure window is fully loaded
    
    // Log that we're in development mode
    console.log('Running in development mode with DevTools enabled');
    log.info('Running in development mode with DevTools enabled');
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
  startClientService();
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
  console.log('Starting client service:', clientPath);
  
  try {
    // Check if the client path exists before starting
    if (!fs.existsSync(clientPath)) {
      const error = `Client not found at: ${clientPath}`;
      log.error(error);
      console.error(error);
      if (mainWindow) {
        mainWindow.webContents.send('client-error', error);
      }
      return;
    }
    
    console.log('Client file exists, proceeding with spawn...');
    
    // Determine the NODE_ENV based on command line arguments
    const isDev = process.argv.includes('--dev');
    const nodeEnv = isDev ? 'development' : 'production';
    
    // Set environment variables for the client process
    const env = {
      ...process.env,
      NODE_ENV: nodeEnv,
      // Always use the Heroku server URL regardless of environment
      SERVER_URL: 'wss://signcast-watchdog-91d66c3ccf16.herokuapp.com',
      HEARTBEAT_INTERVAL: '10000',  // 10 seconds
    };
    
    console.log('Client environment:', {
      NODE_ENV: env.NODE_ENV,
      SERVER_URL: env.SERVER_URL,
      HEARTBEAT_INTERVAL: env.HEARTBEAT_INTERVAL
    });
    
    console.log('Spawning process with command: node', [clientPath]);
    console.log('Working directory:', path.dirname(clientPath));
    
    // Spawn the Node.js process for the watchdog client
    clientProcess = spawn('node', [clientPath], {
      stdio: 'pipe',
      detached: false,
      env: env,
      cwd: path.dirname(clientPath) // Set working directory to the client directory
    });
    
    console.log('Process spawned, PID:', clientProcess.pid);
    console.log('Setting up stdout/stderr handlers...');
    
    clientProcess.stdout.on('data', (data) => {
      const message = data.toString().trim();
      log.info(`Client stdout: ${message}`);
      console.log(`Client stdout: ${message}`);
      if (mainWindow) {
        mainWindow.webContents.send('client-log', message);
      }
    });
    
    clientProcess.stderr.on('data', (data) => {
      const error = data.toString().trim();
      log.error(`Client stderr: ${error}`);
      console.error(`Client stderr: ${error}`);
      if (mainWindow) {
        mainWindow.webContents.send('client-error', error);
      }
    });
    
    clientProcess.on('close', (code) => {
      log.info(`Client process exited with code ${code}`);
      console.log(`Client process exited with code ${code}`);
      if (mainWindow) {
        mainWindow.webContents.send('client-status', { running: false, exitCode: code });
      }
    });
    
    clientProcess.on('error', (error) => {
      log.error('Client process error:', error);
      console.error('Client process error:', error);
      if (mainWindow) {
        mainWindow.webContents.send('client-error', error.message);
      }
    });
    
    console.log('Event handlers set up successfully');
    
    if (mainWindow) {
      mainWindow.webContents.send('client-status',{ running: true });
    }
    
  } catch (error) {
    log.error('Failed to start client service:', error);
    console.error('Failed to start client service:', error);
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

// Handle save client name
ipcMain.on('save-client-name', (event, clientName) => {
  console.log('=== IPC HANDLER CALLED ===');
  log.info(`Received client name: ${clientName}`);
  console.log(`Received client name: ${clientName}`);
  
  console.log('Client process exists:', !!clientProcess);
  console.log('Client process stdin exists:', !!(clientProcess && clientProcess.stdin));
  
  // Forward the client name to the watchdog client process
  if (clientProcess && clientProcess.stdin) {
    const message = JSON.stringify({
      type: 'set_client_name',
      data: { clientName: clientName }
    });
    
    console.log('Sending message to client process:', message);
    
    try {
      clientProcess.stdin.write(message + '\n');
      log.info(`Sent client name to watchdog client: ${clientName}`);
      console.log(`Sent client name to watchdog client: ${clientName}`);
    } catch (error) {
      log.error('Failed to send client name to watchdog client:', error);
      console.error('Failed to send client name to watchdog client:', error);
    }
  } else {
    log.warn('Client process not available to send client name');
    console.warn('Client process not available to send client name');
    console.log('Debug - clientProcess:', !!clientProcess);
    console.log('Debug - clientProcess.stdin:', !!(clientProcess && clientProcess.stdin));
  }
});

// Handle get client name request
ipcMain.on('get-client-name', (event) => {
  try {
    const configPath = path.join(__dirname, 'watchdog-client', 'client-config.json');
    if (fs.existsSync(configPath)) {
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const clientName = configData.clientName;
      if (clientName) {
        log.info(`Loaded saved client name: ${clientName}`);
        console.log(`Loaded saved client name: ${clientName}`);
        event.sender.send('client-name-loaded', clientName);
      }
    }
  } catch (error) {
    log.error('Error loading saved client name:', error);
    console.error('Error loading saved client name:', error);
  }
});

// Quit when all windows are closed except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
}); 



