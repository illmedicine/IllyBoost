#!/usr/bin/env powershell
# Oracle Cloud Quick Setup for IllyBoost
# This script guides you through the setup process

param(
    [switch]$SkipSSH = $false
)

$colors = @{
    Green = "`e[32m"
    Red = "`e[31m"
    Yellow = "`e[33m"
    Blue = "`e[36m"
    Reset = "`e[0m"
    Bold = "`e[1m"
}

function Write-Step { param([string]$msg); Write-Host "$($colors.Blue)→$($colors.Reset) $msg" -ForegroundColor Cyan }
function Write-Success { param([string]$msg); Write-Host "$($colors.Green)✓$($colors.Reset) $msg" -ForegroundColor Green }
function Write-Warning { param([string]$msg); Write-Host "$($colors.Yellow)!$($colors.Reset) $msg" -ForegroundColor Yellow }
function Write-Error { param([string]$msg); Write-Host "$($colors.Red)✗$($colors.Reset) $msg" -ForegroundColor Red }

Clear-Host

Write-Host @"
$($colors.Bold)$($colors.Blue)╔════════════════════════════════════════════╗$($colors.Reset)
$($colors.Bold)$($colors.Blue)║  IllyBoost Oracle Cloud Quick Setup       ║$($colors.Reset)
$($colors.Bold)$($colors.Blue)╚════════════════════════════════════════════╝$($colors.Reset)
"@

Write-Host ""
Write-Step "Step 1: Create SSH Key Pair"
Write-Host "Checking for SSH keys..."

$sshDir = "$env:USERPROFILE\.ssh"
$privateKey = Join-Path $sshDir "id_rsa"
$publicKey = Join-Path $sshDir "id_rsa.pub"

if (-not (Test-Path $privateKey) -or -not (Test-Path $publicKey)) {
    Write-Warning "SSH keys not found. Generating..."
    
    if (-not (Test-Path $sshDir)) {
        New-Item -ItemType Directory -Path $sshDir -Force | Out-Null
    }
    
    # Generate SSH key
    ssh-keygen -t rsa -b 4096 -f $privateKey -N '""'
    Write-Success "SSH keys generated"
} else {
    Write-Success "SSH keys already exist"
}

Write-Host ""
Write-Step "Step 2: Check Terraform Installation"

$terraformVersion = terraform --version 2>$null
if ($null -eq $terraformVersion) {
    Write-Error "Terraform not found. Please install:"
    Write-Host "  Windows: choco install terraform -y"
    Write-Host "  macOS: brew install terraform"
    exit 1
} else {
    Write-Success "Terraform installed: $($terraformVersion[0])"
}

Write-Host ""
Write-Step "Step 3: Prepare Infrastructure Configuration"

$infraDir = "c:\Users\demar\Documents\GitHub\IllyBoost\illyboost-app\infra"
$tfvarsFile = Join-Path $infraDir "oracle.tfvars"
$exampleFile = Join-Path $infraDir "oracle.tfvars.example"

if (-not (Test-Path $tfvarsFile)) {
    if (Test-Path $exampleFile) {
        Copy-Item $exampleFile $tfvarsFile
        Write-Success "Created $tfvarsFile"
    } else {
        Write-Error "Example file not found"
        exit 1
    }
} else {
    Write-Success "Configuration file already exists"
}

Write-Host ""
Write-Step "Step 4: Get Oracle Cloud Credentials"
Write-Host ""
Write-Host @"
You need 4 values from Oracle Cloud Console:

1. Tenancy OCID:
   - Go to Oracle Cloud Console
   - Click profile (top-right) > "Tenancy: [Name]"
   - Copy OCID value

2. User OCID:
   - Click profile > "My Profile"
   - Copy OCID value

3. API Key Fingerprint:
   - In My Profile, scroll to "API Keys"
   - Click "Add API Key" > "Generate API Key Pair"
   - Download private key to ~/.oci/oci_api_key.pem
   - Copy fingerprint

4. Compartment OCID:
   - Go to "Identity & Security" > "Compartments"
   - Click your compartment, copy OCID

$($colors.Bold)Open oracle.tfvars and fill in these values:$($colors.Reset)
  notepad $tfvarsFile
"@

Write-Host ""
Read-Host "Press Enter when you've updated oracle.tfvars with your credentials"

Write-Host ""
Write-Step "Step 5: Initialize Terraform"

cd $infraDir
terraform init

Write-Success "Terraform initialized"

Write-Host ""
Write-Step "Step 6: Review Deployment Plan"
Write-Host "This will show what resources will be created (not destructive):"
Write-Host ""

terraform plan -var-file=oracle.tfvars

Write-Host ""
Write-Host @"
$($colors.Bold)Review the plan above. If everything looks good, proceed to deployment.$($colors.Reset)
"@

$confirm = Read-Host "Deploy to Oracle Cloud? (type 'yes' to confirm)"

if ($confirm -ne "yes") {
    Write-Warning "Deployment cancelled"
    exit 0
}

Write-Host ""
Write-Step "Step 7: Deploy Infrastructure"
Write-Host "This will create resources on Oracle Cloud. Please wait..."
Write-Host ""

terraform apply -var-file=oracle.tfvars

Write-Success "Infrastructure deployed!"

Write-Host ""
Write-Step "Step 8: Get Instance IPs"

$backendIP = terraform output -raw backend_public_ip
$agentIPs = terraform output -json agent_public_ips | ConvertFrom-Json

Write-Success "Backend IP: $backendIP"
foreach ($i, $ip in $agentIPs.GetEnumerator()) {
    Write-Success "Agent $($i+1) IP: $ip"
}

Write-Host ""
Write-Step "Step 9: Wait for Instances to Boot"
Write-Host "Instances are starting. This takes 2-3 minutes..."
Write-Host "Background setup scripts are running automatically."
Write-Host ""
Write-Host "Check status in Oracle Cloud Console:"
Write-Host "  - Compute > Instances"
Write-Host "  - Look for 'RUNNING' state on all 3 instances"
Write-Host ""

Start-Sleep -Seconds 5

Write-Host ""
Write-Step "Step 10: Update Frontend Configuration"
Write-Host ""
Write-Host "Edit frontend/src/App.jsx and change:"
Write-Host ""
Write-Host "  const API_URL = 'http://$backendIP:3001';"
Write-Host "  const WS_URL = 'ws://$backendIP:3003';"
Write-Host ""
Write-Host "Or run this command:"
Write-Host "  notepad c:\Users\demar\Documents\GitHub\IllyBoost\illyboost-app\frontend\src\App.jsx"
Write-Host ""

Write-Host ""
Write-Success "Setup complete!"
Write-Host ""
Write-Host @"
$($colors.Bold)Next steps:$($colors.Reset)

1. Update frontend/src/App.jsx with backend IP
2. Wait 2-3 more minutes for agent setup to complete
3. Start frontend:
   cd frontend
   npm run dev
4. Open http://localhost:5173/IllyBoost/
5. Add URLs and click "Run"

$($colors.Bold)Useful commands:$($colors.Reset)

  # View all outputs
  terraform output

  # SSH to backend
  ssh -i ~/.ssh/id_rsa ubuntu@$backendIP

  # SSH to agent
  ssh -i ~/.ssh/id_rsa ubuntu@$($agentIPs[0])

  # Destroy everything (clean up)
  terraform destroy -var-file=oracle.tfvars

$($colors.Bold)Documentation:$($colors.Reset)

  Complete guide: ORACLE_SETUP_COMPLETE.md
  Troubleshooting: Check logs on instances or Oracle Console

$($colors.Green)Happy deploying!$($colors.Reset)
"@
