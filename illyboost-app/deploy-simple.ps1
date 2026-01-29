#!/usr/bin/env powershell
# Simple Oracle Cloud Deployment for IllyBoost

param(
    [string]$TenancyOcid = "ocid1.tenancy.oc1..aaaaaaaaxhg5qtxwxyaouivxe54uwlbdsvqvitentyrqvxvxf26eamy3miceq",
    [string]$UserOcid = "ocid1.user.oc1..aaaaaaaanmjd56qn2mmzdqmoqgikatexvdjkplt3ah5v4l567mszvpixjfiq",
    [string]$Fingerprint = "97:51:15:1e:53:16:9c:3d:e7:0b:45:3b:c2:a4:80:c3",
    [string]$CompartmentOcid = "ocid1.tenancy.oc1..aaaaaaaaxhg3qtxwxyaouivxe54wvlbdswqvjtentyxqwx6f26eamy3miceq",
    [string]$Region = "us-ashburn-1",
    [int]$AgentCount = 2
)

$ErrorActionPreference = "Stop"

Write-Host "IllyBoost Oracle Cloud Deployment" -ForegroundColor Cyan -BackgroundColor Black
Write-Host "===================================" -ForegroundColor Cyan

# Check Terraform
Write-Host "Checking Terraform..." -ForegroundColor Yellow
if (-not (Get-Command terraform -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Terraform not installed. Install from https://www.terraform.io/downloads" -ForegroundColor Red
    exit 1
}

# Create Terraform variables file
Write-Host "Creating terraform.tfvars..." -ForegroundColor Yellow
$tfvars = @"
tenancy_ocid       = "$TenancyOcid"
user_ocid          = "$UserOcid"
fingerprint        = "$Fingerprint"
compartment_ocid   = "$CompartmentOcid"
region             = "$Region"
agent_count        = $AgentCount
private_key_path   = "$env:USERPROFILE\.oci\oci_api_key.pem"
@"

Set-Content -Path "infra/terraform.tfvars" -Value $tfvars
Write-Host "Terraform variables saved" -ForegroundColor Green

# Initialize Terraform
Write-Host "Initializing Terraform..." -ForegroundColor Yellow
Push-Location infra
terraform init
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Terraform init failed" -ForegroundColor Red
    Pop-Location
    exit 1
}

# Apply Terraform
Write-Host "Deploying infrastructure (this may take 2-3 minutes)..." -ForegroundColor Yellow
terraform apply -auto-approve

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Terraform apply failed" -ForegroundColor Red
    Pop-Location
    exit 1
}

# Get outputs
Write-Host "Getting deployment details..." -ForegroundColor Yellow
$outputs = terraform output -json | ConvertFrom-Json

Pop-Location

# Display results
Write-Host "" -ForegroundColor Green
Write-Host "DEPLOYMENT SUCCESSFUL!" -ForegroundColor Green
Write-Host "======================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend Instance IP: $($outputs.backend_public_ip.value)" -ForegroundColor Cyan
Write-Host "Agent Instances:" -ForegroundColor Cyan
$outputs.agent_public_ips.value | ForEach-Object { Write-Host "  - $_" }

Write-Host ""
Write-Host "Waiting for services to start (30 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host ""
Write-Host "SSH to Backend:" -ForegroundColor Cyan
Write-Host "  ssh ubuntu@$($outputs.backend_public_ip.value)" -ForegroundColor Green
Write-Host ""
Write-Host "Check Backend Status:" -ForegroundColor Cyan
Write-Host "  curl http://$($outputs.backend_public_ip.value):3001/rows" -ForegroundColor Green
Write-Host ""
Write-Host "Backend running on: http://$($outputs.backend_public_ip.value):3001" -ForegroundColor Green
Write-Host "Agent WebSocket on: ws://$($outputs.backend_public_ip.value):3002" -ForegroundColor Green
Write-Host "Frontend WebSocket on: ws://$($outputs.backend_public_ip.value):3003" -ForegroundColor Green

Write-Host ""
Write-Host "To update frontend with backend IP:" -ForegroundColor Yellow
Write-Host "  Update src/App.jsx with backend IP: $($outputs.backend_public_ip.value)" -ForegroundColor Green

Write-Host ""
Write-Host "Deployment complete! Your IllyBoost app is now running in Oracle Cloud." -ForegroundColor Green
