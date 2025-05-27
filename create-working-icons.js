const fs = require('fs');
const path = require('path');

// Ensure the icons directory exists
const iconsDir = path.join(__dirname, 'assets', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Create a simple 16x16 PNG with a blue background and white "W"
function createTrayIcon() {
  // PNG file signature
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR chunk
  const width = 16;
  const height = 16;
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);     // Width
  ihdrData.writeUInt32BE(height, 4);    // Height
  ihdrData.writeUInt8(8, 8);            // Bit depth
  ihdrData.writeUInt8(2, 9);            // Color type (RGB)
  ihdrData.writeUInt8(0, 10);           // Compression
  ihdrData.writeUInt8(0, 11);           // Filter
  ihdrData.writeUInt8(0, 12);           // Interlace
  
  const ihdr = createChunk('IHDR', ihdrData);
  
  // Create image data (16x16 RGB pixels)
  const imageData = Buffer.alloc(width * height * 3); // RGB = 3 bytes per pixel
  
  // Fill with blue background and white "W" pattern
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 3;
      
      // Create a simple "W" pattern in white on blue background
      let isWhite = false;
      
      // Simple "W" pattern (very basic)
      if (y >= 4 && y <= 12) {
        if ((x === 3 || x === 12) && y >= 4 && y <= 10) isWhite = true;
        if ((x === 4 || x === 11) && y >= 8 && y <= 10) isWhite = true;
        if ((x === 5 || x === 10) && y >= 10 && y <= 12) isWhite = true;
        if ((x === 6 || x === 9) && y >= 10 && y <= 12) isWhite = true;
        if ((x === 7 || x === 8) && y === 12) isWhite = true;
      }
      
      if (isWhite) {
        imageData[offset] = 255;     // R
        imageData[offset + 1] = 255; // G
        imageData[offset + 2] = 255; // B
      } else {
        imageData[offset] = 0;       // R
        imageData[offset + 1] = 120; // G
        imageData[offset + 2] = 215; // B (Windows blue)
      }
    }
  }
  
  // Add filter bytes (0 for each row)
  const filteredData = Buffer.alloc(height * (width * 3 + 1));
  for (let y = 0; y < height; y++) {
    filteredData[y * (width * 3 + 1)] = 0; // Filter type 0 (None)
    imageData.copy(filteredData, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3);
  }
  
  // Compress the data (simple deflate)
  const zlib = require('zlib');
  const compressedData = zlib.deflateSync(filteredData);
  
  const idat = createChunk('IDAT', compressedData);
  
  // IEND chunk
  const iend = createChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdr, idat, iend]);
}

// Create a larger 32x32 icon for the main app
function createAppIcon() {
  // PNG file signature
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR chunk
  const width = 32;
  const height = 32;
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);     // Width
  ihdrData.writeUInt32BE(height, 4);    // Height
  ihdrData.writeUInt8(8, 8);            // Bit depth
  ihdrData.writeUInt8(2, 9);            // Color type (RGB)
  ihdrData.writeUInt8(0, 10);           // Compression
  ihdrData.writeUInt8(0, 11);           // Filter
  ihdrData.writeUInt8(0, 12);           // Interlace
  
  const ihdr = createChunk('IHDR', ihdrData);
  
  // Create image data (32x32 RGB pixels)
  const imageData = Buffer.alloc(width * height * 3); // RGB = 3 bytes per pixel
  
  // Fill with blue background and white "WD" pattern
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 3;
      
      // Create a simple "WD" pattern in white on blue background
      let isWhite = false;
      
      // "W" on the left side
      if (y >= 8 && y <= 24) {
        if ((x === 6 || x === 14) && y >= 8 && y <= 20) isWhite = true;
        if ((x === 7 || x === 13) && y >= 16 && y <= 20) isWhite = true;
        if ((x === 8 || x === 12) && y >= 20 && y <= 24) isWhite = true;
        if ((x === 9 || x === 11) && y >= 20 && y <= 24) isWhite = true;
        if (x === 10 && y === 24) isWhite = true;
      }
      
      // "D" on the right side
      if (y >= 8 && y <= 24) {
        if (x === 18 && y >= 8 && y <= 24) isWhite = true;
        if ((x === 19 || x === 20 || x === 21) && (y === 8 || y === 24)) isWhite = true;
        if (x === 22 && y >= 10 && y <= 22) isWhite = true;
        if ((x === 21) && (y === 10 || y === 22)) isWhite = true;
      }
      
      if (isWhite) {
        imageData[offset] = 255;     // R
        imageData[offset + 1] = 255; // G
        imageData[offset + 2] = 255; // B
      } else {
        imageData[offset] = 0;       // R
        imageData[offset + 1] = 120; // G
        imageData[offset + 2] = 215; // B (Windows blue)
      }
    }
  }
  
  // Add filter bytes (0 for each row)
  const filteredData = Buffer.alloc(height * (width * 3 + 1));
  for (let y = 0; y < height; y++) {
    filteredData[y * (width * 3 + 1)] = 0; // Filter type 0 (None)
    imageData.copy(filteredData, y * (width * 3 + 1) + 1, y * width * 3, (y + 1) * width * 3);
  }
  
  // Compress the data (simple deflate)
  const zlib = require('zlib');
  const compressedData = zlib.deflateSync(filteredData);
  
  const idat = createChunk('IDAT', compressedData);
  
  // IEND chunk
  const iend = createChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdr, idat, iend]);
}

// Helper function to create PNG chunks with proper CRC
function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  
  const typeBuffer = Buffer.from(type);
  const typeAndData = Buffer.concat([typeBuffer, data]);
  
  // Calculate CRC32
  const crc = calculateCRC32(typeAndData);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);
  
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

// Simple CRC32 calculation
function calculateCRC32(data) {
  const crcTable = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[i] = c;
  }
  
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc = crcTable[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Create the icons
try {
  const trayIcon = createTrayIcon();
  const appIcon = createAppIcon();
  
  // Write the files
  fs.writeFileSync(path.join(iconsDir, 'tray-icon.png'), trayIcon);
  fs.writeFileSync(path.join(iconsDir, 'icon.png'), appIcon);
  fs.writeFileSync(path.join(iconsDir, 'logo.png'), appIcon);
  
  console.log('Created working icons in:', iconsDir);
  console.log('Tray icon size:', trayIcon.length, 'bytes');
  console.log('App icon size:', appIcon.length, 'bytes');
} catch (error) {
  console.error('Error creating icons:', error);
} 