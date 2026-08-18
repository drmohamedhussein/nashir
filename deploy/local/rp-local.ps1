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

param(
    [Parameter(Position = 0)]
    [ValidateSet("help", "fix-db", "product", "dev", "status", "qa", "setup-test")]
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
    "qa" {
        Run-Node @("deploy/local/qa-rankpublish.cjs") + $Rest
    }
    "setup-test" {
        Run-Node @("deploy/local/setup-rankpublish-test.cjs") + $Rest
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

  status    Show active plugins / detected mode
            .\deploy\local\rp-local.ps1 status --site rankpublish-test

IMPORTANT: Do NOT run 'node deploy/local/...' from app\public — that folder
has no deploy scripts. Use this wrapper or 'cd' to the nashir repo first.

Repo path expected: C:\Users\drmoh\Projects\nashir
"@
    }
}
