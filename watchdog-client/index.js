import WebSocket from 'ws';
import os from 'os';
import { exec } from 'child_process';
import osUtils from 'node-os-utils';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import si from 'systeminformation';
import axios from 'axios';
import { execSync } from 'child_process';

// Load environment variables from .env file
dotenv.config();

const SERVER_URL = process.env.SERVER_URL || 'ws://localhost:8080';
const HEARTBEAT_INTERVAL = parseInt(process.env.HEARTBEAT_INTERVAL || '30000', 10); // 30 seconds default

console.log(`Starting Watchdog Client...`);
console.log(`Server URL: ${SERVER_URL}`);
console.log(`Heartbeat Interval: ${HEARTBEAT_INTERVAL}ms`);

class WatchdogClient {
  constructor() {
    this.computerName = os.hostname();
    this.ipAddress = this.getIPAddress();
    this.macAddress = this.getMacAddress();
    this.osName = this.getOsInfo();
    this.version = '1.0.0';
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
      
      // Get storage information
      const diskInfo = await si.diskLayout();
      const fsInfo = await si.fsSize();
      if (fsInfo.length > 0) {
        const mainDisk = fsInfo[0];
        this.storage = {
          total: Math.round(mainDisk.size / (1024 * 1024 * 1024)), // Convert to GB
          free: Math.round(mainDisk.available / (1024 * 1024 * 1024)), // Convert to GB
          type: diskInfo.length > 0 ? diskInfo[0].type : 'Unknown'
        };
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

  getOsInfo() {
    const platform = os.platform();
    const release = os.release();
    const type = os.type();
    
    // Format OS information based on platform
    if (platform === 'win32') {
      // Windows platform
      const winVersion = {
        '10.0': 'Windows 10/11',
        '6.3': 'Windows 8.1',
        '6.2': 'Windows 8',
        '6.1': 'Windows 7',
        '6.0': 'Windows Vista',
        '5.2': 'Windows XP 64-Bit',
        '5.1': 'Windows XP',
      };
      
      const version = winVersion[release.split('.').slice(0, 2).join('.')] || `Windows (${release})`;
      
      // Try to get edition information using exec (in a real implementation)
      // This is a simplified version
      return version;
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
      this.ws = new WebSocket(SERVER_URL);

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
    
    const info = {
      type: 'client_info',
      data: {
        computerName: this.computerName,
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
      }
    };
    this.send(info);
  }

  startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected) {
        this.send({ type: 'heartbeat' });
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

  send(data) {
    if (this.isConnected) {
      this.ws.send(JSON.stringify(data));
    }
  }
}

const client = new WatchdogClient();
client.connect();