import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import chokidar from "chokidar";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer);
  const PORT = 3000;

  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/files", (req, res) => {
    try {
      const files = fs.readdirSync(process.cwd()).filter(f => !f.startsWith('.') && f !== 'node_modules' && f !== 'dist');
      const data = files.map(file => {
        const fullPath = path.join(process.cwd(), file);
        try {
          const stats = fs.statSync(fullPath);
          if (stats.isFile()) {
            return {
              name: file,
              raw: fs.readFileSync(fullPath, 'utf8') || ""
            };
          }
        } catch (e) {}
        return { name: file, raw: "" };
      });
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to list files" });
    }
  });

  app.get("/api/files/read", (req, res) => {
    const filePath = req.query.path as string;
    if (!filePath) return res.status(400).json({ error: "No path provided" });
    try {
      const content = fs.readFileSync(path.join(process.cwd(), filePath), 'utf-8');
      res.json({ content });
    } catch (error) {
      res.status(500).json({ error: "Failed to read file" });
    }
  });

  app.post("/api/files/write", (req, res) => {
    const { path: filePath, content } = req.body;
    if (!filePath) return res.status(400).json({ error: "No path provided" });
    try {
      fs.writeFileSync(path.join(process.cwd(), filePath), content);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to write file" });
    }
  });

  app.post("/api/app/command", (req, res) => {
    const { type, payload } = req.body;
    io.emit('app:command', { type, payload });
    res.json({ success: true });
  });

  // WebSocket Terminal
  io.on("connection", (socket) => {
    console.log("Terminal client connected");

    // File Watcher
    const watcher = chokidar.watch(process.cwd(), {
      ignored: /(^|[\/\\])\..|node_modules|dist/,
      persistent: true
    });

    watcher.on('all', (event, path) => {
      socket.emit('fs:change', { event, path });
    });
    
    // Create a shell process for each connection
    const shell = spawn('bash', [], {
      env: process.env,
      cwd: process.cwd()
    });

    shell.stdout.on('data', (data) => {
      socket.emit('terminal:output', data.toString());
    });

    shell.stderr.on('data', (data) => {
      socket.emit('terminal:output', data.toString());
    });

    shell.on('exit', (code) => {
      socket.emit('terminal:exit', code);
    });

    socket.on('terminal:input', (data) => {
      shell.stdin.write(data);
    });

    socket.on('disconnect', () => {
      shell.kill();
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
