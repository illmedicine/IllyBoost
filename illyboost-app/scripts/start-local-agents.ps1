<#!
.SYNOPSIS
  Launch multiple local Python agent processes as background PowerShell jobs.

USAGE
  .\start-local-agents.ps1 -Count 2 -AgentSecret 'mysupersecret'

This will start N agents as PowerShell background jobs. Use Get-Job / Stop-Job to manage them.
#>

param(
  [int]$Count = 2,
  [string]$AgentSecret = 'mysupersecret'
)

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = Resolve-Path (Join-Path $scriptRoot '..')
Set-Location $repoRoot

Write-Host "Starting $Count local agents (backend=localhost) as background jobs..."
for ($i=1; $i -le $Count; $i++) {
  $agentId = "agent-local-$i"
  $jobName = "illy-agent-$i"
  Start-Job -Name $jobName -ArgumentList $agentId, $repoRoot -ScriptBlock {
    param($id, $repo)
    Set-Location $repo
    $env:BACKEND_HOST = 'localhost'
    $env:AGENT_SECRET = $using:AgentSecret
    $env:AGENT_ID = $id
    Write-Output "Agent starting: $id"
    python .\agent\agent.py
  }
  Write-Host "Started job $jobName -> $agentId"
}

Write-Host "Use `Get-Job` to list jobs, `Receive-Job -Name illy-agent-1 -Keep` to tail output, and `Stop-Job -Name illy-agent-*; Remove-Job -Name illy-agent-*` to stop and remove jobs."
