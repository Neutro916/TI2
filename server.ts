import express from "express";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import { createServer as createViteServer } from "vite";
import { spawn, exec } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";
import chokidar from "chokidar";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";
import axios from "axios";
import { Server as McpServer } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

// ─── SYSTEM METRICS ──────────────────────────────────────────────────────────
const formatUptime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s].map(v => v < 10 ? "0" + v : v).join(":");
};

const getSystemMetrics = () => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  return {
    cpu: `${os.loadavg()[0].toFixed(1)}%`,
    mem: `${(usedMem / 1024 ** 3).toFixed(1)}GB / ${(totalMem / 1024 ** 3).toFixed(1)}GB (${((usedMem / totalMem) * 100).toFixed(1)}%)`,
    uptime: formatUptime(os.uptime()),
    platform: process.platform,
    node: process.version,
  };
};

// ─── SOVEREIGN SECURITY ──────────────────────────────────────────────────────
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || process.env.T2I_GATEWAY_TOKEN || "";

const sovereignAuth = (req: any, res: any, next: any) => {
  if (!GATEWAY_TOKEN) return next(); // open mode if no token set
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${GATEWAY_TOKEN}`) {
    return res.status(401).json({ error: "T2I AUTH FAILED. NEURAL BRIDGE LOCKED." });
  }
  next();
};

const safePath = (requestedPath: string, base = process.cwd()) => {
  const absolute = path.resolve(base, requestedPath);
  if (!absolute.startsWith(base)) throw new Error("Security: Illegal path traversal.");
  return absolute;
};

// ─── MCP TOOLS ───────────────────────────────────────────────────────────────
const mcpServer = new McpServer(
  { name: "t2i-master-rig", version: "13.0.0" },
  { capabilities: { tools: {} } }
);

mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: "read_file", description: "Read a file from the T2I rig",
      inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } },
    { name: "write_file", description: "Write content to a file",
      inputSchema: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } }, required: ["path","content"] } },
    { name: "execute_shell", description: "Execute a shell command in the rig",
      inputSchema: { type: "object", properties: { command: { type: "string" } }, required: ["command"] } },
    { name: "termux_run", description: "Run a command in Termux via ADB",
      inputSchema: { type: "object", properties: { command: { type: "string" } }, required: ["command"] } },
  ],
}));

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    switch (name) {
      case "read_file":
        return { content: [{ type: "text", text: fs.readFileSync(safePath(args?.path as string), "utf8") }] };
      case "write_file":
        fs.writeFileSync(safePath(args?.path as string), args?.content as string);
        return { content: [{ type: "text", text: "Written." }] };
      case "execute_shell":
      case "termux_run": {
        const cmd = name === "termux_run"
          ? `adb shell "${(args?.command as string).replace(/"/g, '\\"')}"`
          : args?.command as string;
        return new Promise((resolve) =>
          exec(cmd, { timeout: 30000 }, (_, stdout, stderr) =>
            resolve({ content: [{ type: "text", text: stdout || stderr }] })
          )
        );
      }
      default:
        throw new McpError(ErrorCode.MethodNotFound, `Tool ${name} not found`);
    }
  } catch (e: any) {
    return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
  }
});

// ─── TERMINAL SESSIONS (plain spawn — no native deps) ────────────────────────
interface ShellSession { proc: any; }
const shells = new Map<string, ShellSession>();

function getShell(mode: "pty" | "adb" = "pty") {
  if (mode === "adb") return { cmd: "adb", args: ["shell"] };
  return process.platform === "win32"
    ? { cmd: "powershell.exe", args: ["-NoLogo", "-NoProfile"] }
    : { cmd: "bash", args: ["--login"] };
}

function startShell(socket: any, tabId: string, mode: "pty" | "adb" = "pty") {
  const key = `${socket.id}:${tabId}`;
  const old = shells.get(key);
  if (old) { try { old.proc.kill(); } catch {} }

  const { cmd, args } = getShell(mode);
  const proc = spawn(cmd, args, {
    cwd: process.cwd(),
    env: { ...process.env, TERM: "xterm-256color" },
    shell: false,
  });

  proc.stdout?.on("data", (d: Buffer) => socket.emit("terminal:output", { tabId, data: d.toString("utf8") }));
  proc.stderr?.on("data", (d: Buffer) => socket.emit("terminal:output", { tabId, data: d.toString("utf8") }));
  proc.on("close", (code: number) => socket.emit("terminal:exit", { tabId, code }));

  shells.set(key, { proc });
  socket.emit("terminal:ready", { tabId, mode, shell: cmd });
}

// ─── TUNNEL STATE ─────────────────────────────────────────────────────────────
let tunnelProc: any = null;
let tunnelUrl = "";
let tunnelType = "";

// ─── MAIN SERVER ──────────────────────────────────────────────────────────────
async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new SocketServer(httpServer, { cors: { origin: "*" } });
  const PORT = Number(process.env.PORT || 3000);

  app.use(cors());
  app.use(express.json({ limit: "10mb" }));

  // ── MCP ──────────────────────────────────────────────────────────────────
  let transport: SSEServerTransport;
  app.get("/mcp/sse", (req, res) => {
    transport = new SSEServerTransport("/mcp/messages", res);
    mcpServer.connect(transport);
  });
  app.post("/mcp/messages", (req, res) => transport.handlePostMessage(req, res));

  // ── HEALTH ────────────────────────────────────────────────────────────────
  app.get("/api/health", (_req, res) =>
    res.json({ status: "ok", rig: "v13.0", platform: process.platform, node: process.version })
  );

  // ── SYSTEM METRICS ────────────────────────────────────────────────────────
  app.get("/api/system/metrics", (_req, res) => res.json(getSystemMetrics()));

  // ── SENTINEL STATUS ───────────────────────────────────────────────────────
  app.get("/api/sentinel/status", async (_req, res) => {
    const services: Record<string, string> = {
      lmstudio: "http://localhost:1234",
      ollama: "http://localhost:11434",
      openwebui: "http://localhost:8080",
    };
    const status: Record<string, string> = {};
    for (const [k, url] of Object.entries(services)) {
      try { await axios.get(url, { timeout: 800 }); status[k] = "ONLINE"; }
      catch { status[k] = "OFFLINE"; }
    }
    try {
      const out = await new Promise<string>(r => exec("adb devices", (_, s) => r(s)));
      const devices = out.split("\n").slice(1).filter(l => l.includes("device") && !l.includes("List of"));
      status["adb"] = devices.length > 0 ? `ONLINE (${devices.length})` : "NO DEVICE";
    } catch { status["adb"] = "ADB NOT FOUND"; }
    res.json(status);
  });

  // ── FILE API ──────────────────────────────────────────────────────────────
  const IGNORE = new Set(["node_modules", "dist", ".git", "package-lock.json"]);

  function readDir(dir: string, depth = 0): any[] {
    if (depth > 4) return [];
    try {
      return fs.readdirSync(dir)
        .filter(f => !f.startsWith(".") && !IGNORE.has(f))
        .map(f => {
          const full = path.join(dir, f);
          const stat = fs.statSync(full);
          if (stat.isDirectory()) return { name: f, type: "dir", path: full, children: readDir(full, depth + 1) };
          return { name: f, type: "file", path: full, size: stat.size };
        });
    } catch { return []; }
  }

  app.get("/api/files", sovereignAuth, (req, res) =>
    res.json(readDir((req.query.path as string) || process.cwd()))
  );

  app.get("/api/files/read", sovereignAuth, (req, res) => {
    try {
      const p = safePath(req.query.path as string);
      res.json({ content: fs.readFileSync(p, "utf8"), path: p });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.post("/api/files/write", sovereignAuth, (req, res) => {
    try {
      const abs = safePath(req.body.path);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, req.body.content, "utf8");
      res.json({ success: true });
    } catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  app.delete("/api/files/delete", sovereignAuth, (req, res) => {
    try { fs.unlinkSync(safePath(req.query.path as string)); res.json({ success: true }); }
    catch (e: any) { res.status(400).json({ error: e.message }); }
  });

  // ── AI CHAT — Gemini SSE streaming ───────────────────────────────────────
  app.post("/api/ai/chat", async (req, res) => {
    const { messages = [], model = "gemini-2.0-flash", provider = "gemini" } = req.body;

    if (provider === "ollama") {
      try {
        const r = await axios.post("http://localhost:11434/api/chat",
          { model, messages, stream: false }, { timeout: 60000 });
        return res.json({ reply: r.data?.message?.content || "" });
      } catch (e: any) { return res.status(502).json({ error: "Ollama: " + e.message }); }
    }

    if (!process.env.GEMINI_API_KEY) return res.status(400).json({ error: "No GEMINI_API_KEY set in .env" });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      const { GoogleGenAI } = await import("@google/genai");
      const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const result = await genai.models.generateContentStream({
        model,
        contents: messages.map((m: any) => ({
          role: m.role === "ai" || m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        config: {
          systemInstruction: `You are T2I Sovereign AI — a concise, mobile-first coding assistant.
Help with terminal commands, code, tunnels, and Termux/ADB tasks. Be direct and brief.`,
          temperature: 0.7,
          topP: 0.95,
          maxOutputTokens: 4096,
        },
      });
      for await (const chunk of result) {
        const text = chunk.text ?? "";
        if (text) res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (e: any) {
      res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
      res.end();
    }
  });

  // ── TUNNEL MANAGER ────────────────────────────────────────────────────────
  app.post("/api/tunnel/start", sovereignAuth, (req, res) => {
    if (tunnelProc) return res.json({ status: "running", url: tunnelUrl, type: tunnelType });
    const { type = "ngrok", port = PORT } = req.body;
    tunnelType = type; tunnelUrl = "";

    if (type === "cloudflared") {
      tunnelProc = spawn("cloudflared", ["tunnel", "--url", `localhost:${port}`], { stdio: ["ignore","pipe","pipe"] });
      const grab = (d: Buffer) => {
        const m = d.toString().match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
        if (m && !tunnelUrl) { tunnelUrl = m[0]; io.emit("tunnel:url", { url: tunnelUrl }); }
      };
      tunnelProc.stdout?.on("data", grab);
      tunnelProc.stderr?.on("data", grab);
    } else {
      tunnelProc = spawn("ngrok", ["http", String(port)], { stdio: "ignore" });
      setTimeout(async () => {
        try {
          const r = await axios.get("http://127.0.0.1:4040/api/tunnels", { timeout: 3000 });
          const t = r.data?.tunnels?.find((t: any) => t.proto === "https");
          if (t) { tunnelUrl = t.public_url; io.emit("tunnel:url", { url: tunnelUrl }); }
        } catch { tunnelUrl = "http://127.0.0.1:4040"; }
      }, 2500);
    }
    tunnelProc.on("close", () => { tunnelProc = null; tunnelUrl = ""; tunnelType = ""; });
    res.json({ status: "starting", type, port });
  });

  app.post("/api/tunnel/stop", sovereignAuth, (_req, res) => {
    if (tunnelProc) { tunnelProc.kill(); tunnelProc = null; tunnelUrl = ""; tunnelType = ""; }
    res.json({ status: "stopped" });
  });

  app.get("/api/tunnel/status", sovereignAuth, async (_req, res) => {
    if (!tunnelProc) return res.json({ running: false });
    if (tunnelType === "ngrok" && !tunnelUrl) {
      try {
        const r = await axios.get("http://127.0.0.1:4040/api/tunnels", { timeout: 2000 });
        const t = r.data?.tunnels?.find((t: any) => t.proto === "https");
        if (t) tunnelUrl = t.public_url;
      } catch {}
    }
    res.json({ running: true, type: tunnelType, url: tunnelUrl });
  });

  // ── X11 / noVNC PROXY ─────────────────────────────────────────────────────
  const X11_PORT = Number(process.env.X11_NOVNC_PORT || 6080);

  app.get("/api/x11/status", (_req, res) => {
    axios.get(`http://localhost:${X11_PORT}`, { timeout: 800 })
      .then(() => res.json({ available: true, viewerUrl: `/x11/vnc.html`, port: X11_PORT }))
      .catch(() => res.json({ available: false, hint: "Run: adb forward tcp:6080 tcp:6080", port: X11_PORT }));
  });

  app.use("/x11", createProxyMiddleware({
    target: `http://localhost:${X11_PORT}`,
    changeOrigin: true,
    pathRewrite: { "^/x11": "" },
    ws: true,
    on: { error: (_e: any, _q: any, s: any) => s.status?.(502).json?.({ error: "noVNC not running" }) }
  }));

  // ── TERMUX / ADB HTTP ─────────────────────────────────────────────────────
  app.post("/api/termux/run", sovereignAuth, (req, res) => {
    const { command } = req.body;
    if (!command) return res.status(400).json({ error: "command required" });
    exec(`adb shell "${command.replace(/"/g, '\\"')}"`, { timeout: 30000 }, (_, out, err) =>
      res.json({ stdout: out, stderr: err })
    );
  });

  app.post("/api/termux/pkg", sovereignAuth, (req, res) => {
    const { action = "list", pkg = "" } = req.body;
    const safe = ["install","update","upgrade","remove","list","search"].includes(action) ? action : "list";
    exec(`adb shell pkg ${safe}${pkg ? " " + pkg + " -y" : ""}`, { timeout: 120000 }, (_, out, err) =>
      res.json({ stdout: out, stderr: err })
    );
  });

  // ── COLAB LINKS ───────────────────────────────────────────────────────────
  app.get("/api/colab/link", (_req, res) => res.json({
    links: [
      { name: "Train FunctionGemma (Unsloth)", url: "https://colab.research.google.com/github/Neutro916/TI2/blob/main/scripts/train_functiongemma_unsloth.py" },
      { name: "Train Gemma Local", url: "https://colab.research.google.com/github/Neutro916/TI2/blob/main/scripts/train_gemma_local.py" },
    ]
  }));

  // ── LM STUDIO PROXY ───────────────────────────────────────────────────────
  app.use("/v1", sovereignAuth, createProxyMiddleware({
    target: "http://localhost:1234",
    changeOrigin: true,
    on: { error: (_e: any, _q: any, s: any) => s.status?.(502).json?.({ error: "LMStudio offline" }) }
  }));

  // ── WEBSOCKET TERMINAL ────────────────────────────────────────────────────
  io.on("connection", (socket) => {
    console.log(`[WS] +${socket.id}`);

    // Default: auto-start shell tab 1 on connect
    startShell(socket, "1", "pty");

    socket.on("terminal:init", (d: { tabId?: string; mode?: "pty" | "adb" }) => {
      startShell(socket, d.tabId || "1", d.mode || "pty");
    });

    socket.on("terminal:input", (d: { tabId?: string; data: string }) => {
      const s = shells.get(`${socket.id}:${d.tabId || "1"}`);
      if (s?.proc?.stdin) s.proc.stdin.write(d.data);
    });

    // Also accept raw string input (xterm.js sends strings directly)
    socket.on("terminal:input", (data: string) => {
      if (typeof data === "string") {
        const s = shells.get(`${socket.id}:1`);
        if (s?.proc?.stdin) s.proc.stdin.write(data);
      }
    });

    socket.on("terminal:new_tab", (d: { tabId: string; mode?: "pty" | "adb" }) => {
      startShell(socket, d.tabId, d.mode || "pty");
    });

    socket.on("terminal:kill_tab", (d: { tabId: string }) => {
      const key = `${socket.id}:${d.tabId}`;
      try { shells.get(key)?.proc?.kill(); } catch {}
      shells.delete(key);
    });

    socket.on("disconnect", () => {
      console.log(`[WS] -${socket.id}`);
      for (const [key, s] of shells) {
        if (key.startsWith(socket.id)) { try { s.proc?.kill(); } catch {} shells.delete(key); }
      }
    });
  });

  // ── FILE WATCHER ─────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    chokidar.watch(process.cwd(), { ignored: /node_modules|\.git|dist/, depth: 4 })
      .on("change", (p) => io.emit("file:change", { path: p }));
  }

  // ── VITE / STATIC ─────────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true, host: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (_req, res) => res.sendFile(path.resolve("dist", "index.html")));
  }

  // ── LISTEN ────────────────────────────────────────────────────────────────
  httpServer.listen(PORT, "0.0.0.0", () => {
    const lan = Object.values(os.networkInterfaces())
      .flat().find(i => i?.family === "IPv4" && !i.internal)?.address || "localhost";
    console.log(`\n🚀 T2I Sovereign Rig v13.0`);
    console.log(`   Local   → http://localhost:${PORT}`);
    console.log(`   LAN/PWA → http://${lan}:${PORT}  ← open on phone`);
    console.log(`   Health  → http://localhost:${PORT}/api/health`);
    console.log(`   X11     → http://localhost:${PORT}/x11/vnc.html`);
    if (GATEWAY_TOKEN) console.log(`   Token   → ${GATEWAY_TOKEN.slice(0,4)}****`);
    else console.log(`   [OPEN]  No token — open LAN access`);
    console.log();
  });
}

startServer().catch(console.error);
