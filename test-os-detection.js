const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Copy the improved getOsInfo function
function getOsInfo() {
  const platform = os.platform();
  const release = os.release();
  const type = os.type();
  
  // Format OS information based on platform
  if (platform === 'win32') {
    // Windows platform - use build number for exact version detection
    const buildNumber = parseInt(release.split('.')[2]) || 0;
    
    // Windows version mapping using build numbers
    const winVersion = {
      // Windows 11 builds (22000+)
      '22000': 'Windows 11 21H2',
      '22621': 'Windows 11 22H2',
      '22631': 'Windows 11 23H2',
      '26040': 'Windows 11 24H2',
      
      // Windows 10 builds (10240-19045)
      '10240': 'Windows 10 1507',
      '10586': 'Windows 10 1511',
      '14393': 'Windows 10 1607',
      '15063': 'Windows 10 1703',
      '16299': 'Windows 10 1709',
      '17134': 'Windows 10 1803',
      '17763': 'Windows 10 1809',
      '18362': 'Windows 10 1903',
      '18363': 'Windows 10 1909',
      '19041': 'Windows 10 2004',
      '19042': 'Windows 10 20H2',
      '19043': 'Windows 10 21H1',
      '19044': 'Windows 10 21H2',
      '19045': 'Windows 10 22H2',
      
      // Legacy Windows versions
      '9200': 'Windows 8',
      '9600': 'Windows 8.1',
      '7601': 'Windows 7 SP1',
      '7600': 'Windows 7',
      '6002': 'Windows Vista SP2',
      '6001': 'Windows Vista SP1',
      '6000': 'Windows Vista',
      '3790': 'Windows XP x64',
      '2600': 'Windows XP'
    };
    
    // Try to get exact version from build number
    if (winVersion[buildNumber.toString()]) {
      return winVersion[buildNumber.toString()];
    }
    
    // Fallback: determine Windows 10 vs 11 based on build number
    if (buildNumber >= 22000) {
      return `Windows 11 (Build ${buildNumber})`;
    } else if (buildNumber >= 10240) {
      return `Windows 10 (Build ${buildNumber})`;
    } else {
      return `Windows (Build ${buildNumber})`;
    }
    
  } else if (platform === 'darwin') {
    // macOS platform
    const macVersions = {
      '22': 'macOS Ventura',
      '21': 'macOS Monterey',
      '20': 'macOS Big Sur',
      '19': 'macOS Catalina',
      '18': 'macOS Mojave',
      '17': 'macOS High Sierra',
    };
    
    const majorVersion = release.split('.')[0];
    return macVersions[majorVersion] || `macOS (${release})`;
  } else if (platform === 'linux') {
    // Linux platform - would use more specific detection in production
    return `${type} (${release})`;
  } else {
    return `${type} ${platform} (${release})`;
  }
}

// Copy the getDetailedWindowsInfo function
async function getDetailedWindowsInfo() {
  try {
    // Get detailed Windows version information using PowerShell
    const command = `powershell -Command "Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, WindowsBuildLabEx, OsArchitecture | ConvertTo-Json"`;
    
    const { stdout } = await execAsync(command);
    const windowsInfo = JSON.parse(stdout);
    
    return {
      productName: windowsInfo.WindowsProductName,
      version: windowsInfo.WindowsVersion,
      buildLab: windowsInfo.WindowsBuildLabEx,
      architecture: windowsInfo.OsArchitecture
    };
  } catch (error) {
    console.error('Error getting detailed Windows info:', error);
    return null;
  }
}

// Test the OS detection
async function testOsDetection() {
  console.log('=== OS Detection Test ===');
  console.log('Platform:', os.platform());
  console.log('Release:', os.release());
  console.log('Type:', os.type());
  console.log('Hostname:', os.hostname());
  
  console.log('\n=== Basic OS Info ===');
  const basicOsInfo = getOsInfo();
  console.log('Detected OS:', basicOsInfo);
  
  if (os.platform() === 'win32') {
    console.log('\n=== Detailed Windows Info ===');
    const detailedInfo = await getDetailedWindowsInfo();
    if (detailedInfo) {
      console.log('Product Name:', detailedInfo.productName);
      console.log('Version:', detailedInfo.version);
      console.log('Build Lab:', detailedInfo.buildLab);
      console.log('Architecture:', detailedInfo.architecture);
    } else {
      console.log('Failed to get detailed Windows info');
    }
  }
  
  console.log('\n=== Test Complete ===');
}

// Run the test
testOsDetection().catch(console.error); 