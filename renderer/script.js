// DOM Elements
const minimizeBtn = document.getElementById('minimize-btn');
const closeBtn = document.getElementById('close-btn');
const versionText = document.getElementById('version-text');

// Set version
versionText.textContent = `Version: ${window.api.getVersion()}`;

// Window control
minimizeBtn.addEventListener('click', () => {
  window.api.send('app-minimize');
});

closeBtn.addEventListener('click', () => {
  window.api.send('app-quit');
}); 