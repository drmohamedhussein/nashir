# RankPublish local tools — run from ANY folder (fixes wrong-directory errors).
#
# Usage (PowerShell):
#   cd C:\Users\drmoh\Projects\nashir
#   .\deploy\local\rp-local.ps1 fix-db --site rankpublish-test
#   .\deploy\local\rp-local.ps1 product --site rankpublish-test --sync
#   .\deploy\local\rp-local.ps1 qa --site rankpublish-test
#
# Or with full path from Local Site Shell:
#   powershell -File C:\Users\drmoh\Projects\nashir\deploy\local\rp-local.ps1 fix-db --site rankpublish-test
#
# If PowerShell blocks .ps1 scripts, use the CMD wrapper instead:
#   deploy\local\rp-local.cmd sync --site rankpublish-test

param(
    [Parameter(Position = 0)]
    [ValidateSet("help", "fix-db", "product", "dev", "status", "qa", "setup-test", "sync", "verify", "recover", "setup-ssh", "setup-ssh-key", "agent-setup", "agent-wp")]
    [string]$Command = "help",

    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Rest = @()
)

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Set-Location $RepoRoot
Write-Host ""
Write-Host "RankPublish local tools" -ForegroundColor Cyan
Write-Host "Repo: $RepoRoot"
Write-Host ""

function Run-Node([string[]]$NodeArgs) {
    Write-Host "> node $($NodeArgs -join ' ')" -ForegroundColor DarkGray
    & node @NodeArgs
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

switch ($Command) {
    "fix-db" {
        Run-Node @("deploy/local/fix-wp-db.cjs") + $Rest
    }
    "product" {
        Run-Node @("deploy/local/switch-product-mode.cjs", "product") + $Rest
    }
    "dev" {
        Run-Node @("deploy/local/switch-product-mode.cjs", "dev") + $Rest
    }
    "status" {
        Run-Node @("deploy/local/switch-product-mode.cjs", "status") + $Rest
    }
    "recover" {
        Run-Node @("deploy/local/recover-local-wp.cjs") + $Rest
    }
    "qa" {
        Run-Node @("deploy/local/qa-rankpublish.cjs") + $Rest
    }
    "setup-test" {
        Run-Node @("deploy/local/setup-rankpublish-test.cjs") + $Rest
    }
    "sync" {
        Run-Node @("deploy/local/sync-rankpublish-site.cjs") + $Rest
    }
    "verify" {
        Run-Node @("deploy/local/verify-thinkrank-local.cjs") + $Rest
    }
    "setup-ssh" {
        & (Join-Path $PSScriptRoot "setup-agent-access.cmd")
    }
    "setup-ssh-key" {
        & (Join-Path $PSScriptRoot "setup-agent-access.cmd")
    }
    "agent-setup" {
        & (Join-Path $PSScriptRoot "setup-agent-access.cmd")
    }
    "agent-wp" {
        Run-Node @("deploy/local/create-wp-agent-user.cjs") + $Rest
    }
    default {
        Write-Host @"
Commands (always run from repo via this wrapper):

  fix-db    Fix wp-config DB connection (wrong port / DB name)
            .\deploy\local\rp-local.ps1 fix-db --site rankpublish-test

  product   Product-only mode on test site + sync plugin
            .\deploy\local\rp-local.ps1 product --site rankpublish-test --sync

  qa        Automated QA checklist
            .\deploy\local\rp-local.ps1 qa --site rankpublish-test

  sync      Sync rankpublish-site plugin to a Local site
            .\deploy\local\rp-local.ps1 sync --site rankpublish-test

  recover   Fix HTTP 500 on Local (disable plugin, imagick, show PHP log)
            .\deploy\local\rp-local.ps1 recover --site rankpublish --all

  setup-ssh One-time OpenSSH for Cloud Agent (Admin UAC once)
            .\deploy\local\rp-local.ps1 setup-ssh

  status    Show active plugins / detected mode
            .\deploy\local\rp-local.ps1 status --site rankpublish-test

IMPORTANT: Do NOT run 'node deploy/local/...' from app\public — that folder
has no deploy scripts. Use this wrapper or 'cd' to the nashir repo first.

Repo path expected: C:\Users\drmoh\Projects\nashir
"@
    }
}
