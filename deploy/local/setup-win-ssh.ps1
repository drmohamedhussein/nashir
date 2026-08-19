<#
.SYNOPSIS
  OpenSSH + SSH key for Cloud Agent (no Windows password — Microsoft account OK).

  Run: .\deploy\local\rp-local.cmd setup-ssh
#>
$ErrorActionPreference = "Stop"

$LogFile = Join-Path $env:USERPROFILE ".ssh\rankpublish-setup.log"
$SecretsFile = Join-Path $env:USERPROFILE ".ssh\CURSOR-SECRETS-rankpublish.txt"

function Write-Log([string]$Message) {
  $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $Message"
  Write-Host $Message
  try {
    $dir = Split-Path $LogFile -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
    Add-Content -Path $LogFile -Value $line -Encoding utf8
  } catch { }
}

function Wait-Exit {
  Write-Host ""
  Write-Host "Press Enter to close this window..." -ForegroundColor Cyan
  Read-Host | Out-Null
}

try {
  Write-Log ""
  Write-Log "RankPublish — Windows SSH setup (key auth, no password)"
  Write-Log ("=" * 50)

  $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator
  )
  if (-not $isAdmin) {
    Write-Log "ERROR: Run as Administrator (use setup-win-ssh.cmd or rp-local.cmd setup-ssh)"
    Wait-Exit
    exit 1
  }

  # 1. OpenSSH Server
  Write-Log "Checking OpenSSH Server..."
  $cap = Get-WindowsCapability -Online -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "OpenSSH.Server*" }
  if ($cap -and $cap.State -ne "Installed") {
    Write-Log "Installing OpenSSH Server (may take 1-2 minutes)..."
    $result = Add-WindowsCapability -Online -Name "OpenSSH.Server~~~~0.0.1.0"
    Write-Log "Install state: $($result.RestartNeeded)"
  } else {
    Write-Log "OpenSSH Server already installed (or capability check skipped)."
  }

  # 2. sshd service
  $sshd = Get-Service -Name sshd -ErrorAction SilentlyContinue
  if (-not $sshd) {
    Write-Log "Installing sshd service..."
    $programData = $env:ProgramData
    $installScript = Join-Path $programData "Windows\OpenSSH\Install-sshd.ps1"
    if (Test-Path $installScript) {
      & powershell -ExecutionPolicy Bypass -File $installScript
    } else {
      throw "OpenSSH sshd service not found. Reboot Windows and run setup-ssh again."
    }
  }

  Set-Service -Name sshd -StartupType Automatic -ErrorAction Stop
  Start-Service sshd -ErrorAction Stop
  Write-Log "sshd service: running"

  # 3. Firewall
  $ruleName = "OpenSSH-Server-In-TCP"
  if (-not (Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -Name $ruleName `
      -DisplayName "OpenSSH Server (sshd)" `
      -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22 | Out-Null
    Write-Log "Firewall: port 22 allowed"
  } else {
    Write-Log "Firewall rule already exists."
  }

  # 4. SSH key
  $user = $env:USERNAME
  $sshDir = Join-Path $env:USERPROFILE ".ssh"
  $keyPath = Join-Path $sshDir "rankpublish_cloud_agent"
  $authKeys = Join-Path $sshDir "authorized_keys"
  $sshdConfig = "$env:ProgramData\ssh\sshd_config"

  New-Item -ItemType Directory -Force -Path $sshDir | Out-Null

  if (-not (Test-Path $keyPath)) {
    Write-Log "Generating SSH key pair..."
    $emptyPass = [string]::Empty
    & ssh-keygen -t ed25519 -f $keyPath -N $emptyPass -C "rankpublish-cloud-agent" -q
    if ($LASTEXITCODE -ne 0) { throw "ssh-keygen failed (exit $LASTEXITCODE)" }
  } else {
    Write-Log "SSH key already exists: $keyPath"
  }

  $pubKeyLine = (Get-Content "$keyPath.pub" -Raw).Trim()

  if (Test-Path $authKeys) {
    $existing = Get-Content $authKeys -Raw -ErrorAction SilentlyContinue
    if ($existing -notlike "*rankpublish-cloud-agent*") {
      Add-Content -Path $authKeys -Value $pubKeyLine
    }
  } else {
    Set-Content -Path $authKeys -Value $pubKeyLine -Encoding ascii
  }

  icacls $authKeys /inheritance:r /grant "${env:USERNAME}:F" /grant "SYSTEM:F" | Out-Null

  if (Test-Path $sshdConfig) {
    $lines = Get-Content $sshdConfig
    $changed = $false
    if ($lines -notmatch "^\s*PubkeyAuthentication\s+yes") {
      $lines += "PubkeyAuthentication yes"
      $changed = $true
    }
    $lines = $lines | ForEach-Object {
      if ($_ -match "^\s*PasswordAuthentication\s+yes") {
        $changed = $true
        "PasswordAuthentication no"
      } else { $_ }
    }
    if ($changed) {
      Set-Content -Path $sshdConfig -Value $lines -Encoding ascii
      Restart-Service sshd
      Write-Log "sshd_config updated (pubkey auth on)"
    }
  }

  # 5. Network
  $localIp = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike "127.*" -and $_.PrefixOrigin -ne "WellKnown" } |
    Select-Object -First 1).IPAddress
  if (-not $localIp) { $localIp = "YOUR-LOCAL-IP" }

  try {
    $publicIp = (Invoke-RestMethod -Uri "https://ifconfig.me/ip" -TimeoutSec 8).Trim()
  } catch {
    $publicIp = "(open https://ifconfig.me)"
  }

  $publicPath = Join-Path $env:USERPROFILE "Local Sites\rankpublish\app\public"
  if (-not (Test-Path $publicPath)) {
    $publicPath = "C:/Users/$user/Local Sites/rankpublish/app/public"
  }
  $publicPathUnix = $publicPath -replace '\\', '/'

  $privateKeyContent = Get-Content $keyPath -Raw

  $secretsText = @"
RankPublish — Cursor Cloud Agent Secrets
Generated: $(Get-Date)

Add in Cursor → Settings → Cloud Agents → Secrets:

RANKPUBLISH_WIN_SSH_USER = $user
RANKPUBLISH_WIN_SSH_HOST = $localIp
RANKPUBLISH_WIN_PUBLIC = $publicPathUnix

RANKPUBLISH_WIN_SSH_PRIVATE_KEY =
$privateKeyContent

(Do NOT add RANKPUBLISH_WIN_SSH_PASS — key auth only, works with Microsoft account)

Test: ssh -i "$keyPath" $user@localhost
"@

  Set-Content -Path $SecretsFile -Value $secretsText -Encoding utf8
  Write-Log "Secrets saved to: $SecretsFile"
  Write-Log "Log file: $LogFile"

  Write-Host ""
  Write-Host "SUCCESS — copy secrets from this file:" -ForegroundColor Green
  Write-Host "  $SecretsFile" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Or copy from below:" -ForegroundColor Green
  Write-Host $secretsText
  Write-Host ""

  # Open secrets file in Notepad
  Start-Process notepad.exe $SecretsFile

} catch {
  Write-Host ""
  Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
  Write-Log "ERROR: $($_.Exception.Message)"
  Write-Log $_.ScriptStackTrace
  Write-Host ""
  Write-Host "Full log: $LogFile" -ForegroundColor Yellow
}

Wait-Exit
