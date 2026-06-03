$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root
if (-not (Test-Path 'scripts/generate-commercial-secrets.mjs')) {
  throw 'scripts/generate-commercial-secrets.mjs not found. Run this helper from the extracted VERIDION package tools folder.'
}
$lines = & node scripts/generate-commercial-secrets.mjs --preserve-totp
if ($LASTEXITCODE -ne 0) { throw 'Failed to generate core runtime secrets.' }
$text = ($lines -join "`r`n") + "`r`n"
Set-Clipboard -Value $text
Write-Host 'Copied the remaining prelaunch core secret patch to the clipboard.'
Write-Host 'This patch intentionally preserves the existing NV0_ADMIN_TOTP_SECRET so the authenticator registration stays valid.'
Write-Host 'Paste only into a secure local editor or Coolify Developer View, save, redeploy, then clear the clipboard.'
