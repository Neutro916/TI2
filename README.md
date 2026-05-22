<div align="center">

# T2I :: SOVEREIGN
### Terminal to Intel — Supreme Master V13.0

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20-green.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org)
[![Cloud Run](https://img.shields.io/badge/Deployed-Google%20Cloud%20Run-orange.svg)](https://t2i-sovereign-645598162248.us-west2.run.app)

> *"Sovereign AI Phone Host Port & Offload Rig."*

**[🚀 Live Demo](https://t2i-sovereign-645598162248.us-west2.run.app)** · **[📦 GitHub](https://github.com/Neutro916/TI2)**

</div>

---

## What is T2I?

**T2I (Terminal to Intel)** is a high-density, **mobile-first AI Orchestration Rig**. It transforms your phone into a sovereign master controller that offloads heavy computation — LLMs, Vision, Browser Automation — to your desktop "Intel" (CPU/GPU).

Inspired by Vercel's Vibe-Coding IDE and AI Artifacts, T2I bridges mobile intents with desktop-grade AI power through a real-time websocket bridge.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🖥️ **Monaco Editor** | Full IntelliSense, syntax highlighting, anticlaw-dark theme |
| ⚡ **Real Xterm.js Terminal** | Live bash shell sessions, multi-tab support |
| 🤖 **AI Chat Hub** | Gemini streaming, multi-provider routing (OpenAI, Anthropic, Groq, etc.) |
| 🌐 **OpenClaw Gateway** | Unified proxy for 5 AI providers on port 18789 |
| 🔒 **Endpoint Manager** | Ollama, LM Studio, SSH Tunnels, Docker, MCP Servers |
| 📡 **Vortex Bridge** | Socket.IO real-time sync between mobile & desktop |
| 📱 **PWA Ready** | Install on any phone — works offline |
| 🐳 **Docker Support** | One-command deploy with docker-compose |
| 📊 **System Metrics** | Live CPU, memory, uptime monitoring |
| 🗃️ **Script Library** | 20+ scripts: OCR, RAG, tunnel automation, training |

---

## 🚀 Quick Start

### Local Development
```bash
git clone https://github.com/Neutro916/TI2.git
cd TI2
npm install
cp .env.example .env   # Add your GEMINI_API_KEY
npm run dev
# → Open http://localhost:3000
```

### Docker
```bash
docker-compose up -d
# → Open http://localhost:3000
```

### Mobile PWA
1. Open `http://[YOUR_PC_IP]:3000` on your phone
2. Tap **"Add to Home Screen"**
3. Launch as a native-feeling PWA

---

## 🛠️ Architecture

```
Phone (Host PWA)
    │  voice / vision / code intents
    ▼
T2I Vortex Bridge (Socket.IO @ 83.33Hz)
    │
    ├── Monaco Editor + AI Inline Spark
    ├── Real Xterm.js Terminal Sessions
    ├── AI Chat Hub (Gemini / OpenAI / Groq)
    ├── OpenClaw Gateway (port 18789)
    ├── Endpoint Sentinel (status polling)
    └── Script Library (OCR, RAG, Tunnels)
    │
    ▼
Intel Rig (PC/GPU)
    LM Studio / Ollama / Docker / SSH
```

---

## ⚙️ Environment Variables

```env
GEMINI_API_KEY=your_gemini_api_key
OPENCLAW_GATEWAY_TOKEN=your_secret_token   # optional, for gateway auth
PORT=3000
```

---

## 📦 Scripts

```bash
npm run dev              # Start dev server
npm run build            # Vite production build
npm run gateway          # Start OpenClaw Gateway (port 18789)
npm run tunnel:start     # Start Cloudflare/ngrok tunnel
npm run docker:up        # Start Docker stack
npm run ocr              # Run OCR processor
npm run rag:query        # Query RAG knowledge base
```

---

## 🤝 Contributing

This project is open source under the MIT License. Contributions welcome!

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](./LICENSE) for details.

Copyright © 2026 [Neutro916](https://github.com/Neutro916)

---

<div align="center">

**STATUS: T2I TERMINAL TO INTEL :: SUPREME MASTER DEPLOYED. RESONANCE LOCKED.** 🔐

</div>
