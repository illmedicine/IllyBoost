# Deploy Real Agents to AWS Free Tier

## Step 1: Create AWS Account (Free)

1. Go to https://aws.amazon.com/free/
2. Click "Create a free account"
3. Provide email, password, and basic info
4. Verify email
5. Add payment method (won't be charged for free tier)
6. Wait for account activation (~5 minutes)

**Free Tier includes:**
- 750 hours/month EC2 t2.micro instances
- 30GB EBS storage
- Free for 12 months

## Step 2: Create AWS Access Keys

In AWS Console:
1. Click your account name (top-right) → My Security Credentials
2. Click "Access Keys"
3. Click "Create New Access Key"
4. Copy:
   - Access Key ID
   - Secret Access Key
5. Save these safely

**⚠️ KEEP THESE SECRET!**

## Step 3: Install AWS CLI & Terraform

### Windows PowerShell:

```powershell
# Install AWS CLI
choco install awscli -y
# or download from https://aws.amazon.com/cli/

# Install Terraform
choco install terraform -y
# or download from https://www.terraform.io/downloads
```

### Verify Installation:
```powershell
aws --version
terraform --version
```

## Step 4: Configure AWS Credentials

```powershell
aws configure
```

When prompted:
```
AWS Access Key ID: [your access key from Step 2]
AWS Secret Access Key: [your secret key from Step 2]
Default region: us-east-1
Default output format: json
```

## Step 5: Create SSH Key Pair

```powershell
# Create SSH directory
mkdir $env:USERPROFILE\.ssh -Force

# Generate key pair
ssh-keygen -t rsa -b 4096 -f $env:USERPROFILE\.ssh\id_rsa -N '""'
```

This creates:
- `~/.ssh/id_rsa` (private key)
- `~/.ssh/id_rsa.pub` (public key)

## Step 6: Deploy with Terraform

```powershell
cd c:\Users\demar\Documents\GitHub\IllyBoost\illyboost-app\infra

# Initialize Terraform
terraform init

# Plan the deployment (see what will be created)
terraform plan -var="instance_count=5"

# Deploy! (creates 5 agent VMs + 1 backend)
terraform apply -var="instance_count=5"
```

When prompted: type `yes`

**This will create:**
- 1 Backend EC2 instance (runs your backend server)
- 5 Agent EC2 instances (run Python agents)
- Security groups for networking
- All completely FREE on the free tier

## Step 7: Get Backend IP Address

After Terraform completes:

```powershell
# Show outputs (includes IP addresses)
terraform output

# Or get specific backend IP
terraform output backend_public_ip
```

Copy the backend public IP address.

## Step 8: Connect to Backend VM

```powershell
# SSH into backend instance
ssh -i $env:USERPROFILE\.ssh\id_rsa ubuntu@<backend-ip>

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Clone your app
git clone https://github.com/yourusername/IllyBoost.git
cd IllyBoost/illyboost-app/backend

# Install and start
npm install
node server.js
```

Backend should show:
```
Backend API listening 3001
Agent WS server listening on 3002
Frontend WS server listening on 3003
```

## Step 9: Connect to Agent VMs

For each agent instance:

```powershell
# SSH into agent
ssh -i $env:USERPROFILE\.ssh\id_rsa ubuntu@<agent-ip>

# Install Python & Chrome
sudo apt update
sudo apt install -y python3 python3-pip git chromium-browser

# Install Python WebSocket library
pip3 install websocket-client

# Clone app
git clone https://github.com/yourusername/IllyBoost.git
cd IllyBoost/illyboost-app

# Start agent
export BACKEND_WS="ws://<backend-ip>:3002"
export AGENT_ID="agent-$(hostname)"
python3 agent/agent.py
```

Agent should show:
```
[agent-xxx] Registered as agent-xxx
[agent-xxx] Connected to backend
```

## Step 10: Test Full End-to-End

1. Get backend IP from Step 7
2. Update frontend to connect to backend IP:
   
   Edit `frontend/src/App.jsx`:
   ```javascript
   const API_URL = 'http://<backend-ip>:3001';
   const WS_URL = 'ws://<backend-ip>:3003';
   ```

3. Run frontend locally:
   ```powershell
   cd frontend
   npm run dev
   ```

4. Open http://localhost:5173/IllyBoost/

5. You should see:
   - 5 agents in the agent status area (with IPs)
   - Real agent connections from AWS

6. Add URLs and click "Run"
   - URLs distributed to AWS agents
   - Metrics streamed back in real-time
   - Screenshots captured from real Chrome instances

## Full End-to-End Test

```
Your Laptop (Frontend)
        ↓ http://localhost:5173
        ↓ WebSocket to backend
        ↓ REST API to backend
        ↓
AWS Backend Instance (running on port 3001, 3002, 3003)
        ↓ Routes commands to agents
        ↓
AWS Agent Instances (5 VMs running Python agent)
        ├─ Agent-1: Launches Chrome, visits URL, measures bandwidth
        ├─ Agent-2: Launches Chrome, visits URL, measures bandwidth
        ├─ Agent-3: Launches Chrome, visits URL, measures bandwidth
        ├─ Agent-4: Launches Chrome, visits URL, measures bandwidth
        └─ Agent-5: Launches Chrome, visits URL, measures bandwidth
        ↓ Send metrics back
        ↓
AWS Backend Instance (broadcasts to frontend)
        ↓
Your Laptop (displays real-time metrics and screenshots)
```

## Cost Estimate

✅ **Completely FREE** on AWS free tier:

- 5 t2.micro instances × 750 hours = 3,750 hours ✓ (free tier covers this)
- 150GB EBS storage × 30GB free ✓
- Data transfer (reasonable amounts) ✓
- **Total monthly cost: $0.00**

## Troubleshooting

### Agent fails to connect
```bash
# Check backend is accessible
ping <backend-ip>

# Check WebSocket port
nc -zv <backend-ip> 3002

# Check agent logs
cat /var/log/syslog | grep agent
```

### Chrome not installed on agent
```bash
sudo apt install -y chromium-browser
# or
sudo apt install -y google-chrome-stable
```

### Backend crashes
```bash
# Check logs
journalctl -u backend -f

# Restart manually
cd ~/IllyBoost/illyboost-app/backend
npm install
node server.js
```

### WebSocket connection timeout
- Ensure security groups allow port 3002 inbound
- Check firewall on agent VMs

## Clean Up (When Done)

```powershell
# Destroy all resources (saves money)
cd infra
terraform destroy
```

**⚠️ This deletes all EC2 instances and data**

---

## Alternative: Scale to 20 Agents

To test with 20 agents (matching your design):

```powershell
terraform apply -var="instance_count=20"
```

This deploys 20 free t2.micro instances. Still completely within free tier!

---

**You now have REAL agents running on AWS, processing real URLs with real bandwidth metrics!**
