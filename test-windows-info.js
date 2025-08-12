import os from 'os';
import { exec } from 'child_process';
import { execSync } from 'child_process';

async function testWindowsInfo() {
  console.log('=== TESTING WINDOWS INFO DETECTION ===');
  console.log('Platform:', os.platform());
  console.log('Architecture:', os.arch());
  
  // Test the getDetailedWindowsInfo function logic
  async function getDetailedWindowsInfo() {
    try {
      console.log('=== GETTING DETAILED WINDOWS INFO ===');
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);
      
      // Get detailed Windows version information using PowerShell
      const command = `powershell -Command "Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, WindowsBuildLabEx, OsArchitecture | ConvertTo-Json"`;
      console.log('Executing PowerShell command:', command);
      
      const { stdout, stderr } = await execAsync(command);
      console.log('PowerShell stdout:', stdout);
      if (stderr) console.log('PowerShell stderr:', stderr);
      
      const windowsInfo = JSON.parse(stdout);
      console.log('Parsed Windows info:', windowsInfo);
      
      const result = {
        productName: windowsInfo.WindowsProductName,
        version: windowsInfo.WindowsVersion,
        buildLab: windowsInfo.WindowsBuildLabEx,
        architecture: windowsInfo.OsArchitecture
      };
      
      console.log('Returning detailed Windows info:', result);
      return result;
    } catch (error) {
      console.error('Error getting detailed Windows info:', error);
      console.error('Error stack:', error.stack);
      
      // Fallback: try simpler approach
      try {
        console.log('=== TRYING FALLBACK METHOD ===');
        const { exec } = require('child_process');
        const util = require('util');
        const execAsync = util.promisify(exec);
        
        // Try simpler commands
        const verCommand = 'ver';
        const { stdout: verOutput } = await execAsync(verCommand);
        console.log('Ver command output:', verOutput);
        
        // Extract version from ver command output
        const versionMatch = verOutput.match(/(\d+\.\d+\.\d+)/);
        const version = versionMatch ? versionMatch[1] : 'Unknown';
        
        // Try to get edition info from systeminfo (might be slower but more reliable)
        const sysInfoCommand = 'systeminfo | findstr /B /C:"OS Name"';
        const { stdout: sysOutput } = await execAsync(sysInfoCommand);
        console.log('Systeminfo output:', sysOutput);
        
        const osNameMatch = sysOutput.match(/OS Name:\s*(.+)/);
        const productName = osNameMatch ? osNameMatch[1].trim() : 'Windows';
        
        const fallbackResult = {
          productName: productName,
          version: version,
          buildLab: 'Not available',
          architecture: os.arch()
        };
        
        console.log('Returning fallback Windows info:', fallbackResult);
        return fallbackResult;
      } catch (fallbackError) {
        console.error('Fallback method also failed:', fallbackError);
        return null;
      }
    }
  }

  // Test if we're on Windows or simulating
  if (os.platform() === 'win32' || process.env.SIMULATE_WINDOWS === 'true') {
    console.log('Running Windows info detection...');
    const result = await getDetailedWindowsInfo();
    console.log('Final result:', result);
  } else {
    console.log('Not on Windows and not simulating. Result would be null.');
  }
  
  // Test some mock data for display
  console.log('\n=== TESTING MOCK DATA ===');
  const mockDetailedOsInfo = {
    productName: 'Windows 10 Pro',
    version: '10.0.19044',
    buildLab: '19044.2846.amd64fre.21h2_release.210604-1705',
    architecture: 'x64'
  };
  
  console.log('Mock Windows Version (productName):', mockDetailedOsInfo?.productName || 'Not available');
  console.log('Mock Windows Server (version):', mockDetailedOsInfo?.version || 'Not available');
}

// Run the test
testWindowsInfo().catch(console.error); 