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
    { name: "list_dir", description: "List files and directories at a given path",
      inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } },
    { name: "search_files", description: "Search for a keyword in files under a directory",
      inputSchema: { type: "object", properties: { dir: { type: "string" }, query: { type: "string" }, ext: { type: "string" } }, required: ["dir","query"] } },
    { name: "git", description: "Run a git command (status, log, diff, pull, add, commit)",
      inputSchema: { type: "object", properties: { cmd: { type: "string" }, cwd: { type: "string" } }, required: ["cmd"] } },
    { name: "ai_chat", description: "Send a message to the active AI model and get a response",
      inputSchema: { type: "object", properties: { message: { type: "string" }, provider: { type: "string" }, model: { type: "string" } }, required: ["message"] } },
    { name: "get_metrics", description: "Get current system CPU, RAM, uptime, and platform info",
      inputSchema: { type: "object", properties: {} } },
    { name: "rag_query", description: "Semantic search over uploaded documents in the T2I knowledge base",
      inputSchema: { type: "object", properties: { query: { type: "string" }, topK: { type: "number" } }, required: ["query"] } },
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
      case "list_dir": {
        const dirPath = safePath(args?.path as string);
        const entries = fs.readdirSync(dirPath, { withFileTypes: true }).map(e => ({
          name: e.name, type: e.isDirectory() ? "dir" : "file"
        }));
        return { content: [{ type: "text", text: JSON.stringify(entries, null, 2) }] };
      }
      case "search_files": {
        const searchDir = safePath(args?.dir as string);
        const query = (args?.query as string).toLowerCase();
        const ext = (args?.ext as string) || "";
        const results: string[] = [];
        const walk = (d: string) => {
          try {
            for (const f of fs.readdirSync(d)) {
              const full = path.join(d, f);
              try {
                const stat = fs.statSync(full);
                if (stat.isDirectory()) { walk(full); continue; }
                if (ext && !f.endsWith(ext)) continue;
                const content = fs.readFileSync(full, "utf8");
                const lines = content.split("\n");
                lines.forEach((line, idx) => {
                  if (line.toLowerCase().includes(query)) {
                    results.push(`${full}:${idx + 1}: ${line.trim()}`);
                  }
                });
              } catch {}
            }
          } catch {}
        };
        walk(searchDir);
        const out = results.slice(0, 50).join("\n") || "No matches found.";
        return { content: [{ type: "text", text: out }] };
      }
      case "git": {
        const gitCmd = `git ${args?.cmd as string}`;
        const gitCwd = (args?.cwd as string) || process.cwd();
        return new Promise((resolve) =>
          exec(gitCmd, { cwd: gitCwd, timeout: 15000 }, (_, stdout, stderr) =>
            resolve({ content: [{ type: "text", text: stdout || stderr || "Done." }] })
          )
        );
      }
      case "ai_chat": {
        const provider = (args?.provider as string) || "gemini";
        const model = (args?.model as string) || "gemini-2.0-flash";
        const message = args?.message as string;
        if (provider === "ollama") {
          const r = await axios.post("http://localhost:11434/api/chat",
            { model, messages: [{ role: "user", content: message }], stream: false }, { timeout: 60000 });
          return { content: [{ type: "text", text: r.data?.message?.content || "No response" }] };
        }
        if (provider === "lmstudio") {
          const r = await axios.post("http://localhost:1234/v1/chat/completions",
            { model, messages: [{ role: "user", content: message }] }, { timeout: 60000 });
          return { content: [{ type: "text", text: r.data?.choices?.[0]?.message?.content || "No response" }] };
        }
        if (!process.env.GEMINI_API_KEY) return { content: [{ type: "text", text: "No GEMINI_API_KEY set." }], isError: true };
        const { GoogleGenAI } = await import("@google/genai");
        const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const result = await genai.models.generateContent({ model, contents: [{ role: "user", parts: [{ text: message }] }] });
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response";
        return { content: [{ type: "text", text }] };
      }
      case "get_metrics":
        return { content: [{ type: "text", text: JSON.stringify(getSystemMetrics(), null, 2) }] };
      case "rag_query": {
        const query = args?.query as string;
        const topK  = (args?.topK as number) || 5;
        try {
          const r = await axios.post("http://localhost:" + (process.env.PORT || 3000) + "/api/rag/query",
            { query, topK }, { timeout: 15000 });
          const results = r.data?.results || [];
          const out = results.map((x: any) =>
            `[${x.docName}] (score: ${x.score})\n${x.content}`
          ).join("\n\n---\n\n") || "No results found.";
          return { content: [{ type: "text", text: out }] };
        } catch (e: any) {
          return { content: [{ type: "text", text: "RAG query failed: " + e.message }], isError: true };
        }
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
  const mcpTransports = new Map<string, SSEServerTransport>();
  app.get("/mcp/sse", (req, res) => {
    const id = Math.random().toString(36).slice(2);
    const transport = new SSEServerTransport("/mcp/messages", res);
    mcpTransports.set(id, transport);
    res.on("close", () => mcpTransports.delete(id));
    mcpServer.connect(transport);
    console.log(`[MCP] Client connected: ${id}`);
  });
  app.post("/mcp/messages", (req, res) => {
    const transport = [...mcpTransports.values()][0];
    if (transport) transport.handlePostMessage(req, res);
    else res.status(503).json({ error: "No MCP session active" });
  });

  // MCP tools manifest (for discovery)
  app.get("/mcp/tools", (_req, res) => res.json({
    server: "t2i-master-rig", version: "13.0.0",
    tools: ["read_file","write_file","execute_shell","termux_run","list_dir","search_files","git","ai_chat","get_metrics","rag_query"]
  }));

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
      // Persist to history
      saveHistory(messages, provider, model);
    } catch (e: any) {
      res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
      res.end();
    }
  });

  // ── CHAT HISTORY (persistent) ─────────────────────────────────────────────
  const HISTORY_DIR = path.join(os.homedir(), ".t2i");
  const HISTORY_FILE = path.join(HISTORY_DIR, "history.json");
  if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR, { recursive: true });

  function saveHistory(messages: any[], provider: string, model: string) {
    try {
      const existing = fs.existsSync(HISTORY_FILE)
        ? JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8")) : [];
      existing.push({ ts: new Date().toISOString(), provider, model, messages });
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(existing.slice(-500), null, 2));
    } catch {}
  }

  app.get("/api/chat/history", (_req, res) => {
    try {
      const data = fs.existsSync(HISTORY_FILE)
        ? JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8")) : [];
      res.json(data.slice(-100).reverse());
    } catch { res.json([]); }
  });

  app.delete("/api/chat/history", sovereignAuth, (_req, res) => {
    try { fs.writeFileSync(HISTORY_FILE, "[]"); res.json({ cleared: true }); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ── AGENT CHAIN DISPATCHER (model-to-model) ───────────────────────────────
  app.post("/api/agent/run", sovereignAuth, async (req, res) => {
    const { task, agents = [] } = req.body;
    // agents = [{ provider, model, role, systemPrompt }]
    // If no agents provided, default to single Gemini call
    const chain = agents.length > 0 ? agents : [
      { provider: "gemini", model: "gemini-2.0-flash", role: "assistant" }
    ];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let context = task;
    const log: any[] = [];

    for (let i = 0; i < chain.length; i++) {
      const agent = chain[i];
      const label = agent.role || `agent-${i + 1}`;
      res.write(`data: ${JSON.stringify({ step: i + 1, total: chain.length, agent: label, status: "running" })}\n\n`);

      try {
        if (agent.provider === "ollama") {
          const r = await axios.post("http://localhost:11434/api/chat", {
            model: agent.model || "llama3",
            messages: [
              ...(agent.systemPrompt ? [{ role: "system", content: agent.systemPrompt }] : []),
              { role: "user", content: context }
            ],
            stream: false
          }, { timeout: 120000 });
          context = r.data?.message?.content || context;
        } else if (agent.provider === "lmstudio") {
          const r = await axios.post("http://localhost:1234/v1/chat/completions", {
            model: agent.model || "local-model",
            messages: [
              ...(agent.systemPrompt ? [{ role: "system", content: agent.systemPrompt }] : []),
              { role: "user", content: context }
            ]
          }, { timeout: 120000 });
          context = r.data?.choices?.[0]?.message?.content || context;
        } else {
          // Gemini (default)
          if (process.env.GEMINI_API_KEY) {
            const { GoogleGenAI } = await import("@google/genai");
            const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
            const result = await genai.models.generateContent({
              model: agent.model || "gemini-2.0-flash",
              contents: [{ role: "user", parts: [{ text: context }] }],
              config: agent.systemPrompt ? { systemInstruction: agent.systemPrompt } : undefined
            });
            context = result.candidates?.[0]?.content?.parts?.[0]?.text ?? context;
          }
        }
        log.push({ step: i + 1, agent: label, output: context.slice(0, 200) });
        res.write(`data: ${JSON.stringify({ step: i + 1, agent: label, status: "done", output: context })}\n\n`);
      } catch (e: any) {
        res.write(`data: ${JSON.stringify({ step: i + 1, agent: label, status: "error", error: e.message })}\n\n`);
        break;
      }
    }

    res.write(`data: ${JSON.stringify({ status: "complete", result: context, log })}\n\n`);
    res.write("data: [DONE]\n\n");
    res.end();
  });

  // ── RAG — Document Upload + Semantic Search ───────────────────────────────
  // Beat AnythingLLM: PDF/TXT/MD/code → chunk → Gemini embed → SQLite → chat
  // No Python, no vector DB daemon, no setup. Pure Node.

  const RAG_DIR  = path.join(os.homedir(), ".t2i", "rag");
  const RAG_DB   = path.join(os.homedir(), ".t2i", "rag.db");
  if (!fs.existsSync(RAG_DIR)) fs.mkdirSync(RAG_DIR, { recursive: true });

  // Lazy-load SQLite to avoid hard dep crash if not installed
  let ragDb: any = null;
  function getRagDb() {
    if (ragDb) return ragDb;
    try {
      const Database = require("better-sqlite3");
      ragDb = new Database(RAG_DB);
      ragDb.exec(`
        CREATE TABLE IF NOT EXISTS chunks (
          id        INTEGER PRIMARY KEY AUTOINCREMENT,
          doc_id    TEXT    NOT NULL,
          doc_name  TEXT    NOT NULL,
          chunk_idx INTEGER NOT NULL,
          content   TEXT    NOT NULL,
          embedding TEXT    NOT NULL,
          created   TEXT    DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS documents (
          id       TEXT PRIMARY KEY,
          name     TEXT NOT NULL,
          type     TEXT NOT NULL,
          size     INTEGER,
          chunks   INTEGER,
          created  TEXT DEFAULT (datetime('now'))
        );
      `);
      return ragDb;
    } catch {
      return null;
    }
  }

  // Chunk text into ~512-token segments with 64-token overlap
  function chunkText(text: string, size = 1800, overlap = 200): string[] {
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
      chunks.push(text.slice(start, start + size));
      start += size - overlap;
    }
    return chunks.filter(c => c.trim().length > 40);
  }

  // Gemini text embedding
  async function embedText(text: string): Promise<number[]> {
    if (!process.env.GEMINI_API_KEY) throw new Error("No GEMINI_API_KEY");
    const { GoogleGenAI } = await import("@google/genai");
    const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const result = await genai.models.embedContent({
      model: "text-embedding-004",
      contents: text,
    });
    return (result as any).embeddings?.[0]?.values ?? [];
  }

  // Cosine similarity
  function cosineSim(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot   += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
  }

  // Upload endpoint — accepts multipart file
  const multer = require("multer");
  const upload = multer({ dest: RAG_DIR, limits: { fileSize: 20 * 1024 * 1024 } });

  app.post("/api/rag/upload", sovereignAuth, upload.single("file"), async (req: any, res: any) => {
    const db = getRagDb();
    if (!db) return res.status(500).json({ error: "SQLite (better-sqlite3) not installed. Run: npm i better-sqlite3" });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const docId   = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const docName = req.file.originalname || req.file.filename;
    const tmpPath = req.file.path;

    try {
      // Extract text (PDF needs pdf-parse, others read directly)
      let text = "";
      const ext = path.extname(docName).toLowerCase();
      if (ext === ".pdf") {
        try {
          const pdfParse = require("pdf-parse");
          const buf = fs.readFileSync(tmpPath);
          const pdf = await pdfParse(buf);
          text = pdf.text;
        } catch {
          return res.status(400).json({ error: "PDF parse failed. Run: npm i pdf-parse" });
        }
      } else {
        // TXT, MD, TS, JS, PY, etc.
        text = fs.readFileSync(tmpPath, "utf8");
      }
      fs.unlinkSync(tmpPath); // clean up temp

      const chunks = chunkText(text);
      if (!chunks.length) return res.status(400).json({ error: "No content extracted from file" });

      // Embed all chunks (batch with delay to avoid rate limits)
      const insertChunk = db.prepare(
        "INSERT INTO chunks (doc_id, doc_name, chunk_idx, content, embedding) VALUES (?, ?, ?, ?, ?)"
      );
      const insertDoc = db.prepare(
        "INSERT OR REPLACE INTO documents (id, name, type, size, chunks) VALUES (?, ?, ?, ?, ?)"
      );

      for (let i = 0; i < chunks.length; i++) {
        const vec = await embedText(chunks[i]);
        insertChunk.run(docId, docName, i, chunks[i], JSON.stringify(vec));
        if (i < chunks.length - 1) await new Promise(r => setTimeout(r, 120)); // rate limit guard
      }

      insertDoc.run(docId, docName, ext.slice(1) || "txt", text.length, chunks.length);

      console.log(`[RAG] Uploaded: ${docName} → ${chunks.length} chunks`);
      res.json({ docId, name: docName, chunks: chunks.length, status: "embedded" });
    } catch (e: any) {
      try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch {}
      res.status(500).json({ error: e.message });
    }
  });

  // Semantic search — returns top-k relevant chunks
  app.post("/api/rag/query", async (req: any, res: any) => {
    const db = getRagDb();
    if (!db) return res.status(500).json({ error: "SQLite not available" });
    const { query, topK = 5, docId } = req.body;
    if (!query) return res.status(400).json({ error: "query required" });

    try {
      const queryVec = await embedText(query);
      const rows = docId
        ? db.prepare("SELECT * FROM chunks WHERE doc_id = ?").all(docId)
        : db.prepare("SELECT * FROM chunks").all();

      const scored = (rows as any[]).map((row: any) => ({
        ...row,
        score: cosineSim(queryVec, JSON.parse(row.embedding)),
      })).sort((a: any, b: any) => b.score - a.score).slice(0, topK);

      res.json({ results: scored.map((r: any) => ({
        docName: r.doc_name,
        docId:   r.doc_id,
        chunk:   r.chunk_idx,
        content: r.content,
        score:   r.score.toFixed(4),
      })) });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // RAG-augmented chat — query → inject context → stream AI answer
  app.post("/api/rag/chat", async (req: any, res: any) => {
    const db = getRagDb();
    const { messages = [], query, model = "gemini-2.0-flash", docId } = req.body;
    if (!query) return res.status(400).json({ error: "query required" });
    if (!process.env.GEMINI_API_KEY) return res.status(400).json({ error: "No GEMINI_API_KEY" });

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      // Retrieve context if RAG DB available
      let contextBlock = "";
      if (db) {
        const queryVec = await embedText(query);
        const rows = docId
          ? db.prepare("SELECT * FROM chunks WHERE doc_id = ?").all(docId)
          : db.prepare("SELECT * FROM chunks").all();
        const top = (rows as any[]).map((r: any) => ({
          content: r.content, docName: r.doc_name,
          score: cosineSim(queryVec, JSON.parse(r.embedding)),
        })).sort((a: any, b: any) => b.score - a.score).slice(0, 5);

        if (top.length) {
          contextBlock = `\n\n---\nRELEVANT DOCUMENTS:\n${top.map(r =>
            `[${r.docName}]\n${r.content}`
          ).join("\n\n")}\n---\n`;
        }
      }

      const { GoogleGenAI } = await import("@google/genai");
      const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const fullMessages = [
        ...messages,
        { role: "user", content: query + contextBlock },
      ];

      const result = await genai.models.generateContentStream({
        model,
        contents: fullMessages.map((m: any) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        config: {
          systemInstruction: `You are T2I Sovereign AI. Answer using the provided document context when relevant. Be precise and cite the source document name.`,
          maxOutputTokens: 4096,
        },
      });

      for await (const chunk of result) {
        const text = chunk.text ?? "";
        if (text) res.write(`data: ${JSON.stringify({ text })}\\n\\n`);
      }
      res.write("data: [DONE]\\n\\n");
      res.end();
      saveHistory(fullMessages, "gemini-rag", model);
    } catch (e: any) {
      res.write(`data: ${JSON.stringify({ error: e.message })}\\n\\n`);
      res.end();
    }
  });

  // List all uploaded documents
  app.get("/api/rag/docs", (_req: any, res: any) => {
    const db = getRagDb();
    if (!db) return res.json({ docs: [] });
    try {
      const docs = db.prepare("SELECT * FROM documents ORDER BY created DESC").all();
      res.json({ docs });
    } catch { res.json({ docs: [] }); }
  });

  // Delete a document and its chunks
  app.delete("/api/rag/docs/:docId", sovereignAuth, (req: any, res: any) => {
    const db = getRagDb();
    if (!db) return res.status(500).json({ error: "SQLite not available" });
    try {
      db.prepare("DELETE FROM chunks WHERE doc_id = ?").run(req.params.docId);
      db.prepare("DELETE FROM documents WHERE id = ?").run(req.params.docId);
      res.json({ deleted: req.params.docId });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
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
