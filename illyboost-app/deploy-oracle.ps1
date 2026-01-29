#!/usr/bin/env powershell
# Oracle Cloud Auto-Deployment for IllyBoost
# Run this script to deploy everything automatically

param(
    [string]$TenancyOcid = "",
    [string]$UserOcid = "",
    [string]$Fingerprint = "",
    [string]$CompartmentOcid = "",
    [string]$Region = "us-ashburn-1",
    [int]$AgentCount = 2
)

$ErrorActionPreference = "Stop"

$colors = @{
    Green  = "`e[32m"
    Red    = "`e[31m"
    Yellow = "`e[33m"
    Blue   = "`e[36m"
    Bold   = "`e[1m"
    Reset  = "`e[0m"
}

function Log-Step { Write-Host "$($colors.Blue)→$($colors.Reset) $args" -ForegroundColor Cyan }
function Log-Success { Write-Host "$($colors.Green)✓$($colors.Reset) $args" -ForegroundColor Green }
function Log-Error { Write-Host "$($colors.Red)✗$($colors.Reset) $args" -ForegroundColor Red }
function Log-Title { Write-Host "`n$($colors.Bold)$($colors.Blue)$args$($colors.Reset)" }

Clear-Host

Write-Host @"
$($colors.Bold)$($colors.Blue)╔════════════════════════════════════════╗$($colors.Reset)
$($colors.Bold)$($colors.Blue)║   IllyBoost Oracle Cloud Auto Deploy   ║$($colors.Reset)
$($colors.Bold)$($colors.Blue)╚════════════════════════════════════════╝$($colors.Reset)
"@

# Step 1: Verify Tools
Log-Title "Step 1: Verifying Requirements"
Log-Step "Checking Terraform..."
if (-not (Get-Command terraform -ErrorAction SilentlyContinue)) {
    Log-Error "Terraform not found. Install with: choco install terraform -y"
    exit 1
}
Log-Success "Terraform installed"

Log-Step "Checking SSH key..."
$sshKey = "$env:USERPROFILE\.ssh\id_rsa.pub"
if (-not (Test-Path $sshKey)) {
    Log-Step "Generating SSH key..."
    $null = New-Item -ItemType Directory -Path "$env:USERPROFILE\.ssh" -Force -ErrorAction SilentlyContinue
    ssh-keygen -t rsa -b 4096 -f "$env:USERPROFILE\.ssh\id_rsa" -N '""'
}
Log-Success "SSH key ready"

# Step 2: Get Credentials
Log-Title "Step 2: Oracle Cloud Credentials"

if ([string]::IsNullOrEmpty($TenancyOcid)) {
    Write-Host "`nEnter your Oracle Cloud credentials (from Console):"
    $TenancyOcid = Read-Host "Tenancy OCID"
    $UserOcid = Read-Host "User OCID"
    $Fingerprint = Read-Host "API Key Fingerprint"
    $CompartmentOcid = Read-Host "Compartment OCID"
}

Log-Success "Credentials provided"

# Step 3: Prepare Infrastructure
Log-Title "Step 3: Preparing Terraform Configuration"

$infraDir = "c:\Users\demar\Documents\GitHub\IllyBoost\illyboost-app\infra"
$tfvarsFile = Join-Path $infraDir "oracle.tfvars"

Log-Step "Creating oracle.tfvars..."

$tfvarsContent = @"
tenancy_ocid        = "$TenancyOcid"
user_ocid           = "$UserOcid"
fingerprint         = "$Fingerprint"
compartment_ocid    = "$CompartmentOcid"
region              = "$Region"
ssh_public_key_path = "$sshKey"
agent_count         = $AgentCount
private_key_path    = "~/.oci/oci_api_key.pem"
"@

Set-Content -Path $tfvarsFile -Value $tfvarsContent
Log-Success "Configuration created"

# Step 4: Initialize Terraform
Log-Title "Step 4: Initializing Terraform"
Log-Step "Running terraform init..."
cd $infraDir
terraform init -no-color
Log-Success "Terraform initialized"

# Step 5: Deploy
Log-Title "Step 5: Deploying Infrastructure"
Log-Step "This will create 1 backend + $AgentCount agents on Oracle Cloud (always free)"
Log-Step "Estimated time: 3-5 minutes"
Log-Step ""

$continueDeployment = Read-Host "Continue with deployment? (yes/no)"
if ($continueDeployment -ne "yes") {
    Log-Error "Deployment cancelled"
    exit 0
}

Log-Step "Deploying to Oracle Cloud..."
terraform apply -var-file=oracle.tfvars -auto-approve -no-color

Log-Success "Infrastructure deployed!"

# Step 6: Get Outputs
Log-Title "Step 6: Retrieving Instance Information"

$backendIP = terraform output -raw backend_public_ip
$agentIPs = terraform output -json agent_public_ips | ConvertFrom-Json

Log-Success "Backend: $backendIP (3001, 3002, 3003)"
$agentIPs | ForEach-Object { Log-Success "Agent: $_" }

# Step 7: Update Frontend
Log-Title "Step 7: Updating Frontend Configuration"

$appJsPath = "c:\Users\demar\Documents\GitHub\IllyBoost\illyboost-app\frontend\src\App.jsx"
$appJs = Get-Content $appJsPath -Raw

# Replace localhost with backend IP
$appJs = $appJs -replace "const API_URL = 'http://localhost:3001'", "const API_URL = 'http://$backendIP`:3001'"
$appJs = $appJs -replace "const WS_URL = 'ws://localhost:3003'", "const WS_URL = 'ws://$backendIP`:3003'"

Set-Content -Path $appJsPath -Value $appJs
Log-Success "Frontend configured with backend IP"

# Step 8: Wait & Display Summary
Log-Title "Step 8: Deployment Complete!"

Write-Host @"

$($colors.Bold)Infrastructure Summary:$($colors.Reset)
  Backend IP:  $backendIP
  Agents:      $($agentIPs.Count)
  Region:      $Region
  Cost:        $0/month forever

$($colors.Bold)Instances are starting and configuring (2-3 minutes)$($colors.Reset)

$($colors.Bold)Next: Start Frontend$($colors.Reset)

  cd c:\Users\demar\Documents\GitHub\IllyBoost\illyboost-app\frontend
  npm run dev

  Then open: http://localhost:5173/IllyBoost/

$($colors.Bold)Test: Add URLs and click Run$($colors.Reset)

  - Metrics stream from real Oracle Cloud agents
  - Screenshots from real Chrome processes
  - Bandwidth from real browsers

$($colors.Bold)Useful Commands:$($colors.Reset)

  # SSH to backend
  ssh -i ~/.ssh/id_rsa ubuntu@$backendIP

  # SSH to first agent
  ssh -i ~/.ssh/id_rsa ubuntu@$($agentIPs[0])

  # View Terraform outputs
  terraform output

  # Destroy everything (clean up)
  terraform destroy -var-file=oracle.tfvars -auto-approve

$($colors.Green)Ready for production!$($colors.Reset)
"@

# Automatically start frontend
Log-Step "Waiting 10 seconds before starting frontend..."
Log-Step "(This gives instances time to boot)"

Start-Sleep -Seconds 10

Log-Step "Starting frontend development server..."
cd "c:\Users\demar\Documents\GitHub\IllyBoost\illyboost-app\frontend"

# Start frontend in new terminal
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "cd 'c:\Users\demar\Documents\GitHub\IllyBoost\illyboost-app\frontend'; npm run dev"

Log-Success "Frontend started in new window"
Log-Success "Open: http://localhost:5173/IllyBoost/"
