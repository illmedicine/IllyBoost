#!/usr/bin/env powershell
# Oracle Cloud Deployment for IllyBoost

$ErrorActionPreference = "Stop"

# Credentials
$TenancyOcid = "ocid1.tenancy.oc1..aaaaaaaaxhg5qtxwxyaouivxe54uwlbdsvqvitentyrqvxvxf26eamy3miceq"
$UserOcid = "ocid1.user.oc1..aaaaaaaanmjd56qn2mmzdqmoqgikatexvdjkplt3ah5v4l567mszvpixjfiq"
$Fingerprint = "97:51:15:1e:53:16:9c:3d:e7:0b:45:3b:c2:a4:80:c3"
$CompartmentOcid = "ocid1.tenancy.oc1..aaaaaaaaxhg3qtxwxyaouivxe54wvlbdswqvjtentyxqwx6f26eamy3miceq"
$Region = "us-ashburn-1"
$AgentCount = 2

Write-Host "IllyBoost Oracle Cloud Deployment" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Check Terraform
Write-Host "Checking Terraform..." -ForegroundColor Yellow
if (-not (Get-Command terraform -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Terraform not installed" -ForegroundColor Red
    exit 1
}
Write-Host "Terraform found" -ForegroundColor Green

# Create tfvars file
Write-Host "Creating terraform.tfvars..." -ForegroundColor Yellow
$tfvarsPath = "infra\terraform.tfvars"
$content = 'tenancy_ocid       = "' + $TenancyOcid + '"' + "`n"
$content += 'user_ocid          = "' + $UserOcid + '"' + "`n"
$content += 'fingerprint        = "' + $Fingerprint + '"' + "`n"
$content += 'compartment_ocid   = "' + $CompartmentOcid + '"' + "`n"
$content += 'region             = "' + $Region + '"' + "`n"
$content += 'agent_count        = ' + $AgentCount + "`n"
$privateKeyPath = ($env:USERPROFILE + '\.oci\oci_api_key.pem').Replace('\', '\\')
$content += 'private_key_path   = "' + $privateKeyPath + '"' + "`n"

Set-Content -Path $tfvarsPath -Value $content -Encoding UTF8
Write-Host "Terraform variables saved to $tfvarsPath" -ForegroundColor Green

# Initialize Terraform
Write-Host ""
Write-Host "Initializing Terraform..." -ForegroundColor Yellow
Push-Location infra
terraform init

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Terraform init failed" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "Terraform initialized" -ForegroundColor Green

# Apply Terraform
Write-Host ""
Write-Host "Deploying to Oracle Cloud (this may take 3-5 minutes)..." -ForegroundColor Yellow
terraform apply -auto-approve

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Terraform apply failed" -ForegroundColor Red
    Pop-Location
    exit 1
}

Write-Host "Infrastructure deployed successfully!" -ForegroundColor Green

# Get outputs
Write-Host ""
Write-Host "Getting deployment details..." -ForegroundColor Yellow
$outputJson = terraform output -json
$outputs = $outputJson | ConvertFrom-Json

Pop-Location

# Display results
Write-Host ""
Write-Host "========== DEPLOYMENT COMPLETE ==========" -ForegroundColor Green
Write-Host ""
Write-Host "Backend Instance IP: $($outputs.backend_public_ip.value)" -ForegroundColor Cyan
Write-Host "Backend Status URL: http://$($outputs.backend_public_ip.value):3001/rows" -ForegroundColor Cyan
Write-Host ""
Write-Host "Agent Instances:" -ForegroundColor Cyan
$outputs.agent_public_ips.value | ForEach-Object { Write-Host "  - $_" -ForegroundColor Cyan }
Write-Host ""

Write-Host "Services starting (waiting 30 seconds for startup)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host ""
Write-Host "Your IllyBoost application is now live!" -ForegroundColor Green
Write-Host ""
Write-Host "Backend Server Information:" -ForegroundColor Cyan
Write-Host "  REST API: http://$($outputs.backend_public_ip.value):3001" -ForegroundColor Green
Write-Host "  Agent WS: ws://$($outputs.backend_public_ip.value):3002" -ForegroundColor Green
Write-Host "  Frontend WS: ws://$($outputs.backend_public_ip.value):3003" -ForegroundColor Green
Write-Host ""
Write-Host "SSH Access:" -ForegroundColor Cyan
Write-Host "  ssh ubuntu@$($outputs.backend_public_ip.value)" -ForegroundColor Green
Write-Host ""
