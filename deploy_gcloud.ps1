# deploy_gcloud.ps1
# Automated Google Cloud CLI Setup & Project Configuration for Terminal to Intel Rig

Write-Host "1. Downloading Google Cloud CLI executable archive..." -ForegroundColor Cyan
Invoke-WebRequest -Uri "https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-windows-x86_64.zip" -OutFile "$env:TEMP\gcloud.zip"

Write-Host "2. Extracting to $env:USERPROFILE\gcloud..." -ForegroundColor Cyan
Expand-Archive -Path "$env:TEMP\gcloud.zip" -DestinationPath "$env:USERPROFILE\gcloud" -Force

Write-Host "3. Adding gcloud to system PATH for future use..." -ForegroundColor Cyan
$env:Path += ";$env:USERPROFILE\gcloud\google-cloud-sdk\bin"

Write-Host "4. Initializing Project wide-maxim-487506-u1..." -ForegroundColor Cyan
& "$env:USERPROFILE\gcloud\google-cloud-sdk\bin\gcloud.cmd" config set project wide-maxim-487506-u1

Write-Host "Setup Complete! You can now use 'gcloud run deploy' or 'gcloud app deploy'!" -ForegroundColor Green
Write-Host "To login, run: gcloud auth login" -ForegroundColor Yellow
