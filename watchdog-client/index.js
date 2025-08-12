import WebSocket from 'ws';
import os from 'os';
import { exec } from 'child_process';
import osUtils from 'node-os-utils';
import path from 'path';
import fs from 'fs';
import si from 'systeminformation';
import axios from 'axios';
import { execSync } from 'child_process';
import { config } from './config.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import screenshot from 'screenshot-desktop';

// Get the directory path for the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json to get the actual version
let packageVersion = '1.0.0'; // Default fallback version
try {
  const packageJsonPath = join(__dirname, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  packageVersion = packageJson.version;
  console.log(`Watchdog Client Version: ${packageVersion}`);
} catch (error) {
  console.error('Failed to read package.json version:', error);
}

// Use the configuration values from the config module
const SERVER_URL = config.serverUrl;
const HEARTBEAT_INTERVAL = config.heartbeatInterval;
// Enable Windows simulation mode for testing on non-Windows platforms
const SIMULATE_WINDOWS = process.env.SIMULATE_WINDOWS === 'true';

console.log(`Starting Watchdog Client...`);
console.log(`Server URL: ${SERVER_URL}`);
console.log(`Heartbeat Interval: ${HEARTBEAT_INTERVAL}ms`);
console.log(`Environment: ${config.environment}`);
if (SIMULATE_WINDOWS) {
  console.log('Running in Windows simulation mode for testing');
}

class WatchdogClient {
  constructor() {
    this.computerName = os.hostname();
    this.clientName = this.loadClientName(); // Load persisted client name
    this.ipAddress = this.getIPAddress();
    this.macAddress = this.getMacAddress();
    this.osName = this.getOsInfo();
    this.version = packageVersion; // Use the version from package.json
    this.isConnected = false;
    this.reconnectAttempts = 0;
    
    // Initialize other properties that will be populated asynchronously
    this.publicIpAddress = null;
    this.buildNumber = null;
    this.cpu = null;
    this.totalMemory = null;
    this.storage = null;
    this.graphicsCard = null;
    
    // Fetch initial system information
    this.fetchAdditionalSystemInfo();
    
    // Set up stdin handling for receiving messages from main process
    this.setupStdinHandling();
  }

  getIPAddress() {
    const interfaces = os.networkInterfaces();
    for (const iface of Object.values(interfaces)) {
      for (const alias of iface) {
        if (alias.family === 'IPv4' && !alias.internal) {
          return alias.address;
        }
      }
    }
    return '127.0.0.1';
  }

  getMacAddress() {
    const interfaces = os.networkInterfaces();
    for (const iface of Object.values(interfaces)) {
      for (const alias of iface) {
        if (alias.family === 'IPv4' && !alias.internal) {
          return alias.mac;
        }
      }
    }
    return '00:00:00:00:00:00';
  }

  async fetchPublicIp() {
    try {
      const response = await axios.get('https://api.ipify.org?format=json');
      return response.data.ip;
    } catch (error) {
      console.error('Failed to fetch public IP:', error);
      return null;
    }
  }

  async fetchAdditionalSystemInfo() {
    try {
      // Get public IP address
      this.publicIpAddress = await this.fetchPublicIp();
      
      // Get CPU information
      const cpuInfo = await si.cpu();
      this.cpu = `${cpuInfo.manufacturer} ${cpuInfo.brand} @ ${cpuInfo.speed}GHz`;
      
      // Get total memory
      const memInfo = await si.mem();
      this.totalMemory = Math.round(memInfo.total / (1024 * 1024)); // Convert to MB
      
      // Get storage information for all drives
      const diskInfo = await si.diskLayout();
      const fsInfo = await si.fsSize();
      
      // Create an array to store information for all drives
      this.storage = [];
      
      // Process each drive
      for (const drive of fsInfo) {
        const driveInfo = {
          mount: drive.fs, // Drive letter (e.g., C:, D:)
          total: Math.round(drive.size / (1024 * 1024 * 1024)), // Convert to GB
          free: Math.round(drive.available / (1024 * 1024 * 1024)), // Convert to GB
          type: 'Unknown',
          usage: Math.round((1 - drive.available / drive.size) * 100) // Calculate usage percentage
        };
        
        // Try to find matching disk type
        const matchingDisk = diskInfo.find(disk => 
          disk.device.toLowerCase().includes(drive.fs.toLowerCase().replace(':', ''))
        );
        if (matchingDisk) {
          driveInfo.type = matchingDisk.type;
        }
        
        this.storage.push(driveInfo);
      }
      
      // Get graphics card information
      const graphicsInfo = await si.graphics();
      if (graphicsInfo.controllers.length > 0) {
        const mainGPU = graphicsInfo.controllers[0];
        this.graphicsCard = `${mainGPU.vendor} ${mainGPU.model}`;
      }
      
      // Get OS build number
      this.buildNumber = await this.getOSBuildNumber();
      
      console.log('System information collected successfully');
    } catch (error) {
      console.error('Error collecting system information:', error);
    }
  }

  async getOSBuildNumber() {
    const platform = os.platform();
    
    try {
      if (platform === 'win32') {
        // Windows
        const output = execSync('ver').toString();
        const match = output.match(/\d+\.\d+\.\d+/);
        return match ? match[0] : null;
      } else if (platform === 'darwin') {
        // macOS
        const output = execSync('sw_vers -buildVersion').toString();
        return output.trim();
      } else if (platform === 'linux') {
        // Linux
        const output = execSync('uname -r').toString();
        return output.trim();
      }
    } catch (error) {
      console.error('Error getting OS build number:', error);
      return null;
    }
    
    return null;
  }

  async getDetailedWindowsInfo() {
    try {
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      // Get detailed Windows version information using PowerShell
      const command = `powershell -Command "Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, WindowsBuildLabEx, OsArchitecture | ConvertTo-Json"`;
      
      console.log('Getting detailed Windows info...');
      const { stdout } = await execAsync(command);
      console.log('Windows info retrieved:', stdout);
      
      const windowsInfo = JSON.parse(stdout);
      
      const result = {
        productName: windowsInfo.WindowsProductName,
        version: windowsInfo.WindowsVersion,
        buildLab: windowsInfo.WindowsBuildLabEx,
        architecture: windowsInfo.OsArchitecture
      };
      
      console.log('Detailed Windows info result:', result);
      return result;
    } catch (error) {
      console.error('Error getting detailed Windows info:', error);
      return null;
    }
  }

  getOsInfo() {
    const platform = os.platform();
    const release = os.release();
    const type = os.type();
    
    // Format OS information based on platform
    if (platform === 'win32') {
      // Windows platform - use build number for exact version detection
      const buildNumber = parseInt(release.split('.')[2]) || 0;
      
      // Windows version mapping using build numbers
      const winVersion = {
        // Windows 11 builds (22000+)
        '22000': 'Windows 11 21H2',
        '22621': 'Windows 11 22H2',
        '22631': 'Windows 11 23H2',
        '26040': 'Windows 11 24H2',
        
        // Windows 10 builds (10240-19045)
        '10240': 'Windows 10 1507',
        '10586': 'Windows 10 1511',
        '14393': 'Windows 10 1607',
        '15063': 'Windows 10 1703',
        '16299': 'Windows 10 1709',
        '17134': 'Windows 10 1803',
        '17763': 'Windows 10 1809',
        '18362': 'Windows 10 1903',
        '18363': 'Windows 10 1909',
        '19041': 'Windows 10 2004',
        '19042': 'Windows 10 20H2',
        '19043': 'Windows 10 21H1',
        '19044': 'Windows 10 21H2',
        '19045': 'Windows 10 22H2',
        
        // Legacy Windows versions
        '9200': 'Windows 8',
        '9600': 'Windows 8.1',
        '7601': 'Windows 7 SP1',
        '7600': 'Windows 7',
        '6002': 'Windows Vista SP2',
        '6001': 'Windows Vista SP1',
        '6000': 'Windows Vista',
        '3790': 'Windows XP x64',
        '2600': 'Windows XP'
      };
      
      // Try to get exact version from build number
      if (winVersion[buildNumber.toString()]) {
        return winVersion[buildNumber.toString()];
      }
      
      // Fallback: determine Windows 10 vs 11 based on build number
      if (buildNumber >= 22000) {
        return `Windows 11 (Build ${buildNumber})`;
      } else if (buildNumber >= 10240) {
        return `Windows 10 (Build ${buildNumber})`;
      } else {
        return `Windows (Build ${buildNumber})`;
      }
      
    } else if (platform === 'darwin') {
      // macOS platform
      const macVersions = {
        '22': 'macOS Ventura',
        '21': 'macOS Monterey',
        '20': 'macOS Big Sur',
        '19': 'macOS Catalina',
        '18': 'macOS Mojave',
        '17': 'macOS High Sierra',
      };
      
      const majorVersion = release.split('.')[0];
      return macVersions[majorVersion] || `macOS (${release})`;
    } else if (platform === 'linux') {
      // Linux platform - would use more specific detection in production
      return `${type} (${release})`;
    } else {
      return `${type} ${platform} (${release})`;
    }
  }

  async connect() {
    try {
      // Include the computer name in the WebSocket URL as a query parameter
      const wsUrl = `${SERVER_URL}?computerName=${encodeURIComponent(this.computerName)}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        console.log('Connected to server');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.sendClientInfo();
        this.startHeartbeat();
      });

      this.ws.on('message', async (data) => {
        const message = JSON.parse(data);
        await this.handleCommand(message);
      });

      this.ws.on('close', () => {
        console.log('Disconnected from server');
        this.isConnected = false;
        this.reconnect();
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.reconnect();
      });
    } catch (error) {
      console.error('Connection error:', error);
      this.reconnect();
    }
  }

  reconnect() {
    if (this.reconnectAttempts < 5) {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      this.reconnectAttempts++;
      setTimeout(() => this.connect(), delay);
    }
  }

  async sendClientInfo() {
    // Refresh system information before sending
    await this.fetchAdditionalSystemInfo();
    
    // Get detailed Windows info if on Windows
    let detailedOsInfo = null;
    if (os.platform() === 'win32') {
      console.log('Platform is Windows, getting detailed OS info...');
      detailedOsInfo = await this.getDetailedWindowsInfo();
      console.log('Detailed OS info retrieved:', detailedOsInfo);
    }
    
    const info = {
      type: 'client_info',
      data: {
        computerName: this.computerName,
        clientName: this.clientName,
        ipAddress: this.ipAddress,
        publicIpAddress: this.publicIpAddress,
        macAddress: this.macAddress,
        osName: this.osName,
        buildNumber: this.buildNumber,
        cpu: this.cpu,
        totalMemory: this.totalMemory,
        storage: this.storage,
        graphicsCard: this.graphicsCard,
        version: this.version,
        uptimeHours: os.uptime() / 3600,
        cpuUsage: await osUtils.cpu.usage(),
        memoryUsage: await osUtils.mem.info(),
        // Add detailed OS information
        detailedOsInfo: detailedOsInfo
      }
    };
    console.log('Sending client info with detailedOsInfo:', info.data.detailedOsInfo);
    this.send(info);
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        // Include current uptime in heartbeat to keep it updated
        this.send({ 
          type: 'heartbeat',
          data: {
            uptimeHours: os.uptime() / 3600
          }
        });
      }
    }, HEARTBEAT_INTERVAL);
  }

  async handleCommand(message) {
    switch (message.type) {
      case 'reboot':
        await this.rebootSystem();
        break;
      case 'shutdown':
        await this.shutdownSystem();
        break;
      case 'refresh_info':
        await this.sendClientInfo();
        break;
      case 'screenshot':
        await this.captureAndSendScreenshot();
        break;
      default:
        console.log('Unknown command:', message.type);
    }
  }

  async rebootSystem() {
    this.send({ type: 'reboot_initiated' });
    const platform = os.platform();
    let command = '';
    
    if (platform === 'win32') {
      command = 'shutdown /r /t 5';
    } else if (platform === 'darwin') {
      command = 'sudo shutdown -r +1';
    } else if (platform === 'linux') {
      command = 'sudo shutdown -r +1';
    }
    
    exec(command, (error) => {
      if (error) {
        console.error('Reboot error:', error);
        this.send({ type: 'reboot_failed', error: error.message });
      }
    });
  }

  async shutdownSystem() {
    this.send({ type: 'shutdown_initiated' });
    const platform = os.platform();
    let command = '';
    
    if (platform === 'win32') {
      command = 'shutdown /s /t 5';
    } else if (platform === 'darwin') {
      command = 'sudo shutdown -h +1';
    } else if (platform === 'linux') {
      command = 'sudo shutdown -h +1';
    }
    
    exec(command, (error) => {
      if (error) {
        console.error('Shutdown error:', error);
        this.send({ type: 'shutdown_failed', error: error.message });
      }
    });
  }

  async captureAndSendScreenshot() {
    try {
      console.log('Starting screenshot capture...');
      // First, send a message that we're starting the screenshot
      this.send({ type: 'screenshot_started' });
      
      console.log('Capturing screenshot...');
      // Capture the screenshot
      const imageBuffer = await screenshot();
      console.log('Screenshot captured, size:', imageBuffer.length, 'bytes');
      
      // Convert the buffer to base64
      const base64Image = imageBuffer.toString('base64');
      console.log('Screenshot converted to base64, length:', base64Image.length);
      
      // Send the screenshot data
      console.log('Sending screenshot data to server...');
      this.send({ 
        type: 'screenshot_data',
        data: {
          timestamp: new Date().toISOString(),
          image: base64Image,
          format: 'png'
        }
      });
      console.log('Screenshot data sent successfully');
    } catch (error) {
      console.error('Screenshot error:', error);
      this.send({ 
        type: 'screenshot_error',
        error: error.message 
      });
    }
  }

  send(data) {
    if (this.isConnected) {
      this.ws.send(JSON.stringify(data));
    }
  }

  // Set up stdin handling for receiving messages from main process
  setupStdinHandling() {
    try {
      console.log('=== SETTING UP STDIN HANDLING ===');
      console.log('process.stdin.isTTY:', process.stdin.isTTY);
      console.log('process.stdin readable:', process.stdin.readable);
      
      // Check if we're running as a child process (isTTY is false or undefined)
      if (process.stdin.isTTY !== true) {
        // We're running as a child process, set up stdin handling
        console.log('Setting up stdin handling for child process...');
        
        // Set encoding with error handling
        try {
          process.stdin.setEncoding('utf8');
        } catch (error) {
          console.warn('Failed to set stdin encoding:', error);
          return; // Exit gracefully if stdin setup fails
        }
       
        let buffer = '';
        
        // Wrap event listeners in try-catch to prevent crashes
        try {
          process.stdin.on('data', (chunk) => {
            try {
              console.log('=== RECEIVED STDIN DATA ===');
              console.log('Raw chunk:', JSON.stringify(chunk));
              buffer += chunk;
              
              // Process complete lines
              const lines = buffer.split('\n');
              buffer = lines.pop(); // Keep incomplete line in buffer
              
              console.log('Processing lines:', lines.length);
              lines.forEach(line => {
                if (line.trim()) {
                  console.log('Processing line:', JSON.stringify(line.trim()));
                  try {
                    const message = JSON.parse(line.trim());
                    console.log('Parsed message:', message);
                    this.handleMainProcessMessage(message);
                  } catch (error) {
                    console.error('Error parsing message from main process:', error);
                    console.error('Raw line was:', JSON.stringify(line.trim()));
                  }
                }
              });
            } catch (error) {
              console.error('Error processing stdin data:', error);
            }
          });
          
          process.stdin.on('end', () => {
            console.log('Main process stdin ended');
          });
          
          process.stdin.on('error', (error) => {
            console.warn('Stdin error (non-fatal):', error);
          });
          
          console.log('Stdin event listeners set up successfully');
        } catch (error) {
          console.warn('Failed to set up stdin event listeners:', error);
        }
      } else {
        console.log('Running in TTY mode, stdin handling not needed');
      }
    } catch (error) {
      console.error('Error in setupStdinHandling (non-fatal):', error);
      // Don't throw - allow client to continue connecting even if stdin setup fails
    }
  }

  // Handle messages from the main process
  handleMainProcessMessage(message) {
    console.log('=== HANDLING MAIN PROCESS MESSAGE ===');
    console.log('Received message from main process:', message);
    
    switch (message.type) {
      case 'set_client_name':
        console.log('Processing set_client_name message...');
        console.log('Current clientName:', this.clientName);
        console.log('New clientName:', message.data.clientName);
        
        this.clientName = message.data.clientName;
        console.log(`Client name updated to: ${this.clientName}`);
        
        // Save the client name to file for persistence
        console.log('Attempting to save client name...');
        this.saveClientName(this.clientName);
        console.log('Save client name completed');
        
        // Send updated client info to server immediately
        if (this.isConnected) {
          console.log('Sending updated client info to server...');
          this.sendClientInfo();
        } else {
          console.log('Not connected to server, will send info when connected');
        }
        break;
      default:
        console.log('Unknown message type from main process:', message.type);
    }
  }

  loadClientName() {
    try {
      // Use user-specific directory instead of shared app directory
      const userHomeDir = os.homedir();
      const configDir = path.join(userHomeDir, '.watchdog-client');
      const configPath = path.join(configDir, 'client-config.json');
      
      console.log(`Loading client name from user-specific path: ${configPath}`);
      
      if (fs.existsSync(configPath)) {
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        console.log(`Loaded client name from config: ${configData.clientName}`);
        return configData.clientName || `Client-${this.computerName}`;
      } else {
        console.log('No user-specific client config found, using default client name');
      }
    } catch (error) {
      console.error('Error loading client name:', error);
    }
    
    // Return a default client name based on computer name for new installations
    const defaultName = `Client-${this.computerName}`;
    console.log(`Using default client name: ${defaultName}`);
    return defaultName;
  }
  
  saveClientName(clientName) {
    try {
      console.log('=== SAVING CLIENT NAME ===');
      console.log('Client name to save:', clientName);
      
      // Use user-specific directory instead of shared app directory
      const userHomeDir = os.homedir();
      const configDir = path.join(userHomeDir, '.watchdog-client');
      const configPath = path.join(configDir, 'client-config.json');
      
      console.log('User home directory:', userHomeDir);
      console.log('Config directory:', configDir);
      console.log('Config file path:', configPath);
      
      // Create the config directory if it doesn't exist
      if (!fs.existsSync(configDir)) {
        console.log('Creating config directory...');
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      const configData = { clientName: clientName };
      console.log('Config data to write:', configData);
      
      fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
      console.log(`Successfully saved client name to user-specific config: ${clientName}`);
      
      // Verify the file was written
      if (fs.existsSync(configPath)) {
        const savedData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        console.log('Verification - file exists and contains:', savedData);
      } else {
        console.error('ERROR: Config file was not created!');
      }
    } catch (error) {
      console.error('=== ERROR SAVING CLIENT NAME ===');
      console.error('Error saving client name:', error);
      console.error('Error stack:', error.stack);
    }
  }
}

const client = new WatchdogClient();
client.connect();