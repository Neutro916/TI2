import express from "express";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import { createServer as createViteServer } from "vite";
import { spawn, exec } from "child_process";
import path from "path";
import fs from "fs";
import chokidar from "chokidar";
import cors from "cors";
import axios from "axios";
import { createProxyMiddleware } from "http-proxy-middleware";
import { Server as McpServer } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from "@modelcontextprotocol/sdk/types.js";

// --- SOVEREIGN SECURITY ---
const sovereignAuth = (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (process.env.T2I_GATEWAY_TOKEN && authHeader !== `Bearer ${process.env.T2I_GATEWAY_TOKEN}`) {
        return res.status(401).json({ error: "T2I AUTH FAILED. NEURAL BRIDGE LOCKED." });
    }
    next();
};

const safePath = (requestedPath: string) => {
    const absolute = path.resolve(process.cwd(), requestedPath);
    if (!absolute.startsWith(process.cwd())) {
        throw new Error("Sovereign Security Breach: Illegal Path Traversal detected.");
    }
    return absolute;
};

// --- MCP SERVER LOGIC ---
const mcpServer = new McpServer(
  { name: "t2i-master-rig", version: "13.0.0" },
  { capabilities: { tools: {} } }
);

mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "read_file",
      description: "Read a file from the T2I project rig",
      inputSchema: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
    {
      name: "execute_shell",
      description: "Execute a command in the T2I rig terminal",
      inputSchema: {
        type: "object",
        properties: { command: { type: "string" } },
        required: ["command"],
      },
    }
  ],
}));

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    switch (name) {
      case "read_file": {
        const content = fs.readFileSync(safePath(args?.path as string), "utf8");
        return { content: [{ type: "text", text: content }] };
      }
      case "execute_shell": {
        return new Promise((resolve) => {
          exec(args?.command as string, (error, stdout, stderr) => {
            resolve({ content: [{ type: "text", text: stdout || stderr }] });
          });
        });
      }
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Tool ${name} not found`);
    }
  } catch (error: any) {
    return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
  }
});

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new SocketServer(httpServer);
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Logging middleware
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // MCP SSE Endpoint
  let transport: SSEServerTransport;
  app.get("/mcp/sse", (req, res) => {
    transport = new SSEServerTransport("/mcp/messages", res);
    mcpServer.connect(transport);
  });

  app.post("/mcp/messages", (req, res) => {
    transport.handlePostMessage(req, res);
  });

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", rig: "v13.0", core: "T2I Terminal to Intel", master: "Sovereign" });
  });

  app.get("/api/files", sovereignAuth, (req, res) => {
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

  app.get("/api/files/read", sovereignAuth, (req, res) => {
    const filePath = req.query.path as string;
    if (!filePath) return res.status(400).json({ error: "No path provided" });
    try {
      const content = fs.readFileSync(safePath(filePath), 'utf-8');
      res.json({ content });
    } catch (error) {
      res.status(500).json({ error: "Failed to read file" });
    }
  });

  app.post("/api/files/write", sovereignAuth, (req, res) => {
    const { path: filePath, content } = req.body;
    if (!filePath) return res.status(400).json({ error: "No path provided" });
    try {
      fs.writeFileSync(safePath(filePath), content);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to write file" });
    }
  });

  app.post("/api/app/command", sovereignAuth, (req, res) => {
    const { type, payload } = req.body;
    io.emit('app:command', { type, payload });
    res.json({ success: true });
  });

  app.get("/api/sentinel/status", sovereignAuth, async (req, res) => {
    const endpoints = req.query.endpoints as string;
    if (!endpoints) return res.json({});
    
    const endpointList = endpoints.split(',');
    const status: any = {};
    
    for (const url of endpointList) {
        try {
            await axios.get(url, { timeout: 2000 });
            status[url] = "ONLINE";
        } catch (e) {
            status[url] = "OFFLINE";
        }
    }
    res.json(status);
  });

  // Catch-all for /api that returns JSON 404
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "API route not found" });
  });

  // WebSocket Terminal
  io.on("connection", (socket) => {
    const shell = spawn(process.platform === 'win32' ? 'cmd.exe' : 'bash', process.platform === 'win32' ? [] : ['-i'], {
      env: process.env,
      cwd: process.cwd()
    });

    shell.stdout.on('data', (data) => socket.emit('terminal:output', data.toString()));
    shell.stderr.on('data', (data) => socket.emit('terminal:output', data.toString()));
    shell.on('exit', (code) => socket.emit('terminal:exit', code));
    socket.on('terminal:input', (data) => shell.stdin.write(data));
    socket.on('disconnect', () => shell.kill());

    const watcher = chokidar.watch(process.cwd(), {
      ignored: /(^|[\/\\])\..|node_modules|dist/,
      persistent: true
    });
    watcher.on('all', (event, path) => socket.emit('fs:change', { event, path }));
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
