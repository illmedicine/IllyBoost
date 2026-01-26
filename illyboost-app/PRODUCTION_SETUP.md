# IllyBoost Production Setup Guide

**Last Updated:** January 25, 2026

## Quick Start - Local Development (Recommended First)

### 1. Start the Backend

```bash
cd backend
npm install
npm start
```

**Output:** You should see:
```
Backend API listening 3001
Agent WS server listening on 3002
Frontend WS server listening on 3003
```

### 2. Start the Frontend (in a new terminal)

```bash
cd frontend
npm install
npm run dev
```

**Output:** You should see:
```
  VITE v5.1.2  ready in XXX ms

  ➜  Local:   http://localhost:5173/
```

### 3. Open Browser

Navigate to: **http://localhost:5173**

You should see the IllyBoost UI with empty rows ready for input.

---

## Testing with Local Docker Agents

To test with simulated agents running in Docker containers:

### 1. Ensure Backend is Running
```bash
cd backend && npm start
# Keep this running in background
```

### 2. Start Test Agents (new terminal)

From project root:
```bash
docker compose -f docker-compose.test.yml up --scale agent=3 --build
```

This will:
- Build the agent Docker image
- Start 3 containerized agents
- Agents automatically connect to backend on `ws://host.docker.internal:3002`
- Agents appear in the UI as `agent-<id>`

### 3. Test in UI

1. Select rows (e.g., rows 1, 2, 3)
2. Enter URLs (e.g., `https://example.com`, `https://github.com`, `https://amazon.com`)
3. Click "Run Selected"
4. Observe:
   - ✅ Rows highlight green
   - ✅ Bandwidth meters show traffic
   - ✅ Agent IDs appear in VM column
   - ✅ Preview button shows screenshots (every 3 seconds)

### 4. Stop Agents

```bash
docker compose -f docker-compose.test.yml down
```

---

## Production Deployment (AWS EC2)

### Prerequisites

- AWS credentials configured (`~/.aws/credentials` or env vars)
- SSH public key available (`~/.ssh/id_rsa.pub`)
- Backend server running on a public IP/domain

### Step 1: Deploy Backend to Server

**Option A: Self-hosted EC2**

```bash
# Create an EC2 instance manually or via Terraform
# SSH into the instance

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repository
git clone <your-repo> illyboost
cd illyboost/backend

# Install dependencies
npm install

# Start with TLS (recommended)
# Generate self-signed cert or use Let's Encrypt
SSL_KEY_PATH=/path/to/key.pem SSL_CERT_PATH=/path/to/cert.pem npm start

# Or use PM2 for persistence
npm install -g pm2
pm2 start server.js --name illyboost-backend
pm2 startup
pm2 save
```

**Option B: Using Terraform (Automated)**

```bash
cd infra

# Initialize Terraform
terraform init

# Get your public IP (where backend will run)
BACKEND_IP=$(curl -s https://api.ipify.org)

# Apply Terraform to provision EC2 agents
terraform apply \
  -var='backend_host='$BACKEND_IP \
  -var='ssh_pub_key_path=~/.ssh/id_rsa.pub' \
  -var='instance_count=3'
```

### Step 2: Deploy Frontend

```bash
cd frontend

# Build for production
npm install
npm run build

# This creates `dist/` folder with static assets

# Deploy to a CDN or web server
# For simple testing, you can serve locally:
npm run preview

# Or deploy dist/ folder to:
# - AWS S3 + CloudFront
# - Vercel / Netlify
# - Any web server (nginx, Apache, etc.)
```

### Step 3: Update Frontend API Endpoint

If backend is on a different host, update [frontend/src/App.jsx](frontend/src/App.jsx#L3):

```javascript
const API = 'https://your-backend-domain.com:3001'
// or
const API = 'https://your-backend-domain.com'  // if using TLS on single port
```

### Step 4: Test End-to-End

1. Navigate to frontend URL
2. Enter URLs in rows
3. Click "Run Selected"
4. Monitor bandwidth and screenshots

---

## Configuration

### Backend Environment Variables

```bash
# Port for REST API
PORT=3001

# WebSocket ports (if not using TLS)
WS_PORT=3002           # Agent connection
FRONT_WS_PORT=3003     # Frontend connection

# TLS Configuration (optional but recommended for production)
SSL_KEY_PATH=/path/to/key.pem
SSL_CERT_PATH=/path/to/cert.pem

# Agent Authentication (optional)
AGENT_SECRET=your-secret-key
```

### Agent Environment Variables (EC2/VM)

```bash
# Backend WebSocket URL
BACKEND_HOST=your-backend-ip.com
# OR
BACKEND_WS=wss://your-backend-ip.com:3001/agents  # if using TLS

# Optional authentication
AGENT_SECRET=your-secret-key

# Custom agent ID (optional)
AGENT_ID=agent-prod-01
```

### Frontend Configuration

Edit [frontend/src/App.jsx](frontend/src/App.jsx#L3):

```javascript
// Local development
const API = 'http://localhost:3001'

// Production
const API = 'https://illyboost.yourdomain.com'
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│  Frontend (React/Vite) - Browser UI                 │
│  - User enters URLs and clicks "Run"                │
│  - Shows bandwidth, screenshots, agent status       │
│  - Connects to Backend WS for live updates          │
└──────────────────┬──────────────────────────────────┘
                   │
        HTTP/HTTPS │ (REST API)
        WS/WSS     │ (WebSocket)
                   │
┌──────────────────▼──────────────────────────────────┐
│  Backend (Node.js) - Control & Metrics Hub          │
│  - REST API on port 3001                            │
│  - Agent WS server on port 3002 (or /agents path)   │
│  - Frontend WS server on port 3003 (or /front path) │
│  - Stores screenshots, bandwidth, agent status      │
│  - Broadcasts updates to all connected clients      │
└──────────────────┬──────────────────────────────────┘
                   │
        WS/WSS     │ (Agent Connection)
                   │
        ┌──────────┴──────────────────┐
        │                             │
┌───────▼────────┐          ┌─────────▼──────────┐
│  Agent VM #1   │          │  Agent VM #2...N   │
│ (Python)       │          │ (Python)           │
│ - Chrome       │          │ - Chrome           │
│ - Screenshots  │          │ - Screenshots      │
│ - Bandwidth    │          │ - Bandwidth        │
└────────────────┘          └────────────────────┘
```

---

## System Requirements

### Backend Server

- **OS:** Linux (Ubuntu 18.04+) or macOS
- **CPU:** 2+ cores
- **RAM:** 2GB minimum, 4GB+ recommended
- **Node.js:** v18 or higher
- **Port Access:** 3001, 3002, 3003 (or single 3001 with TLS)

### Agent VMs (EC2)

- **OS:** Ubuntu 20.04 LTS or newer
- **CPU:** 2+ cores
- **RAM:** 2GB minimum
- **Software:**
  - Python 3.8+
  - Google Chrome or Chromium
  - `gnome-screenshot` (for screenshot captures)
  - `websocket-client` Python package

### Frontend Browser

- Modern browser (Chrome, Firefox, Safari, Edge)
- WebSocket support
- JavaScript enabled

---

## Monitoring & Troubleshooting

### Check Backend Health

```bash
# REST API status
curl http://localhost:3001/agents

# Expected output:
# {"agent-xyz123": "192.168.1.100", "agent-abc456": "192.168.1.101"}
```

### Check Agent Connection

```bash
# SSH into agent VM
ssh ubuntu@agent-ip

# Check agent logs
tail -f /var/log/illyboost-agent.log

# Test Chrome
google-chrome --version
```

### Debug WebSocket Issues

**Check if ports are open:**
```bash
# From backend server
netstat -tuln | grep -E '3001|3002|3003'

# Should show LISTEN on all three ports
```

**Test WebSocket connectivity:**
```bash
# Install wscat for testing
npm install -g wscat

# Test agent WS port
wscat -c ws://localhost:3002

# Send hello message
{"type": "hello", "agentId": "test-agent"}
```

### Frontend Connection Issues

1. **Check API endpoint:**
   - Open DevTools (F12)
   - Check Console for errors
   - Verify API URL is correct in [App.jsx](frontend/src/App.jsx#L3)

2. **Check WebSocket:**
   - DevTools → Network → WS
   - Should see `ws://localhost:3003` connection
   - Look for data frames with row updates

3. **Check CORS:**
   - Backend logs should show connection
   - If CORS error, verify `app.use(cors())` in server.js

### Performance Tuning

**For many agents (50+):**

1. Increase Node.js memory:
```bash
NODE_OPTIONS=--max-old-space-size=4096 npm start
```

2. Consider database for persistence (vs in-memory):
- Replace `urlRows` array with MongoDB/PostgreSQL
- Store screenshots in S3/cloud storage
- Implement pagination for many rows

3. Use load balancer:
- nginx reverse proxy
- AWS Application Load Balancer
- Distribute agents across multiple backend instances

---

## Security Best Practices

### TLS/HTTPS (Required for Production)

```bash
# Use Let's Encrypt for free certificates
sudo certbot certonly --standalone -d illyboost.yourdomain.com

# Start backend with TLS
SSL_KEY_PATH=/etc/letsencrypt/live/illyboost.yourdomain.com/privkey.pem \
SSL_CERT_PATH=/etc/letsencrypt/live/illyboost.yourdomain.com/fullchain.pem \
npm start
```

### Authentication

Enable `AGENT_SECRET` for agent authentication:

```bash
# Backend
AGENT_SECRET=super-secret-key npm start

# Agent VMs
export AGENT_SECRET=super-secret-key
python agent.py
```

### Network Isolation

- Use AWS Security Groups to restrict access
- Only allow agents to connect from your VPC/IP range
- Use VPN for remote access
- Don't expose backend directly to internet without authentication

### Data Protection

Screenshots contain page content:
- Don't store screenshots longer than needed
- Implement cleanup job to delete old screenshots
- Consider encrypting screenshots at rest
- Restrict access to API endpoints

---

## Deployment Checklist

Before going live:

- [ ] Backend running and accessible on public IP
- [ ] TLS certificates installed and valid
- [ ] Frontend built and deployed to CDN/web server
- [ ] Frontend API endpoint updated to backend URL
- [ ] Agent authentication enabled (AGENT_SECRET)
- [ ] Security groups configured to restrict access
- [ ] DNS records point to backend and frontend
- [ ] Monitor backend logs for errors
- [ ] Test with sample URLs and agents
- [ ] Backup screenshots/data periodically

---

## Scaling Considerations

### Horizontal Scaling (Multiple Backend Instances)

If you have 100+ agents, consider multiple backend instances behind a load balancer:

1. **Shared State:** Replace in-memory `agents`/`urlRows` with Redis
2. **Load Balancer:** nginx or AWS ALB to distribute connections
3. **Monitoring:** Prometheus + Grafana for metrics

### Vertical Scaling (Single Powerful Server)

For most use cases, a single powerful server handles 100+ agents:

```bash
# Monitor resource usage
top -i
free -h
df -h

# Adjust Node.js memory if needed
NODE_OPTIONS=--max-old-space-size=8192 npm start
```

---

## Support & Debugging

For issues:

1. Check backend logs:
```bash
# If using PM2
pm2 logs illyboost-backend

# If running directly
# (logs print to console)
```

2. Check frontend browser console (F12)

3. Verify Docker agents are connected:
```bash
docker logs <container-id>
```

4. Test individual components:
```bash
# Test REST API
curl http://localhost:3001/rows

# Test agent WS port
wscat -c ws://localhost:3002
```

---

## Production Deployment Summary

**Minimum viable setup:**

```bash
# 1. Start backend on server with TLS
SSH into server
cd illyboost/backend
SSL_KEY_PATH=/certs/key.pem SSL_CERT_PATH=/certs/cert.pem npm start

# 2. Deploy frontend static files
cd illyboost/frontend
npm run build
# Upload dist/ to CDN or web server

# 3. Update frontend API endpoint
Edit src/App.jsx line 3: const API = 'https://your-backend.com'

# 4. Provision agents with Terraform
cd illyboost/infra
terraform apply -var='backend_host=your-backend.com'

# 5. Users navigate to frontend URL
# Select rows, enter URLs, click "Run Selected"
# Bandwidth and screenshots appear in real-time
```

All components are now production-ready and fully functional! 🚀
