<#
.SYNOPSIS
  Keep a reverse SSH tunnel from this Windows PC to Contabo so Cursor Cloud Agents can reach LocalWP.

.DESCRIPTION
  Cloud Agents cannot dial private LAN IPs. This script opens:
    Contabo:127.0.0.1:2222  ->  this PC:22 (OpenSSH Server)

  Keep the window open while the Cloud Agent works.

.EXAMPLE
  .\deploy\local\rp-local.cmd cloud-tunnel
#>
param(
  [string]$ContaboHost = $env:NASHIR_SSH_HOST,
  [string]$ContaboUser = $env:NASHIR_SSH_USER,
  [int]$TunnelPort = 2222,
  [string]$KeyPath = (Join-Path $env:USERPROFILE ".ssh\rankpublish_cloud_agent")
)

$ErrorActionPreference = "Stop"

function Read-TunnelConfig {
  $candidates = @(
    (Join-Path $env:USERPROFILE ".ssh\rankpublish-tunnel.json"),
    (Join-Path $PSScriptRoot "cloud-tunnel.config.json")
  )
  foreach ($p in $candidates) {
    if (Test-Path $p) {
      try { return Get-Content $p -Raw | ConvertFrom-Json } catch { }
    }
  }
  return $null
}

function Read-SecretsFileHost {
  $secrets = Join-Path $env:USERPROFILE ".ssh\CURSOR-SECRETS-rankpublish.txt"
  if (-not (Test-Path $secrets)) { return @{ Host = $null; User = $null } }
  $hostVal = $null; $userVal = $null
  foreach ($line in Get-Content $secrets) {
    if ($line -match '^\s*NASHIR_SSH_HOST\s*=\s*(.+)\s*$') { $hostVal = $Matches[1].Trim() }
    if ($line -match '^\s*NASHIR_SSH_USER\s*=\s*(.+)\s*$') { $userVal = $Matches[1].Trim() }
    if ($line -match '^\s*RANKPUBLISH_TUNNEL_HOST\s*=\s*(.+)\s*$') { $hostVal = $Matches[1].Trim() }
    if ($line -match '^\s*RANKPUBLISH_TUNNEL_USER\s*=\s*(.+)\s*$') { $userVal = $Matches[1].Trim() }
  }
  return @{ Host = $hostVal; User = $userVal }
}

$cfg = Read-TunnelConfig
if (-not $ContaboHost -and $cfg -and $cfg.host) { $ContaboHost = [string]$cfg.host }
if (-not $ContaboUser -and $cfg -and $cfg.user) { $ContaboUser = [string]$cfg.user }
if ($cfg -and $cfg.port) { $TunnelPort = [int]$cfg.port }

if (-not $ContaboHost -or -not $ContaboUser) {
  $fromSecrets = Read-SecretsFileHost
  if (-not $ContaboHost) { $ContaboHost = $fromSecrets.Host }
  if (-not $ContaboUser) { $ContaboUser = $fromSecrets.User }
}

Write-Host ""
Write-Host "RankPublish Cloud Tunnel" -ForegroundColor Cyan
Write-Host ("=" * 40)

if (-not (Test-Path $KeyPath)) {
  Write-Host "Missing SSH key: $KeyPath" -ForegroundColor Red
  Write-Host "Run first: .\rp-local.cmd agent-setup"
  exit 1
}

$sshd = Get-Service -Name sshd -ErrorAction SilentlyContinue
if (-not $sshd) {
  Write-Host "OpenSSH Server (sshd) is not installed." -ForegroundColor Red
  Write-Host "Run as Admin: .\rp-local.cmd setup-ssh"
  exit 1
}
if ($sshd.Status -ne "Running") {
  try {
    Start-Service sshd
    Write-Host "Started sshd"
  } catch {
    Write-Host "Could not start sshd. Run as Admin: Start-Service sshd" -ForegroundColor Red
    exit 1
  }
}

if (-not $ContaboHost -or -not $ContaboUser) {
  Write-Host "Contabo host/user not found." -ForegroundColor Red
  Write-Host "Add to $env:USERPROFILE\.ssh\rankpublish-tunnel.json :"
  Write-Host '  { "host": "YOUR_NASHIR_SSH_HOST", "user": "YOUR_NASHIR_SSH_USER", "port": 2222 }'
  Write-Host "Values are the same as Cursor secrets NASHIR_SSH_HOST / NASHIR_SSH_USER."
  exit 1
}

$ssh = Get-Command ssh -ErrorAction SilentlyContinue
if (-not $ssh) {
  Write-Host "ssh.exe not found. Install OpenSSH Client." -ForegroundColor Red
  exit 1
}

Write-Host "Local sshd: running"
Write-Host "Key:        $KeyPath"
Write-Host "Jump:       $ContaboUser@$ContaboHost"
Write-Host "Map:        Contabo 127.0.0.1:$TunnelPort  ->  this PC :22"
Write-Host ""
Write-Host "Keep this window OPEN while the Cloud Agent syncs." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop the tunnel." -ForegroundColor Yellow
Write-Host ""

# Clear stale host keys for Contabo on first connect noise
$sshArgs = @(
  "-i", $KeyPath,
  "-N",
  "-o", "ServerAliveInterval=30",
  "-o", "ServerAliveCountMax=3",
  "-o", "ExitOnForwardFailure=yes",
  "-o", "StrictHostKeyChecking=accept-new",
  "-R", "127.0.0.1:${TunnelPort}:127.0.0.1:22",
  "$ContaboUser@$ContaboHost"
)

while ($true) {
  Write-Host "[$(Get-Date -Format 'HH:mm:ss')] connecting…"
  & ssh @sshArgs
  $code = $LASTEXITCODE
  Write-Host "[$(Get-Date -Format 'HH:mm:ss')] ssh exited ($code). Reconnecting in 5s…" -ForegroundColor DarkYellow
  Start-Sleep -Seconds 5
}
