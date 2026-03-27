#!/usr/bin/env node

/**
 * T2I :: SOVEREIGN - Universal Bridge Script
 * Run this in Termux or on your PC to give the SOVEREIGN web app access to your local files.
 * 
 * Usage:
 * 1. npx @sovereign/sdk
 * 2. Paste the printed IP into SOVEREIGN's Host settings.
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
const app = express();

app.use(cors()); // Allow cross-origin requests from the web app
app.use(bodyParser.json());

// Root directory to expose (defaults to current dir)
const ROOT = process.cwd();

// Static serving for the web app (if built)
const DIST_PATH = path.join(__dirname, '../../dist');
if (require('fs').existsSync(DIST_PATH)) {
  app.use(express.static(DIST_PATH));
  console.log(`[SOVEREIGN Bridge] Serving web UI from: ${DIST_PATH}`);
}

// IP Discovery
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// --- SAFETY GATE: FIXES THE 'SPLIT' ERROR ---
app.get('/api/files', async (req, res) => {
  try {
    const files = await fs.readdir(ROOT);
    const filtered = files.filter(f => !f.startsWith('.') && f !== 'node_modules' && f !== 'dist');
    const data = await Promise.all(filtered.map(async (file) => {
      const fullPath = path.join(ROOT, file);
      try {
        const stats = await fs.stat(fullPath);
        if (stats.isFile()) {
          const raw = await fs.readFile(fullPath, 'utf8');
          return { name: file, raw: raw || "" };
        }
      } catch (e) {}
      return { name: file, raw: "" };
    }));
    res.json(data);
  } catch (e) {
    res.json([{ name: "error.txt", raw: "Failed to read directory" }]);
  }
});

// Read file
app.get('/api/files/read', async (req, res) => {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).json({ error: 'Path required' });
  try {
    const fullPath = path.join(ROOT, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    res.json({ content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Write file
app.post('/api/files/write', async (req, res) => {
  const { path: filePath, content } = req.body;
  if (!filePath || content === undefined) return res.status(400).json({ error: 'Path and content required' });
  try {
    const fullPath = path.join(ROOT, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Execute Shell
app.post('/api/shell', async (req, res) => {
  const { command } = req.body;
  try {
    console.log(`[Shell] Executing: ${command}`);
    const { stdout, stderr } = await execAsync(command, { cwd: ROOT, timeout: 10000 });
    res.json({ stdout, stderr });
  } catch (error) {
    res.json({ stdout: error.stdout, stderr: error.stderr || error.message });
  }
});

// Auto-Port Selection
function startServer(port) {
  const server = app.listen(port, '0.0.0.0', () => {
    const ip = getLocalIP();
    console.log(`\n🚀 SOVEREIGN Bridge Live on http://${ip}:${port}`);
    console.log(`🔗 Paste this into your SOVEREIGN UI to sync.\n`);
    console.log(`[SOVEREIGN Bridge] Exposing: ${ROOT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`[SOVEREIGN Bridge] Port ${port} taken, trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error(`[SOVEREIGN Bridge] Error: ${err.message}`);
    }
  });
}

const DEFAULT_PORT = process.env.PORT || (process.env.NODE_ENV === 'production' ? 3000 : 3001);
startServer(parseInt(DEFAULT_PORT));
