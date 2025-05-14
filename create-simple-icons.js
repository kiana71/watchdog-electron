const fs = require('fs');
const path = require('path');

// Ensure the icons directory exists
const iconsDir = path.join(__dirname, 'assets', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Simple 16x16 blue square for tray icon (RGBA values)
const trayIconData = Buffer.from([
  // 16x16 pixels, RGBA format (each pixel is 4 bytes)
  // This creates a blue square with a white "W" in the middle
  // Row 1
  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,
  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,
  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,
  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,
  // Row 2
  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,
  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,
  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,
  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,
  // Row 3
  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,
  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,
  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,
  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,
  // Row 4
  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,
  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,
  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,
  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,
  // Row 5
  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,
  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,
  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,
  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,
  // Row 6
  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,
  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,
  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,
  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,  0, 120, 215, 255,
  // Rows 7-16 (repeating the same pattern)
  // ...simplified for brevity
]);

// Create a simple PNG file structure for a 16x16 blue square
function createSimplePNG() {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk (Image Header) - 16x16 pixels, 8-bit RGB
  const width = Buffer.alloc(4);
  width.writeUInt32BE(16, 0);
  const height = Buffer.alloc(4);
  height.writeUInt32BE(16, 0);
  
  const ihdrData = Buffer.concat([
    width,                        // Width: 16
    height,                       // Height: 16
    Buffer.from([8]),            // Bit depth: 8 bits
    Buffer.from([6]),            // Color type: RGBA
    Buffer.from([0]),            // Compression: deflate
    Buffer.from([0]),            // Filter: standard
    Buffer.from([0])             // Interlace: none
  ]);
  
  const ihdrChunk = createPNGChunk('IHDR', ihdrData);
  
  // IDAT chunk placeholder (we'll use a very simple blue square)
  // This should be compressed with zlib in a real implementation
  // For simplicity, we're using a minimal representation here
  const idatData = Buffer.from([
    120, 156, 99, 96, 96, 96, 128, 0, 0, 0, 6, 0, 3
  ]); // A minimal zlib compressed blue block
  
  const idatChunk = createPNGChunk('IDAT', idatData);
  
  // IEND chunk (end of PNG)
  const iendChunk = createPNGChunk('IEND', Buffer.alloc(0));
  
  // Concatenate all chunks to form the PNG file
  return Buffer.concat([
    signature,
    ihdrChunk,
    idatChunk,
    iendChunk
  ]);
}

// Helper function to create PNG chunks
function createPNGChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  
  const typeBuffer = Buffer.from(type);
  
  // CRC calculation (simplified)
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(0, 0); // Placeholder CRC
  
  return Buffer.concat([length, typeBuffer, data, crc]);
}

// Create a minimal PNG file for each icon
try {
  // Since creating a proper PNG is complex without libraries,
  // we'll create a minimal version just to have non-empty files
  const minimalPNG = createSimplePNG();
  
  // Write the files
  fs.writeFileSync(path.join(iconsDir, 'tray-icon.png'), minimalPNG);
  fs.writeFileSync(path.join(iconsDir, 'icon.png'), minimalPNG);
  fs.writeFileSync(path.join(iconsDir, 'logo.png'), minimalPNG);
  
  console.log('Created placeholder icons in:', iconsDir);
  console.log('These are minimal PNG files - replace with real icons when available.');
} catch (error) {
  console.error('Error creating icons:', error);
} 