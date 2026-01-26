# IllyBoost Project Summary

**Export Date:** January 25, 2026  
**Project Version:** 0.1.0

---

## Project Overview

**IllyBoost** is a distributed browser control and bandwidth monitoring platform that enables:
- Launching and managing browser sessions remotely on multiple VMs/agents
- Real-time per-URL bandwidth usage monitoring across distributed agents
- Centralized control panel for orchestrating multi-agent runs

### Core Use Case
Control panel for launching browser sessions on remote agents (VMs) and monitoring per-URL live bandwidth usage in real time.

---

## Architecture

### System Components

**1. Frontend (React + Vite)**
- Local control panel UI supporting up to 20 URL rows
- Multi-select row functionality
- Live bandwidth meters for real-time metrics display
- Real-time WebSocket connection to backend for live updates
- Static demo mode available without backend (`demo.html`)

**2. Backend (Node.js + Express + WebSocket)**
- REST API server exposing row management and run control
- Dual WebSocket servers for agents and frontend coordination
- Metrics aggregation and broadcasting
- Optional TLS/WSS support for secure communication

**3. Agent (Python)**
- Runs on each VM/EC2 instance
- Launches headless Chrome browser for given URLs
- Measures and reports network interface bandwidth (bytes/sec)
- Connects back to backend via WebSocket
- Unique agent ID registration and status tracking

**4. Infrastructure (Terraform)**
- AWS EC2 provisioning automation
- Ubuntu AMI deployment with auto-installation of dependencies
- Python agent bootstrapping via user-data script
- Security group configuration for SSH and WebSocket access

---

## Technology Stack

### Backend Dependencies
```
express: ^4.18.2           (Web framework)
ws: ^8.13.0                (WebSocket implementation)
body-parser: ^1.20.2       (Request parsing)
cors: ^2.8.5               (Cross-origin support)
axios: ^1.4.0              (HTTP client)
aws-sdk: ^2.1360.0         (AWS integration)
selfsigned: ^1.10.11       (TLS certificate generation)
```

### Frontend Dependencies
```
react: ^18.2.0
react-dom: ^18.2.0
socket.io-client: ^4.7.2   (WebSocket client)
axios: ^1.4.0
vite: ^5.1.2
@vitejs/plugin-react: ^4.0.0
```

### Infrastructure & Deployment
```
Terraform: AWS EC2, VPC, Security Groups
Docker Compose: Test agent orchestration
Node.js: Backend runtime
Python 3.x: Agent runtime
Chrome/Chromium: Browser automation on agents
```

---

## API Specifications

### Backend REST Endpoints

| Endpoint | Method | Purpose | Payload |
|----------|--------|---------|---------|
| `/rows` | GET | Get list of 20 rows | - |
| `/rows` | POST | Update URLs for rows | `{rows: [{id, url}, ...]}` |
| `/run` | POST | Trigger run for specific rows | `{rowIds: [1,2,...]}` |
| `/agents` | GET | List connected agent IDs | - |

### WebSocket Protocols

**Agent WS Server (Port 3002 / wss://<host>:<PORT>/agents)**
- **Message Type: `open`**
  - Sent by: Backend
  - Payload: `{type:'open', rowId, url}`
  - Purpose: Command agent to launch Chrome for URL

- **Message Type: `bandwidth`**
  - Sent by: Agent
  - Payload: `{type:'bandwidth', agentId, rowId, bytesPerSec}`
  - Purpose: Report network bandwidth metrics

- **Message Type: `hello` (on connection)**
  - Sent by: Agent
  - Payload: `{agentId, secret (optional)}`
  - Purpose: Agent registration

**Frontend WS Server (Port 3003 / wss://<host>:<PORT>/front)**
- Receives real-time row/bandwidth updates from backend
- Live metric streaming for UI display

---

## Network Architecture

### Local Development
- REST API: `http://localhost:3001`
- Agent WebSocket: `ws://localhost:3002`
- Frontend WebSocket: `ws://localhost:3003`
- Frontend dev server: `http://localhost:5173` (Vite)

### Cloud Deployment (with TLS)
- Single HTTPS port carries both WebSocket paths:
  - Agents connect to: `wss://<host>:<PORT>/agents`
  - Frontend connects to: `wss://<host>:<PORT>/front`

---

## Environment Variables

### Backend Configuration
```
PORT                 : REST API port (default: 3001)
WS_PORT              : Agent WebSocket port (default: 3002)
FRONT_WS_PORT        : Frontend WebSocket port (default: 3003)
AGENT_SECRET         : Optional shared secret for agent authentication
SSL_KEY_PATH         : Path to TLS private key (PEM format)
SSL_CERT_PATH        : Path to TLS certificate (PEM format)
```

### Agent Configuration
```
BACKEND_WS           : Full WebSocket URL override
BACKEND_HOST         : Backend hostname/IP (used to construct BACKEND_WS)
AGENT_ID             : Custom agent identifier (default: auto-generated UUID)
AGENT_SECRET         : Shared secret matching backend (if configured)
```

### Terraform Variables
```
backend_host         : Public IP/hostname where backend WS is reachable
ssh_pub_key_path     : Path to SSH public key for EC2 access
instance_count       : Number of EC2 instances to provision (default: 1)
```

---

## Deployment Models

### Local Development
```bash
cd backend && npm install && npm start
cd frontend && npm install && npm run dev
```

### Docker Test Environment
```bash
docker compose -f docker-compose.test.yml up --scale agent=3 --build
```
- Runs containerized agents connecting to `ws://host.docker.internal:3002`
- Useful for testing without AWS provisioning

### AWS Cloud (Terraform)
```bash
cd infra
terraform init
terraform apply -var='backend_host=<IP>' -var='ssh_pub_key_path=~/.ssh/id_rsa.pub'
```
- Provisions EC2 instances with auto-installed Python agent
- User-data script handles dependencies (Python, Chrome, agent)

### Local TLS Testing
```bash
node scripts/start-local-tls.js
```
- Auto-generates self-signed certificates
- Enables HTTPS/WSS for testing secure configurations

---

## Security Considerations

### Implemented
- Optional agent authentication via `AGENT_SECRET`
- TLS/WSS support for encrypted communication
- Self-signed certificate generation for testing

### Recommended Hardening
- Tighten security group rules (currently open to world)
- Implement proper certificate management (not self-signed in production)
- Add authentication/authorization for API endpoints
- Implement per-process bandwidth metrics vs. interface-wide
- Configure load-balanced agent pool
- Implement rate limiting and request validation

---

## Key Features

### Current Implementation
✅ Multi-agent browser session management  
✅ Real-time bandwidth monitoring (interface-level)  
✅ Live dashboard with up to 20 URL rows  
✅ Multi-select row management  
✅ Docker-based local testing harness  
✅ Terraform infrastructure as code  
✅ TLS/WSS support  
✅ Optional agent authentication  

### Future Enhancements
- Per-process bandwidth metrics (vs. interface-wide)
- User authentication/authorization
- Load-balanced agent pool
- Enhanced security hardening
- Agent health monitoring and auto-recovery
- Metric persistence and historical analysis

---

## File Structure

```
illyboost-app/
├── README.md                    # Main project documentation
├── docker-compose.test.yml      # Docker testing orchestration
├── agent/
│   ├── agent.py                # Python agent implementation
│   └── Dockerfile              # Container image for agents
├── backend/
│   ├── server.js               # Express.js backend server
│   ├── package.json            # Node.js dependencies
│   └── README.md               # Backend documentation
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # Main React component
│   │   ├── main.jsx            # Entry point
│   │   └── styles.css          # Styling
│   ├── demo.html               # Static demo without backend
│   ├── index.html              # HTML template
│   ├── package.json            # Frontend dependencies
│   └── README.md               # Frontend documentation
├── infra/
│   ├── main.tf                 # Terraform AWS resources
│   ├── variables.tf            # Terraform variable definitions
│   ├── user_data.sh.tpl        # EC2 bootstrap script
│   └── README.md               # Infrastructure documentation
└── scripts/
    ├── start-local-tls.js      # TLS helper script (Node.js)
    ├── start-local-tls.ps1     # TLS helper script (PowerShell)
    └── start-local-agents.ps1  # Local agent launcher (PowerShell)
```

---

## Agent Metrics Collection

### Current Implementation
- **Measurement Type:** Interface-level bandwidth (rx_bytes + tx_bytes)
- **Frequency:** 1 second intervals
- **Source:** `/sys/class/net/<iface>/statistics/` (Linux)
- **Calculation:** Delta between consecutive reads (bytes per second)
- **Reporting:** WebSocket message to backend every second

### Measurement Method
```python
# Read from Linux network interface statistics
rx = /sys/class/net/{iface}/statistics/rx_bytes
tx = /sys/class/net/{iface}/statistics/tx_bytes
bytesPerSec = max(0, (current - previous))
```

---

## Development Workflow

### Local Setup
1. Clone repository
2. Start backend: `cd backend && npm install && npm start`
3. Start frontend: `cd frontend && npm install && npm run dev`
4. Open `http://localhost:5173` in browser

### Testing
- Use `demo.html` for UI testing without backend
- Use `docker-compose.test.yml` for multi-agent simulation
- Run local TLS helper for secure channel testing

### Production Deployment
1. Review and harden Terraform configurations
2. Configure TLS certificates (not self-signed)
3. Set `AGENT_SECRET` for authentication
4. Deploy backend to public-facing server
5. Run Terraform to provision EC2 agents
6. Build and deploy frontend (static assets)

---

## Contact & Support

This is a prototype/example implementation. Review all security configurations before production deployment.

For detailed component information, see:
- [Backend Documentation](backend/README.md)
- [Frontend Documentation](frontend/README.md)
- [Infrastructure Documentation](infra/README.md)

---

**End of Summary Document**
