<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Terminal to Intel (T2I) - Personal Intelligence Rig V3.1

The **T2I-bot-skill** is an industrial-tier AI Orchestration Rig powered by **Gemini 3.1 Pro**. This version focuses on the **"Old & Pro"** aesthetic—industrial reliability, minimalist command discipline, and robust architectural planning for the Sovereign Lab 33-agent swarm.

## 🚀 Core Features

- **Moltbot Spawning**: The Conductor AI can autonomously trigger the `spawn_moltbot_monk` skill to spin up isolated Docker containers for specialized tasks (e.g., C++ analysis, hardware thermals) using the `[8-Infinity 373-733-933]` frequency.
- **Anticlaw 2 (Scraping & Autonomy)**: Native integration of `Crawl4AI` for high-speed, LLM-optimized web crawling and `Pydantic-AI` logic for 24/7 background reasoning nodes that monitor your environment continuously.
- **Dynamic Network Posting**: Natively handles massive AI loads and binds to `0.0.0.0`, allowing you to host the AI terminal locally and access it from any phone or secondary laptop on your Wi-Fi (perfect for broken screen scenarios).
- **Dual-Backup Automation**: A built-in deployment script (`build_and_backup.ps1`) that strips `node_modules`, cleanly packages the core files, and synchronizes backups simultaneously to a 7TB Drive and local laptop paths.
- **Standalone Gemma Fine-Tuning**: A strictly local Unsloth training script (`train_gemma_local.py`) to tune the `gemma-2-9b-it-ti2-moltbot` model securely on an RTX workstation.

---

## 🛠️ Usage & Setup

### 1. Basic Launch
To start the T2I Rig, open your terminal (in the `E:\T2I-bot-skill` directory) and run:
```bash
npm install
npm run dev
```
The interface is now live at `http://localhost:3000`.

### 2. Multi-Device/Remote Hosting (Broken Screen Bypass)
If you need to access the AI from another device (like your phone or secondary laptop), you can assign a custom port and the system will automatically broadcast over your local Wi-Fi.
```bash
PORT=8080 npm run dev
```
Find your PC's IP address (e.g., `192.168.1.15`) and visit `http://192.168.1.15:8080` on the other device.

### 3. Deploying Automated Backups
To package exactly just the main files and back them up to your 7TB Drive and Test Laptop directories:
```powershell
.\scripts\build_and_backup.ps1
```

### 4. Tuning the Local Gemma Model
If you want to train your own Kimi K2.5 style offline model specifically for Moltbot orchestration:
```bash
python scripts/train_gemma_local.py
```
*(Note: Ensure you have your `unsloth` virtual environment activated first).*

### 5. Running 24/7 Autonomous Nodes (Anticlaw 2)
To launch a background worker that monitors your workspace and handles multi-step task chains:
```bash
python scripts/autonomous_worker.py --directive "Monitor workspace and index new files"
```
Or use the `autonomous_reasoning` tool inside the T2I Chat Interface.

### 6. High-Speed Web Crawling
The AI can now use the `anticlaw_crawl` tool to extract clean Markdown from any site using the local `Crawl4AI` engine.


---

## 🔧 Troubleshooting Guide

### 1. The React app or terminal keeps crashing/turning off
**Symptom:** You run `npm run dev` but the terminal closes abruptly.
**Fix:** Ensure no other process is holding your port. Try explicitly assigning a fresh port like `PORT=8888 npm run dev` in PowerShell. Also check that your `.env.local` contains a valid `GEMINI_API_KEY`. If node_modules failed to map correctly previously, run `npm install` again.

### 2. `node_modules` / Windows MAX_PATH Errors during Copying
**Symptom:** Moving the folder or attempting to ZIP it fails because the file path is "too long".
**Fix:** Never manually copy `node_modules`. Run `Remove-Item -Recurse -Force .\node_modules` before moving the project. (The `build_and_backup.ps1` script handles this cleanly for you).

### 3. Docker "Moltbot Spawning" Failing
**Symptom:** The AI says `[MOLTBOT SPAWN] Booting...` but the container doesn't show up.
**Fix:** The root rig terminal uses native `docker run` commands. Verify that **Docker Desktop** is currently running in your background tray and that WSL2 integration is enabled natively in Windows.

### 4. Cannot reach the AI Web UI from my Phone/Laptop
**Symptom:** `http://<ip-address>:<port>` times out on your other device.
**Fix:** Windows Firewall typically blocks incoming traffic on custom ports. You must open the `Windows Defender Firewall` settings, click "Advanced Settings," and add a new **Inbound Rule** to allow TCP traffic over the port you specified (e.g., 3000 or 8080).
