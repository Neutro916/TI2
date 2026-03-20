import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API ROUTES ---

  // File System Access
  app.get('/api/files', async (req, res) => {
    try {
      const files = await fs.readdir(process.cwd(), { recursive: true });
      // Filter out node_modules and hidden files
      const filtered = files.filter(f => !f.includes('node_modules') && !f.startsWith('.'));
      res.json(filtered);
    } catch (error) {
      res.status(500).json({ error: 'Failed to list files' });
    }
  });

  app.get('/api/files/read', async (req, res) => {
    const { path: filePath } = req.query;
    if (!filePath) return res.status(400).json({ error: 'Path required' });
    try {
      const content = await fs.readFile(path.join(process.cwd(), filePath as string), 'utf-8');
      res.json({ content });
    } catch (error) {
      res.status(500).json({ error: 'Failed to read file' });
    }
  });

  app.post('/api/files/write', async (req, res) => {
    const { path: filePath, content } = req.body;
    if (!filePath || content === undefined) return res.status(400).json({ error: 'Path and content required' });
    try {
      await fs.writeFile(path.join(process.cwd(), filePath), content, 'utf-8');
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to write file' });
    }
  });

  // Shell Execution (Restricted)
  app.post('/api/shell', async (req, res) => {
    const { command } = req.body;
    if (!command) return res.status(400).json({ error: 'Command required' });
    
    // Safety: Don't allow destructive commands in this demo
    const forbidden = ['rm -rf /', 'mkfs', 'dd'];
    if (forbidden.some(f => command.includes(f))) {
      return res.status(403).json({ error: 'Forbidden command' });
    }

    try {
      const { stdout, stderr } = await execAsync(command, { timeout: 5000 });
      res.json({ stdout, stderr });
    } catch (error: any) {
      res.json({ stdout: error.stdout, stderr: error.stderr || error.message });
    }
  });

  // --- VITE MIDDLEWARE ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`TermIntel Server running on http://localhost:${PORT}`);
  });
}

startServer();
