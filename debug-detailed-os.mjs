import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

async function getDetailedWindowsInfo() {
  try {
    // Get detailed Windows version information using PowerShell
    const command = `powershell -Command "Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion, WindowsBuildLabEx, OsArchitecture | ConvertTo-Json"`;
    
    console.log('Running command:', command);
    const { stdout } = await execAsync(command);
    console.log('Raw PowerShell output:', stdout);
    
    const windowsInfo = JSON.parse(stdout);
    console.log('Parsed Windows info:', windowsInfo);
    
    const result = {
      productName: windowsInfo.WindowsProductName,
      version: windowsInfo.WindowsVersion,
      buildLab: windowsInfo.WindowsBuildLabEx,
      architecture: windowsInfo.OsArchitecture
    };
    
    console.log('Final result object:', result);
    return result;
  } catch (error) {
    console.error('Error getting detailed Windows info:', error);
    return null;
  }
}

async function testDetailedOsInfo() {
  console.log('=== Testing Detailed Windows OS Info ===');
  console.log('Platform:', os.platform());
  
  if (os.platform() === 'win32') {
    console.log('Running Windows - testing detailed info...');
    const detailedInfo = await getDetailedWindowsInfo();
    
    if (detailedInfo) {
      console.log('\n✅ Success! Detailed Windows info:');
      console.log('- Product Name:', detailedInfo.productName);
      console.log('- Version:', detailedInfo.version);
      console.log('- Build Lab:', detailedInfo.buildLab);
      console.log('- Architecture:', detailedInfo.architecture);
      
      console.log('\n📤 This is what would be sent to dashboard:');
      console.log('detailedOsInfo:', JSON.stringify(detailedInfo, null, 2));
    } else {
      console.log('❌ Failed to get detailed Windows info');
    }
  } else {
    console.log('Not running on Windows - skipping test');
  }
  
  console.log('\n=== Test Complete ===');
}

testDetailedOsInfo().catch(console.error); 