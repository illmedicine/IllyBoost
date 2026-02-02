# Oracle Cloud Deployment - Quick Start

## TL;DR Setup (15 minutes)

### 1. Create Free Oracle Cloud Account
https://www.oracle.com/cloud/free/ → Sign up (takes 5 minutes)

### 2. Get Credentials from Oracle Console

In Oracle Cloud Console, copy these values:

```
1. Tenancy OCID       (Profile > Tenancy info)
2. User OCID          (Profile > My Profile)  
3. API Fingerprint    (Profile > API Keys > Add > Generate)
4. Compartment OCID   (Identity > Compartments)
```

**Save the private API key to:** `~/.oci/oci_api_key.pem`

### 3. Install Tools (Windows)

```powershell
choco install terraform -y
choco install oci-cli -y

# Verify
terraform --version
```

### 4. Create SSH Keys

```powershell
ssh-keygen -t rsa -b 4096 -f $env:USERPROFILE\.ssh\id_rsa -N '""'
```

### 5. Configure & Deploy

```powershell
cd c:\Users\demar\Documents\GitHub\IllyBoost\illyboost-app\infra

# Copy example config
Copy-Item oracle.tfvars.example oracle.tfvars

# Edit with your credentials
notepad oracle.tfvars

# Initialize
terraform init

# Deploy
terraform apply -var-file=oracle.tfvars
```

Type `yes` when prompted.

### 6. Get IPs and Update Frontend

```powershell
# See your instance IPs
terraform output

# Edit frontend with backend IP
notepad ..\frontend\src\App.jsx
```

Change these lines:
```javascript
const API_URL = 'http://YOUR_BACKEND_IP:3001';
const WS_URL = 'ws://YOUR_BACKEND_IP:3003';
```

### 7. Start Frontend

```powershell
cd ..\frontend
npm run dev
```

Open: http://localhost:5173/IllyBoost/

### 8. Test

1. Add URLs to rows
2. Click "Run"
3. Watch real-time metrics from Oracle Cloud instances!

---

## What Gets Created

| Item | Quantity | Cost |
|------|----------|------|
| VCN (Virtual Network) | 1 | FREE |
| Backend Instance | 1 (4 OCPU, 24GB) | FREE |
| Agent Instances | 2 (2 OCPU, 12GB each) | FREE |
| Total Monthly Cost | | **$0.00** |

**All free forever - no credit card expiration.**

---

## Troubleshooting

**For comprehensive troubleshooting, see [ORACLE_TROUBLESHOOTING.md](ORACLE_TROUBLESHOOTING.md)**

### Quick Fixes

#### Agents not showing up in frontend
- Wait 3-5 minutes for instances to fully boot
- SSH into backend and check: `curl http://localhost:3001/agents`
- Check logs: `journalctl -u illyboost-agent -f`

#### Can't connect to backend ("Could not connect")
```bash
# 1. Verify backend is running and bound to 0.0.0.0
ssh ubuntu@YOUR_BACKEND_IP
sudo lsof -i -P -n | grep LISTEN | grep node

# Should show: 0.0.0.0:3001 (GOOD)
# If shows: 127.0.0.1:3001 (BAD)

# 2. Test from your laptop
curl http://YOUR_BACKEND_IP:3001/health

# If fails, see ORACLE_TROUBLESHOOTING.md for complete checklist
```

#### Chrome not found on agent
```bash
ssh ubuntu@YOUR_AGENT_IP
sudo apt install -y chromium-browser
```

**For detailed step-by-step troubleshooting:** [ORACLE_TROUBLESHOOTING.md](ORACLE_TROUBLESHOOTING.md)

---

## Important Commands

```powershell
# See what was created
terraform output

# SSH to backend
ssh -i ~/.ssh/id_rsa ubuntu@<backend-ip>

# SSH to agent
ssh -i ~/.ssh/id_rsa ubuntu@<agent-ip>

# Scale to more agents
notepad oracle.tfvars
# Change: agent_count = 2  →  agent_count = 5
terraform apply -var-file=oracle.tfvars

# Destroy everything (clean up)
terraform destroy -var-file=oracle.tfvars
```

---

## File References

- **Configuration:** `infra/oracle.tfvars`
- **Terraform Files:** `infra/oracle.tf`, `infra/oracle-variables.tf`, `infra/oracle-outputs.tf`
- **Setup Scripts:** `infra/user_data_backend.sh`, `infra/user_data_agent.sh`
- **Documentation:** `ORACLE_SETUP_COMPLETE.md` (detailed guide)

---

## Support

If stuck:
1. **See comprehensive guide:** [ORACLE_TROUBLESHOOTING.md](ORACLE_TROUBLESHOOTING.md)
2. Check `ORACLE_SETUP_COMPLETE.md` for detailed troubleshooting
3. View Terraform logs: `terraform show`
4. SSH to instances and check logs: `journalctl -u illyboost-backend -f`
5. Check Oracle Cloud Console for instance status

---

**Your production infrastructure is ready to deploy!**
