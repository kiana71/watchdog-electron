// DOM Elements
const minimizeBtn = document.getElementById('minimize-btn');
const closeBtn = document.getElementById('close-btn');
const versionText = document.getElementById('version-text');
const configInput = document.getElementById('config-input');
const saveBtn = document.getElementById('save-btn');
const updateBtn = document.getElementById('restart-btn'); // Actually the update button

// Update button state management
let updateButtonState = {
  isUpdateReady: false,
  isInstalling: false,
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
  
  // Reset update button to normal state on startup
  resetUpdateButton();
});

// Function to reset update button to normal state
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
}

// Listen for saved client name from main process
if (window.api && typeof window.api.receive === 'function') {
  window.api.receive('client-name-loaded', (clientName) => {
    if (clientName && configInput) {
      configInput.value = clientName;
      console.log(`Loaded saved client name: ${clientName}`);
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
    
    switch (statusData.status) {
      case 'checking':
        updateBtn.title = 'Checking for updates...';
        updateBtn.style.opacity = '0.6';
        if (updateBtnSvg) updateBtnSvg.style.color = updateButtonState.normalColor;
        updateButtonState.isInstalling = false;
        break;
      case 'available':
        // Start download automatically when update is available
        window.api.send('download-update');
        updateBtn.title = 'Downloading update...';
        updateBtn.style.opacity = '0.8';
        if (updateBtnSvg) updateBtnSvg.style.color = updateButtonState.normalColor;
        updateButtonState.isInstalling = true;
        break;
      case 'not-available':
        updateBtn.title = 'Check for updates';
        updateBtn.style.opacity = '1';
        if (updateBtnSvg) {
          updateBtnSvg.style.color = updateButtonState.normalColor;
          updateBtnSvg.classList.remove('update-ready');
        }
        updateButtonState.isInstalling = false;
        updateButtonState.isUpdateReady = false;
        break;
      case 'downloading':
        updateBtn.title = `Downloading... ${Math.round(statusData.progress || 0)}%`;
        updateBtn.style.opacity = '0.8';
        if (updateBtnSvg) updateBtnSvg.style.color = updateButtonState.normalColor;
        updateButtonState.isInstalling = true;
        break;
      case 'downloaded':
        updateBtn.title = 'Update is ready';
        updateBtn.style.opacity = '1';
        if (updateBtnSvg) {
          updateBtnSvg.style.color = '#ef4444'; // Red
          updateBtnSvg.classList.add('update-ready'); // Add pulsing animation
        }
        updateButtonState.isUpdateReady = true;
        updateButtonState.isInstalling = false;
        break;
      case 'error':
        updateBtn.title = `Error: ${statusData.error}`;
        updateBtn.style.opacity = '1';
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
        break;
      default:
        updateBtn.title = 'Check for updates';
        updateBtn.style.opacity = '1';
        if (updateBtnSvg) {
          updateBtnSvg.style.color = updateButtonState.normalColor;
          updateBtnSvg.classList.remove('update-ready');
        }
        updateButtonState.isInstalling = false;
        updateButtonState.isUpdateReady = false;
    }
  });
}