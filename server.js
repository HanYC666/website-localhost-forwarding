const express = require('express');
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 8080;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const caddyPath = path.join(__dirname, 'bin', 'caddy');
const caddyfilePath = path.join(__dirname, 'Caddyfile');

let caddyProcess = null;
let currentConfig = {
  running: false,
  target: '',
  port: ''
};

// Check if caddy binary exists
if (!fs.existsSync(caddyPath)) {
  console.error(`Caddy binary not found at ${caddyPath}. Please run npm install first.`);
}

function getCaddyStatus() {
  if (!caddyProcess) {
    return { running: false, target: '', port: '' };
  }
  return currentConfig;
}

function killCaddy() {
  return new Promise((resolve) => {
    if (!caddyProcess) {
      resolve();
      return;
    }

    console.log('Stopping Caddy...');
    // We send SIGTERM
    caddyProcess.kill('SIGTERM');

    const timeout = setTimeout(() => {
      if (caddyProcess) {
        console.log('Caddy did not stop. Sending SIGKILL...');
        caddyProcess.kill('SIGKILL');
      }
    }, 2000);

    caddyProcess.on('close', () => {
      clearTimeout(timeout);
      caddyProcess = null;
      currentConfig = { running: false, target: '', port: '' };
      console.log('Caddy stopped.');
      resolve();
    });
  });
}

app.get('/api/status', (req, res) => {
  res.json(getCaddyStatus());
});

app.post('/api/start', async (req, res) => {
  let { target, port } = req.body;

  if (!target || !port) {
    return res.status(400).json({ error: 'Target URL and port are required.' });
  }

  // Basic validation & formatting
  port = parseInt(port, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    return res.status(400).json({ error: 'Invalid port number.' });
  }

  // Ensure target has protocol
  if (!/^https?:\/\//i.test(target)) {
    target = 'https://' + target;
  }

  try {
    // 1. Kill any existing instance
    await killCaddy();

    // 2. Generate Caddyfile
    // header_up Host {upstream_hostport} is vital so the destination web server
    // knows which website we are requesting.
    const caddyfileContent = `http://127.0.0.1:${port} {
    reverse_proxy ${target} {
        header_up Host {upstream_hostport}
        header_up X-Real-IP {remote_host}
    }
}
`;
    fs.writeFileSync(caddyfilePath, caddyfileContent);

    // 3. Spawn Caddy
    console.log(`Starting Caddy proxy to ${target} on port ${port}...`);
    caddyProcess = spawn(caddyPath, ['run', '--config', caddyfilePath, '--adapter', 'caddyfile'], {
      cwd: __dirname,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let started = false;
    let startupError = '';

    caddyProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[Caddy STDOUT] ${output.trim()}`);
    });

    caddyProcess.stderr.on('data', (data) => {
      const output = data.toString();
      console.error(`[Caddy STDERR] ${output.trim()}`);
      if (output.includes('Error') || output.includes('failed')) {
        startupError += output;
      }
    });

    caddyProcess.on('error', (err) => {
      console.error('Failed to start Caddy process:', err);
      startupError = err.message;
    });

    // Wait a brief moment to ensure it didn't exit immediately on port conflict or bad config
    await new Promise((resolve) => setTimeout(resolve, 800));

    if (caddyProcess && caddyProcess.exitCode === null) {
      currentConfig = { running: true, target, port };
      res.json({ success: true, message: 'Proxy started successfully.', config: currentConfig });
    } else {
      res.status(500).json({ error: `Caddy failed to start. ${startupError || 'Port might already be in use.'}` });
      caddyProcess = null;
      currentConfig = { running: false, target: '', port: '' };
    }

  } catch (error) {
    console.error('Error starting proxy:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/stop', async (req, res) => {
  await killCaddy();
  res.json({ success: true, message: 'Proxy stopped.' });
});

// Ensure clean exit
process.on('SIGINT', async () => {
  await killCaddy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await killCaddy();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Proxy Manager Web UI running at http://localhost:${PORT}`);
});
