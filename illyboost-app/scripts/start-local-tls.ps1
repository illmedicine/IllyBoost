<#
.SYNOPSIS
  PowerShell wrapper to run the local TLS helper on Windows.

.DESCRIPTION
  Sets helpful environment variables and invokes the Node TLS helper `scripts/start-local-tls.js`.

.PARAMETER AgentSecret
  Optional agent secret to export to child processes.

.PARAMETER Port
  Backend HTTPS port to export (default 3001).

.PARAMETER FrontendPort
  Frontend HTTPS preview port to export (default 5173).

USAGE:
  .\start-local-tls.ps1 -AgentSecret mysecret -Port 3001 -FrontendPort 5173
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)] [string]$AgentSecret = "",
    [Parameter(Mandatory=$false)] [int]$Port = 3001,
    [Parameter(Mandatory=$false)] [int]$FrontendPort = 5173
)

try {
    $scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
    $repoRoot = Resolve-Path (Join-Path $scriptRoot '..')
} catch {
    Write-Error "Failed to resolve script path: $_"
    exit 1
}

Write-Host "Repo root: $repoRoot"
Set-Location $repoRoot

if ($AgentSecret -ne "") {
    $env:AGENT_SECRET = $AgentSecret
    Write-Host "Exported AGENT_SECRET"
}

$env:PORT = $Port
$env:FRONTEND_PORT = $FrontendPort
Write-Host "Exported PORT=$Port and FRONTEND_PORT=$FrontendPort"

# Ensure Node is available
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Error "Node.js not found in PATH. Install Node.js and try again."
    exit 1
}

$scriptPath = Join-Path $repoRoot 'scripts\start-local-tls.js'
if (-not (Test-Path $scriptPath)) {
    Write-Error "Helper script not found at $scriptPath"
    exit 1
}

Write-Host "Launching local TLS helper..."
& node $scriptPath
$exit = $LASTEXITCODE
if ($exit -ne 0) {
    Write-Error "start-local-tls.js exited with code $exit"
}
exit $exit
