import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determine which environment to use
const NODE_ENV = process.env.NODE_ENV || 'development';

// Load the appropriate .env file
let envPath;
if (NODE_ENV === 'production') {
  envPath = path.resolve(__dirname, '.env.production');
  console.log('Loading production configuration');
} else {
  envPath = path.resolve(__dirname, '.env.development');
  console.log('Loading development configuration');
}

// Load environment variables from the correct file
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error('Error loading environment file:', result.error);
}

// Export configuration values
export const config = {
  serverUrl: process.env.SERVER_URL || 'ws://localhost:8080',
  heartbeatInterval: parseInt(process.env.HEARTBEAT_INTERVAL || '10000', 10),
  environment: NODE_ENV
};

console.log(`Configuration loaded: ${NODE_ENV} mode`);
console.log(`Server URL: ${config.serverUrl}`); 