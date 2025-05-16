// DOM Elements
const minimizeBtn = document.getElementById('minimize-btn');
const closeBtn = document.getElementById('close-btn');
const versionText = document.getElementById('version-text');

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