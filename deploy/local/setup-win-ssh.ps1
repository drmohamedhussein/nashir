#Requires -RunAsAdministrator
<#
.SYNOPSIS
  One-time OpenSSH setup for Cloud Agent — uses SSH KEY (no Windows password needed).
  Works with Microsoft account sign-in (email/PIN).

  Run: .\deploy\local\rp-local.cmd setup-ssh
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "RankPublish — Windows SSH setup (key auth, no password)" -ForegroundColor Cyan
Write-Host ("=" * 50)

# 1. OpenSSH Server
$cap = Get-WindowsCapability -Online | Where-Object { $_.Name -like "OpenSSH.Server*" }
if ($cap.State -ne "Installed") {
  Write-Host "Installing OpenSSH Server..."
  Add-WindowsCapability -Online -Name "OpenSSH.Server~~~~0.0.1.0" | Out-Null
} else {
  Write-Host "OpenSSH Server already installed."
}

# 2. sshd service
Set-Service -Name sshd -StartupType Automatic
Start-Service sshd
Write-Host "sshd service: running"

# 3. Firewall
$ruleName = "OpenSSH-Server-In-TCP"
if (-not (Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -Name $ruleName `
    -DisplayName "OpenSSH Server (sshd)" `
    -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22 | Out-Null
  Write-Host "Firewall: port 22 allowed"
}

# 4. SSH key for Cloud Agent (no Windows password required)
$user = $env:USERNAME
$sshDir = Join-Path $env:USERPROFILE ".ssh"
$keyPath = Join-Path $sshDir "rankpublish_cloud_agent"
$authKeys = Join-Path $sshDir "authorized_keys"
$sshdConfig = "$env:ProgramData\ssh\sshd_config"

New-Item -ItemType Directory -Force -Path $sshDir | Out-Null

if (-not (Test-Path $keyPath)) {
  Write-Host "Generating SSH key pair..."
  & ssh-keygen -t ed25519 -f $keyPath -N '""' -C "rankpublish-cloud-agent" | Out-Null
} else {
  Write-Host "SSH key already exists: $keyPath"
}

$pubKey = Get-Content "$keyPath.pub" -Raw
$pubKeyLine = $pubKey.Trim()

if (Test-Path $authKeys) {
  $existing = Get-Content $authKeys -Raw
  if ($existing -notlike "*$pubKeyLine*") {
    Add-Content -Path $authKeys -Value $pubKeyLine
  }
} else {
  Set-Content -Path $authKeys -Value $pubKeyLine -Encoding utf8
}

# Fix ACL on authorized_keys (required by OpenSSH on Windows)
icacls $authKeys /inheritance:r /grant "${env:USERNAME}:F" /grant "SYSTEM:F" | Out-Null

# Ensure pubkey auth is enabled in sshd_config
if (Test-Path $sshdConfig) {
  $cfg = Get-Content $sshdConfig -Raw
  if ($cfg -notmatch "(?m)^PubkeyAuthentication yes") {
    Add-Content $sshdConfig "`nPubkeyAuthentication yes"
  }
  if ($cfg -match "(?m)^#?\s*PasswordAuthentication yes") {
    (Get-Content $sshdConfig) -replace "^#?\s*PasswordAuthentication yes", "PasswordAuthentication no" | Set-Content $sshdConfig
  }
  Restart-Service sshd
}

# 5. Network info
$localIp = (Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike "127.*" -and $_.PrefixOrigin -ne "WellKnown" } |
  Select-Object -First 1).IPAddress

try {
  $publicIp = (Invoke-RestMethod -Uri "https://ifconfig.me/ip" -TimeoutSec 8).Trim()
} catch {
  $publicIp = "(open https://ifconfig.me)"
}

$publicPath = Join-Path $env:USERPROFILE "Local Sites\rankpublish\app\public"
if (-not (Test-Path $publicPath)) {
  $publicPath = "C:/Users/$user/Local Sites/rankpublish/app/public"
}

$privateKeyContent = Get-Content $keyPath -Raw

Write-Host ""
Write-Host "Microsoft account / no Windows password — use SSH KEY only:" -ForegroundColor Green
Write-Host ""
Write-Host "Cursor → Settings → Cloud Agents → Secrets — add:"
Write-Host ""
Write-Host "  RANKPUBLISH_WIN_SSH_USER = $user"
Write-Host "  RANKPUBLISH_WIN_SSH_HOST  = $localIp  (or Tailscale 100.x IP)"
Write-Host "  RANKPUBLISH_WIN_PUBLIC    = $($publicPath -replace '\\','/')"
Write-Host ""
Write-Host "  RANKPUBLISH_WIN_SSH_PRIVATE_KEY = paste entire private key below:"
Write-Host ("-" * 50) -ForegroundColor DarkGray
Write-Host $privateKeyContent -ForegroundColor Yellow
Write-Host ("-" * 50) -ForegroundColor DarkGray
Write-Host ""
Write-Host "  (Do NOT use RANKPUBLISH_WIN_SSH_PASS — not needed with key auth)"
Write-Host ""
Write-Host "Private key file saved at: $keyPath" -ForegroundColor DarkGray
Write-Host "Public IP (router forward): $publicIp"
Write-Host ""
Write-Host "Test locally: ssh -i `"$keyPath`" $user@localhost" -ForegroundColor Yellow
Write-Host ""

if ($Host.Name -eq "ConsoleHost") {
  Read-Host "Press Enter to close"
}
