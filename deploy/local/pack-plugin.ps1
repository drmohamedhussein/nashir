param(
  [string]$OutFile = ""
)

$ErrorActionPreference = "Stop"
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$script = Join-Path $PSScriptRoot "pack-plugin.cjs"
$downloads = Join-Path $root "apps\web\public\downloads"
if (-not $OutFile) {
  $OutFile = Join-Path $downloads "nashir.zip"
}
node $script $OutFile
