# ANTICLAW-2 :: NEURAL MOBILE SYNC V1.0
# "Bridging the Gap between Desktop Sovereign and Handheld Rig"

$ADB = "C:\Users\natra\Downloads\platform-tools-latest-windows\platform-tools\adb.exe"
$SCRCPY = Get-ChildItem -Path "C:\Users\natra\Downloads", "C:\Users\natra\Documents" -Filter "scrcpy.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
$PWA_URL = "http://localhost:8888" # Update with your Local IP if testing over Wi-Fi

function Show-Header {
    Clear-Host
    Write-Host "------------------------------------------------" -ForegroundColor Cyan
    Write-Host "   ANTICLAW-2 :: NEURAL MOBILE SYNC [V1.0]     " -ForegroundColor Yellow -BackgroundColor Black
    Write-Host "------------------------------------------------" -ForegroundColor Cyan
}

function Mirror-Phone {
    if (-not $SCRCPY) {
        Write-Host "[!] Scrcpy binary not found in Downloads or Documents." -ForegroundColor Red
        return
    }
    Write-Host "[*] Launching Mirroring Engine..." -ForegroundColor Yellow
    Start-Process $SCRCPY
}

function Check-PWA {
    Write-Host "[*] Auditing PWA Connectivity on Phone..." -ForegroundColor Yellow
    & $ADB shell am start -a android.intent.action.VIEW -d $PWA_URL
    Write-Host "[+] Navigation Command Dispatched." -ForegroundColor Green
}

function Check-Flutter {
    Write-Host "[*] checking Flutter Environment..." -ForegroundColor Yellow
    if (Get-Command flutter -ErrorAction SilentlyContinue) {
        flutter doctor
    } else {
        Write-Host "[!] Flutter SDK not matched in system path." -ForegroundColor Red
    }
}

# MAIN LOOP
while ($true) {
    Show-Header
    Write-Host "1. [MIRROR] Launch Scrcpy Screen Mirror"
    Write-Host "2. [AUDIT] Connect to Anticlaw PWA on Phone"
    Write-Host "3. [FLUTTER] Ready-Check Flutter Debug"
    Write-Host "Q. Exit"
    Write-Host ""
    $choice = Read-Host "Awaiting Neural Command"

    switch ($choice) {
        "1" { Mirror-Phone; }
        "2" { Check-PWA; }
        "3" { Check-Flutter; }
        "Q" { exit; }
        "q" { exit; }
    }
    Write-Host "`nPress any key to return to Hub..."
    $null = [System.Console]::ReadKey()
}
