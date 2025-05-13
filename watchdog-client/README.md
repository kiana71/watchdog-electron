# Watchdog Client

This is the client component of the Digital Signage Watchdog system. It runs on computers that need to be monitored and managed remotely.

## Features

- Gathers system information (hostname, IP address, MAC address, OS info)
- Establishes WebSocket connection to the Watchdog server
- Sends periodic heartbeats to maintain connection
- Accepts and executes commands for system restart and shutdown
- Automatically reconnects if connection is lost

## Setup

1. Install Node.js 16.x or later
2. Clone this repository
3. Install dependencies:
   ```
   npm install
   ```
4. Configure the environment variables in `.env`:
   ```
   SERVER_URL=ws://your-server-url:8080
   HEARTBEAT_INTERVAL=30000
   ```

## Running the Client

### Standard Startup

```
npm start
```

### Development Mode

```
npm run dev
```

### Install as Windows Service

```
npm run install-service
```

### Install as macOS Service

```
npm run install-service-mac
```

## Configuration

All configuration is done through environment variables in the `.env` file:

- `SERVER_URL`: WebSocket URL of the Watchdog server
- `HEARTBEAT_INTERVAL`: Interval in milliseconds for sending heartbeats (default: 30000)

## Architecture

The client connects to the Watchdog server via WebSocket and provides the following functionality:

1. **System Information Collection**: Gathers data about the client system
2. **Heartbeat Mechanism**: Maintains connection with the server
3. **Command Execution**: Processes restart and shutdown commands
4. **Automatic Reconnection**: Attempts to reconnect with exponential backoff

## Logs

Logs are output to the console by default. For production deployment, consider redirecting output to a log file. 