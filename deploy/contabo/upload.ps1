param(
  [Parameter(Mandatory = $true)][string]$HostName,
  [string]$User = "root",
  [string]$RemotePath = "/var/www/nashir"
)

$ErrorActionPreference = "Stop"
$root = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
Write-Host "Uploading $root -> ${User}@${HostName}:$RemotePath"
scp -r "$root\apps" "$root\deploy" "$root\README.md" "${User}@${HostName}:${RemotePath}/"
Write-Host "Upload finished. SSH in and run: cd $RemotePath/apps/web && npm ci && npx prisma generate && node $RemotePath/deploy/contabo/run-staging-schema-safe.cjs $RemotePath/apps/web && npm run build && pm2 start $RemotePath/deploy/contabo/ecosystem.config.cjs"
