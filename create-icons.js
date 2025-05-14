const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Ensure the icons directory exists
const iconsDir = path.join(__dirname, 'assets', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Create tray icon (16x16)
function createTrayIcon() {
  const size = 16;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Fill background
  ctx.fillStyle = '#0078D7';
  ctx.fillRect(0, 0, size, size);

  // Draw "W" letter
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('W', size/2, size/2);

  // Save the image
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(iconsDir, 'tray-icon.png'), buffer);
  console.log('Created tray-icon.png');
}

// Create app icon (256x256)
function createAppIcon() {
  const size = 256;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Fill background with gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#0078D7');
  gradient.addColorStop(1, '#005A9E');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Draw "WD" text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 120px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('WD', size/2, size/2);

  // Save the image
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(iconsDir, 'icon.png'), buffer);
  console.log('Created icon.png');
}

// Create logo (40x40)
function createLogo() {
  const size = 40;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Fill background
  ctx.fillStyle = '#0078D7';
  ctx.fillRect(0, 0, size, size);

  // Draw "WD" text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('WD', size/2, size/2);

  // Save the image
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(iconsDir, 'logo.png'), buffer);
  console.log('Created logo.png');
}

// Create all icons
try {
  createTrayIcon();
  createAppIcon();
  createLogo();
  console.log('All icons created successfully!');
} catch (error) {
  console.error('Error creating icons:', error);
} 