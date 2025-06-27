const https = require('https');

// Test GitHub API connection
function testGitHubConnection(owner, repo) {
  const url = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
  
  console.log(`\nTesting GitHub connection to: ${url}`);
  
  const options = {
    headers: {
      'User-Agent': 'Digital-Signage-Watchdog/1.0.0'
    }
  };
  
  https.get(url, options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 200) {
        const release = JSON.parse(data);
        console.log('✅ GitHub repository found!');
        console.log(`Latest release: ${release.tag_name}`);
        console.log(`Release name: ${release.name}`);
        console.log(`Published: ${release.published_at}`);
        console.log(`Assets:`, release.assets.map(asset => asset.name));
      } else if (res.statusCode === 404) {
        console.log(`❌ Repository not found: ${owner}/${repo}`);
        console.log('This could mean:');
        console.log('- Repository name is incorrect');
        console.log('- Repository is private');
        console.log('- Repository doesn\'t exist');
      } else {
        console.log(`❌ GitHub API error: ${res.statusCode}`);
        console.log('Response:', data);
      }
    });
  }).on('error', (err) => {
    console.log(`❌ Network error: ${err.message}`);
  });
}

// Test different possible repository configurations
console.log('Testing GitHub repository configurations...');

// Test the current configuration
testGitHubConnection('kiana71', 'watchdog-electron');

// Test with different possible names
setTimeout(() => testGitHubConnection('kiana71', 'Digital-Signage-Watchdog'), 1000);
setTimeout(() => testGitHubConnection('kiana71', 'digital-signage-watchdog'), 2000);
setTimeout(() => testGitHubConnection('kiana71', 'watchdog'), 3000); 