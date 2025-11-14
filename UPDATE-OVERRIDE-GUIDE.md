# Electron App Update: Override vs Uninstall/Reinstall

---

## 🔑 Critical Code for Override Updates

### These are the EXACT settings that enable override instead of uninstall/reinstall:

#### 1. In `main.js` - Silent Installer Configuration

```javascript
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// THIS IS THE KEY: Silent installation flag
if (process.platform === 'win32') {
  autoUpdater.installerArgs = ['/S']; // '/S' = Silent mode (no UI)
  log.info('Configured silent Windows installer');
}

// When update is downloaded, quit and install
autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded, installing...');
  
  // THIS TRIGGERS THE OVERRIDE:
  // - Quits app
  // - Runs installer with /S flag (silent)
  // - Installer replaces files (doesn't uninstall first)
  // - Restarts app
  autoUpdater.quitAndInstall(false, true);
  // Parameters: (isSilent, isForceRunAfter)
  // false = graceful quit
  // true = restart app after install
});
```

#### 2. In `package.json` - NSIS Configuration

```json
{
  "build": {
    "nsis": {
      "oneClick": true,
      "allowToChangeInstallationDirectory": false,
      "deleteAppDataOnUninstall": false,  // ← CRITICAL: Preserves user data
      "runAfterFinish": true
    }
  }
}
```

**Why these work together:**
1. `/S` flag tells NSIS to run silently
2. NSIS in silent mode on existing install = **REPLACES FILES** (no uninstall)
3. `deleteAppDataOnUninstall: false` ensures user data is never touched
4. `quitAndInstall(false, true)` handles the quit → install → restart flow

**That's it!** These settings change the behavior from uninstall/reinstall to override.

---

## The Problem

By default, some Electron update configurations do a full uninstall and reinstall process, which:
- Takes longer
- May require more user permissions
- Can disrupt the user experience
- Might lose user settings if not configured properly

## The Solution: Override/Replace Updates

Configure your app to **replace files** instead of uninstalling/reinstalling. This is:
- Faster
- Seamless
- Preserves all user data automatically
- No extra prompts or disruptions

---

## Configuration

### 1. Install Required Packages

```bash
npm install electron-updater --save
```

### 2. Configure `package.json`

Add this to your `package.json`:

```json
{
  "name": "your-app-name",
  "version": "1.0.0",
  "main": "main.js",
  "build": {
    "appId": "com.yourcompany.yourapp",
    "productName": "Your App Name",
    "publish": {
      "provider": "github",
      "owner": "your-github-username",
      "repo": "your-repo-name",
      "private": false
    },
    "win": {
      "target": ["nsis"]
    },
    "nsis": {
      "oneClick": true,
      "allowToChangeInstallationDirectory": false,
      "createDesktopShortcut": true,
      "runAfterFinish": true,
      "deleteAppDataOnUninstall": false
    }
  }
}
```

**Key settings:**
- `oneClick: true` — Single-click installation (no wizard steps)
- `deleteAppDataOnUninstall: false` — **Critical!** Preserves user data
- `runAfterFinish: true` — Auto-starts app after update

---

## Main Process Code (`main.js`)

### Step 1: Import and Configure

```javascript
const { app, BrowserWindow } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Configure auto-updater logger
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// Control update behavior
autoUpdater.autoDownload = false; // Control download manually
autoUpdater.autoInstallOnAppQuit = false; // Control install manually

// Configure silent installation for Windows
if (process.platform === 'win32') {
  autoUpdater.installerPath = null; // Use default installer
  autoUpdater.installerArgs = ['/S']; // Silent installation flag
  log.info('Configured silent Windows installer');
}

// Configure GitHub repository for updates
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'your-github-username',
  repo: 'your-repo-name',
  private: false,
  releaseType: 'release'
});
```

**Important:**
- `/S` flag makes the installer run silently (no UI)
- This is what enables the seamless override

### Step 2: Handle Update Events

```javascript
// When update is available
autoUpdater.on('update-available', (info) => {
  log.info('Update available:', info.version);
  
  // Start downloading immediately
  autoUpdater.downloadUpdate();
  
  // Optionally notify user
  mainWindow.webContents.send('update-status', {
    status: 'downloading',
    version: info.version
  });
});

// When update is downloaded
autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded:', info.version);
  
  // Install immediately (quits app, installs, restarts)
  autoUpdater.quitAndInstall(false, true);
  
  // Parameters:
  // - false: don't force quit (close gracefully)
  // - true: restart app after install
});

// Handle errors
autoUpdater.on('error', (err) => {
  log.error('Auto-updater error:', err);
});

// Handle "no updates"
autoUpdater.on('update-not-available', (info) => {
  log.info('No updates available');
});
```

### Step 3: Check for Updates on Startup

```javascript
app.whenReady().then(() => {
  createWindow();
  
  // Check for updates 10 seconds after app starts
  setTimeout(() => {
    log.info('Checking for updates...');
    autoUpdater.checkForUpdates();
  }, 10000);
});
```

---

## How It Works

### The Override Process:

1. **App detects update available**
   - Compares current version with latest GitHub release

2. **Downloads new installer**
   - Saves to temp directory

3. **App closes gracefully**
   - `quitAndInstall()` closes all windows

4. **Installer runs with `/S` flag**
   - Silent mode (no UI)
   - **Replaces app files** in installation directory
   - Does NOT uninstall first

5. **Files are overwritten:**
   - Executable (`.exe`)
   - Application code (`main.js`, renderer files, etc.)
   - Resources and assets

6. **User data is untouched:**
   - Settings in `AppData\Roaming\your-app-name\`
   - User configurations
   - Logs
   - Any stored data

7. **App restarts automatically**
   - Because of `quitAndInstall()` second parameter = `true`

---

## Why This Works

### NSIS Installer Behavior:

When you run an NSIS installer with `/S` flag on an **already installed app**:

```
- Detects existing installation
- Skips uninstall step
- Directly replaces files in installation folder
- Preserves %APPDATA% folder (because deleteAppDataOnUninstall: false)
- Exits and starts app
```

This is **much faster** than:
```
- Uninstall old version
- Remove all files
- Install new version
- Restore settings
```

---

## File Locations

### What Gets Replaced:
```
C:\Users\<User>\AppData\Local\Programs\your-app-name\
├── your-app.exe          ← Replaced
├── resources/
│   ├── app/             ← Replaced
│   │   ├── main.js      ← Replaced
│   │   └── ...          ← Replaced
```

### What Stays Untouched:
```
C:\Users\<User>\AppData\Roaming\your-app-name\
├── config.json          ← Preserved
├── logs/                ← Preserved
└── user-settings.json   ← Preserved
```

---

## Creating Releases

### 1. Update Version

In `package.json`:
```json
{
  "version": "1.0.1"
}
```

### 2. Build the App

```bash
npm run build
# or
npm run build:win
```

This creates:
- `dist/your-app-setup-1.0.1.exe`
- `dist/latest.yml`

### 3. Create GitHub Release

1. Go to your repo: `https://github.com/username/repo/releases`
2. Click "Create a new release"
3. Tag version: `v1.0.1` (with "v")
4. Release title: `v1.0.1`
5. Upload files:
   - `your-app-setup-1.0.1.exe`
   - `latest.yml`
6. Click "Publish release"

**Important:** Tag format must be `v1.0.1` (with "v") for electron-updater to detect it.

---

## Testing

### Test the Update Process:

1. Install version 1.0.0 on a test machine
2. Create and publish release 1.0.1 on GitHub
3. Launch the app (version 1.0.0)
4. Watch the logs in: `%APPDATA%\your-app-name\logs\`
5. You should see:
   ```
   Checking for updates...
   Update available: 1.0.1
   Downloading update...
   Update downloaded
   Installing update...
   ```
6. App closes, updates, and restarts automatically
7. Check version — should now be 1.0.1
8. Verify user settings are still intact

---

## Troubleshooting

### Update Not Detected

**Check:**
- Is repository public? (or add GitHub token for private repos)
- Is release tag format correct? (must be `v1.0.1`, not `1.0.1` or `v.1.0.1`)
- Did you upload both `.exe` and `latest.yml`?
- Check logs in `%APPDATA%\your-app-name\logs\main.log`

### UAC Prompts Appear

**This is normal** if:
- App is installed in `Program Files` (admin location)
- First-time installation

**To minimize:**
- Install in user folder: `AppData\Local\Programs\` (NSIS does this by default)
- User-level installs don't require admin rights

### Settings Lost After Update

**Check:**
- `deleteAppDataOnUninstall: false` in `package.json` NSIS config
- User settings are in `AppData\Roaming\`, not in app installation folder

---

## Key Differences: Override vs Uninstall/Reinstall

| Aspect | Override (Our Setup) | Uninstall/Reinstall |
|--------|---------------------|---------------------|
| Speed | Fast (5-10 seconds) | Slow (30-60 seconds) |
| User Data | Always preserved | Can be lost |
| Process | Replace files | Remove → Install |
| Permissions | Minimal | May need admin |
| User Experience | Seamless | Disruptive |
| Installer Flag | `/S` (silent) | Default (with UI) |

---

## Summary

**To get seamless override updates:**

1. ✅ Set `installerArgs: ['/S']` in main.js
2. ✅ Set `deleteAppDataOnUninstall: false` in package.json
3. ✅ Use `quitAndInstall(false, true)` to restart after update
4. ✅ Use NSIS installer (not Squirrel or MSI)
5. ✅ Install in user folder (not Program Files)

**What happens:**
- App closes → Installer replaces files → App restarts
- User settings stay untouched
- No uninstall step
- No reinstall wizard
- Fast and seamless

---

## Additional Resources

- [electron-updater documentation](https://www.electron.build/auto-update)
- [NSIS installer options](https://www.electron.build/configuration/nsis)
- [electron-builder configuration](https://www.electron.build/configuration/configuration)

---

**Questions?** Check the logs in `%APPDATA%\your-app-name\logs\main.log` for detailed update process information.

