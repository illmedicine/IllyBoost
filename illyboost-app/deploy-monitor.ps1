#!/usr/bin/env powershell
# Oracle Cloud Deployment Monitor & Retry

$infraDir = "C:\Users\demar\Documents\GitHub\IllyBoost\illyboost-app\infra"
$maxRetries = 5
$retryCount = 0
$deployed = $false

Write-Host "IllyBoost Oracle Cloud Deployment Monitor" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Configuration:" -ForegroundColor Yellow
Get-Content "$infraDir\terraform.tfvars" | Write-Host
Write-Host ""

while ($retryCount -lt $maxRetries -and -not $deployed) {
    $retryCount++
    Write-Host "Attempt $retryCount of $maxRetries..." -ForegroundColor Yellow
    Write-Host ""
    
    Push-Location $infraDir
    
    $output = terraform apply -auto-approve 2>&1
    
    if ($output -match "oci_core_instance.backend: Creation complete") {
        $deployed = $true
        Write-Host "Deployment SUCCESSFUL!" -ForegroundColor Green
        Write-Host ""
        terraform output
        Pop-Location
        exit 0
    }
    
    if ($output -match "Out of host capacity") {
        Write-Host "Oracle Cloud capacity exhausted. Waiting 5 minutes before retry..." -ForegroundColor Red
        Pop-Location
        Start-Sleep -Seconds 300
    } else {
        Write-Host "Deployment failed with different error:" -ForegroundColor Red
        Write-Host $output | Select-Object -Last 20
        Pop-Location
        exit 1
    }
}

if (-not $deployed) {
    Write-Host ""
    Write-Host "Maximum retries reached. Oracle Cloud Ashburn region is at capacity." -ForegroundColor Red
    Write-Host ""
    Write-Host "Options:" -ForegroundColor Yellow
    Write-Host "1. Wait and run again in 1 hour" -ForegroundColor Gray
    Write-Host "2. Contact Oracle support for capacity request" -ForegroundColor Gray
    Write-Host "3. Try different region (edit terraform.tfvars, change region)" -ForegroundColor Gray
    exit 1
}
