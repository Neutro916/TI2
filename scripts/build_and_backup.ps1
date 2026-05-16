<#
.SYNOPSIS
Automates the Final Build, structure organization, and dual-backup distribution of the T2I-bot-skill Rig.

.DESCRIPTION
This script compiles the React frontend, isolates the critical "main files" needed to run the UI/Backend and MoltBot agent spawners, and automatically zips them. It then clones the payload exactly into two specific syncing destinations for the massive Google Drive and the identical Secondary test laptop.
#>

$ErrorActionPreference = "Stop"

$ProjectRoot = "E:\T2I-bot-skill"
$StagingFolder = "$ProjectRoot\T2I_Final_Release"
$ZipName = "T2I_Release_Latest.zip"
$ZipPath = "$ProjectRoot\$ZipName"

$BackupDest1 = "E:\T2I_Backups\Drive_7TB_Sync"
$BackupDest2 = "E:\T2I_Backups\Laptop_Test_Sync"

Write-Host "[1/5] Compiling Production Frontend UI..." -ForegroundColor Cyan
Set-Location $ProjectRoot
# Assuming node_modules is installed. If it fails, user needs to run npm install.
try {
    npm run build
} catch {
    Write-Host "WARNING: 'npm run build' failed. Did you run 'npm install' on E:\ drive yet?" -ForegroundColor Yellow
}

Write-Host "[2/5] Cleaning previous staging areas..." -ForegroundColor Cyan
if (Test-Path $StagingFolder) { Remove-Item $StagingFolder -Recurse -Force }
if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }

Write-Host "[3/5] Structuring exactly 1 pristine final build folder..." -ForegroundColor Cyan
New-Item -ItemType Directory -Path $StagingFolder -Force | Out-Null
New-Item -ItemType Directory -Path "$StagingFolder\scripts" -Force | Out-Null

# Extract only the critical "main files" requested for the test laptop
if (Test-Path "$ProjectRoot\dist") { Copy-Item -Path "$ProjectRoot\dist" -Destination "$StagingFolder\dist" -Recurse -Force }
if (Test-Path "$ProjectRoot\server.ts") { Copy-Item -Path "$ProjectRoot\server.ts" -Destination $StagingFolder -Force }
if (Test-Path "$ProjectRoot\package.json") { Copy-Item -Path "$ProjectRoot\package.json" -Destination $StagingFolder -Force }
if (Test-Path "$ProjectRoot\Dockerfile") { Copy-Item -Path "$ProjectRoot\Dockerfile" -Destination $StagingFolder -Force }
if (Test-Path "$ProjectRoot\scripts\train_gemma_local.py") { Copy-Item -Path "$ProjectRoot\scripts\train_gemma_local.py" -Destination "$StagingFolder\scripts\" -Force }

Write-Host "[4/5] Zipping payload..." -ForegroundColor Cyan
Compress-Archive -Path "$StagingFolder\*" -DestinationPath $ZipPath -Force

Write-Host "[5/5] Routing automated backups to Google Drive (7TB) and Laptop Target..." -ForegroundColor Cyan
# Create destinations if missing
New-Item -ItemType Directory -Path $BackupDest1 -Force | Out-Null
New-Item -ItemType Directory -Path $BackupDest2 -Force | Out-Null

Copy-Item -Path $ZipPath -Destination "$BackupDest1\$ZipName" -Force
Copy-Item -Path $ZipPath -Destination "$BackupDest2\$ZipName" -Force

Write-Host "`n✅ Automation Complete! Deployments securely staged in 2 directories:" -ForegroundColor Green
Write-Host " -> $BackupDest1\$ZipName"
Write-Host " -> $BackupDest2\$ZipName"
