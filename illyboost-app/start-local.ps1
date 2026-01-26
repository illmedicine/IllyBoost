# IllyBoost Production Launcher Script (Windows PowerShell)
# This script starts all components for local testing

$ErrorActionPreference = "Stop"

Write-Host "===========================================" -ForegroundColor Green
Write-Host "  IllyBoost - Production Launcher" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green
Write-Host ""

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Node.js is not installed." -ForegroundColor Red
    Write-Host "Install from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Function to start backend
function Start-Backend {
    Write-Host "Starting Backend Server..." -ForegroundColor Cyan
    
    Push-Location backend
    
    # Install dependencies if not already installed
    if (-not (Test-Path "node_modules")) {
        Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
        npm install
    }
    
    Write-Host "Backend starting on port 3001..." -ForegroundColor Green
    Write-Host "  REST API: http://localhost:3001" -ForegroundColor Gray
    Write-Host "  Agent WS: ws://localhost:3002" -ForegroundColor Gray
    Write-Host "  Frontend WS: ws://localhost:3003" -ForegroundColor Gray
    Write-Host ""
    
    # Start in background
    $script:BackendProcess = Start-Process -FilePath "npm" -ArgumentList "start" -PassThru -NoNewWindow
    Write-Host "Backend PID: $($script:BackendProcess.Id)" -ForegroundColor Gray
    
    Pop-Location
}

# Function to start frontend
function Start-Frontend {
    Write-Host ""
    Write-Host "Starting Frontend..." -ForegroundColor Cyan
    
    Push-Location frontend
    
    # Install dependencies if not already installed
    if (-not (Test-Path "node_modules")) {
        Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
        npm install
    }
    
    Write-Host "Frontend starting on port 5173..." -ForegroundColor Green
    Write-Host "  URL: http://localhost:5173" -ForegroundColor Gray
    Write-Host ""
    
    # Start in background
    $script:FrontendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru -NoNewWindow
    Write-Host "Frontend PID: $($script:FrontendProcess.Id)" -ForegroundColor Gray
    
    Pop-Location
}

# Function to cleanup on exit
function Cleanup {
    Write-Host ""
    Write-Host "===========================================" -ForegroundColor Yellow
    Write-Host "  Shutting down..." -ForegroundColor Yellow
    Write-Host "===========================================" -ForegroundColor Yellow
    
    if ($script:BackendProcess) {
        Write-Host "Stopping backend (PID: $($script:BackendProcess.Id))..." -ForegroundColor Gray
        Stop-Process -Id $script:BackendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    
    if ($script:FrontendProcess) {
        Write-Host "Stopping frontend (PID: $($script:FrontendProcess.Id))..." -ForegroundColor Gray
        Stop-Process -Id $script:FrontendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    
    Write-Host "Shutdown complete." -ForegroundColor Green
}

# Set up trap to cleanup on exit
Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Cleanup } | Out-Null

# Main flow
Write-Host "Starting IllyBoost components..." -ForegroundColor Cyan
Write-Host ""

Start-Backend

# Wait for backend to be ready
Write-Host "Waiting for backend to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Start-Frontend

Write-Host ""
Write-Host "===========================================" -ForegroundColor Green
Write-Host "  ✓ IllyBoost is Running!" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Frontend URL: http://localhost:5173" -ForegroundColor Cyan
Write-Host "Backend API: http://localhost:3001" -ForegroundColor Cyan
Write-Host ""
Write-Host "To test with Docker agents:" -ForegroundColor Yellow
Write-Host "  In another terminal, run:" -ForegroundColor Gray
Write-Host "  docker compose -f docker-compose.test.yml up --scale agent=3 --build" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow
Write-Host ""

# Keep script running
while ($true) {
    Start-Sleep -Seconds 1
    
    if ($script:BackendProcess.HasExited -or $script:FrontendProcess.HasExited) {
        Write-Host "One of the processes has exited. Cleaning up..." -ForegroundColor Red
        Cleanup
        exit 1
    }
}
