// DOM Elements
const minimizeBtn = document.getElementById('minimize-btn');
const closeBtn = document.getElementById('close-btn');
const versionText = document.getElementById('version-text');
const configInput = document.getElementById('config-input');
const saveBtn = document.getElementById('save-btn');

// Set version - with fallback if API isn't available
try {
  if (window.api && typeof window.api.getVersion === 'function') {
    versionText.textContent = `Version: ${window.api.getVersion()}`;
  } else {
    console.warn('API not available, using default version');
    versionText.textContent = 'Version: 1.0.0';
  }
} catch (error) {
  console.error('Error setting version:', error);
  versionText.textContent = 'Version: 1.0.0';
}

// Load saved client name on startup
document.addEventListener('DOMContentLoaded', () => {
  if (window.api && typeof window.api.send === 'function') {
    // Request the saved client name from main process
    window.api.send('get-client-name');
  }
});

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
    window.api.send('app-quit');
  } else {
    console.warn('API not available for quit');
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