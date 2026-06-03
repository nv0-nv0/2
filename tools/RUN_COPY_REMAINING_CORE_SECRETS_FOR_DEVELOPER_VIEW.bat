@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0copy-remaining-core-secrets-developer-view.ps1"
if errorlevel 1 pause
endlocal
