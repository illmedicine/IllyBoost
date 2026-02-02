# Deploy Real Agents to Oracle Cloud Always Free Tier

**Best Option: Truly Free Forever (No Credit Card Expiration)**

Oracle Cloud offers a genuinely free tier that doesn't expire after 12 months. You get:
- 2 free Compute instances (permanently)
- 2 free Virtual Networks
- 100GB object storage
- Free MySQL Database
- Always free - no time limit

## Step 1: Create Oracle Cloud Account

1. Go to https://www.oracle.com/cloud/free/
2. Click "Start for free"
3. Provide email, country, company info
4. Create password
5. Verify email
6. Add billing info (optional - won't be charged for always-free resources)
7. Account created!

## Step 2: Create Compute Instances

In Oracle Cloud Console:

1. Click "Compute" → "Instances"
2. Click "Create Instance"
3. Configure:
   - **Name:** `illyboost-backend`
   - **Image:** Ubuntu 22.04 (Always Free eligible)
   - **Instance Type:** Ampere A1 (Always Free eligible)
   - **Shape:** VM.Standard.A1.Flex (4 OCPU, 24GB RAM - FREE!)
   - **Networking:** Create new VCN
   - **SSH Key:** Generate new or use existing
4. Click "Create"

Repeat for agent instances:
   - `illyboost-agent-01` through `illyboost-agent-02`

**Wait 2-3 minutes for instances to boot**

## Step 3: Get Instance IP Addresses

1. Click each instance in the console
2. Copy the "Public IP Address"
3. Save all IPs

Example:
```
Backend:  155.248.xxx.xxx
Agent-1:  155.248.xxx.yyy
Agent-2:  155.248.xxx.zzz
```

## Step 4: Configure Security Rules

1. Click "Virtual Cloud Networks"
2. Click your VCN
3. Click "Security Lists"
4. Edit rules:

**Add these ingress rules:**
```
- Port 22 (SSH) from anywhere
- Port 3001 (API) from anywhere
- Port 3002 (Agent WS) from anywhere
- Port 3003 (Frontend WS) from anywhere
```

## Step 5: Connect and Deploy Backend

```bash
# SSH into backend instance
ssh -i your-private-key ubuntu@<backend-ip>

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Git
sudo apt install -y git

# Clone your repository
git clone https://github.com/yourusername/IllyBoost.git
cd IllyBoost/illyboost-app/backend

# Install dependencies
npm install

# Start backend (bind to all interfaces for external access)
HOST=0.0.0.0 node server.js
```

**Should output:**
```
Backend API listening on 0.0.0.0:3001
Agent WS server listening on 0.0.0.0:3002
Frontend WS server listening on 0.0.0.0:3003
```

**Important:** The `HOST=0.0.0.0` is critical for external access. Without it, the backend will only be accessible from within the VM itself.

## Step 6: Deploy Agents

**For each agent instance:**

```bash
# SSH into agent
ssh -i your-private-key ubuntu@<agent-ip>

# Install dependencies
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-pip git chromium-browser

# Install Python WebSocket library
pip3 install websocket-client

# Clone repository
git clone https://github.com/yourusername/IllyBoost.git
cd IllyBoost/illyboost-app

# Start agent
export BACKEND_WS="ws://<backend-ip>:3002"
export AGENT_ID="agent-$(hostname)"
python3 agent/agent.py
```

Each agent should output:
```
BACKEND_WS= ws://155.248.xxx.xxx:3002
[agent-xxx] Connected to backend
[agent-xxx] Registered as agent-xxx
```

## Step 7: Test from Your Laptop

```powershell
# Edit frontend to connect to Oracle Cloud backend
# Edit frontend/src/App.jsx:

const API_URL = 'http://<backend-ip>:3001';
const WS_URL = 'ws://<backend-ip>:3003';

# Start frontend
cd frontend
npm run dev
```

Open http://localhost:5173/IllyBoost/

You should see:
- 2 agents listed (Oracle Cloud instances)
- Each with real IP address
- Ready to process URLs

## Step 8: Full End-to-End Test

1. Add 2 URLs to rows:
   - Row 1: https://example.com
   - Row 2: https://google.com

2. Click "Run"

3. Watch real-time:
   - Status changes (loading → processing → done)
   - Bandwidth metrics from real Chrome processes
   - Screenshots captured from real browsers
   - All happening on Oracle Cloud instances

## Cost

✅ **Absolutely FREE**
- 2 Ampere A1 instances (4 OCPU each) = FREE
- 100GB storage = FREE
- Outbound bandwidth (reasonable) = FREE
- **Total: $0/month, forever**

## Scaling to 20 Agents

If you want to test with 20 agents, you have options:

### Option A: Multiple Oracle Accounts
Create 10 Oracle Cloud accounts (each gets 2 free instances = 20 total agents)

### Option B: Upgrade to Paid (Still Cheap)
Add paid instances alongside free ones:
- Ubuntu Standard instances: ~$0.07/hour
- 20 instances × 730 hours/month = ~$100/month

### Option C: Use Both AWS and Oracle
- Oracle: 2 free agents
- AWS Free Tier: 5 free agents (t2.micro)
- Total: 7 free agents across both

## Compare: AWS vs Oracle

| Feature | AWS Free Tier | Oracle Always Free |
|---------|---|---|
| Cost | $0 × 12 months, then paid | $0 forever |
| Time Limit | 12 months | No limit |
| Instance Size | t2.micro (1 vCPU, 1GB RAM) | A1 (4 vCPU, 24GB RAM) |
| Instances | 750 hours/month (≈1 instance) | 2 permanently free |
| Best For | Learning/testing | Production-like workloads |

**Recommendation:** Start with Oracle Cloud (better specs, no time limit)

## Troubleshooting

**For comprehensive troubleshooting, see [ORACLE_TROUBLESHOOTING.md](ORACLE_TROUBLESHOOTING.md)**

### Quick Fixes

#### Can't SSH into instance
```bash
# Check security rules include port 22
# Verify instance has public IP assigned
# Check SSH key permissions
chmod 600 your-private-key.pem
```

#### Frontend can't connect to backend ("Could not connect")
```bash
# 1. Verify backend is bound to 0.0.0.0, not 127.0.0.1
ssh ubuntu@<backend-ip>
sudo lsof -i -P -n | grep LISTEN | grep node

# Should show: 0.0.0.0:3001 (GOOD)
# If shows: 127.0.0.1:3001 (BAD - restart with HOST=0.0.0.0)

# 2. Test from outside the VM
curl http://<backend-ip>:3001/health

# 3. If fails, check security list and firewall
# See ORACLE_TROUBLESHOOTING.md for complete checklist
```

#### Agent can't connect to backend
```bash
# Verify backend is running
ssh ubuntu@<backend-ip>
ps aux | grep node

# Check network connectivity
ssh ubuntu@<agent-ip>
ping <backend-ip>

# Verify ports are open
nc -zv <backend-ip> 3002
```

#### Chrome not found on agent
```bash
# Install Chromium
sudo apt install -y chromium-browser

# Verify installation
which chromium-browser
```

#### WebSocket connection timeout
- Check security rules allow ports 3001-3003 inbound
- Verify backend is listening: `sudo lsof -i -P -n | grep LISTEN`
- Ensure backend started with `HOST=0.0.0.0`

**For detailed step-by-step troubleshooting, see [ORACLE_TROUBLESHOOTING.md](ORACLE_TROUBLESHOOTING.md)**

## Keep Instances Running

Oracle Cloud may shut down instances after inactivity. To prevent:

1. In Console: Click instance
2. "Instance Details"
3. Ensure "Preserve Boot Volume on Instance Deletion" is checked
4. Enable monitoring if desired

## Next: Automate with Terraform

Once working, automate with Terraform:

```bash
# Install Terraform
choco install terraform -y

# Use Terraform to manage Oracle Cloud resources
# This makes scaling easier
```

---

## Quick Start Checklist

- [ ] Create Oracle Cloud account
- [ ] Create 2 Compute instances (backend + agent)
- [ ] Configure security rules (ports 22, 3001, 3002, 3003)
- [ ] SSH into backend, install Node.js, start backend
- [ ] SSH into agent, install Python/Chrome, start agent
- [ ] Update frontend API_URL and WS_URL
- [ ] Run frontend locally
- [ ] Add URLs and click "Run"
- [ ] See real metrics and screenshots from Oracle Cloud!

**Estimated setup time: 30 minutes**
**Cost: $0/month forever**

---

**Your IllyBoost is now running on real cloud infrastructure!**
