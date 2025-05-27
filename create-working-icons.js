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
  
  // Create a modern watchdog/shield icon design
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 3;
      
      // Create a shield-like shape with an eye symbol (watchdog theme)
      let r = 45, g = 45, b = 45; // Dark background
      
      // Shield outline (rounded rectangle)
      const centerX = 8, centerY = 8;
      const shieldWidth = 10, shieldHeight = 12;
      
      // Check if we're inside the shield area
      const inShield = (x >= centerX - shieldWidth/2 && x <= centerX + shieldWidth/2 && 
                       y >= centerY - shieldHeight/2 && y <= centerY + shieldHeight/2);
      
      if (inShield) {
        // Shield background - gradient blue
        const distFromTop = y - (centerY - shieldHeight/2);
        const gradientFactor = distFromTop / shieldHeight;
        r = Math.floor(30 + gradientFactor * 40);  // 30-70
        g = Math.floor(100 + gradientFactor * 60); // 100-160
        b = Math.floor(200 + gradientFactor * 55); // 200-255
        
        // Eye symbol in the center
        const eyeCenterX = 8, eyeCenterY = 7;
        const distFromEyeCenter = Math.sqrt((x - eyeCenterX) ** 2 + (y - eyeCenterY) ** 2);
        
        // Outer eye (white)
        if (distFromEyeCenter <= 3.5) {
          r = 255; g = 255; b = 255;
        }
        
        // Inner eye (dark blue pupil)
        if (distFromEyeCenter <= 1.8) {
          r = 20; g = 40; b = 80;
        }
        
        // Eye highlight (small white dot)
        if (Math.sqrt((x - (eyeCenterX - 0.5)) ** 2 + (y - (eyeCenterY - 0.5)) ** 2) <= 0.7) {
          r = 255; g = 255; b = 255;
        }
        
        // Shield border (lighter blue)
        if (x === centerX - shieldWidth/2 || x === centerX + shieldWidth/2 || 
            y === centerY - shieldHeight/2 || y === centerY + shieldHeight/2) {
          r = Math.min(255, r + 60);
          g = Math.min(255, g + 60);
          b = Math.min(255, b + 30);
        }
      }
      
      // Add subtle corner rounding to shield
      const cornerDist = Math.min(
        Math.sqrt((x - (centerX - shieldWidth/2)) ** 2 + (y - (centerY - shieldHeight/2)) ** 2),
        Math.sqrt((x - (centerX + shieldWidth/2)) ** 2 + (y - (centerY - shieldHeight/2)) ** 2),
        Math.sqrt((x - (centerX - shieldWidth/2)) ** 2 + (y - (centerY + shieldHeight/2)) ** 2),
        Math.sqrt((x - (centerX + shieldWidth/2)) ** 2 + (y - (centerY + shieldHeight/2)) ** 2)
      );
      
      if (cornerDist > 1.5 && inShield) {
        // Fade out corners for rounded effect
        const alpha = Math.max(0, 1 - (cornerDist - 1.5) / 1);
        r = Math.floor(45 + (r - 45) * alpha);
        g = Math.floor(45 + (g - 45) * alpha);
        b = Math.floor(45 + (b - 45) * alpha);
      }
      
      imageData[offset] = r;
      imageData[offset + 1] = g;
      imageData[offset + 2] = b;
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
  
  // Create a larger, more detailed watchdog shield icon
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 3;
      
      // Create a professional shield with eye and "WD" text
      let r = 35, g = 35, b = 35; // Dark background
      
      // Shield outline (rounded rectangle)
      const centerX = 16, centerY = 16;
      const shieldWidth = 20, shieldHeight = 24;
      
      // Check if we're inside the shield area
      const inShield = (x >= centerX - shieldWidth/2 && x <= centerX + shieldWidth/2 && 
                       y >= centerY - shieldHeight/2 && y <= centerY + shieldHeight/2);
      
      if (inShield) {
        // Shield background - gradient blue
        const distFromTop = y - (centerY - shieldHeight/2);
        const gradientFactor = distFromTop / shieldHeight;
        r = Math.floor(25 + gradientFactor * 50);  // 25-75
        g = Math.floor(90 + gradientFactor * 80);  // 90-170
        b = Math.floor(180 + gradientFactor * 75); // 180-255
        
        // Eye symbol in the upper part
        const eyeCenterX = 16, eyeCenterY = 12;
        const distFromEyeCenter = Math.sqrt((x - eyeCenterX) ** 2 + (y - eyeCenterY) ** 2);
        
        // Outer eye (white)
        if (distFromEyeCenter <= 5) {
          r = 255; g = 255; b = 255;
        }
        
        // Inner eye (dark blue pupil)
        if (distFromEyeCenter <= 2.5) {
          r = 15; g = 30; b = 70;
        }
        
        // Eye highlight (small white dot)
        if (Math.sqrt((x - (eyeCenterX - 1)) ** 2 + (y - (eyeCenterY - 1)) ** 2) <= 1) {
          r = 255; g = 255; b = 255;
        }
        
        // "WD" text in the lower part
        // "W" 
        if (y >= 20 && y <= 26) {
          if ((x === 10 || x === 14) && y >= 20 && y <= 24) { r = 255; g = 255; b = 255; }
          if ((x === 11 || x === 13) && y >= 23 && y <= 24) { r = 255; g = 255; b = 255; }
          if (x === 12 && y === 26) { r = 255; g = 255; b = 255; }
        }
        
        // "D"
        if (y >= 20 && y <= 26) {
          if (x === 18 && y >= 20 && y <= 26) { r = 255; g = 255; b = 255; }
          if ((x === 19 || x === 20) && (y === 20 || y === 26)) { r = 255; g = 255; b = 255; }
          if (x === 21 && y >= 22 && y <= 24) { r = 255; g = 255; b = 255; }
        }
        
        // Shield border (lighter blue)
        if (x === centerX - shieldWidth/2 || x === centerX + shieldWidth/2 || 
            y === centerY - shieldHeight/2 || y === centerY + shieldHeight/2) {
          r = Math.min(255, r + 80);
          g = Math.min(255, g + 80);
          b = Math.min(255, b + 40);
        }
      }
      
      // Add corner rounding to shield
      const cornerDist = Math.min(
        Math.sqrt((x - (centerX - shieldWidth/2)) ** 2 + (y - (centerY - shieldHeight/2)) ** 2),
        Math.sqrt((x - (centerX + shieldWidth/2)) ** 2 + (y - (centerY - shieldHeight/2)) ** 2),
        Math.sqrt((x - (centerX - shieldWidth/2)) ** 2 + (y - (centerY + shieldHeight/2)) ** 2),
        Math.sqrt((x - (centerX + shieldWidth/2)) ** 2 + (y - (centerY + shieldHeight/2)) ** 2)
      );
      
      if (cornerDist > 2.5 && inShield) {
        // Fade out corners for rounded effect
        const alpha = Math.max(0, 1 - (cornerDist - 2.5) / 2);
        r = Math.floor(35 + (r - 35) * alpha);
        g = Math.floor(35 + (g - 35) * alpha);
        b = Math.floor(35 + (b - 35) * alpha);
      }
      
      imageData[offset] = r;
      imageData[offset + 1] = g;
      imageData[offset + 2] = b;
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