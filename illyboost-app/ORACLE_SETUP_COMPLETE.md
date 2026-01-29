# Oracle Cloud Deployment - Complete Setup Guide

## Overview

This guide sets up IllyBoost on Oracle Cloud Always Free tier:
- 1 Backend instance (4 OCPU, 24GB RAM)
- 2 Agent instances (2 OCPU, 12GB RAM each)
- Networking, security groups, and auto-startup configured
- **Cost: $0/month forever**

---

## Prerequisites

### 1. Create Oracle Cloud Account

1. Go to https://www.oracle.com/cloud/free/
2. Click "Start for free"
3. Complete registration (takes ~5 minutes)
4. Verify email
5. Set up billing (won't be charged for always-free resources)

### 2. Install Required Tools on Your Laptop

**Windows (PowerShell):**

```powershell
# Install Terraform
choco install terraform -y

# Install Oracle Cloud CLI (optional but helpful)
choco install oci-cli -y

# Verify installation
terraform --version
```

**macOS:**

```bash
brew install terraform
brew install oci-cli
```

**Linux:**

```bash
# Download Terraform from https://www.terraform.io/downloads
# Or use your package manager
apt install terraform

# Install OCI CLI
pip install oci-cli
```

### 3. Create SSH Key Pair

```powershell
# Create .ssh directory
mkdir $env:USERPROFILE\.ssh -Force

# Generate SSH key
ssh-keygen -t rsa -b 4096 -f $env:USERPROFILE\.ssh\id_rsa -N '""'
```

This creates:
- `~/.ssh/id_rsa` (private key)
- `~/.ssh/id_rsa.pub` (public key)

---

## Step 1: Get Oracle Cloud Credentials

### 1.1 Get Tenancy OCID

1. Log into Oracle Cloud Console: https://cloud.oracle.com
2. Click your profile picture (top-right) → "Tenancy: [Name]"
3. Look for "OCID" field
4. Copy the value (looks like: `ocid1.tenancy.oc1..aaa...`)
5. Save it

### 1.2 Get User OCID

1. In Oracle Cloud Console, click your profile picture (top-right) → "My Profile"
2. Look for "OCID" field
3. Copy the value
4. Save it

### 1.3 Create API Key

1. In Oracle Cloud Console, go to "My Profile"
2. Scroll down to "API Keys"
3. Click "Add API Key"
4. Choose "Generate API Key Pair"
5. Click "Download Private Key"
6. Save the key to: `~/.oci/oci_api_key.pem`
7. Copy the "Fingerprint" value
8. Save it

### 1.4 Get Compartment OCID

1. Go to "Identity & Security" → "Compartments"
2. Click on your compartment (usually "Tenancy (root)")
3. Copy the OCID value
4. Save it

**You now have all credentials needed!**

---

## Step 2: Configure Terraform

### 2.1 Copy Example Configuration

```powershell
cd c:\Users\demar\Documents\GitHub\IllyBoost\illyboost-app\infra

# Copy example file
Copy-Item oracle.tfvars.example oracle.tfvars
```

### 2.2 Edit oracle.tfvars with Your Credentials

```powershell
# Open the file
notepad oracle.tfvars
```

Replace these values (from Step 1):

```hcl
tenancy_ocid    = "ocid1.tenancy.oc1..YOUR_ACTUAL_VALUE"
user_ocid       = "ocid1.user.oc1..YOUR_ACTUAL_VALUE"
fingerprint     = "ab:cd:ef:12:34:56:YOUR_ACTUAL_FINGERPRINT"
compartment_ocid = "ocid1.compartment.oc1..YOUR_ACTUAL_VALUE"
```

Save the file.

### 2.3 Verify SSH Key Path

In `oracle.tfvars`, make sure:

```hcl
ssh_public_key_path = "~/.ssh/id_rsa.pub"
```

This should point to your SSH public key created in Prerequisites.

---

## Step 3: Deploy to Oracle Cloud

### 3.1 Initialize Terraform

```powershell
cd c:\Users\demar\Documents\GitHub\IllyBoost\illyboost-app\infra

terraform init
```

This downloads the Oracle Cloud provider.

### 3.2 Review Deployment Plan

```powershell
terraform plan -var-file=oracle.tfvars
```

You'll see output like:

```
Plan: 15 to add, 0 to change, 0 to destroy.

Resources to add:
  - oci_core_virtual_network.illyboost_vcn
  - oci_core_internet_gateway.illyboost_igw
  - oci_core_instance.backend
  - oci_core_instance.agent (2 instances)
  - [security groups, subnets, etc.]
```

**This is safe - it just shows what will be created, doesn't actually create anything yet.**

### 3.3 Deploy Infrastructure

```powershell
terraform apply -var-file=oracle.tfvars
```

When prompted, type: `yes`

**This will:**
1. Create VCN (virtual network)
2. Create security groups (firewall rules)
3. Launch backend instance
4. Launch 2 agent instances
5. Configure auto-startup
6. Takes ~3-5 minutes

**Watch for output like:**

```
Apply complete! Resources: 15 added, 0 destroyed.

Outputs:

backend_public_ip = "155.248.123.45"
agent_public_ips = [
  "155.248.123.46",
  "155.248.123.47",
]
ssh_command_backend = "ssh ubuntu@155.248.123.45"
ssh_commands_agents = [
  "ssh ubuntu@155.248.123.46 # agent-1",
  "ssh ubuntu@155.248.123.47 # agent-2",
]
```

**Save these IP addresses!**

---

## Step 4: Wait for Instances to Boot

Instances take 2-3 minutes to start and run setup scripts.

Check status in Oracle Cloud Console:
1. Go to "Compute" → "Instances"
2. You should see 3 instances (1 backend + 2 agents)
3. Wait for "RUNNING" state
4. Wait ~2 more minutes for background setup

---

## Step 5: Verify Backend is Running

```powershell
# SSH into backend
ssh -i $env:USERPROFILE\.ssh\id_rsa ubuntu@<backend-public-ip>

# Check if backend is running
curl http://localhost:3001/rows

# You should see JSON array of 20 empty rows
```

If successful, you see:
```json
[
  {"id": 1, "url": "", "state": "idle", ...},
  ...
]
```

---

## Step 6: Verify Agents are Connected

```powershell
# From backend instance
curl http://localhost:3001/agents

# You should see agent IPs
```

Output:
```json
{
  "agent-1": "10.0.1.45",
  "agent-2": "10.0.1.46"
}
```

---

## Step 7: Update Frontend Configuration

Edit `frontend/src/App.jsx`:

```javascript
// Replace these lines:
const API_URL = 'http://localhost:3001';
const WS_URL = 'ws://localhost:3003';

// With your backend IP:
const API_URL = 'http://155.248.123.45:3001';
const WS_URL = 'ws://155.248.123.45:3003';
```

---

## Step 8: Start Frontend Locally

```powershell
cd c:\Users\demar\Documents\GitHub\IllyBoost\illyboost-app\frontend

npm run dev
```

Open: http://localhost:5173/IllyBoost/

You should see:
- 20 empty rows ready for URLs
- Agent status showing 2 agents connected
- Real IP addresses of agents

---

## Step 9: Test End-to-End

1. **Add URLs:**
   - Row 1: https://example.com
   - Row 2: https://google.com

2. **Click Run** on rows 1-2

3. **Watch Real-Time:**
   - Status changes: loading → processing → done
   - Bandwidth updates (real Chrome processes on Oracle Cloud!)
   - Screenshots captured from real browsers

4. **In Browser Console:**
   - Check WebSocket messages coming from backend
   - View agent metrics in real-time

---

## Useful Commands

### View Terraform Status

```powershell
# Show current resources
terraform show

# Show outputs
terraform output

# Get specific output
terraform output backend_public_ip
```

### SSH into Instances

```powershell
# Backend
ssh -i $env:USERPROFILE\.ssh\id_rsa ubuntu@<backend-ip>

# Agents
ssh -i $env:USERPROFILE\.ssh\id_rsa ubuntu@<agent-ip>
```

### Check Services on Instances

```bash
# Check backend service
systemctl status illyboost-backend

# Check agent service
systemctl status illyboost-agent

# View logs
journalctl -u illyboost-backend -f

# Restart service
sudo systemctl restart illyboost-backend
```

### Scale to More Agents

```powershell
# Edit oracle.tfvars
notepad oracle.tfvars

# Change: agent_count = 2
# To:     agent_count = 5

# Apply changes
terraform apply -var-file=oracle.tfvars
```

---

## Troubleshooting

### Agents not connecting to backend

1. Check agents are running:
   ```bash
   ssh ubuntu@<agent-ip>
   systemctl status illyboost-agent
   ```

2. Check backend is accessible:
   ```bash
   ssh ubuntu@<agent-ip>
   ping <backend-private-ip>
   telnet <backend-private-ip> 3002
   ```

3. Check logs:
   ```bash
   journalctl -u illyboost-agent -n 50
   ```

### Chrome not found on agent

```bash
ssh ubuntu@<agent-ip>
sudo apt install -y chromium-browser
```

### WebSocket connection timeout on frontend

- Verify backend IP in `App.jsx` is correct
- Check firewall rules allow port 3003
- Try: `curl http://<backend-ip>:3001/rows` from your laptop

---

## Clean Up (When Done)

```powershell
# Destroy all infrastructure
terraform destroy -var-file=oracle.tfvars
```

When prompted, type: `yes`

**⚠️ This deletes all instances and data**

---

## Cost Summary

| Resource | Cost |
|----------|------|
| 1 Backend VM (4 OCPU, 24GB) | FREE (Always Free tier) |
| 2 Agent VMs (2 OCPU, 12GB each) | FREE (Always Free tier) |
| VCN + Networking | FREE (Always Free tier) |
| **Total Monthly Cost** | **$0.00** |

**Forever. No credit card expiration.**

---

## Scaling Beyond Free Tier

If you want more than 2 agents:

```hcl
# In oracle.tfvars, change:
agent_count = 5  # or 10, 20, etc.

# Cost per additional t4 Standard instance:
# ~$0.0075/hour = ~$5.50/month per agent

# 20 agents = ~$110/month extra
```

---

## Next Steps

✅ Terraform setup complete
✅ Oracle Cloud instances deployed
✅ Frontend connected to real cloud backend
✅ Agents processing URLs on real VMs
✅ Bandwidth metrics streaming in real-time
✅ Screenshots captured from real browsers

**Your IllyBoost is now running on production infrastructure!**

For questions, check:
- Terraform logs: `terraform.log`
- Instance logs: `journalctl` on the instance
- Oracle Cloud Console: Instance details and monitoring
