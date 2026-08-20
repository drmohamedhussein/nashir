<#
.SYNOPSIS
  OpenSSH + SSH key for Cloud Agent (no Windows password; Microsoft account OK).

  Run: .\deploy\local\rp-local.cmd setup-ssh
  Keys only (skip OpenSSH install): .\deploy\local\rp-local.cmd setup-ssh-key
#>
param(
  [switch]$KeysOnly
)

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
  $out.Add("IMPORTANT for Cursor Cloud Agents:")
  $out.Add("  HOST must be a PUBLIC / Tailscale IP (not 192.168.x.x).")
  $out.Add("  If only LAN IP is available, sync on Windows instead:")
  $out.Add("    .\\rp-local.cmd sync --site rankpublish")
  $out.Add("    .\\rp-local.cmd sync --site rankpublish-test")
  $out.Add("")
  $out.Add("Test: ssh -i `"$KeyPath`" ${User}@localhost")
  [System.IO.File]::WriteAllLines($Path, $out.ToArray())
}

function Show-ManualOpenSshSteps {
  Write-Host ""
  Write-Host "OpenSSH is NOT installed yet. Install manually (2 minutes):" -ForegroundColor Yellow
  Write-Host "  1. Settings > System > Optional features > Add a feature"
  Write-Host "  2. Search: OpenSSH Server > Install"
  Write-Host "  3. Wait until status shows Installed"
  Write-Host "  4. Run again: .\deploy\local\rp-local.cmd setup-ssh"
  Write-Host ""
  Write-Host "Or run keys-only now (creates secrets; finish OpenSSH install later):" -ForegroundColor Cyan
  Write-Host "  .\deploy\local\rp-local.cmd setup-ssh-key"
  Write-Host ""
  try {
    Start-Process "ms-settings:optionalfeatures"
  } catch { }
}

function Test-SshdInstalled {
  return $null -ne (Get-Service -Name sshd -ErrorAction SilentlyContinue)
}

function Install-OpenSshServerQuick {
  if (Test-SshdInstalled) {
    Write-Log "OpenSSH Server (sshd) already present."
    return $true
  }

  $cap = Get-WindowsCapability -Online -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "OpenSSH.Server*" }
  if ($cap -and $cap.State -eq "Installed") {
    Write-Log "OpenSSH capability installed; registering sshd..."
    $installScript = Join-Path $env:ProgramData "Windows\OpenSSH\Install-sshd.ps1"
    if (Test-Path $installScript) {
      & powershell -ExecutionPolicy Bypass -File $installScript
    }
    return (Test-SshdInstalled)
  }

  Write-Log "Trying winget (max 90 sec)..."
  $winget = Get-Command winget -ErrorAction SilentlyContinue
  if ($winget) {
    $job = Start-Job -ScriptBlock {
      winget install --id Microsoft.OpenSSH.Beta --exact --accept-source-agreements --accept-package-agreements 2>&1
    }
    $done = Wait-Job $job -Timeout 90
    if ($done) {
      Receive-Job $job | Out-Null
      Remove-Job $job -Force
      if (Test-SshdInstalled) {
        Write-Log "OpenSSH installed via winget."
        return $true
      }
    } else {
      Stop-Job $job -Force
      Remove-Job $job -Force
      Write-Log "winget timed out (skipped)."
    }
  }

  Write-Log "Skipping Add-WindowsCapability (often hangs 30+ min on some PCs)."
  return $false
}

function Invoke-SshKeygen([string]$KeyPath) {
  if (Test-Path $KeyPath) {
    Write-Log "SSH key already exists: $KeyPath"
    return
  }

  $keygen = Get-Command ssh-keygen -ErrorAction SilentlyContinue
  if (-not $keygen) {
    throw "ssh-keygen not found. Install OpenSSH Client: Settings > Optional features > OpenSSH Client"
  }

  Write-Log "Generating SSH key pair..."

  $argSets = @(
    "-t ed25519 -f `"$KeyPath`" -N `"`" -C rankpublish-cloud-agent",
    "-t ed25519 -f `"$KeyPath`" -C rankpublish-cloud-agent"
  )

  foreach ($argLine in $argSets) {
    $pinfo = New-Object System.Diagnostics.ProcessStartInfo
    $pinfo.FileName = $keygen.Source
    $pinfo.Arguments = $argLine
    $pinfo.UseShellExecute = $false
    $pinfo.CreateNoWindow = $true
    $proc = [System.Diagnostics.Process]::Start($pinfo)
    $proc.WaitForExit()
    if ($proc.ExitCode -eq 0 -and (Test-Path $KeyPath) -and (Test-Path "$KeyPath.pub")) {
      Write-Log "SSH key created: $KeyPath"
      return
    }
  }

  throw "ssh-keygen failed. Run manually: ssh-keygen -t ed25519 -f `"$KeyPath`" -N `"`""
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

  $sshdReady = $false
  if (-not $KeysOnly) {
    $sshdReady = Install-OpenSshServerQuick
    if ($sshdReady) {
      Set-Service -Name sshd -StartupType Automatic -ErrorAction Stop
      Start-Service sshd -ErrorAction Stop
      Write-Log "sshd service: running"

      $ruleName = "OpenSSH-Server-In-TCP"
      if (-not (Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule -Name $ruleName `
          -DisplayName "OpenSSH Server (sshd)" `
          -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22 | Out-Null
        Write-Log "Firewall: port 22 allowed"
      }
    } else {
      Show-ManualOpenSshSteps
    }
  } else {
    Write-Log "Keys-only mode (skipping OpenSSH install)."
    $sshdReady = Test-SshdInstalled
  }

  $user = $env:USERNAME
  $sshDir = Join-Path $env:USERPROFILE ".ssh"
  $keyPath = Join-Path $sshDir "rankpublish_cloud_agent"
  $authKeys = Join-Path $sshDir "authorized_keys"
  $sshdConfig = Join-Path $env:ProgramData "ssh\sshd_config"

  New-Item -ItemType Directory -Force -Path $sshDir | Out-Null
  Invoke-SshKeygen -KeyPath $keyPath

  if ($sshdReady) {
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
  } else {
    Write-Log "Skipped authorized_keys (install OpenSSH Server first, then re-run setup-ssh)."
  }

  $localIp = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike "127.*" -and $_.PrefixOrigin -ne "WellKnown" } |
    Select-Object -First 1).IPAddress
  if (-not $localIp) { $localIp = "YOUR-LOCAL-IP" }

  $wanIp = $null
  try {
    $wanIp = (Invoke-RestMethod -Uri "https://api.ipify.org" -TimeoutSec 8).Trim()
  } catch {
    Write-Log "Could not detect public WAN IP (offline or blocked)."
  }

  # Cloud Agents cannot reach RFC1918 LAN addresses. Prefer WAN when known.
  $hostForCloud = if ($wanIp) { $wanIp } else { $localIp }

  $publicPath = Join-Path $env:USERPROFILE "Local Sites\rankpublish\app\public"
  if (-not (Test-Path $publicPath)) {
    $publicPath = "C:/Users/$user/Local Sites/rankpublish/app/public"
  }
  $publicPathUnix = ($publicPath -replace '\\', '/')

  $privateKeyContent = Get-Content $keyPath -Raw
  Write-SecretsFile -Path $SecretsFile -User $user -HostIp $hostForCloud -PublicPath $publicPathUnix -KeyPath $keyPath -PrivateKey $privateKeyContent

  Write-Log "Secrets saved to: $SecretsFile"
  Write-Log "Log file: $LogFile"
  Write-Log "LAN IP: $localIp"
  if ($wanIp) { Write-Log "WAN IP (used for Cloud Secret): $wanIp" }

  Write-Host ""
  if ($sshdReady) {
    Write-Host "SUCCESS - SSH ready. Secrets in Notepad:" -ForegroundColor Green
  } else {
    Write-Host "PARTIAL - Keys saved. Install OpenSSH Server then re-run setup-ssh:" -ForegroundColor Yellow
  }
  Write-Host "  $SecretsFile" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Cloud Agent note:" -ForegroundColor Cyan
  Write-Host "  RANKPUBLISH_WIN_SSH_HOST must be reachable from the internet." -ForegroundColor Cyan
  if ($wanIp) {
    Write-Host "  Using WAN IP $wanIp — also forward router TCP 22 -> this PC." -ForegroundColor Cyan
  } else {
    Write-Host "  LAN IP alone will NOT work from Cloud Agents." -ForegroundColor Yellow
  }
  Write-Host "  Without port-forward/Tailscale, sync locally:" -ForegroundColor Cyan
  Write-Host "    .\rp-local.cmd sync --site rankpublish" -ForegroundColor White
  Write-Host "    .\rp-local.cmd sync --site rankpublish-test" -ForegroundColor White
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
