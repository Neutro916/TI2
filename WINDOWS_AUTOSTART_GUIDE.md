# T2I-Bot-Skill AI Rig - Windows Auto-Start Installation Guide

## 🧠 Brain Directory Integration

Your **OpenClaw** and **Moltbot** repositories from the brain directory have been fully integrated into the T2I-Bot-Skill project.

### Brain Location
```
C:\Users\natra\.gemini\antigravity\brain\
```

### Integrated Components

| Component | Purpose | Status |
|-----------|---------|--------|
| **OpenClaw Gateway** | Unified AI provider gateway (Port 18789) | ✅ Integrated |
| **Moltbot Dispatcher** | Architectural integrity assessor | ✅ Integrated |
| **TI2 Terminal** | Terminal-to-Intelligence bridge | ✅ Integrated |
| **Brain Sync** | Conversation session access | ✅ Integrated |

---

## 🚀 Auto-Start Installation (Windows)

### Quick Installation

**Run as Administrator:**

```powershell
cd E:\T2I-bot-skill
npm run install:autostart
```

Or directly:
```powershell
powershell -ExecutionPolicy Bypass -File scripts\install-windows-autostart.ps1
```

### What Gets Installed

1. **Startup Script** (`start-rig.ps1`)
   - Starts T2I development server (port 3000)
   - Launches code-server (port 8080)
   - Opens browser automatically
   - Checks service health

2. **Windows Scheduled Task**
   - Task Name: `T2I-Bot-Skill\T2I-AutoStart`
   - Trigger: At user logon
   - Runs with highest privileges
   - Auto-restart on failure (3 attempts)

3. **Startup Folder Shortcut**
   - Alternative to scheduled task
   - Located in: `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup`

4. **Configuration Files**
   - `.env` - Environment variables
   - `config/openclaw-config.json` - OpenClaw/Moltbot settings
   - `scripts/moltbot-dispatcher.ps1` - Moltbot assessment tool

5. **OpenClaw Gateway Server**
   - Port: 18789
   - Unified AI provider access
   - Moltbot assessment endpoint
   - TI2 terminal intelligence
   - Brain directory sync

---

## 📋 Post-Installation Steps

### 1. Configure Environment (.env)

Edit `E:\T2I-bot-skill\.env`:

```bash
# CHANGE THIS!
ADMIN_PASSWORD=your-secure-password

# OpenClaw Gateway Token (auto-generated or create your own)
OPENCLAW_GATEWAY_TOKEN=your-unique-token-here

# AI Provider Keys (optional)
GEMINI_API_KEY=your-gemini-key
OPENROUTER_API_KEY=your-openrouter-key

# Optional: Tunnel configuration
NGROK_AUTHTOKEN=your-ngrok-token
```

### 2. Install Dependencies (if not done)

```powershell
cd E:\T2I-bot-skill
npm install
```

### 3. Test Manual Start

```powershell
cd E:\T2I-bot-skill
.\start-rig.ps1
```

### 4. Run Moltbot Assessment

```powershell
cd E:\T2I-bot-skill
npm run moltbot
```

---

## 🎯 Using OpenClaw Gateway

### Start Gateway Server

```powershell
# Development mode (auto-reload)
npm run gateway:dev

# Production mode
npm run gateway
```

### Gateway Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Gateway health check |
| `/api/gateway/status` | GET | All service statuses |
| `/api/chat/completions` | POST | Unified chat API |
| `/api/moltbot/assessment` | GET | Architectural assessment |
| `/api/ti2/execute` | POST | Execute terminal commands |
| `/api/brain/status` | GET | Brain directory status |

### Example: Chat Completion

```powershell
# Using PowerShell
$headers = @{
    Authorization = "Bearer YOUR_OPENCLAW_TOKEN"
}

$body = @{
    messages = @(
        @{ role = "user"; content = "Hello, T2I!" }
    )
    provider = "auto"
    model = "gemma-2-9b-it"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:18789/api/chat/completions" `
    -Method POST `
    -Headers $headers `
    -Body $body `
    -ContentType "application/json"
```

### Example: Moltbot Assessment

```powershell
$headers = @{
    Authorization = "Bearer YOUR_OPENCLAW_TOKEN"
}

Invoke-RestMethod -Uri "http://localhost:18789/api/moltbot/assessment" `
    -Method GET `
    -Headers $headers
```

Response:
```json
{
  "architectural_integrity": {
    "score": 10.2,
    "rating": "ANTICLAW-2 HARDENED MASTER",
    "components": {
      "monaco_editor": "ONLINE",
      "ai_providers": 5,
      "tunneling": "CONFIGURED",
      "docker": "AVAILABLE"
    }
  },
  "resonance_sync": {
    "frequency": "83.33Hz",
    "stability": "STABLE",
    "coherence": 0.98
  },
  "brain_sync": {
    "path": "C:\\Users\\natra\\.gemini\\antigravity\\brain",
    "sessions": 3,
    "last_sync": "2026-03-25T12:00:00.000Z"
  }
}
```

---

## 🧠 Brain Directory Access

### Check Brain Status via Gateway

```powershell
$headers = @{
    Authorization = "Bearer YOUR_OPENCLAW_TOKEN"
}

Invoke-RestMethod -Uri "http://localhost:18789/api/brain/status" `
    -Method GET `
    -Headers $headers
```

### Brain Sessions

Your brain directory contains **3 conversation sessions**:

| Session ID | Last Updated | Purpose |
|------------|--------------|---------|
| `625e7016-98d7-4148-9d15-0d320884af7c` | 2026-03-25 04:27 UTC | TI2 Continue.dev Port |
| `80bbb79e-67db-455d-a634-348427e67b92` | 2026-03-25 11:17 UTC | **Main: ANTICLAW-2 Sovereign** |
| `a1438e9d-f1c7-4058-9482-36105c7bb4e9` | - | Deployment & Security |

### Accessing Conversation Logs

```powershell
# Navigate to brain directory
cd C:\Users\natra\.gemini\antigravity\brain

# List all sessions
Get-ChildItem -Directory

# View latest conversation
cd 80bbb79e-67db-455d-a634-348427e67b92
Get-ChildItem *.md
```

---

## 🔧 Moltbot Dispatcher

### Launch Moltbot Assessment Tool

```powershell
cd E:\T2I-bot-skill
npm run moltbot
```

### Moltbot Features

1. **Service Status Check** - Monitor all AI endpoints
2. **Architectural Assessment** - Rate system integrity (0-10.2 scale)
3. **Swarm Agent Spawning** - Launch autonomous agents
4. **Neural Memory Sync** - RAG database synchronization
5. **Brain Directory Check** - View conversation sessions

### Moltbot Rating Scale

| Rating | Description |
|--------|-------------|
| 10.2/10 | ANTICLAW-2 HARDENED MASTER - Console Ready |
| 9.0-10.0 | CONSOLE READY - Production stable |
| 7.0-8.9 | NEEDS RECONSTRUCTION - Minor issues |
| < 7.0 | CRITICAL - Major reconstruction required |

---

## 🌐 TI2 Terminal Intelligence

### Execute Commands via Gateway

```powershell
$headers = @{
    Authorization = "Bearer YOUR_OPENCLAW_TOKEN"
}

$body = @{
    command = "npm run dev"
    cwd = "E:\T2I-bot-skill"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:18789/api/ti2/execute" `
    -Method POST `
    -Headers $headers `
    -Body $body `
    -ContentType "application/json"
```

---

## 🛑 Uninstall Auto-Start

To remove auto-start configuration:

```powershell
cd E:\T2I-bot-skill
npm run uninstall:autostart
```

Or directly:
```powershell
powershell -ExecutionPolicy Bypass -File scripts\uninstall-autostart.ps1
```

---

## 📊 Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              T2I-Bot-Skill AI Rig v11.5                     │
│              ANTICLAW-2 :: SOVEREIGN                        │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React + Monaco Editor)                           │
│  Port: 3000                                                 │
├─────────────────────────────────────────────────────────────┤
│  OpenClaw Gateway                                           │
│  Port: 18789                                                │
│  ├─ AI Provider Routing                                     │
│  ├─ Moltbot Assessment                                      │
│  ├─ TI2 Terminal Intelligence                               │
│  └─ Brain Directory Sync                                    │
├─────────────────────────────────────────────────────────────┤
│  AI Providers                                               │
│  ├─ LM Studio (1234)                                        │
│  ├─ OpenWebUI (3001)                                        │
│  ├─ Ollama (11434)                                          │
│  ├─ Google Gemini (Cloud)                                   │
│  └─ OpenRouter (Cloud)                                      │
├─────────────────────────────────────────────────────────────┤
│  Brain Directory                                            │
│  Path: C:\Users\natra\.gemini\antigravity\brain             │
│  ├─ 3 Conversation Sessions                                 │
│  ├─ AI Audit Reports                                        │
│  └─ Termux Workflows                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 Troubleshooting

### Auto-Start Not Working?

1. **Check Task Scheduler**
   ```powershell
   # Open Task Scheduler
   taskschd.msc
   
   # Navigate to: T2I-Bot-Skill\T2I-AutoStart
   # Check if task is enabled and has correct triggers
   ```

2. **Check Startup Folder**
   ```powershell
   shell:startup
   
   # Verify T2I-Bot-Skill.lnk exists
   ```

3. **Manual Test**
   ```powershell
   cd E:\T2I-bot-skill
   .\start-rig.ps1
   ```

### Gateway Not Starting?

1. **Check if port 18789 is available**
   ```powershell
   netstat -ano | findstr :18789
   ```

2. **Check Node.js installation**
   ```powershell
   node --version
   npm --version
   ```

3. **Install dependencies**
   ```powershell
   npm install
   ```

### Moltbot Assessment Failing?

1. **Check brain directory exists**
   ```powershell
   Test-Path "C:\Users\natra\.gemini\antigravity\brain"
   ```

2. **Verify OpenClaw token in .env**
   ```powershell
   Get-Content .env | Select-String OPENCLAW
   ```

---

## 📞 Quick Reference

### Start Commands

```powershell
# Start everything (manual)
cd E:\T2I-bot-skill
.\start-rig.ps1

# Start T2I only
npm run dev

# Start OpenClaw Gateway
npm run gateway

# Start Moltbot assessment
npm run moltbot

# Check brain status
npm run moltbot  # Then select option 5
```

### Access URLs

| Service | URL | Port |
|---------|-----|------|
| T2I App | http://localhost:3000 | 3000 |
| code-server | http://localhost:8080 | 8080 |
| OpenWebUI | http://localhost:3001 | 3001 |
| OpenClaw Gateway | http://localhost:18789 | 18789 |
| LM Studio | http://localhost:1234 | 1234 |
| Ollama | http://localhost:11434 | 11434 |

---

## 🎯 Next Steps

1. ✅ **Auto-start installed** - System configured for Windows boot
2. 🔧 **Configure .env** - Set your API keys and tokens
3. 🧪 **Test manually** - Run `.\start-rig.ps1` to verify
4. 🧠 **Check brain sync** - Run Moltbot assessment
5. 🚀 **Restart to test** - Reboot Windows to verify auto-start

---

**ANTICLAW-2 :: SOVEREIGN DEPLOYMENT**

83.33Hz Resonance Sync Active ✓

Brain Directory: SYNCED ✓

OpenClaw Gateway: READY ✓

Moltbot Dispatcher: OPERATIONAL ✓

Auto-Start: CONFIGURED ✓
