<#
.SYNOPSIS
  OpenSSH + SSH key for Cloud Agent (no Windows password; Microsoft account OK).

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
    Add-Content -Path $LogFile -Value $line -Encoding ascii
  } catch { }
}

function Wait-Exit {
  Write-Host ""
  Write-Host "Press Enter to close this window..." -ForegroundColor Cyan
  Read-Host | Out-Null
}

function Write-SecretsFile([string]$Path, [string]$User, [string]$HostIp, [string]$PublicPath, [string]$KeyPath, [string]$PrivateKey) {
  $out = New-Object System.Collections.Generic.List[string]
  $out.Add("RankPublish - Cursor Cloud Agent Secrets")
  $out.Add("Generated: $(Get-Date)")
  $out.Add("")
  $out.Add("Add in Cursor > Settings > Cloud Agents > Secrets:")
  $out.Add("")
  $out.Add("RANKPUBLISH_WIN_SSH_USER = $User")
  $out.Add("RANKPUBLISH_WIN_SSH_HOST = $HostIp")
  $out.Add("RANKPUBLISH_WIN_PUBLIC = $PublicPath")
  $out.Add("")
  $out.Add("RANKPUBLISH_WIN_SSH_PRIVATE_KEY =")
  $out.Add($PrivateKey.Trim())
  $out.Add("")
  $out.Add("Do NOT add RANKPUBLISH_WIN_SSH_PASS - key auth only (Microsoft account OK)")
  $out.Add("")
  $out.Add("Test: ssh -i `"$KeyPath`" ${User}@localhost")
  [System.IO.File]::WriteAllLines($Path, $out.ToArray())
}

try {
  Write-Log ""
  Write-Log "RankPublish - Windows SSH setup (key auth, no password)"
  Write-Log ("=" * 50)

  $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator
  )
  if (-not $isAdmin) {
    Write-Log "ERROR: Run as Administrator (use setup-win-ssh.cmd or rp-local.cmd setup-ssh)"
    Wait-Exit
    exit 1
  }

  Write-Log "Checking OpenSSH Server..."
  $cap = Get-WindowsCapability -Online -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "OpenSSH.Server*" }
  if ($cap -and $cap.State -ne "Installed") {
    Write-Log "Installing OpenSSH Server (may take 1-2 minutes)..."
    $result = Add-WindowsCapability -Online -Name "OpenSSH.Server~~~~0.0.1.0"
    Write-Log "Install state: $($result.RestartNeeded)"
  } else {
    Write-Log "OpenSSH Server already installed."
  }

  $sshd = Get-Service -Name sshd -ErrorAction SilentlyContinue
  if (-not $sshd) {
    Write-Log "Installing sshd service..."
    $installScript = Join-Path $env:ProgramData "Windows\OpenSSH\Install-sshd.ps1"
    if (Test-Path $installScript) {
      & powershell -ExecutionPolicy Bypass -File $installScript
    } else {
      throw "OpenSSH sshd service not found. Reboot Windows and run setup-ssh again."
    }
  }

  Set-Service -Name sshd -StartupType Automatic -ErrorAction Stop
  Start-Service sshd -ErrorAction Stop
  Write-Log "sshd service: running"

  $ruleName = "OpenSSH-Server-In-TCP"
  if (-not (Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -Name $ruleName `
      -DisplayName "OpenSSH Server (sshd)" `
      -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22 | Out-Null
    Write-Log "Firewall: port 22 allowed"
  } else {
    Write-Log "Firewall rule already exists."
  }

  $user = $env:USERNAME
  $sshDir = Join-Path $env:USERPROFILE ".ssh"
  $keyPath = Join-Path $sshDir "rankpublish_cloud_agent"
  $authKeys = Join-Path $sshDir "authorized_keys"
  $sshdConfig = Join-Path $env:ProgramData "ssh\sshd_config"

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
      Add-Content -Path $authKeys -Value $pubKeyLine -Encoding ascii
    }
  } else {
    Set-Content -Path $authKeys -Value $pubKeyLine -Encoding ascii
  }

  icacls $authKeys /inheritance:r /grant "${env:USERNAME}:F" /grant "SYSTEM:F" | Out-Null

  if (Test-Path $sshdConfig) {
    $lines = @(Get-Content $sshdConfig)
    $changed = $false
    if (-not ($lines -match "^\s*PubkeyAuthentication\s+yes")) {
      $lines += "PubkeyAuthentication yes"
      $changed = $true
    }
    $newLines = New-Object System.Collections.Generic.List[string]
    foreach ($line in $lines) {
      if ($line -match "^\s*PasswordAuthentication\s+yes") {
        $newLines.Add("PasswordAuthentication no")
        $changed = $true
      } else {
        $newLines.Add($line)
      }
    }
    if ($changed) {
      [System.IO.File]::WriteAllLines($sshdConfig, $newLines.ToArray())
      Restart-Service sshd
      Write-Log "sshd_config updated (pubkey auth on)"
    }
  }

  $localIp = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike "127.*" -and $_.PrefixOrigin -ne "WellKnown" } |
    Select-Object -First 1).IPAddress
  if (-not $localIp) { $localIp = "YOUR-LOCAL-IP" }

  $publicPath = Join-Path $env:USERPROFILE "Local Sites\rankpublish\app\public"
  if (-not (Test-Path $publicPath)) {
    $publicPath = "C:/Users/$user/Local Sites/rankpublish/app/public"
  }
  $publicPathUnix = ($publicPath -replace '\\', '/')

  $privateKeyContent = Get-Content $keyPath -Raw
  Write-SecretsFile -Path $SecretsFile -User $user -HostIp $localIp -PublicPath $publicPathUnix -KeyPath $keyPath -PrivateKey $privateKeyContent

  Write-Log "Secrets saved to: $SecretsFile"
  Write-Log "Log file: $LogFile"

  Write-Host ""
  Write-Host "SUCCESS - secrets file opened in Notepad:" -ForegroundColor Green
  Write-Host "  $SecretsFile" -ForegroundColor Yellow
  Write-Host ""

  Start-Process notepad.exe $SecretsFile

} catch {
  Write-Host ""
  Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
  Write-Log "ERROR: $($_.Exception.Message)"
  if ($_.ScriptStackTrace) { Write-Log $_.ScriptStackTrace }
  Write-Host ""
  Write-Host "Full log: $LogFile" -ForegroundColor Yellow
}

Wait-Exit
