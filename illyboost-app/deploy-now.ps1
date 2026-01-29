#!/usr/bin/env powershell
# Deploy IllyBoost to Oracle Cloud

$infraDir = "C:\Users\demar\Documents\GitHub\IllyBoost\illyboost-app\infra"

Write-Host "Deploying IllyBoost to Oracle Cloud..." -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

Push-Location $infraDir

Write-Host "Running: terraform apply -auto-approve" -ForegroundColor Yellow
terraform apply -auto-approve

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Deployment successful! Getting outputs..." -ForegroundColor Green
    Write-Host ""
    
    terraform output -json | ConvertFrom-Json | ForEach-Object {
        $_.PSObject.Properties | ForEach-Object {
            Write-Host "$($_.Name): $($_.Value)" -ForegroundColor Cyan
        }
    }
    
    Write-Host ""
    Write-Host "Your IllyBoost application is now running in Oracle Cloud!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Wait 2-3 minutes for instances to start" -ForegroundColor Gray
    Write-Host "2. Update frontend config with backend IP" -ForegroundColor Gray
    Write-Host "3. Access at: http://localhost:5173/IllyBoost/" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "Deployment had errors. Check the output above." -ForegroundColor Red
    Write-Host "Run this command again to retry:" -ForegroundColor Yellow
    Write-Host "  cd $infraDir" -ForegroundColor Green
    Write-Host "  terraform apply -auto-approve" -ForegroundColor Green
}

Pop-Location
