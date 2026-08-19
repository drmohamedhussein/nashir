#Requires -RunAsAdministrator
<#
.SYNOPSIS
  One-time OpenSSH setup so Cloud Agent can sync rankpublish-site to LocalWP.

  Double-click setup-win-ssh.cmd (UAC prompt once) — no manual PowerShell needed.

  After run, add printed values to Cursor → Settings → Cloud Agents → Secrets:
    RANKPUBLISH_WIN_SSH_HOST
    RANKPUBLISH_WIN_SSH_USER
    RANKPUBLISH_WIN_SSH_PASS
#>
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "RankPublish — Windows SSH setup for Cloud Agent" -ForegroundColor Cyan
Write-Host ("=" * 50)

# 1. Install OpenSSH Server
$cap = Get-WindowsCapability -Online | Where-Object { $_.Name -like "OpenSSH.Server*" }
if ($cap.State -ne "Installed") {
  Write-Host "Installing OpenSSH Server..."
  Add-WindowsCapability -Online -Name "OpenSSH.Server~~~~0.0.1.0" | Out-Null
} else {
  Write-Host "OpenSSH Server already installed."
}

# 2. Start + enable sshd
Set-Service -Name sshd -StartupType Automatic
Start-Service sshd
Write-Host "sshd service: running"

# 3. Firewall rule
$ruleName = "OpenSSH-Server-In-TCP"
if (-not (Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -Name $ruleName `
    -DisplayName "OpenSSH Server (sshd)" `
    -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22 | Out-Null
  Write-Host "Firewall: port 22 allowed"
} else {
  Write-Host "Firewall rule already exists."
}

# 4. Collect values for Cursor Secrets
$user = $env:USERNAME
$localIp = (Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike "127.*" -and $_.PrefixOrigin -ne "WellKnown" } |
  Select-Object -First 1).IPAddress

try {
  $publicIp = (Invoke-RestMethod -Uri "https://ifconfig.me/ip" -TimeoutSec 8).Trim()
} catch {
  $publicIp = "(open https://ifconfig.me in browser)"
}

$publicPath = Join-Path $env:USERPROFILE "Local Sites\rankpublish\app\public"
if (-not (Test-Path $publicPath)) {
  $publicPath = "C:/Users/$user/Local Sites/rankpublish/app/public"
}

Write-Host ""
Write-Host "Add these to Cursor → Settings → Cloud Agents → Secrets:" -ForegroundColor Green
Write-Host ""
Write-Host "  RANKPUBLISH_WIN_SSH_USER = $user"
Write-Host "  RANKPUBLISH_WIN_SSH_PASS = (your Windows login password)"
Write-Host "  RANKPUBLISH_WIN_PUBLIC   = $($publicPath -replace '\\','/')"
Write-Host ""
Write-Host "  RANKPUBLISH_WIN_SSH_HOST = choose ONE:"
Write-Host "    Local network only : $localIp"
Write-Host "    Internet (router)  : $publicIp  (+ port-forward 22 on router)"
Write-Host "    Recommended        : Tailscale IP (install Tailscale, use its 100.x IP)"
Write-Host ""
Write-Host "Test from another machine: ssh $user@$localIp" -ForegroundColor Yellow
Write-Host ""
Write-Host "Done. Re-run Cloud Agent and ask it to deploy." -ForegroundColor Green
Write-Host ""

# Keep window open when launched via double-click
if ($Host.Name -eq "ConsoleHost") {
  Read-Host "Press Enter to close"
}
