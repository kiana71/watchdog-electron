# Digital Signage Watchdog - Electron App

This is the desktop application component of the Digital Signage Watchdog system. It provides a user interface for monitoring and controlling the Watchdog client service.

## Features

- System tray integration with context menu
- Status monitoring of Watchdog client service
- Restart service functionality
- Log viewing
- Frameless window with minimize and close controls

## Development

### Prerequisites

- Node.js 16.x or later
- npm or yarn

### Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Add icon files to the `assets/icons` directory:
   - `icon.png`
   - `tray-icon.png`
   - `logo.png`

3. Run the application in development mode:
   ```
   npm run dev
   ```

### Project Structure

- `main.js` - Main process entry point
- `preload.js` - Preload script for secure renderer process communication
- `renderer/` - UI files
  - `index.html` - Main application window
  - `styles.css` - Styling
  - `script.js` - UI logic
- `assets/` - Static assets
  - `icons/` - Application icons

## Building

### Windows

```
npm run build:win
```

### macOS

```
npm run build:mac
```

### All Platforms

```
npm run build
```

## Architecture

The application consists of two main components:

1. **Electron App** - This application, providing a user interface
2. **Watchdog Client** - The service that monitors the system and communicates with the server

The Electron app spawns the Watchdog client as a child process and communicates with it via stdout/stderr pipes. This allows the Electron app to display client logs and status information.

## How It Works

1. The Electron app starts and creates a window
2. It spawns the Watchdog client service as a child process
3. The client connects to the server and begins monitoring
4. The Electron app displays status information from the client
5. The user can restart the client service if needed
6. When minimized, the app hides to the system tray

## Customization

You can customize the appearance and behavior of the application by editing the following files:

- `renderer/styles.css` - UI styling
- `renderer/index.html` - UI structure
- `main.js` - Application behavior 