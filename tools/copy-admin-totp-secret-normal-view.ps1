$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$generator = Join-Path $root 'scripts/generate-admin-totp-secret.mjs'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js가 설치되어 있지 않습니다.' }
if (-not (Test-Path -LiteralPath $generator)) { throw '프로젝트 루트의 tools 폴더에서 실행하세요.' }
$secret = (& node $generator --value-only).Trim().ToUpperInvariant()
if ($LASTEXITCODE -ne 0 -or $secret.Length -lt 16 -or $secret -notmatch '^[A-Z2-7]+=*$') { throw 'TOTP Base32 생성 검증에 실패했습니다.' }
Set-Clipboard -Value $secret
Write-Host '[OK] Coolify Normal View의 Value 칸에 넣을 Base32 값만 클립보드에 복사했습니다.' -ForegroundColor Green
Write-Host '[SECURITY] 화면, 로그, 채팅에 붙여넣지 마십시오.' -ForegroundColor Yellow
