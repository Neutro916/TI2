import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import { spawn, exec } from "child_process";
import path from "path";
import fs from "fs";
import chokidar from "chokidar";
import basicAuth from "express-basic-auth";
import { createProxyMiddleware } from "http-proxy-middleware";
import axios from "axios";

// Sovereign Security Middleware
const sovereignAuth = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (process.env.OPENCLAW_GATEWAY_TOKEN && authHeader !== `Bearer ${process.env.OPENCLAW_GATEWAY_TOKEN}`) {
        return res.status(401).json({ error: "ANTICLAW-2 AUTH FAILED. NEURAL BRIDGE LOCKED." });
    }
    next();
};

// Sovereign Path Sanitization
const safePath = (requestedPath: string) => {
    const absolute = path.resolve(process.cwd(), requestedPath);
    if (!absolute.startsWith(process.cwd())) {
        throw new Error("Sovereign Security Breach: Illegal Path Traversal detected.");
    }
    return absolute;
};

const execAsync = (command: string): Promise<{stdout: string, stderr: string}> => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
};

async function startServer() {
  const app = express();

  if (process.env.ADMIN_PASSWORD) {
    app.use(basicAuth({
      users: { 'admin': process.env.ADMIN_PASSWORD },
      challenge: true,
      realm: 'AI Studio Rig'
    }));
  }

  const httpServer = createServer(app);
  const io = new Server(httpServer);
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // Anticlaw 2 Service Sentinel
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", rig: "v11.5", core: "Anticlaw-2", master: "Sovereign" });
  });

  const SERVICES = {
    lmstudio: "http://localhost:1234",
    openwebui: "http://localhost:3000",
    openclaw: "http://localhost:18789"
  };

  app.get("/api/sentinel/status", async (req, res) => {
    const status: any = {};
    for (const [name, url] of Object.entries(SERVICES)) {
        try { await axios.get(url, { timeout: 1000 }); status[name] = "ONLINE"; }
        catch (e) { status[name] = "OFFLINE"; }
    }
    res.json(status);
  });

  // Neural Bridge Proxy (Local Model Gateway) - Sovereign Protected
  app.use("/v1", sovereignAuth, createProxyMiddleware({
      target: SERVICES.lmstudio,
      changeOrigin: true,
      pathRewrite: { "^/v1": "/v1" }
  }));

  // File System API - Sovereign Protected
  app.get("/api/files", sovereignAuth, (req, res) => {
    try {
      const files = fs.readdirSync(process.cwd()).filter(f => !f.startsWith('.') && f !== 'node_modules' && f !== 'dist');
      const data = files.map(file => {
        const fullPath = safePath(file);
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
      res.status(500).json({ error: "Sovereign Audit Error: Failed to list files" });
    }
  });

  app.get("/api/files/read", sovereignAuth, (req, res) => {
    const filePath = req.query.path as string;
    if (!filePath) return res.status(400).json({ error: "No path provided" });
    try {
      const content = fs.readFileSync(safePath(filePath), 'utf-8');
      res.json({ content });
    } catch (error) {
      res.status(500).json({ error: "Sovereign Audit Error: Failed to read file" });
    }
  });

  app.post("/api/files/write", sovereignAuth, (req, res) => {
    const { path: filePath, content } = req.body;
    if (!filePath) return res.status(400).json({ error: "No path provided" });
    try {
      fs.writeFileSync(safePath(filePath), content);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Sovereign Audit Error: Failed to write file" });
    }
  });

  app.post("/api/app/command", sovereignAuth, (req, res) => {
    const { type, payload } = req.body;
    io.emit('app:command', { type, payload });
    res.json({ success: true });
  });

  // WebSocket Terminal - Sovereign Protected
  io.use((socket, next) => {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (process.env.OPENCLAW_GATEWAY_TOKEN && token !== process.env.OPENCLAW_GATEWAY_TOKEN) {
          return next(new Error("ANTICLAW-2 :: SOVEREIGN SECURITY BREACH. UNLINKED CLIENT."));
      }
      next();
  });

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
      server: { middlewareMode: true, host: true },
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
