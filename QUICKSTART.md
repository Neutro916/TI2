# T2I-Bot-Skill Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Option 1: Desktop Development (Recommended for first-time)

```bash
# 1. Clone and install
cd E:\T2I-bot-skill
npm install

# 2. Start development server
npm run dev

# 3. Open browser
# Navigate to: http://localhost:3000
```

### Option 2: Termux Mobile (Full AI Rig)

```bash
# 1. Open Termux app
# 2. Run one-line installer
curl -fsSL https://raw.githubusercontent.com/your-username/t2i-bot-skill/main/scripts/install-termux.sh | bash

# 3. Start all services
~/start-t2i-rig.sh
```

### Option 3: Docker (Production-ready)

```bash
# 1. Start full stack
docker-compose up -d

# 2. Access services
# T2I App: http://localhost:3000
# code-server: http://localhost:8080
# OpenWebUI: http://localhost:3001
```

---

## 📱 Mobile Setup (Termux)

### Step-by-Step Installation

1. **Install Termux** (from F-Droid, NOT Play Store)
   - Download: https://f-droid.org/en/packages/com.termux/

2. **Open Termux and grant permissions**
   ```bash
   termux-setup-storage
   ```

3. **Update packages**
   ```bash
   pkg update && pkg upgrade
   ```

4. **Clone repository**
   ```bash
   pkg install git
   git clone https://github.com/your-username/t2i-bot-skill.git
   cd t2i-bot-skill
   ```

5. **Run installation script**
   ```bash
   bash scripts/install-termux.sh
   ```

6. **Start services**
   ```bash
   ~/start-t2i-rig.sh
   ```

### Accessing Your AI Rig

After installation, access services:

- **T2I App (Monaco Editor)**: http://localhost:3000
- **code-server (VS Code)**: http://localhost:8080 (password: t2i-rig)
- **Terminal**: Built into T2I app

### Setting Up Tunneling (For Remote Access)

```bash
# 1. Get ngrok token from https://dashboard.ngrok.com
# 2. Add token
ngrok config add-authtoken YOUR_TOKEN_HERE

# 3. Start tunnels
bash scripts/tunnel_automation.sh start

# 4. Get public URLs
bash scripts/tunnel_automation.sh status
```

---

## 🎨 Monaco Editor Features

### Keyboard Shortcuts

| Action | Windows/Linux | macOS |
|--------|--------------|-------|
| Quick Open | Ctrl+P | Cmd+P |
| Find | Ctrl+F | Cmd+F |
| Replace | Ctrl+H | Cmd+H |
| Format | Ctrl+Shift+P | Cmd+Shift+P |
| Multi-cursor | Alt+Click | Option+Click |
| Comment Line | Ctrl+/ | Cmd+/ |

### T2I Custom Commands

Type `t2i:` in any file to see available commands:
- `t2i:open` - Open file
- `t2i:save` - Save current file
- `t2i:run` - Execute code
- `t2i:ai` - Ask AI assistant

---

## 🤖 AI Provider Setup

### Google Gemini (Free Tier)

1. Get API key: https://makersuite.google.com/app/apikey
2. In T2I app, go to Settings > AI Providers
3. Enter API key
4. Select Gemini model

### Ollama (Local - Recommended)

```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull models
ollama pull gemma-2-9b-it
ollama pull llama-3.1-8b

# Ollama auto-detects in T2I app
```

### LM Studio (Local with GUI)

1. Download: https://lmstudio.ai/
2. Install and launch
3. Download a model
4. Start local server (port 1234)
5. T2I auto-connects

---

## 🔧 Common Tasks

### OCR Processing

```bash
# Process single image
python scripts/ocr_processor.py image.png

# Process with language
python scripts/ocr_processor.py image.png --lang vie

# Batch process
python scripts/ocr_processor.py img1.png img2.png --batch
```

### RAG Memory

```bash
# Query memory
python scripts/rag_processor.py query "how to edit files"

# Add to memory
python scripts/rag_processor.py add "T2I uses Monaco Editor"

# Index codebase
python scripts/rag_processor.py index ./src

# View stats
python scripts/rag_processor.py stats
```

### Tunnel Management

```bash
# Start all tunnels
npm run tunnel:start

# Stop all tunnels
npm run tunnel:stop

# Check status
npm run tunnel:status
```

---

## 🐛 Troubleshooting

### "Monaco Editor not loading"

```bash
# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

### "Tunnel connection failed"

```bash
# Check ngrok authentication
ngrok config add-authtoken YOUR_TOKEN

# Restart
npm run tunnel:stop
npm run tunnel:start
```

### "Python OCR errors"

```bash
# Install dependencies
pip install pytesseract pillow opencv-python-headless

# Install tesseract
# Termux:
pkg install tesseract
# Ubuntu/Debian:
sudo apt install tesseract-ocr
# macOS:
brew install tesseract
```

### "RAG not working"

```bash
# Install ChromaDB
pip install chromadb sentence-transformers

# Clear and rebuild
python scripts/rag_processor.py clear
python scripts/rag_processor.py index ./src
```

---

## 📊 Performance Tips

### For Low-End Devices

1. Disable minimap in Monaco Editor
2. Use lighter models (Phi-3, TinyLlama)
3. Reduce browser tabs
4. Use cloudflared instead of ngrok

### For Best Performance

1. Use Ollama with GPU acceleration
2. Enable Docker for isolation
3. Use SSD storage
4. Increase Node.js memory: `export NODE_OPTIONS="--max-old-space-size=4096"`

---

## 🎯 Next Steps

1. **Customize Theme**: Edit `src/components/MonacoEditor.tsx`
2. **Add AI Models**: Configure `config/openwebui-integration.yml`
3. **Deploy to Cloud**: Use `docker-compose.yml` for production
4. **Extend Features**: Check `scripts/` for automation examples

---

## 📞 Getting Help

- **Documentation**: See README.md
- **Issues**: GitHub Issues tab
- **Scripts**: Check `scripts/` directory
- **Config Files**: See `config/` directory

---

**Happy Coding! 🚀**
