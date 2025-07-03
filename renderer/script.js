// DOM Elements
const minimizeBtn = document.getElementById('minimize-btn');
const closeBtn = document.getElementById('close-btn');
const versionText = document.getElementById('version-text');
const configInput = document.getElementById('config-input');
const saveBtn = document.getElementById('save-btn');
const updateBtn = document.getElementById('restart-btn'); // Actually the update button
const toggleInput = document.getElementById('checkbox'); // Auto update toggle

// Update button state management
let updateButtonState = {
  isUpdateReady: false,
  isInstalling: false,
  hasUpdateDetected: false, // Track if update was detected
  normalColor: '#a0a0a0' // Default color
};

// Set version - with fallback if API isn't available
try {
  if (window.api && typeof window.api.getVersion === 'function') {
    versionText.textContent = `Version: ${window.api.getVersion()}`;
  } else {
    console.warn('API not available, using default version');
    versionText.textContent = 'Version: 1.0.7';
  }
} catch (error) {
  console.error('Error setting version:', error);
  versionText.textContent = 'Version: 1.0.7';
}

// Load saved client name on startup
document.addEventListener('DOMContentLoaded', () => {
  if (window.api && typeof window.api.send === 'function') {
    // Request the saved client name from main process
    window.api.send('get-client-name');
    // Request the saved auto update setting from main process
    window.api.send('get-auto-update-setting');
  }
  
  // Set computer name directly
  if (window.api && typeof window.api.getComputerName === 'function') {
    const computerNameElement = document.querySelector('.computer-Name');
    if (computerNameElement) {
      const computerName = window.api.getComputerName();
      computerNameElement.textContent = `Host Name: ${computerName}`;
      console.log(`Loaded computer name: ${computerName}`);
    }
  }
  
  // Don't reset update button on startup - let it maintain its state
  // The main process will send update status if an update is available
});

// Function to reset update button to normal state (only for manual checks)
function resetUpdateButton() {
  const updateBtnSvg = updateBtn.querySelector('svg');
  if (updateBtnSvg) {
    updateBtnSvg.style.color = updateButtonState.normalColor;
    updateBtnSvg.classList.remove('update-ready');
  }
  updateBtn.title = 'Check for updates';
  updateBtn.style.opacity = '1';
  updateButtonState.isUpdateReady = false;
  updateButtonState.isInstalling = false;
  updateButtonState.hasUpdateDetected = false;
}

// Listen for saved client name from main process
if (window.api && typeof window.api.receive === 'function') {
  window.api.receive('client-name-loaded', (clientName) => {
    if (clientName && configInput) {
      configInput.value = clientName;
      console.log(`Loaded saved client name: ${clientName}`);
    }
  });
  
  // Listen for saved auto update setting from main process
  window.api.receive('auto-update-setting-loaded', (enabled) => {
    if (toggleInput) {
      toggleInput.checked = enabled;
      console.log(`Loaded saved auto update setting: ${enabled}`);
    }
  });
}

// Window control with safety checks
minimizeBtn.addEventListener('click', () => {
  if (window.api && typeof window.api.send === 'function') {
    window.api.send('app-minimize');
  } else {
    console.warn('API not available for minimize');
  }
});

closeBtn.addEventListener('click', () => {
  if (window.api && typeof window.api.send === 'function') {
    // Hide to tray instead of quitting
    window.api.send('app-minimize');
  } else {
    console.warn('API not available for minimize');
  }
});

// Save client name functionality
saveBtn.addEventListener('click', () => {
  const clientName = configInput.value.trim();
  
  if (!clientName) {
    alert('Please enter a client name');
    return;
  }
  
  if (window.api && typeof window.api.send === 'function') {
    // Send the client name to the main process
    window.api.send('save-client-name', clientName);
    
    // Show success feedback
    saveBtn.textContent = 'Saved!';
    saveBtn.style.backgroundColor = '#10b981';
    
    // Reset button after 2 seconds
    setTimeout(() => {
      saveBtn.textContent = 'Save Changes';
      saveBtn.style.backgroundColor = '#22c55e';
    }, 2000);
  } else {
    console.warn('API not available for save');
    alert('Unable to save client name');
  }
});

// Auto update toggle functionality
toggleInput.addEventListener('change', (e) => {
  const enabled = e.target.checked;
  console.log('Auto update setting changed:', enabled);
  
  if (window.api && typeof window.api.send === 'function') {
    // Send the auto update setting to the main process
    window.api.send('set-auto-update', enabled);
    
    // Show feedback
    if (enabled) {
      console.log('Auto update enabled');
    } else {
      console.log('Auto update disabled');
    }
  } else {
    console.warn('API not available for auto update setting');
  }
});

// Update button functionality
updateBtn.addEventListener('click', () => {
  if (window.api && typeof window.api.send === 'function') {
    // Check if we're in update ready state
    if (updateButtonState.isUpdateReady) {
      // Show confirmation alert
      const confirmed = confirm('Do you want to install the update?');
      if (confirmed) {
        window.api.send('install-update');
        updateBtn.title = 'Installing update...';
        updateBtn.style.opacity = '0.6';
        updateButtonState.isInstalling = true;
        updateButtonState.hasUpdateDetected = false; // Reset the flag when installing
        
        // Reset button color immediately when installing starts
        const updateBtnSvg = updateBtn.querySelector('svg');
        if (updateBtnSvg) {
          updateBtnSvg.style.color = updateButtonState.normalColor;
          updateBtnSvg.classList.remove('update-ready');
        }
      }
    } else {
      // Normal check for updates
      updateBtn.style.opacity = '0.6';
      updateBtn.title = 'Checking for updates...';
      window.api.send('check-for-updates');
    }
  } else {
    console.warn('API not available for update check');
    alert('Unable to check for updates');
  }
});

// Listen for update status from main process
if (window.api && typeof window.api.receive === 'function') {
  window.api.receive('update-status', (statusData) => {
    console.log('Update status received:', statusData);
    // Get the SVG inside the update button
    const updateBtnSvg = updateBtn.querySelector('svg');
    
    // Check if auto update is enabled to determine behavior
    const autoUpdateEnabled = toggleInput ? toggleInput.checked : false;
    
    switch (statusData.status) {
      case 'checking':
        updateBtn.title = 'Checking for updates...';
        updateBtn.style.opacity = '0.6';
        if (updateBtnSvg) updateBtnSvg.style.color = updateButtonState.normalColor;
        updateButtonState.isInstalling = false;
        break;
      case 'available':
        // Mark that an update was detected
        updateButtonState.hasUpdateDetected = true;
        
        if (autoUpdateEnabled) {
          // Auto update mode: download silently without changing button appearance
          window.api.send('download-update');
          console.log('Auto update: downloading update silently');
        } else {
          // Manual mode: show download progress on button
          window.api.send('download-update');
          updateBtn.title = 'Downloading update...';
          updateBtn.style.opacity = '0.8';
          if (updateBtnSvg) updateBtnSvg.style.color = updateButtonState.normalColor;
          updateButtonState.isInstalling = true;
        }
        break;
      case 'not-available':
        // Only reset to gray if no update was previously detected
        if (!updateButtonState.hasUpdateDetected) {
          updateBtn.title = 'Check for updates';
          updateBtn.style.opacity = '1';
          if (updateBtnSvg) {
            updateBtnSvg.style.color = updateButtonState.normalColor;
            updateBtnSvg.classList.remove('update-ready');
          }
          updateButtonState.isInstalling = false;
          updateButtonState.isUpdateReady = false;
        } else {
          // If update was previously detected, keep the button red and ready
          updateBtn.title = 'Update is ready';
          updateBtn.style.opacity = '1';
          if (updateBtnSvg) {
            updateBtnSvg.style.color = '#ef4444'; // Red
            updateBtnSvg.classList.add('update-ready');
          }
          updateButtonState.isUpdateReady = true;
          updateButtonState.isInstalling = false;
        }
        break;
      case 'downloading':
        if (autoUpdateEnabled) {
          // Auto update mode: download silently without changing button appearance
          console.log(`Auto update: downloading progress ${Math.round(statusData.progress || 0)}%`);
        } else {
          // Manual mode: show download progress on button
          updateBtn.title = `Downloading... ${Math.round(statusData.progress || 0)}%`;
          updateBtn.style.opacity = '0.8';
          if (updateBtnSvg) updateBtnSvg.style.color = updateButtonState.normalColor;
          updateButtonState.isInstalling = true;
        }
        break;
      case 'auto-installing':
        // Auto update mode: installing silently - no UI changes needed
        console.log('Auto update: installing update silently');
        break;
      case 'downloaded':
        // Always show update ready state for manual button, regardless of auto-update setting
        // This ensures the manual button always turns red when update is ready
        updateBtn.title = 'Update is ready';
        updateBtn.style.opacity = '1';
        if (updateBtnSvg) {
          updateBtnSvg.style.color = '#ef4444'; // Red
          updateBtnSvg.classList.add('update-ready'); // Add pulsing animation
        }
        updateButtonState.isUpdateReady = true;
        updateButtonState.isInstalling = false;
        
        // Log auto-update status for debugging
        if (autoUpdateEnabled) {
          console.log('Auto update: update downloaded, will be installed automatically');
        } else {
          console.log('Manual mode: update downloaded, waiting for user confirmation');
        }
        break;
      case 'error':
        if (autoUpdateEnabled) {
          // Auto update mode: log error silently, no UI changes
          console.error('Auto update error:', statusData.error);
        } else {
          // Manual mode: show error on button
          updateBtn.title = `Error: ${statusData.error}`;
          updateBtn.style.opacity = '1';
          // Only reset to gray if no update was previously detected
          if (!updateButtonState.hasUpdateDetected) {
            if (updateBtnSvg) {
              updateBtnSvg.style.color = updateButtonState.normalColor;
              updateBtnSvg.classList.remove('update-ready');
            }
            updateButtonState.isInstalling = false;
            updateButtonState.isUpdateReady = false;
            console.error('Update error:', statusData.error);
            // Reset color after 5 seconds
            setTimeout(() => {
              if (updateBtnSvg) {
                updateBtnSvg.style.color = updateButtonState.normalColor;
                updateBtnSvg.classList.remove('update-ready');
              }
            }, 5000);
          } else {
            // If update was previously detected, keep the button red and ready
            if (updateBtnSvg) {
              updateBtnSvg.style.color = '#ef4444'; // Red
              updateBtnSvg.classList.add('update-ready');
            }
            updateButtonState.isUpdateReady = true;
            updateButtonState.isInstalling = false;
          }
        }
        break;
      default:
        if (autoUpdateEnabled) {
          // Auto update mode: no UI changes for unknown status
          console.log('Auto update: unknown status received:', statusData.status);
        } else {
          // Manual mode: handle unknown status
          // Only reset to gray if no update was previously detected
          if (!updateButtonState.hasUpdateDetected) {
            updateBtn.title = 'Check for updates';
            updateBtn.style.opacity = '1';
            if (updateBtnSvg) {
              updateBtnSvg.style.color = updateButtonState.normalColor;
              updateBtnSvg.classList.remove('update-ready');
            }
            updateButtonState.isInstalling = false;
            updateButtonState.isUpdateReady = false;
          } else {
            // If update was previously detected, keep the button red and ready
            updateBtn.title = 'Update is ready';
            updateBtn.style.opacity = '1';
            if (updateBtnSvg) {
              updateBtnSvg.style.color = '#ef4444'; // Red
              updateBtnSvg.classList.add('update-ready');
            }
            updateButtonState.isUpdateReady = true;
            updateButtonState.isInstalling = false;
          }
        }
    }
  });
}