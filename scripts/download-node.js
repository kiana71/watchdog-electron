const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const NODE_VERSION = 'v20.12.1'; // LTS version that exists
const PLATFORM = 'win';
const ARCH = 'x64';

const downloadUrl = `https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-${PLATFORM}-${ARCH}.zip`;
const runtimeDir = path.join(__dirname, '..', 'runtime');
const nodeDir = path.join(runtimeDir, `node-${PLATFORM}-${ARCH}`);
const zipFile = path.join(runtimeDir, `node-${NODE_VERSION}-${PLATFORM}-${ARCH}.zip`);
const extractedDir = path.join(runtimeDir, `node-${NODE_VERSION}-${PLATFORM}-${ARCH}`);

console.log('=== Downloading Node.js Runtime ===');
console.log(`Version: ${NODE_VERSION}`);
console.log(`Platform: ${PLATFORM}-${ARCH}`);

// Create runtime directory
if (!fs.existsSync(runtimeDir)) {
    fs.mkdirSync(runtimeDir, { recursive: true });
}

// Check if already downloaded
if (fs.existsSync(nodeDir)) {
    console.log('✅ Node.js runtime already exists, skipping download');
    process.exit(0);
}

console.log('📥 Downloading Node.js runtime...');
console.log(`URL: ${downloadUrl}`);

// Download function with progress
function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        
        https.get(url, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                // Handle redirect
                return downloadFile(response.headers.location, dest)
                    .then(resolve)
                    .catch(reject);
            }
            
            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                return;
            }

            const totalSize = parseInt(response.headers['content-length'], 10);
            let downloadedSize = 0;

            response.on('data', (chunk) => {
                downloadedSize += chunk.length;
                const percent = Math.round((downloadedSize / totalSize) * 100);
                process.stdout.write(`\r📥 Downloading... ${percent}% (${Math.round(downloadedSize / 1024 / 1024)}MB / ${Math.round(totalSize / 1024 / 1024)}MB)`);
            });

            response.pipe(file);

            file.on('finish', () => {
                file.close();
                console.log('\n✅ Download completed');
                resolve();
            });

            file.on('error', (err) => {
                fs.unlink(dest, () => {}); // Delete partial file
                reject(err);
            });
        }).on('error', reject);
    });
}

// Extract function using PowerShell (Windows built-in)
function extractZip(zipPath, extractTo) {
    console.log('📦 Extracting Node.js runtime...');
    
    try {
        // Use PowerShell to extract (available on all Windows)
        const command = `powershell -command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractTo}' -Force"`;
        execSync(command, { stdio: 'inherit' });
        console.log('✅ Extraction completed');
        
        // Move extracted files to expected location
        if (fs.existsSync(extractedDir) && !fs.existsSync(nodeDir)) {
            fs.renameSync(extractedDir, nodeDir);
            console.log(`📁 Moved to: ${nodeDir}`);
        }
        
        // Clean up zip file
        fs.unlinkSync(zipPath);
        console.log('🗑️ Cleaned up zip file');
        
    } catch (error) {
        console.error('❌ Extraction failed:', error.message);
        process.exit(1);
    }
}

// Main execution
async function main() {
    try {
        await downloadFile(downloadUrl, zipFile);
        extractZip(zipFile, runtimeDir);
        
        console.log('🎉 Node.js runtime setup completed!');
        console.log(`📁 Location: ${nodeDir}`);
        
    } catch (error) {
        console.error('❌ Failed to setup Node.js runtime:', error.message);
        process.exit(1);
    }
}

main(); 