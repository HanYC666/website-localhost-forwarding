const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const binDir = path.join(__dirname, '..', 'bin');
const caddyPath = path.join(binDir, 'caddy');

// Map Node's platform and arch to Caddy's naming conventions
const platformMap = {
  darwin: 'darwin',
  linux: 'linux'
};

const archMap = {
  x64: 'amd64',
  arm64: 'arm64'
};

const os = platformMap[process.platform];
const arch = archMap[process.arch];

if (!os || !arch) {
  console.error(`Unsupported platform/architecture: ${process.platform}/${process.arch}`);
  process.exit(1);
}

const downloadUrl = `https://caddyserver.com/api/download?os=${os}&arch=${arch}`;

if (!fs.existsSync(binDir)) {
  fs.mkdirSync(binDir, { recursive: true });
}

console.log(`Downloading Caddy for ${os}/${arch}...`);
console.log(`URL: ${downloadUrl}`);

const file = fs.createWriteStream(caddyPath);

function download(url) {
  https.get(url, (response) => {
    // Handle redirects
    if (response.statusCode === 302 || response.statusCode === 301 || response.statusCode === 307 || response.statusCode === 308) {
      download(response.headers.location);
      return;
    }

    if (response.statusCode !== 200) {
      console.error(`Download failed. Status code: ${response.statusCode}`);
      process.exit(1);
    }

    response.pipe(file);

    file.on('finish', () => {
      file.close(() => {
        console.log('Download completed. Setting permissions...');
        try {
          fs.chmodSync(caddyPath, 0o755);
          console.log(`Caddy is ready at: ${caddyPath}`);
          // Print Caddy version to verify it works
          const version = execSync(`"${caddyPath}" version`).toString().trim();
          console.log(`Successfully verified Caddy: ${version}`);
        } catch (err) {
          console.error('Failed to set executable permissions or verify Caddy:', err.message);
          process.exit(1);
        }
      });
    });
  }).on('error', (err) => {
    fs.unlink(caddyPath, () => {});
    console.error(`Error downloading Caddy: ${err.message}`);
    process.exit(1);
  });
}

download(downloadUrl);
