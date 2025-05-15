// This is a modified version of index.js for testing data collection without a server
import os from 'os';
import { exec } from 'child_process';
import osUtils from 'node-os-utils';
import dotenv from 'dotenv';
import fs from 'fs';
import si from 'systeminformation';
import axios from 'axios';
import { execSync } from 'child_process';

// Load environment variables from .env file
dotenv.config();

console.log(`Starting Watchdog Client Test Mode...`);
console.log(`This version only tests data collection without server connection`);

class WatchdogClientTest {
  constructor() {
    this.computerName = os.hostname();
    this.ipAddress = this.getIPAddress();
    this.macAddress = this.getMacAddress();
    this.osName = this.getOsInfo();
    this.version = '1.0.0';
    
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
      console.log('\n--- COLLECTING SYSTEM INFORMATION ---\n');
      
      // Basic info
      console.log(`Computer Name: ${this.computerName}`);
      console.log(`Local IP: ${this.ipAddress}`);
      console.log(`MAC Address: ${this.macAddress}`);
      console.log(`OS: ${this.osName}`);
      
      // Get public IP address
      this.publicIpAddress = await this.fetchPublicIp();
      console.log(`Public IP: ${this.publicIpAddress}`);
      
      // Get OS build number
      this.buildNumber = await this.getOSBuildNumber();
      console.log(`OS Build Number: ${this.buildNumber}`);
      
      // Get CPU information
      const cpuInfo = await si.cpu();
      this.cpu = `${cpuInfo.manufacturer} ${cpuInfo.brand} @ ${cpuInfo.speed}GHz`;
      console.log(`CPU: ${this.cpu}`);
      console.log(`CPU Cores: ${cpuInfo.cores} (Physical: ${cpuInfo.physicalCores})`);
      
      // Get CPU usage
      const cpuUsage = await osUtils.cpu.usage();
      console.log(`CPU Usage: ${cpuUsage.toFixed(1)}%`);
      
      // Get total memory
      const memInfo = await si.mem();
      this.totalMemory = Math.round(memInfo.total / (1024 * 1024)); // Convert to MB
      console.log(`Total Memory: ${this.totalMemory} MB`);
      console.log(`Free Memory: ${Math.round(memInfo.free / (1024 * 1024))} MB`);
      console.log(`Memory Usage: ${(100 - memInfo.free / memInfo.total * 100).toFixed(1)}%`);
      
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
        console.log(`Storage:`);
        console.log(`  - Total: ${this.storage.total} GB`);
        console.log(`  - Free: ${this.storage.free} GB`);
        console.log(`  - Type: ${this.storage.type}`);
        console.log(`  - Usage: ${(100 - mainDisk.available / mainDisk.size * 100).toFixed(1)}%`);
      }
      
      // Get graphics card information
      const graphicsInfo = await si.graphics();
      if (graphicsInfo.controllers.length > 0) {
        const mainGPU = graphicsInfo.controllers[0];
        this.graphicsCard = `${mainGPU.vendor} ${mainGPU.model}`;
        console.log(`Graphics Card: ${this.graphicsCard}`);
        console.log(`VRAM: ${Math.round(mainGPU.vram)} MB`);
      }
      
      console.log(`System Uptime: ${(os.uptime() / 3600).toFixed(2)} hours`);
      
      console.log('\n--- SYSTEM INFORMATION COLLECTION COMPLETE ---\n');
      
      // Log all collected data as a JSON object
      console.log('COLLECTED DATA AS JSON:');
      const collectedData = {
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
      };
      console.log(JSON.stringify(collectedData, null, 2));
      
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

  testRebootCommand() {
    const platform = os.platform();
    let command = '';
    
    if (platform === 'win32') {
      command = 'shutdown /r /t 5';
    } else if (platform === 'darwin') {
      command = 'sudo shutdown -r +1';
    } else if (platform === 'linux') {
      command = 'sudo shutdown -r +1';
    }
    
    console.log(`[TEST] Reboot command for this platform would be: ${command}`);
  }

  testShutdownCommand() {
    const platform = os.platform();
    let command = '';
    
    if (platform === 'win32') {
      command = 'shutdown /s /t 5';
    } else if (platform === 'darwin') {
      command = 'sudo shutdown -h +1';
    } else if (platform === 'linux') {
      command = 'sudo shutdown -h +1';
    }
    
    console.log(`[TEST] Shutdown command for this platform would be: ${command}`);
  }
}

// Create and run the test client
const client = new WatchdogClientTest();

// Test reboot and shutdown commands (without executing them)
setTimeout(() => {
  client.testRebootCommand();
  client.testShutdownCommand();
  console.log('\nTest complete. You can copy this data for verification.');
}, 5000); 