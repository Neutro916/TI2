param(
    [switch]$Help
)

if ($Help) {
    Write-Host "Usage: .\setup_embedding_port.ps1"
    Write-Host "Automatically configures the local Ollama vector embedding port using nomic-embed-text."
    exit
}

Write-Host "Terminal to Intel (TI2) - FunctionGemma Embedding Port Setup" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

Write-Host "`n[1] Checking local Ollama routing..." -ForegroundColor Yellow
$ollamaRunning = $false
try {
    $test = Invoke-RestMethod -Uri "http://localhost:11434/" -Method Get -ErrorAction Stop
    $ollamaRunning = $true
} catch {
    Write-Host "Ollama service is not responding at port 11434. Please start Ollama before continuing!" -ForegroundColor Red
    exit
}

Write-Host "`n[2] Pulling nomic-embed-text for ultra-fast local code vectorization... (This may take a moment)" -ForegroundColor Yellow
try {
    # We use Start-Process to allow native stdout streaming to the user
    $proc = Start-Process "ollama" -ArgumentList "pull nomic-embed-text" -NoNewWindow -Wait -PassThru
    if ($proc.ExitCode -ne 0) {
        Write-Host "Failed to pull embedding model." -ForegroundColor Red
        exit
    }
} catch {
    Write-Host "Error pulling model: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

Write-Host "`n[3] Validating /api/embeddings Port hook..." -ForegroundColor Yellow
try {
    $body = @{
        model = "nomic-embed-text"
        prompt = "Initialize Terminal to Intel Vector DB Space"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "http://localhost:11434/api/embeddings" -Method Post -Body $body -ContentType "application/json" -ErrorAction Stop

    if ($response.embedding) {
        Write-Host "`n✅ Embedding Port Successfully Initialized!" -ForegroundColor Green
        Write-Host "Your embedding API is actively listening at: http://localhost:11434/api/embeddings" -ForegroundColor Green
        Write-Host "FunctionGemma and the TI2 Sidebar can now natively use this port for rapid codebase context retrieval."
    } else {
        Write-Host "❌ Failed to retrieve valid embedding payload." -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Failed to hit embedding port. Make sure Ollama isn't blocked by your firewall. Exception: $($_.Exception.Message)" -ForegroundColor Red
}
