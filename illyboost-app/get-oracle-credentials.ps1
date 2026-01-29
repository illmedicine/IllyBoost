#!/usr/bin/env powershell
# Oracle Cloud Credentials Helper
# Collects credentials and validates them

$colors = @{
    Green  = "`e[32m"
    Red    = "`e[31m"
    Yellow = "`e[33m"
    Blue   = "`e[36m"
    Bold   = "`e[1m"
    Reset  = "`e[0m"
}

function Log-Title { Write-Host "`n$($colors.Bold)$($colors.Blue)$args$($colors.Reset)" }
function Log-Step { Write-Host "$($colors.Blue)→$($colors.Reset) $args" }
function Log-Success { Write-Host "$($colors.Green)✓$($colors.Reset) $args" -ForegroundColor Green }
function Log-Error { Write-Host "$($colors.Red)✗$($colors.Reset) $args" -ForegroundColor Red }

Clear-Host

Write-Host @"
$($colors.Bold)Oracle Cloud Credentials Helper$($colors.Reset)

This will collect your Oracle Cloud credentials and save them for deployment.

$($colors.Yellow)You need:$($colors.Reset)
1. Oracle Cloud Free Account (sign up at https://www.oracle.com/cloud/free/)
2. 4 credential values from the Console (see below)
3. API private key file

"@

Log-Title "Getting Credentials from Oracle Cloud Console"

Write-Host @"
To get your credentials:

1. $($colors.Bold)Tenancy OCID:$($colors.Reset)
   - Go to Oracle Cloud Console (https://cloud.oracle.com)
   - Click your profile (top-right) > "Tenancy: [Name]"
   - Find "OCID" field
   - Example: ocid1.tenancy.oc1..aaa...

2. $($colors.Bold)User OCID:$($colors.Reset)
   - Click your profile > "My Profile"
   - Find "OCID" field
   - Example: ocid1.user.oc1..bbb...

3. $($colors.Bold)API Fingerprint:$($colors.Reset)
   - In My Profile, scroll down to "API Keys"
   - Click "Add API Key"
   - Select "Generate API Key Pair"
   - Click "Generate API Key Pair"
   - Click "Download Private Key"
   - Save to: ~/.oci/oci_api_key.pem
   - Copy the "Fingerprint" (example: ab:cd:ef:12:34:56:78:90)

4. $($colors.Bold)Compartment OCID:$($colors.Reset)
   - Go to "Identity & Security" > "Compartments"
   - Click the compartment (usually "Tenancy (root)")
   - Copy the OCID value
   - Example: ocid1.compartment.oc1..ccc...

"@

Log-Title "Enter Your Credentials"

$tenancyOcid = Read-Host "Tenancy OCID"
if ([string]::IsNullOrWhiteSpace($tenancyOcid)) { Log-Error "Tenancy OCID required"; exit 1 }

$userOcid = Read-Host "User OCID"
if ([string]::IsNullOrWhiteSpace($userOcid)) { Log-Error "User OCID required"; exit 1 }

$fingerprint = Read-Host "API Fingerprint (format: ab:cd:ef:12:34:56:78:90)"
if ([string]::IsNullOrWhiteSpace($fingerprint)) { Log-Error "Fingerprint required"; exit 1 }

$compartmentOcid = Read-Host "Compartment OCID"
if ([string]::IsNullOrWhiteSpace($compartmentOcid)) { Log-Error "Compartment OCID required"; exit 1 }

$region = Read-Host "Region (default: us-ashburn-1)"
if ([string]::IsNullOrWhiteSpace($region)) { $region = "us-ashburn-1" }

$agentCount = Read-Host "Number of agents (default: 2, free tier)"
if ([string]::IsNullOrWhiteSpace($agentCount)) { $agentCount = 2 } else { $agentCount = [int]$agentCount }

Log-Title "Verify Credentials"

Write-Host @"
Tenancy OCID:    $($tenancyOcid.Substring(0, 50))...
User OCID:       $($userOcid.Substring(0, 50))...
Fingerprint:     $fingerprint
Compartment:     $($compartmentOcid.Substring(0, 50))...
Region:          $region
Agent Count:     $agentCount
"@

$confirm = Read-Host "Correct? (yes/no)"
if ($confirm -ne "yes") {
    Log-Error "Cancelled"
    exit 0
}

Log-Title "Checking API Key File"

$apiKeyPath = "$env:USERPROFILE\.oci\oci_api_key.pem"
if (-not (Test-Path $apiKeyPath)) {
    Log-Error "API private key not found at $apiKeyPath"
    Write-Host "`nYou need to:"
    Write-Host "1. Download your API private key from Oracle Console"
    Write-Host "2. Save it to: $apiKeyPath"
    Write-Host "3. Run this script again"
    exit 1
}
Log-Success "API key found"

Log-Title "Ready to Deploy"

Write-Host @"

Everything is configured. You can now deploy with:

  cd c:\Users\demar\Documents\GitHub\IllyBoost\illyboost-app
  .\deploy-oracle.ps1 -TenancyOcid "$tenancyOcid" -UserOcid "$userOcid" -Fingerprint "$fingerprint" -CompartmentOcid "$compartmentOcid" -Region "$region" -AgentCount $agentCount

Or save these to a file and run:

  .\deploy-oracle.ps1

$($colors.Green)Deployment will automatically:$($colors.Reset)
✓ Initialize Terraform
✓ Deploy 1 backend + $agentCount agents
✓ Configure security groups
✓ Update frontend
✓ Start frontend server
✓ Display connection info

"@

$deployNow = Read-Host "Deploy now? (yes/no)"
if ($deployNow -eq "yes") {
    & "c:\Users\demar\Documents\GitHub\IllyBoost\illyboost-app\deploy-oracle.ps1" `
        -TenancyOcid $tenancyOcid `
        -UserOcid $userOcid `
        -Fingerprint $fingerprint `
        -CompartmentOcid $compartmentOcid `
        -Region $region `
        -AgentCount $agentCount
} else {
    Log-Step "Run this command when ready:"
    Write-Host ""
    Write-Host "  .\deploy-oracle.ps1 -TenancyOcid '$tenancyOcid' -UserOcid '$userOcid' -Fingerprint '$fingerprint' -CompartmentOcid '$compartmentOcid' -Region '$region' -AgentCount $agentCount"
}
