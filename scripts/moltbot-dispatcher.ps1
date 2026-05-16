# Moltbot Sovereign Swarm Dispatcher
# ANTICLAW-2 Service Endpoint Monitor

$ErrorActionPreference = "Continue"
$ProjectRoot = "E:\T2I-bot-skill"

function Show-MoltbotHeader {
    Clear-Host
    Write-Host "╔════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║   MOLTBOT :: SERVICE ENDPOINT MONITOR                ║" -ForegroundColor Yellow
    Write-Host "║   ANTICLAW-2 Real-Time Status Dashboard              ║" -ForegroundColor Cyan
    Write-Host "╚════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
}

function Get-ServiceStatus {
    Write-Host "[*] Scanning service endpoints..." -ForegroundColor Yellow
    Write-Host ""
    
    $services = @(
        @{ Name = "T2I App"; Url = "http://localhost:3000/api/health"; Port = 3000 },
        @{ Name = "OpenClaw Gateway"; Url = "http://localhost:18789/api/health"; Port = 18789 },
        @{ Name = "LM Studio"; Url = "http://localhost:1234"; Port = 1234 },
        @{ Name = "OpenWebUI"; Url = "http://localhost:3001"; Port = 3001 },
        @{ Name = "Ollama"; Url = "http://localhost:11434/api/tags"; Port = 11434 },
        @{ Name = "code-server"; Url = "http://localhost:8080"; Port = 8080 },
        @{ Name = "ChromaDB"; Url = "http://localhost:8000"; Port = 8000 }
    )
    
    $onlineCount = 0
    $offlineCount = 0
    
    foreach ($service in $services) {
        try {
            $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
            $response = Invoke-WebRequest -Uri $service.Url -TimeoutSec 2 -ErrorAction Stop
            $stopwatch.Stop()
            $latency = [math]::Round($stopwatch.ElapsedMilliseconds, 0)
            
            Write-Host "  [✓] $($service.Name)" -ForegroundColor Green -NoNewline
            Write-Host " :$($service.Port)" -ForegroundColor Gray -NoNewline
            Write-Host " (${latency}ms)" -ForegroundColor Cyan
            $onlineCount++
        } catch {
            Write-Host "  [✗] $($service.Name)" -ForegroundColor Red -NoNewline
            Write-Host " :$($service.Port)" -ForegroundColor Gray
            Write-Host "      └─ OFFLINE or not responding" -ForegroundColor Yellow
            $offlineCount++
        }
    }
    
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  SUMMARY" -ForegroundColor Yellow
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  Online:  $onlineCount / $($services.Count)" -ForegroundColor Green
    Write-Host "  Offline: $offlineCount / $($services.Count)" -ForegroundColor Red
    
    $healthPercent = [math]::Round(($onlineCount / $services.Count) * 100, 1)
    $resonance = [math]::Round(83.33 * ($healthPercent / 100), 2)
    
    Write-Host ""
    Write-Host "  System Health: $healthPercent%" -ForegroundColor White
    Write-Host "  Resonance Sync: ${resonance}Hz" -ForegroundColor Yellow
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""
}

function Get-QuickActions {
    Write-Host "QUICK ACTIONS:" -ForegroundColor Cyan
    Write-Host "  [R] Refresh status" -ForegroundColor White
    Write-Host "  [O] Open T2I in browser" -ForegroundColor White
    Write-Host "  [G] Start OpenClaw Gateway" -ForegroundColor White
    Write-Host "  [Q] Quit" -ForegroundColor Yellow
    Write-Host ""
}

# MAIN LOOP
Show-MoltbotHeader
Get-ServiceStatus
Get-QuickActions

while ($true) {
    $choice = Read-Host "Neural Command"
    Write-Host ""
    
    switch ($choice.ToLower()) {
        "r" { 
            Get-ServiceStatus
            Get-QuickActions
        }
        "o" {
            Write-Host "[*] Opening T2I-Bot-Skill in browser..." -ForegroundColor Cyan
            Start-Process "http://localhost:3000"
            Write-Host "  [✓] Browser opened" -ForegroundColor Green
            Write-Host ""
        }
        "g" {
            Write-Host "[*] Starting OpenClaw Gateway..." -ForegroundColor Cyan
            Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ProjectRoot'; npm run gateway"
            Write-Host "  [✓] Gateway starting on port 18789" -ForegroundColor Green
            Write-Host ""
            Start-Sleep -Seconds 3
            Get-ServiceStatus
            Get-QuickActions
        }
        "q" { 
            Clear-Host
            Write-Host "Moltbot Monitor shutting down..." -ForegroundColor Yellow
            Write-Host "83.33Hz Resonance Sync maintained ✓" -ForegroundColor Green
            Write-Host ""
            exit 
        }
        default {
            Write-Host "Unknown command. Try: R (Refresh), O (Open), G (Gateway), Q (Quit)" -ForegroundColor Yellow
            Write-Host ""
        }
    }
}
