import { Service } from 'node-windows';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const service = new Service({
  name: 'Digital Signage Watchdog',
  description: 'Monitoring service for digital signage displays',
  script: join(__dirname, 'index.js'),
  nodeOptions: [],
  grow: 0.25,
  wait: 2,
  maxRestarts: 3
});

service.on('install', () => {
  service.start();
  console.log('Service installed and started');
});

service.on('error', (error) => {
  console.error('Service error:', error);
});

service.install();