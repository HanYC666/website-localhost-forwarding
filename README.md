# Website Localhost Forwarding

A sleek, self-contained web app to forward any website to a local port on your machine — powered by [Caddy Server](https://caddyserver.com/) and controlled through a modern dark-mode dashboard.

![Dashboard UI](public/screenshot.png)

## Features

- 🌐 **Reverse proxy any URL** to a local port (e.g. `https://example.com` → `localhost:5000`)
- 💻 **Cross-platform**: works on macOS and Linux (x64 & arm64)
- 📦 **Zero manual server setup**: Caddy is auto-downloaded on `npm install`
- 🎨 **Premium UI**: glassmorphism dark-mode dashboard with live status polling
- 🔌 **REST API**: programmable control via simple HTTP endpoints

## Requirements

- [Node.js](https://nodejs.org/) v16 or newer
- `npm`
- Internet connection (for the initial Caddy binary download)

## Quick Start

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd website-localhost-forwarding

# 2. Install dependencies (auto-downloads Caddy binary for your OS)
npm install

# 3. Start the manager
npm start
```

Then open your browser at **http://localhost:8080**.

## Usage

1. Enter a **Target Website** URL (e.g. `https://example.com`)
2. Enter your desired **Local Port** (e.g. `5000`)
3. Click **Start Proxy**
4. Browse to `http://localhost:<port>` — the site is forwarded locally
5. Click **Stop Proxy** when done

## REST API

The manager exposes a simple API on port `8080`:

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| `GET` | `/api/status` | — | Get current proxy status |
| `POST` | `/api/start` | `{ "target": "https://...", "port": "5000" }` | Start the proxy |
| `POST` | `/api/stop` | — | Stop the proxy |

**Example:**

```bash
# Start a proxy
curl -X POST http://localhost:8080/api/start \
  -H "Content-Type: application/json" \
  -d '{"target":"https://example.com","port":"5050"}'

# Check status
curl http://localhost:8080/api/status

# Stop
curl -X POST http://localhost:8080/api/stop
```

## Project Structure

```
.
├── bin/                   # Auto-downloaded Caddy binary (git-ignored)
├── public/
│   ├── index.html         # Dashboard UI
│   ├── style.css          # Dark-mode styles & animations
│   └── app.js             # Frontend logic & API client
├── scripts/
│   └── setup-caddy.js     # Detects OS/Arch, downloads Caddy on postinstall
├── server.js              # Express backend & Caddy process manager
├── Caddyfile              # Dynamically generated per proxy session (git-ignored)
└── package.json
```

## Limitations

- Some websites (e.g. Google, Netflix) enforce strict **CORS / Content Security Policies** that prevent assets from loading when the `Host` doesn't match their origin. This is a browser security feature, not a bug in the proxy.
- The proxy uses **HTTP** only (no TLS on the local listener). Your browser may show a "Not Secure" warning for the local URL — this is expected and safe for local development use.

## How It Works

1. On `npm install`, `scripts/setup-caddy.js` detects your OS and CPU architecture and downloads the correct Caddy binary from the official Caddy API into `bin/`.
2. `npm start` launches an Express server on port `8080` that serves the web UI.
3. When you click **Start Proxy**, the backend writes a `Caddyfile` with your chosen target and port, then spawns Caddy as a child process.
4. Caddy handles all the reverse-proxying — including connection reuse, header forwarding, and graceful shutdown.
5. When you click **Stop Proxy**, the backend sends `SIGTERM` to Caddy.

## License

MIT
