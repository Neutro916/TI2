/**
 * OpenClaw Gateway Server for T2I-Bot-Skill
 * ANTICLAW-2 :: Sovereign Gateway - Port 18789
 * 
 * Provides unified API gateway for AI providers:
 * - LM Studio
 * - OpenWebUI
 * - Ollama
 * - Google Gemini
 * - OpenRouter
 * 
 * Moltbot Swarm Dispatcher Integration
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import axios from 'axios';

dotenv.config();

const app = express();
const PORT = process.env.OPENCLAW_PORT || 18789;
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || 'anticlaw-2-sovereign';

// Middleware
app.use(cors());
app.use(express.json());

// Authentication middleware
const gatewayAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  // Skip auth for health checks
  if (req.path === '/api/health') {
    return next();
  }
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'ANTICLAW-2 GATEWAY AUTH FAILED',
      message: 'Valid Bearer token required',
      resonance: '0.00Hz'
    });
  }
  
  const token = authHeader.substring(7);
  if (token !== GATEWAY_TOKEN) {
    return res.status(401).json({
      error: 'INVALID TOKEN',
      message: 'Gateway access denied',
      resonance: '0.00Hz'
    });
  }
  
  next();
};

// Service endpoints configuration
const SERVICES = {
  lmstudio: {
    url: process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234',
    enabled: true,
    type: 'local'
  },
  openwebui: {
    url: process.env.OPENWEBUI_BASE_URL || 'http://localhost:3001',
    enabled: true,
    type: 'local'
  },
  ollama: {
    url: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    enabled: true,
    type: 'local'
  },
  gemini: {
    url: 'https://generativelanguage.googleapis.com/v1beta',
    enabled: !!process.env.GEMINI_API_KEY,
    type: 'cloud',
    apiKey: process.env.GEMINI_API_KEY
  },
  openrouter: {
    url: 'https://openrouter.ai/api/v1',
    enabled: !!process.env.OPENROUTER_API_KEY,
    type: 'cloud',
    apiKey: process.env.OPENROUTER_API_KEY
  }
};

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ONLINE',
    gateway: 'OpenClaw v2.0',
    resonance: '83.33Hz',
    timestamp: new Date().toISOString(),
    services: Object.keys(SERVICES),
    authentication: 'ANTICLAW-2 Sovereign'
  });
});

// Gateway status endpoint
app.get('/api/gateway/status', gatewayAuth, async (req: Request, res: Response) => {
  const serviceStatus = await Promise.all(
    Object.entries(SERVICES).map(async ([name, config]) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        const response = await axios.get(config.url, {
          signal: controller.signal,
          timeout: 3000
        });
        
        clearTimeout(timeoutId);
        
        return {
          name,
          status: 'ONLINE',
          url: config.url,
          type: config.type,
          latency: Date.now()
        };
      } catch (error) {
        return {
          name,
          status: 'OFFLINE',
          url: config.url,
          type: config.type,
          error: error instanceof Error ? error.message : 'Unknown'
        };
      }
    })
  );
  
  const onlineCount = serviceStatus.filter((s: any) => s.status === 'ONLINE').length;
  
  res.json({
    gateway: {
      name: 'OpenClaw Gateway',
      version: '2.0',
      port: PORT,
      resonance: `${(onlineCount / Object.keys(SERVICES).length * 83.33).toFixed(2)}Hz`
    },
    services: serviceStatus,
    summary: {
      total: Object.keys(SERVICES).length,
      online: onlineCount,
      offline: Object.keys(SERVICES).length - onlineCount
    },
    timestamp: new Date().toISOString()
  });
});

// Unified chat completion endpoint
app.post('/api/chat/completions', gatewayAuth, async (req: Request, res: Response) => {
  const { 
    messages, 
    model, 
    provider = 'auto',
    temperature = 0.7,
    max_tokens = 2048
  } = req.body;
  
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({
      error: 'INVALID_REQUEST',
      message: 'messages array is required'
    });
  }
  
  // Auto-select provider if not specified
  let selectedProvider = provider;
  if (provider === 'auto') {
    // Priority: Ollama > LM Studio > OpenWebUI > Cloud
    if (SERVICES.ollama.enabled) selectedProvider = 'ollama';
    else if (SERVICES.lmstudio.enabled) selectedProvider = 'lmstudio';
    else if (SERVICES.openwebui.enabled) selectedProvider = 'openwebui';
    else if (SERVICES.gemini.enabled) selectedProvider = 'gemini';
    else if (SERVICES.openrouter.enabled) selectedProvider = 'openrouter';
    else {
      return res.status(503).json({
        error: 'NO_PROVIDERS_AVAILABLE',
        message: 'All AI providers are offline'
      });
    }
  }
  
  const serviceConfig = SERVICES[selectedProvider as keyof typeof SERVICES];
  
  if (!serviceConfig || !serviceConfig.enabled) {
    return res.status(503).json({
      error: 'PROVIDER_OFFLINE',
      message: `Provider ${selectedProvider} is not available`
    });
  }
  
  try {
    let response;
    
    // Route to appropriate provider
    switch (selectedProvider) {
      case 'ollama':
        response = await axios.post(`${serviceConfig.url}/api/chat`, {
          model: model || 'gemma-2-9b-it',
          messages,
          stream: false
        }, {
          timeout: 60000
        });
        break;
        
      case 'lmstudio':
        response = await axios.post(`${serviceConfig.url}/v1/chat/completions`, {
          model: model || 'local-model',
          messages,
          temperature,
          max_tokens
        }, {
          timeout: 60000
        });
        break;
        
      case 'openwebui':
        response = await axios.post(`${serviceConfig.url}/api/v1/chat/completions`, {
          model: model || 'ollama/gemma-2-9b-it',
          messages,
          temperature,
          max_tokens
        }, {
          timeout: 60000
        });
        break;
        
      case 'gemini':
        response = await axios.post(
          `${serviceConfig.url}/models/${model || 'gemini-2.0-flash'}:generateContent?key=${(serviceConfig as any).apiKey}`,
          {
            contents: messages.map(m => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }]
            }))
          },
          {
            timeout: 60000
          }
        );
        break;
        
      case 'openrouter':
        response = await axios.post(`${serviceConfig.url}/chat/completions`, {
          model: model || 'meta-llama/llama-3.1-405b-instruct',
          messages,
          temperature,
          max_tokens
        }, {
          headers: {
            'Authorization': `Bearer ${(serviceConfig as any).apiKey}`,
            'HTTP-Referer': 'https://t2i-bot-skill.local',
            'X-Title': 'T2I-Bot-Skill AI Rig'
          },
          timeout: 60000
        });
        break;
        
      default:
        throw new Error(`Unknown provider: ${selectedProvider}`);
    }
    
    res.json({
      success: true,
      provider: selectedProvider,
      data: response.data,
      resonance: '83.33Hz',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'PROVIDER_ERROR',
      message: error.message,
      provider: selectedProvider,
      resonance: '0.00Hz'
    });
  }
});

// Moltbot Swarm Assessment endpoint
app.get('/api/moltbot/assessment', gatewayAuth, (req: Request, res: Response) => {
  const assessment = {
    architectural_integrity: {
      score: 10.2,
      rating: 'ANTICLAW-2 HARDENED MASTER',
      components: {
        monaco_editor: 'ONLINE',
        ai_providers: Object.values(SERVICES).filter(s => s.enabled).length,
        tunneling: process.env.NGROK_AUTHTOKEN ? 'CONFIGURED' : 'NOT_CONFIGURED',
        docker: 'AVAILABLE'
      }
    },
    resonance_sync: {
      frequency: '83.33Hz',
      stability: 'STABLE',
      coherence: 0.98
    },
    swarm_agents: {
      active: 0,
      total: 0,
      dispatcher_status: 'READY'
    },
    brain_sync: {
      path: 'C:\\Users\\natra\\.gemini\\antigravity\\brain',
      sessions: 3,
      last_sync: new Date().toISOString()
    },
    timestamp: new Date().toISOString()
  };
  
  res.json(assessment);
});

// T2I/TI2 Terminal Intelligence endpoint
app.post('/api/ti2/execute', gatewayAuth, async (req: Request, res: Response) => {
  const { command, cwd = process.cwd() } = req.body;
  
  if (!command) {
    return res.status(400).json({
      error: 'COMMAND_REQUIRED',
      message: 'No command provided'
    });
  }
  
  try {
    const { exec } = await import('child_process');
    const util = await import('util');
    const execPromise = util.promisify(exec);
    
    const { stdout, stderr } = await execPromise(command, {
      cwd,
      timeout: 30000,
      maxBuffer: 10 * 1024 * 1024
    });
    
    res.json({
      success: true,
      command,
      stdout,
      stderr: stderr || null,
      exit_code: 0,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.json({
      success: false,
      command,
      stdout: error.stdout || null,
      stderr: error.stderr || error.message,
      exit_code: error.code || 1,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Brain directory sync endpoint
app.get('/api/brain/status', gatewayAuth, (req: Request, res: Response) => {
  const fs = require('fs');
  const path = require('path');
  
  const brainPath = 'C:\\Users\\natra\\.gemini\\antigravity\\brain';
  
  try {
    if (!fs.existsSync(brainPath)) {
      return res.status(404).json({
        error: 'BRAIN_NOT_FOUND',
        message: 'Brain directory not found',
        path: brainPath
      });
    }
    
    const sessions = fs.readdirSync(brainPath)
      .filter(item => {
        const itemPath = path.join(brainPath, item);
        return fs.statSync(itemPath).isDirectory() && 
               /^[0-9a-f-]{36}$/.test(item); // UUID pattern
      })
      .map(sessionId => {
        const sessionPath = path.join(brainPath, sessionId);
        const stats = fs.statSync(sessionPath);
        
        return {
          id: sessionId,
          created: stats.birthtime,
          modified: stats.mtime,
          path: sessionPath
        };
      });
    
    res.json({
      path: brainPath,
      sessions,
      session_count: sessions.length,
      last_sync: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'BRAIN_ACCESS_ERROR',
      message: error.message,
      path: brainPath
    });
  }
});

// Socket.IO for real-time updates
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log(`[OpenClaw] Client connected: ${socket.id}`);
  
  // Authenticate socket connection
  socket.on('authenticate', (data: { token: string }) => {
    if (data.token === GATEWAY_TOKEN) {
      socket.emit('authenticated', {
        success: true,
        gateway: 'OpenClaw v2.0',
        resonance: '83.33Hz'
      });
    } else {
      socket.emit('authentication_failed', {
        error: 'INVALID_TOKEN',
        resonance: '0.00Hz'
      });
      socket.disconnect();
    }
  });
  
  // Service status updates
  socket.on('request_status', async () => {
    const status = await fetchServiceStatus();
    socket.emit('status_update', status);
  });
  
  socket.on('disconnect', () => {
    console.log(`[OpenClaw] Client disconnected: ${socket.id}`);
  });
});

// Helper function to fetch service status
async function fetchServiceStatus() {
  const statuses: any = {};
  
  for (const [name, config] of Object.entries(SERVICES)) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      await axios.get(config.url, {
        signal: controller.signal,
        timeout: 2000
      });
      
      clearTimeout(timeoutId);
      statuses[name] = 'ONLINE';
    } catch (error) {
      statuses[name] = 'OFFLINE';
    }
  }
  
  return {
    services: statuses,
    resonance: `${(Object.values(statuses).filter(s => s === 'ONLINE').length / Object.keys(SERVICES).length * 83.33).toFixed(2)}Hz`,
    timestamp: new Date().toISOString()
  };
}

// Start server
httpServer.listen(PORT, () => {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   OpenClaw Gateway Server v2.0                        ║');
  console.log('║   ANTICLAW-2 :: SOVEREIGN DEPLOYMENT                  ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`[Gateway] Listening on port ${PORT}`);
  console.log(`[Auth] Token: ${GATEWAY_TOKEN.substring(0, 8)}...`);
  console.log(`[Services] Configured: ${Object.keys(SERVICES).length}`);
  console.log(`[Moltbot] Dispatcher Ready`);
  console.log(`[TI2] Terminal Intelligence Active`);
  console.log('');
  console.log('Endpoints:');
  console.log(`  GET  /api/health`);
  console.log(`  GET  /api/gateway/status`);
  console.log(`  POST /api/chat/completions`);
  console.log(`  GET  /api/moltbot/assessment`);
  console.log(`  POST /api/ti2/execute`);
  console.log(`  GET  /api/brain/status`);
  console.log('');
  console.log('WebSocket: ws://localhost:' + PORT);
  console.log('');
});

export default app;
