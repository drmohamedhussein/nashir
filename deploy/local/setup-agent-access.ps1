#Requires -RunAsAdministrator
<#
  Creates dedicated local accounts for Cloud Agent access.
  - Windows user: rp-cursor (SSH key auth, no Microsoft account needed)
  - Grants plugin folder access on all LocalWP sites
  - Writes Cursor secrets file

  Run: .\deploy\local\rp-local.cmd agent-setup
#>
param([switch]$SkipSshd)

$ErrorActionPreference = "Stop"
$AgentWinUser = "rp-cursor"
$LogFile = Join-Path $env:USERPROFILE ".ssh\rankpublish-agent-setup.log"
$SecretsFile = Join-Path $env:USERPROFILE ".ssh\CURSOR-SECRETS-rankpublish.txt"
$SshDir = Join-Path $env:USERPROFILE ".ssh"
$KeyPath = Join-Path $SshDir "rankpublish_cloud_agent"

function Log([string]$Msg) {
  Write-Host $Msg
  Add-Content $LogFile "[$(Get-Date -Format 'HH:mm:ss')] $Msg" -Encoding ascii -ErrorAction SilentlyContinue
}

function New-RandomPassword([int]$Len = 28) {
  -join ((48..57) + (65..90) + (97..122) | Get-Random -Count $Len | ForEach-Object { [char]$_ })
}

New-Item -ItemType Directory -Force -Path $SshDir | Out-Null
Log ""
Log "RankPublish agent access setup"
Log ("=" * 40)

# --- 1. Windows local user (not Microsoft account) ---
$agentPass = New-RandomPassword
$userExists = $null -ne (Get-LocalUser -Name $AgentWinUser -ErrorAction SilentlyContinue)
if (-not $userExists) {
  $sec = ConvertTo-SecureString $agentPass -AsPlainText -Force
  New-LocalUser -Name $AgentWinUser -Password $sec -FullName "RankPublish Cloud Agent" -Description "SSH/file access for Cursor Cloud Agent" | Out-Null
  Log "Created Windows user: $AgentWinUser"
} else {
  $sec = ConvertTo-SecureString $agentPass -AsPlainText -Force
  Set-LocalUser -Name $AgentWinUser -Password $sec | Out-Null
  Log "Reset password for existing user: $AgentWinUser"
}

# --- 2. SSH key (for Cloud Agent; no interactive password) ---
if (-not (Test-Path $KeyPath)) {
  $kg = Get-Command ssh-keygen -ErrorAction SilentlyContinue
  if (-not $kg) {
    throw "Install OpenSSH Client: Settings > Optional features > OpenSSH Client"
  }
  $pinfo = New-Object System.Diagnostics.ProcessStartInfo
  $pinfo.FileName = $kg.Source
  $pinfo.Arguments = "-t ed25519 -f `"$KeyPath`" -N `"`" -C rankpublish-cloud-agent"
  $pinfo.UseShellExecute = $false
  $pinfo.CreateNoWindow = $true
  $p = [Diagnostics.Process]::Start($pinfo)
  $p.WaitForExit()
  if ($p.ExitCode -ne 0 -or -not (Test-Path $KeyPath)) {
    throw "ssh-keygen failed. Run: ssh-keygen -t ed25519 -f `"$KeyPath`" -N `"`""
  }
  Log "SSH key: $KeyPath"
} else {
  Log "SSH key exists: $KeyPath"
}

# --- 3. authorized_keys for rp-cursor ---
$agentProfile = "C:\Users\$AgentWinUser"
$agentSsh = Join-Path $agentProfile ".ssh"
$agentAuth = Join-Path $agentSsh "authorized_keys"
New-Item -ItemType Directory -Force -Path $agentSsh | Out-Null
$pub = (Get-Content "$KeyPath.pub" -Raw).Trim()
Set-Content -Path $agentAuth -Value $pub -Encoding ascii
icacls $agentAuth /inheritance:r /grant "Administrators:F" /grant "SYSTEM:F" /grant "${AgentWinUser}:F" | Out-Null
Log "authorized_keys for $AgentWinUser"

# --- 4. Grant plugin access (fast: no recursive /T on all plugins) ---
Log "Granting plugin access..."
$localSites = Join-Path $env:USERPROFILE "Local Sites"
$granted = @()
if (Test-Path $localSites) {
  Get-ChildItem $localSites -Directory | ForEach-Object {
    $plugins = Join-Path $_.FullName "app\public\wp-content\plugins"
    if (-not (Test-Path $plugins)) { return }
    Log "  $($_.Name)..."
    # Inherit only on plugins root (instant). New sync writes rankpublish-site inside.
    icacls $plugins /grant "${AgentWinUser}:(OI)(CI)M" /Q 2>$null | Out-Null
    $rpsite = Join-Path $plugins "rankpublish-site"
    if (Test-Path $rpsite) {
      icacls $rpsite /grant "${AgentWinUser}:(OI)(CI)M" /Q 2>$null | Out-Null
    }
    $granted += $_.Name
  }
}
if ($granted.Count -gt 0) {
  Log ("Plugin access granted on: " + ($granted -join ", "))
} else {
  Log "No Local Sites found yet - re-run after creating sites in Local"
}

# --- 5. sshd (only if already installed; never hang on capability install) ---
$sshdOk = $false
$sshd = Get-Service sshd -ErrorAction SilentlyContinue
if ($sshd -and -not $SkipSshd) {
  Set-Service sshd -StartupType Automatic
  Start-Service sshd
  if (-not (Get-NetFirewallRule -Name "OpenSSH-Server-In-TCP" -EA SilentlyContinue)) {
    New-NetFirewallRule -Name "OpenSSH-Server-In-TCP" -DisplayName "OpenSSH Server" -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22 | Out-Null
  }
  $sshdOk = $true
  Log "sshd running"
} else {
  Log "sshd not installed - skip SSH remote (local sync still works)"
  Log "Optional: Settings > Optional features > OpenSSH Server > Install"
}

# --- 6. Network + paths ---
$localIp = (Get-NetIPAddress -AddressFamily IPv4 -EA SilentlyContinue |
  Where-Object { $_.IPAddress -notlike "127.*" -and $_.PrefixOrigin -ne "WellKnown" } |
  Select-Object -First 1).IPAddress
if (-not $localIp) { $localIp = "127.0.0.1" }

$rankpublishPublic = Join-Path $env:USERPROFILE "Local Sites\rankpublish\app\public"
$rankpublishUnix = ($rankpublishPublic -replace '\\', '/')
$privateKey = Get-Content $KeyPath -Raw

$lines = @(
  "RankPublish Cloud Agent - Local Access",
  "Generated: $(Get-Date)",
  "",
  "=== Cursor Secrets (Cloud Agents) ===",
  "",
  "RANKPUBLISH_WIN_SSH_USER = $AgentWinUser",
  "RANKPUBLISH_WIN_SSH_HOST = $localIp",
  "RANKPUBLISH_WIN_PUBLIC = $rankpublishUnix",
  "RANKPUBLISH_WIN_SSH_PRIVATE_KEY =",
  $privateKey.Trim(),
  "",
  "=== WordPress agent (run: rp-local.cmd agent-wp --site rankpublish) ===",
  "RANKPUBLISH_WP_AGENT_USER = rp-cursor",
  "",
  "=== Windows login (backup only; prefer SSH key above) ===",
  "RANKPUBLISH_WIN_SSH_PASS = $agentPass",
  "",
  "Windows user $AgentWinUser is a LOCAL account (not Microsoft email).",
  "SSH key auth works without your Windows password.",
  "",
  "Cloud Agent cannot reach LAN IPs. Keep this running while agents sync:",
  "  .\\rp-local.cmd cloud-tunnel"
)
[System.IO.File]::WriteAllLines($SecretsFile, $lines)
Log "Secrets: $SecretsFile"

Write-Host ""
Write-Host "DONE" -ForegroundColor Green
Write-Host "  Secrets file: $SecretsFile"
Write-Host "  Windows user: $AgentWinUser (local account)"
if ($sshdOk) { Write-Host "  SSH: ready on port 22" } else { Write-Host "  SSH: install OpenSSH Server from Settings (optional)" -ForegroundColor Yellow }
Write-Host ""
Write-Host "Next:"
Write-Host "  1. Copy secrets to Cursor > Cloud Agents > Secrets"
Write-Host "  2. .\deploy\local\rp-local.cmd agent-wp --site rankpublish"
Write-Host "  3. Keep tunnel open for Cloud Agents: .\rp-local.cmd cloud-tunnel"
Write-Host "  4. Or sync locally: .\rp-local.cmd sync --site rankpublish"
Write-Host ""
Start-Process notepad.exe $SecretsFile
Read-Host "Press Enter to close"
