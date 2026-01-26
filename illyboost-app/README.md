# IllyBoost App

IllyBoost is a local control panel for launching browser sessions on remote agents (VMs) and monitoring per-URL live bandwidth usage in real time, with real-time screenshot previews.

## What is included

- **Frontend:** React + Vite app (up to 20 URL rows) with multi-select, live bandwidth meters, and screenshot previews
- **Backend:** Node.js server exposing REST APIs and WebSocket servers (agents & frontend) to coordinate runs and stream metrics
- **Agent:** Python agent that runs on each VM, launches Chrome for a given URL, captures screenshots, and reports interface bytes/sec back to the backend
- **Infra:** Terraform templates to provision AWS EC2 instances and install the agent (user supplies AWS creds)

## Quick Start (Local Development)

### Option 1: Using Launch Script (Easiest)

**Windows (PowerShell):**
```powershell
.\start-local.ps1
```

**Linux/macOS (Bash):**
```bash
chmod +x start-local.sh
./start-local.sh
```

Both scripts will:
- Start the backend on port 3001
- Start the frontend on port 5173
- Keep both running until you press Ctrl+C

### Option 2: Manual Setup

**1) Start backend:**
```bash
cd backend
npm install
npm start
```

Output:
```
Backend API listening 3001
Agent WS server listening on 3002
Frontend WS server listening on 3003
```

**2) Start frontend (in another terminal):**
```bash
cd frontend
npm install
npm run dev
```

Output:
```
  VITE v5.1.2  ready in XXX ms
  ➜  Local:   http://localhost:5173/
```

**3) Open http://localhost:5173 in your browser**

Enter URLs in the rows and click "Run Selected" to test!

## Features

✅ **Real-time Bandwidth Monitoring** - Live bandwidth meters for each URL  
✅ **Screenshot Previews** - See what's currently rendered on each agent's Chrome browser  
✅ **Multi-row Management** - Control up to 20 URLs simultaneously  
✅ **Live Agent Status** - See which agent is running each URL  
✅ **URL Persistence** - Entered URLs stay visible throughout the run  
✅ **WebSocket Updates** - Real-time metrics streaming from agents

## Testing with Docker Agents

For end-to-end testing with simulated agents:

```bash
# Terminal 1: Start backend and frontend (see above)

# Terminal 2: Start 3 containerized agents
docker compose -f docker-compose.test.yml up --scale agent=3 --build
```

The agents will automatically connect to your local backend. You'll see:
- Agent IDs appear in the "VM" column
- Bandwidth meters start moving
- Screenshot button becomes active

## Demo Mode (No Backend Required)

To see the UI demo without running any backend:

```bash
# Simply open in browser:
open frontend/demo.html

# Or start a local web server:
cd frontend
npx http-server
# Then open http://localhost:8080/demo.html
```

## Production Deployment

For full production deployment instructions, see [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md).

### Quick Production Checklist

1. **Deploy Backend to Server**
   ```bash
   # On your server:
   cd illyboost/backend
   npm install
   SSL_KEY_PATH=/path/to/key.pem SSL_CERT_PATH=/path/to/cert.pem npm start
   ```

2. **Build and Deploy Frontend**
   ```bash
   cd frontend
   npm run build
   # Deploy dist/ folder to CDN or web server
   ```

3. **Update Frontend API Endpoint**
   - Edit `frontend/src/App.jsx` line 3
   - Change `const API = 'http://localhost:3001'` to your backend URL

4. **Provision Agents with Terraform**
   ```bash
   cd infra
   terraform init
   terraform apply -var='backend_host=your-backend.com' -var='ssh_pub_key_path=~/.ssh/id_rsa.pub'
   ```

5. **Navigate to frontend URL and start running URLs!**

See [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md) for detailed instructions.

## Configuration

### Backend Environment Variables

```bash
PORT=3001                    # REST API port
WS_PORT=3002                 # Agent WebSocket port
FRONT_WS_PORT=3003          # Frontend WebSocket port
SSL_KEY_PATH=/path/to/key    # TLS (optional)
SSL_CERT_PATH=/path/to/cert  # TLS (optional)
AGENT_SECRET=your-secret     # Agent authentication (optional)
```

### Agent Environment Variables

```bash
BACKEND_HOST=backend-ip.com  # Backend hostname
BACKEND_WS=wss://...         # Or full WebSocket URL
AGENT_SECRET=your-secret     # Must match backend
```

### Frontend Configuration

Edit `frontend/src/App.jsx` line 3:
```javascript
const API = 'http://localhost:3001'  // Local dev
// or
const API = 'https://your-backend.com'  // Production
```

## Detailed Documentation

- [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md) - Full production deployment guide
- [SCREENSHOT_PREVIEW_FEATURE.md](SCREENSHOT_PREVIEW_FEATURE.md) - Screenshot feature documentation
- [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - Architecture and technical overview
- [backend/README.md](backend/README.md) - Backend API documentation
- [frontend/README.md](frontend/README.md) - Frontend setup
- [infra/README.md](infra/README.md) - Infrastructure as code (Terraform)

## Architecture

```
┌──────────────────────┐
│   Browser Frontend   │
│   (React/Vite)       │
│ - URLs & Bandwidth   │
│ - Screenshots        │
│ - Agent Status       │
└──────────┬───────────┘
           │ HTTP/WS
           │
┌──────────▼───────────┐
│  Node.js Backend     │
│ - REST API           │
│ - Agent WS Server    │
│ - Frontend WS Server │
└──────────┬───────────┘
           │ WS
     ┌─────┴──────────────┐
     │                    │
┌────▼────┐          ┌────▼────┐
│ Agent #1 │          │ Agent #N │
│ Chrome   │          │ Chrome   │
│ Python   │          │ Python   │
└──────────┘          └──────────┘
```

## System Requirements

- **Node.js:** v18 or higher
- **Python:** 3.8+ (for agents)
- **Docker:** Optional (for containerized test agents)
- **AWS Account:** Optional (for cloud provisioning)
- **Browser:** Modern browser with WebSocket support

## Troubleshooting

**Backend won't start?**
- Check ports 3001, 3002, 3003 are available
- Kill any existing Node processes: `pkill -f "node server.js"`
- Check Node.js version: `node --version` (should be v18+)

**Frontend won't connect?**
- Check backend is running: `curl http://localhost:3001/rows`
- Check API URL in `App.jsx` line 3
- Check browser console for WebSocket errors (F12)

**Agents not connecting?**
- Check backend is accessible: `curl http://backend-ip:3001/agents`
- Verify `BACKEND_HOST` on agent matches backend IP
- Check agent logs: `docker logs <container-id>`

**No screenshots appearing?**
- Agents need X11/Wayland display and gnome-screenshot utility
- Local Docker agents may not support screenshots (no display)
- Check agent logs for screenshot errors

## Security Notes

- Screenshots contain page content - implement proper access controls
- Use TLS (SSL_KEY_PATH/SSL_CERT_PATH) in production
- Enable AGENT_SECRET for agent authentication
- Restrict security groups to limit access
- Don't expose backend directly to internet without authentication

## Next Steps

1. **Local Testing:** Follow "Quick Start" above
2. **Docker Testing:** Run with `docker compose` for multi-agent simulation
3. **Production:** Follow [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md)
4. **Scaling:** See "Scaling Considerations" in PRODUCTION_SETUP.md

## License & Support

This is a working production-ready application. All components are functional and ready for deployment.

For detailed information:
- Backend: [backend/README.md](backend/README.md)
- Frontend: [frontend/README.md](frontend/README.md)
- Infrastructure: [infra/README.md](infra/README.md)
- Features: [SCREENSHOT_PREVIEW_FEATURE.md](SCREENSHOT_PREVIEW_FEATURE.md)

Quick local development (recommended to prototype):

1) Start backend

```bash
cd backend
npm install
npm start
```

This runs the REST API on `http://localhost:3001`, the agent WebSocket server on port `3002`, and the frontend WS server on port `3003`.

2) Start frontend

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL (usually `http://localhost:5173`) to use the UI.

3) (Optional) Run the demo UI without the backend

Open `frontend/demo.html` directly in your browser for a simulated live demo.

Provisioning agents in the cloud

The `infra` folder contains Terraform to provision EC2 instances and install the Python agent via user-data. You must set `backend_host` to the public IP or hostname where the backend WebSocket is reachable by agents.

Basic Terraform steps:

```bash
cd infra
terraform init
terraform apply -var='backend_host=<YOUR_BACKEND_PUBLIC_IP>' -var='ssh_pub_key_path=~/.ssh/id_rsa.pub'
```

Security note: The provided Terraform is an example. Review security groups, keys, and user-data before running in production.

Next steps
- Improve agent metrics (per-process vs interface), add authentication for agents and the backend, and configure a load-balanced agent pool.

See the detailed READMEs in `backend/README.md`, `frontend/README.md`, and `infra/README.md`.

Local end-to-end test harness

You can run multiple containerized agents that connect to your local backend (helpful for development):

1. Start the backend (locally):

```bash
cd backend
npm install
npm start
```

2. In another terminal, from project root run the test agents (use `host.docker.internal` for Docker on Mac/Windows):

```bash
# optionally export AGENT_SECRET if you set one in infra
export AGENT_SECRET=mysupersecret
docker compose -f docker-compose.test.yml up --scale agent=3 --build
```

This will start 3 containerized agents that connect to `ws://host.docker.internal:3002` and register. Use the UI to trigger runs and observe simulated metrics from the agents.

Local TLS helper

To quickly try TLS locally (self-signed) the repository includes a helper script that:
- builds the frontend,
- generates a self-signed cert,
- starts the backend with TLS enabled (env `SSL_KEY_PATH`/`SSL_CERT_PATH`),
- serves the built frontend over HTTPS for preview.

Usage:

```bash
# from repo root (requires Node.js)
node scripts/start-local-tls.js
```

The helper writes cert files to `backend/certs` and will run `npm install` in `frontend` and `backend` if needed. Your browser will warn about the self-signed certificate — accept the warning to proceed.
