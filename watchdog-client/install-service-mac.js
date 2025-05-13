import { homedir } from 'os';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const plistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.digitalsignage.watchdog</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>${join(__dirname, 'index.js')}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardErrorPath</key>
    <string>/tmp/watchdog.err</string>
    <key>StandardOutPath</key>
    <string>/tmp/watchdog.out</string>
</dict>
</plist>`;

async function installService() {
  try {
    const plistPath = join(homedir(), 'Library/LaunchAgents/com.digitalsignage.watchdog.plist');
    
    // Create LaunchAgents directory if it doesn't exist
    await fs.mkdir(join(homedir(), 'Library/LaunchAgents'), { recursive: true });
    
    // Write plist file
    await fs.writeFile(plistPath, plistContent);
    
    // Set correct permissions
    await fs.chmod(plistPath, 0o644);
    
    // Load the service
    exec(`launchctl load ${plistPath}`, (error) => {
      if (error) {
        console.error('Failed to load service:', error);
        return;
      }
      console.log('Service installed and started successfully');
    });
  } catch (error) {
    console.error('Installation failed:', error);
  }
}

installService();