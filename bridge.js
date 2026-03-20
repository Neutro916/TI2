/**
 * TermIntel v2 - Local Bridge Script
 * Run this in Termux or on your PC to give the TermIntel web app access to your local files.
 * 
 * Usage:
 * 1. Install dependencies: npm install express cors body-parser
 * 2. Run: node bridge.js
 * 3. Use a tunnel (like ngrok or cloudflared) to expose port 3001 to the web.
 * 4. Paste the tunnel URL into TermIntel's Host settings.
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
const app = express();
const PORT = 3001;

app.use(cors()); // Allow cross-origin requests from the web app
app.use(bodyParser.json());

// Root directory to expose (defaults to current dir)
const ROOT = process.cwd();

console.log(`[TermIntel Bridge] Starting...`);
console.log(`[TermIntel Bridge] Exposing: ${ROOT}`);

// List files
app.get('/api/files', async (req, res) => {
  try {
    const files = await fs.readdir(ROOT, { recursive: true });
    const filtered = files.filter(f => !f.includes('node_modules') && !f.startsWith('.git') && !f.startsWith('.'));
    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: error.message });
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[TermIntel Bridge] Running on http://localhost:${PORT}`);
  console.log(`[TermIntel Bridge] Use a tunnel to expose this to the web app.`);
});
