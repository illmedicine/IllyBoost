#!/usr/bin/env powershell
# IllyBoost Production Deployment
# One script to rule them all

$projectRoot = "c:\Users\demar\Documents\GitHub\IllyBoost\illyboost-app"

Write-Host @"
╔════════════════════════════════════════════════════╗
║   IllyBoost Production Deployment                 ║
║   Deploy to Oracle Cloud Free Tier                ║
╚════════════════════════════════════════════════════╝

IMPORTANT: Before running this, you need:
1. Oracle Cloud Free Account (https://www.oracle.com/cloud/free/)
2. API credentials from Oracle Console
3. Private API key saved to ~/.oci/oci_api_key.pem

Choose one:
  1 - Get Oracle Credentials (collects your Oracle info)
  2 - Deploy (requires credentials already saved)
  3 - Exit

"@

$choice = Read-Host "Enter choice (1-3)"

switch ($choice) {
    "1" {
        Write-Host "`nGetting Oracle credentials...`n"
        & "$projectRoot\get-oracle-credentials.ps1"
    }
    "2" {
        Write-Host "`nDeploying to Oracle Cloud...`n"
        & "$projectRoot\deploy-oracle.ps1"
    }
    default {
        Write-Host "Exiting..."
        exit 0
    }
}
