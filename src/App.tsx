import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal as TerminalIcon, 
  Code2, 
  Settings, 
  Cpu, 
  Sparkles, 
  Plus, 
  ChevronRight, 
  X, 
  Send,
  Zap,
  Globe,
  Trash2,
  FileCode,
  FolderOpen,
  Monitor,
  Shield,
  Palette,
  Image as ImageIcon,
  Box,
  Wifi,
  WifiOff,
  Edit2,
  Save,
  Play,
  Search,
  Square,
  Camera,
  Mic,
  Folder,
  Lock,
  RefreshCw,
  ExternalLink,
  MonitorPlay
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
import { ProviderSync, ModelInfo } from "./services/providerSync";
import { io, Socket } from "socket.io-client";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { 
  FileData, 
  ShellLine, 
  Endpoint, 
  Message, 
  PageType, 
  VimMode, 
  ChatMode 
} from './types';
import { INITIAL_FILES, SHELL_PROMPTS, LANG_LABELS } from './constants';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export default function App() {
  const [bridgeConfig, setBridgeConfig] = useState({ enabled: false, url: '' });
  const [curPage, setCurPage] = useState<PageType>('shell');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isNavMinimized, setIsNavMinimized] = useState(false);
  const [curFileIdx, setCurFileIdx] = useState(-1);
  const [files, setFiles] = useState<FileData[]>(INITIAL_FILES);
  const [vimMode, setVimMode] = useState<VimMode>('NORMAL');
  const [curLine, setCurLine] = useState(15);
  const [isModified, setIsModified] = useState(false);
  const [aiWorkingOn, setAiWorkingOn] = useState<number | null>(null);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiLog, setAiLog] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('/');
  const [hasTerminalActivity, setHasTerminalActivity] = useState(false);
  const [editorScroll, setEditorScroll] = useState({ top: 0, height: 100, viewHeight: 20 });
  const [isAddingEndpoint, setIsAddingEndpoint] = useState(false);
  const [newEndpoint, setNewEndpoint] = useState<Partial<Endpoint>>({
    name: '',
    type: 'API',
    host: 'localhost',
    port: '8080',
    model: '',
    apiKey: '',
    secondaryToken: '',
    sshKey: '',
    containerId: '',
    notes: '',
    quantization: '',
    icon: '⚡'
  });

  useEffect(() => {
    const typeToIcon: Record<string, string> = {
      'API': '⚡',
      'Ollama': '◉',
      'Docker': '⬡',
      'SSH Tunneling': '🔒',
      'SSH + Docker': '🛡️',
      'Compute': '⚙',
      'Terminal Debug': '⚗',
      'WSL': '◈',
      'Claw Hub': '▣',
      'Telegram Token': '◎',
      'Chat Bot Agent': '◉',
      'MCP': '⬡',
      'LMStudio': '⚡'
    };
    if (newEndpoint.type && typeToIcon[newEndpoint.type]) {
      setNewEndpoint(prev => ({ ...prev, icon: typeToIcon[newEndpoint.type!] }));
    }
  }, [newEndpoint.type]);
  
  const [primaryColor, setPrimaryColor] = useState('#0070f3');
  const [isPhoneRatio, setIsPhoneRatio] = useState(true);
  const [freqDivisor, setFreqDivisor] = useState(83.3333);
  const [showFavSidebar, setShowFavSidebar] = useState(true);
  const [showFileRail, setShowFileRail] = useState(true);
  const [monitorExpanded, setMonitorExpanded] = useState<Record<string, boolean>>({
    logs: true
  });
  const [monitorLogs, setMonitorLogs] = useState<string[]>([
    '[OLLAMA] Starting server...',
    '[OLLAMA] Loading model: qwen2.5:0.8b',
    '[RF] Frequency lock at 83.3333 Hz',
    '[OLLAMA] Ready for requests'
  ]);
  const [shellInputHistory, setShellInputHistory] = useState<string[]>([]);
  const [shellInputHistoryIdx, setShellInputHistoryIdx] = useState(-1);
  const logEndRef = useRef<HTMLDivElement>(null);
  const minimapRef = useRef<HTMLDivElement>(null);
  const filesRef = useRef(files);
  useEffect(() => { filesRef.current = files; }, [files]);

  const [shellTabs, setShellTabs] = useState<{id: string, name: string}[]>([
    { id: '1', name: 'forge' },
    { id: '2', name: 'worker' }
  ]);
  const [activeShellId, setActiveShellId] = useState('1');
  const [shellInput, setShellInput] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isX11Active, setIsX11Active] = useState(false);
  const [isSandboxActive, setIsSandboxActive] = useState(false);
  const [favScripts, setFavScripts] = useState([
    { category: 'GIT MANAGER', items: [
      { name: 'git status', cmd: 'git status', icon: '📦' },
      { name: 'git pull', cmd: 'git pull', icon: '↻' },
      { name: 'git add all', cmd: 'git add .', icon: 'Plus' },
      { name: 'git auto-commit', cmd: 'git commit -m "Auto Update"', icon: 'Save' },
      { name: 'git log', cmd: 'git log -n 5 --oneline', icon: '⌨' }
    ]},
    { category: 'SYSTEM', items: [
      { name: 'apt update', cmd: 'sudo apt update', icon: '⚙' },
      { name: 'pkg install', cmd: 'pkg install ', icon: '📦' },
      { name: 'curl check', cmd: 'curl -I localhost:3000', icon: '⚡' },
    ]},
    { category: 'SERVICES', items: [
      { name: 'code-server', cmd: 'code-server --auth none', icon: '⬡' },
      { name: 'open-webui', cmd: 'open-webui serve', icon: '🌐' },
      { name: 'ollama serve', cmd: 'ollama serve', icon: '◉' },
    ]},
    { category: 'CLAW/CODE', items: [
      { name: 'g++ build', cmd: 'g++ main.cpp -o main && ./main', icon: '⚙' },
      { name: 'claudecode', cmd: 'claudecode', icon: '🤖' },
      { name: 'openclaw', cmd: 'openclaw', icon: '🦞' },
      { name: 'opencode', cmd: 'opencode .', icon: '⌨' },
    ]},
    { category: 'GEMINI/ANTIGRAVITY', items: [
      { name: 'gemini cli', cmd: 'gemini-cli', icon: '✨' },
      { name: 'antigravity', cmd: 'echo "Antigravity Agent Ready"', icon: '🌟' },
    ]},
    { category: 'NETWORK', items: [
      { name: 'ngrok :3000', cmd: 'ngrok http 3000', icon: '↻' },
    ]}
  ]);
  
  const [isAddingScript, setIsAddingScript] = useState(false);
  const [newScript, setNewScript] = useState({ name: '', cmd: '', icon: '⚡' });
  const [notifications, setNotifications] = useState<{id: string, message: string}[]>([]);

  // Vercel AI Chatbot / Continue.dev Layout State
  const [showAiSidebar, setShowAiSidebar] = useState(false);
  const [aiMessages, setAiMessages] = useState<{role: 'user'|'assistant', content: string, toolCalls?: any[]}[]>([]);

  // Grep / Glob Search Modal
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{fileIdx: number, lineIdx: number, text: string}[]>([]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const results: {fileIdx: number, lineIdx: number, text: string}[] = [];
    files.forEach((f, idx) => {
      if (f.raw) {
        const lines = f.raw.split('\n');
        lines.forEach((l, lIdx) => {
          if (l.toLowerCase().includes(q) || f.name.toLowerCase().includes(q)) {
            results.push({ fileIdx: idx, lineIdx: lIdx, text: l.trim() || f.name });
            if (results.length > 50) return; // limit search
          }
        });
      }
    });
    setSearchResults(results.slice(0, 50));
  }, [searchQuery, files]);
  
  const [discoveredModels, setDiscoveredModels] = useState<Record<string, ModelInfo[]>>({});

  const validateEndpoint = (endpoint: Partial<Endpoint>) => {
    if (!endpoint.host?.trim()) {
      const id = Math.random().toString(36).substr(2, 9);
      setNotifications(prev => [...prev, { id, message: "Host cannot be empty" }]);
      setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
      return false;
    }
    if (!endpoint.port?.trim()) {
      const id = Math.random().toString(36).substr(2, 9);
      setNotifications(prev => [...prev, { id, message: "Port cannot be empty" }]);
      setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
      return false;
    }
    if (isNaN(Number(endpoint.port))) {
      const id = Math.random().toString(36).substr(2, 9);
      setNotifications(prev => [...prev, { id, message: "Port must be a valid number" }]);
      setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
      return false;
    }
    return true;
  };

  const syncModels = async (endpoint: Endpoint) => {
    try {
      setNotifications(prev => [...prev, { id: Math.random().toString(), message: `Syncing models for ${endpoint.name}...` }]);
      const models = await ProviderSync.getInstance().discoverModels(endpoint);
      setDiscoveredModels(prev => ({ ...prev, [endpoint.id]: models }));
      if (models.length > 0) {
        setNotifications(prev => [...prev, { id: Math.random().toString(), message: `Discovered ${models.length} models for ${endpoint.name}` }]);
        terminalsRef.current[activeShellId]?.writeln(`\x1b[32m[OK] Discovered ${models.length} models for ${endpoint.name}\x1b[0m`);
      } else {
        setNotifications(prev => [...prev, { id: Math.random().toString(), message: `No models found for ${endpoint.name}` }]);
      }
    } catch (e) {
      console.error('Sync failed', e);
      setNotifications(prev => [...prev, { id: Math.random().toString(), message: `Sync failed for ${endpoint.name}` }]);
      terminalsRef.current[activeShellId]?.writeln(`\x1b[31m[ERR] Failed to sync models for ${endpoint.name}\x1b[0m`);
    }
  };

  const [chatMode, setChatMode] = useState<ChatMode>('aider');
  const [ctxActive, setCtxActive] = useState<Set<string>>(new Set(['file']));
  const [activeTabType, setActiveTabType] = useState<'file'|'shell'>('file');

  const [endpoints, setEndpoints] = useState<Endpoint[]>([
    { id: 'openai', name: 'OpenAI', type: 'API', host: 'api.openai.com', port: '443', apiKey: '', status: 'IDLE', icon: '◉', isProvider: true },
    { id: 'anthropic', name: 'Anthropic', type: 'API', host: 'api.anthropic.com', port: '443', apiKey: '', status: 'IDLE', icon: '⬡', isProvider: true },
    { id: 'gemini', name: 'Google Gemini', type: 'API', host: 'generativelanguage.googleapis.com', port: '443', apiKey: '', status: 'API', icon: '⚡', isProvider: true },
    { id: 'mistral', name: 'Mistral AI', type: 'API', host: 'api.mistral.ai', port: '443', apiKey: '', status: 'IDLE', icon: '◈', isProvider: true },
    { id: 'ollama-local', name: 'Local Ollama', type: 'Ollama', host: typeof window !== 'undefined' ? window.location.hostname : 'localhost', port: '11434', apiKey: '', status: 'IDLE', icon: '◉', isProvider: false },
    { id: 'lmstudio-local', name: 'Local LMStudio', type: 'LMStudio', host: typeof window !== 'undefined' ? window.location.hostname : 'localhost', port: '1234', apiKey: '', status: 'IDLE', icon: '⚡', isProvider: false },
    { id: 'mobile-rig-tunnel', name: 'Mobile AI Rig Tunnel', type: 'Ollama', host: '192.168.1.50', port: '11434', apiKey: '', notes: 'Change host to your phone IP for local offloading', status: 'IDLE', icon: '📱', isProvider: false },
    { id: 'huggingface', name: 'HuggingFace (Unsloth Base)', type: 'API', host: 'api-inference.huggingface.co', port: '443', apiKey: '', status: 'IDLE', icon: '🤗', isProvider: true },
    { id: 'kaggle', name: 'Kaggle Models', type: 'API', host: 'kaggle.com/api/v1/models', port: '443', apiKey: '', status: 'IDLE', icon: 'K', isProvider: true },
  ]);

  const [selectedEndpointId, setSelectedEndpointId] = useState<string>('ollama-local');
  const [todos, setTodos] = useState<{task: string, status: 'PENDING' | 'DONE'}[]>([]);
  const [endpointHealth, setEndpointHealth] = useState<Record<string, boolean>>({});

  // Real-time Health check loop for local ports
  useEffect(() => {
    const checkHealth = async () => {
      const health: Record<string, boolean> = { ...endpointHealth };
      for (const ep of endpoints) {
        if (ep.id === 'ollama-local') {
          try {
            const res = await fetch(`http://${ep.host}:${ep.port}/`);
            health[ep.id] = res.ok || res.status === 200;
          } catch { health[ep.id] = false; }
        } else if (ep.id === 'lmstudio-local') {
          try {
            const res = await fetch(`http://${ep.host}:${ep.port}/v1/models`);
            health[ep.id] = res.ok;
          } catch { health[ep.id] = false; }
        } else {
          health[ep.id] = true;
        }
      }
      setEndpointHealth(health);
    };
    checkHealth();
    const iv = setInterval(checkHealth, 15000);
    return () => clearInterval(iv);
  }, [endpoints]);

  // Auto-sync Rig models on startup
  useEffect(() => {
    const autoSync = async () => {
      const localOllama = endpoints.find(e => e.id === 'ollama-local');
      if (localOllama) {
        await syncModels(localOllama);
      }
    };
    setTimeout(autoSync, 1500);
  }, []); // Run once on mount

  const [editingEndpoint, setEditingEndpoint] = useState<string | null>(null);
  const [wakeLock, setWakeLock] = useState<any>(null);

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        const lock = await (navigator as any).wakeLock.request('screen');
        setWakeLock(lock);
        console.log('Wake Lock active');
      }
    } catch (err) {
      console.warn('Wake Lock failed', err);
    }
  };

  useEffect(() => {
    requestWakeLock();
    const handleVisibilityChange = () => {
      if (wakeLock !== null && document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      wakeLock?.release();
    };
  }, []);

  const togglePiP = async () => {
    if (!('documentPictureInPicture' in window)) {
      alert('Document Picture-in-Picture is not supported in this browser.');
      return;
    }

    try {
      const pipWindow = await (window as any).documentPictureInPicture.requestWindow({
        width: 600,
        height: 400,
      });

      // Copy styles
      [...document.styleSheets].forEach((styleSheet) => {
        try {
          const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
          const style = document.createElement('style');
          style.textContent = cssRules;
          pipWindow.document.head.appendChild(style);
        } catch (e) {
          if (styleSheet.href) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = styleSheet.href;
            pipWindow.document.head.appendChild(link);
          }
        }
      });

      const container = terminalContainersRef.current[activeShellId];
      if (container) {
        const parent = container.parentElement;
        pipWindow.document.body.append(container);
        pipWindow.document.body.style.background = '#000';
        pipWindow.document.body.style.margin = '0';
        pipWindow.document.body.style.overflow = 'hidden';
        container.style.height = '100vh';
        container.style.width = '100vw';
        container.style.position = 'absolute';
        container.style.inset = '0';
        container.style.opacity = '1';
        container.style.zIndex = '100';
        container.style.pointerEvents = 'auto';

        // Re-fit terminal
        const term = terminalsRef.current[activeShellId];
        if (term) {
          setTimeout(() => (term as any).fitAddon?.fit(), 100);
        }

        pipWindow.addEventListener('pagehide', () => {
          if (parent) {
            parent.append(container);
            container.style.height = '';
            container.style.width = '';
            container.style.position = 'absolute';
            container.style.inset = '0';
            setTimeout(() => (term as any).fitAddon?.fit(), 100);
          }
        });
      }
    } catch (e) {
      console.error('PiP failed', e);
    }
  };

  const terminalsRef = useRef<Record<string, Terminal>>({});
  const socketsRef = useRef<Record<string, Socket>>({});
  const terminalContainersRef = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    shellTabs.forEach(tab => {
      if (!terminalsRef.current[tab.id]) {
        const term = new Terminal({
          cursorBlink: true,
          fontSize: 10,
          fontFamily: 'JetBrains Mono, monospace',
          theme: {
            background: 'transparent',
            foreground: '#ffffff',
            cursor: '#0070f3',
            selectionBackground: 'rgba(26, 159, 255, 0.3)',
          },
          allowTransparency: true,
        });
        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        (term as any).fitAddon = fitAddon;
        terminalsRef.current[tab.id] = term;

        const socket = io();
        socketsRef.current[tab.id] = socket;

        socket.on('terminal:output', (data) => {
          term.write(data);
          setHasTerminalActivity(true);
        });

        term.onData((data) => {
          socket.emit('terminal:input', data);
        });

        // Initial greeting
        term.writeln('\x1b[34mTerminal to Intel – Reality Forge OS\x1b[0m');
        term.writeln(`\x1b[32m[OK] Shell instance ${tab.name} ready\x1b[0m`);
        term.write('\r\nforge:~$ ');
      }
    });

    return () => {
      // Cleanup logic if needed
    };
  }, [shellTabs]);

  useEffect(() => {
    const activeTerm = terminalsRef.current[activeShellId];
    const container = terminalContainersRef.current[activeShellId];
    if (activeTerm && container) {
      activeTerm.open(container);
      const fitAddon = new FitAddon();
      activeTerm.loadAddon(fitAddon);
      (activeTerm as any).fitAddon = fitAddon;
      setTimeout(() => {
        try {
          fitAddon.fit();
        } catch (e) {
          console.warn('FitAddon fit failed', e);
        }
      }, 100);
    }
  }, [activeShellId, curPage]);

  const handleResize = () => {
    Object.values(terminalsRef.current).forEach(term => {
      const fitAddon = (term as any).fitAddon;
      if (fitAddon) {
        try {
          fitAddon.fit();
        } catch (e) {
          // Ignore errors during resize
        }
      }
    });
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchFiles = async () => {
    try {
      const res = await fetch(getApiUrl('/api/files'));
      const data = await res.json();
      if (Array.isArray(data)) {
        const newFiles = data.map((item: any) => {
          const name = typeof item === 'string' ? item : (item.name || 'unknown.txt');
          const raw = typeof item === 'object' ? (item.raw || '') : '';
          const ext = name.split('.').pop() || 'txt';
          const lang = ext === 'js' ? 'js' : ext === 'ts' ? 'ts' : ext === 'py' ? 'py' : ext === 'sh' ? 'sh' : 'txt';
          const color = lang === 'js' ? '#f7df1e' : lang === 'ts' ? '#3178c6' : lang === 'py' ? '#3776ab' : lang === 'sh' ? '#4eaa25' : '#888';
          return { name, lang, color, raw };
        });
        setFiles(newFiles);
      }
    } catch (e) {
      console.error('Failed to fetch files', e);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [bridgeConfig.enabled]);

  useEffect(() => {
    const file = files[curFileIdx];
    if (file && !file.raw) {
      const fetchContent = async () => {
        try {
          const res = await fetch(getApiUrl(`/api/files/read?path=${file.name}`));
          const data = await res.json();
          if (data.content !== undefined) {
            setFiles(prev => {
              const next = [...prev];
              if (next[curFileIdx] && next[curFileIdx].name === file.name) {
                next[curFileIdx] = { ...next[curFileIdx], raw: data.content };
              }
              return next;
            });
          }
        } catch (e) {
          console.error('Failed to fetch file content', e);
        }
      };
      fetchContent();
    }
  }, [curFileIdx, files.length, bridgeConfig.enabled]);

  useEffect(() => {
    const s = io();
    
    // CLI-to-App Command Bridge
    s.on('app:command', (data: { type: string, payload: any }) => {
      if (data.type === 'navigate') setCurPage(data.payload);
      if (data.type === 'open') {
        const idx = filesRef.current.findIndex(f => f.name === data.payload);
        if (idx !== -1) {
          setCurFileIdx(idx);
          setCurPage('editor');
        } else {
          // If file not in list, try to fetch it
          fetchFiles().then(() => {
            const newIdx = filesRef.current.findIndex(f => f.name === data.payload);
            if (newIdx !== -1) {
              setCurFileIdx(newIdx);
              setCurPage('editor');
            }
          });
        }
      }
      if (data.type === 'theme') setPrimaryColor(data.payload);
      if (data.type === 'alert') {
        const id = Math.random().toString(36).substr(2, 9);
        setNotifications(prev => [...prev, { id, message: data.payload }]);
        setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
      }
    });

    s.on('terminal:output', (data: string) => {
      setHasTerminalActivity(true);
      // Stream terminal output to monitor logs too
      const clean = data.replace(/\x1B\[[0-9;]*[JKmsu]/g, '').trim();
      if (clean) {
        setMonitorLogs(prev => [...prev.slice(-100), `[LOG] ${clean}`]);
      }
    });

    s.on('fs:change', () => {
      fetchFiles();
    });

    return () => { s.disconnect(); };
  }, []);

  const [showModal, setShowModal] = useState<string | null>(null);
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));

  const shellEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [mcpServers, setMcpServers] = useState<any[]>([]);

  // Helper to get the correct API base (Local Container vs Remote Bridge)
  const getApiUrl = (path: string) => {
    if (bridgeConfig.enabled && bridgeConfig.url) {
      const base = bridgeConfig.url.endsWith('/') ? bridgeConfig.url.slice(0, -1) : bridgeConfig.url;
      return `${base}${path}`;
    }
    return path;
  };






  // Global IDE Shortcuts (Nomacode Parity)
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      // Require Shift key, but not input elements unless we want to override
      if (e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const tagName = (e.target as HTMLElement)?.tagName;
        if (tagName === 'INPUT' || tagName === 'TEXTAREA') return;

        const char = e.key.toLowerCase();
        if (char === 'n') { e.preventDefault(); addShellTab(); }
        if (char === 'w') { e.preventDefault(); removeShellTab(activeShellId, { stopPropagation: () => {} } as any); }
        if (char === 'k') { e.preventDefault(); setCurPage('ai'); }
        if (char === 'c') { e.preventDefault(); setCurPage('editor'); }
        if (char === 't') { e.preventDefault(); setCurPage('shell'); }
      }
    };
    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [activeShellId]);

  // Vim Keybindings Logic
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (curPage !== 'editor') return;

      if (e.key === 'Escape') {
        setVimMode('NORMAL');
        (document.activeElement as HTMLElement)?.blur();
      } else if (vimMode === 'NORMAL') {
        if (e.key === 'i') {
          setVimMode('INSERT');
          e.preventDefault();
        } else if (e.key === 'v') {
          setVimMode('VISUAL');
          e.preventDefault();
        } else if (e.key === ':') {
          setVimMode('COMMAND');
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [curPage, vimMode]);

  const highlightCode = (line: string) => {
    const file = files[curFileIdx];
    if (file.lang === 'txt' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      return <span>{line}</span>;
    }
    // Regex-based syntax highlighting for JS/TS/Py/C++
    const tokens = [
      { regex: /(#include|#define|#if|#ifdef|#ifndef|#else|#elif|#endif|#pragma|#error|#warning|#undef)\b/g, color: 'var(--color-yellow-primary)' },
      { regex: /\b(int|char|float|double|void|bool|long|short|signed|unsigned|struct|union|enum|typedef|sizeof|auto|static|extern|register|volatile|const|restrict|return|if|else|switch|case|default|break|continue|for|while|do|goto|template|typename|class|public|private|protected|virtual|friend|inline|explicit|this|new|delete|operator|try|catch|throw|namespace|using)\b/g, color: 'var(--color-purple-primary)' },
      { regex: /\b(let|var|function|import|export|from|extends|interface|type|async|await|def|str|dict|list|set|tuple|print)\b/g, color: 'var(--color-purple-primary)' },
      { regex: /\b(true|false|null|undefined|None|True|False)\b/g, color: 'var(--color-orange-primary)' },
      { regex: /\b(\d+)\b/g, color: 'var(--color-orange-primary)' },
      { regex: /(".*?"|'.*?'|`.*?`|<.*?>)/g, color: 'var(--color-green-primary)' },
      { regex: /(\/\/.*$|\/\*[\s\S]*?\*\/|# .*$)/g, color: 'var(--color-txt3)' },
      { regex: /\b(console|window|document|Math|JSON|std|cout|cin|endl|vector|string|map|printf|scanf)\b/g, color: 'var(--color-cyan-primary)' },
    ];

    let segments: { text: string, color?: string }[] = [{ text: line }];

    tokens.forEach(({ regex, color }) => {
      const nextSegments: { text: string, color?: string }[] = [];
      segments.forEach(seg => {
        if (seg.color) {
          nextSegments.push(seg);
          return;
        }
        let lastIdx = 0;
        let match;
        while ((match = regex.exec(seg.text)) !== null) {
          if (match.index > lastIdx) {
            nextSegments.push({ text: seg.text.substring(lastIdx, match.index) });
          }
          nextSegments.push({ text: match[0], color });
          lastIdx = regex.lastIndex;
        }
        if (lastIdx < seg.text.length) {
          nextSegments.push({ text: seg.text.substring(lastIdx) });
        }
      });
      segments = nextSegments;
    });

    return segments.map((seg, i) => (
      <span key={i} style={{ color: seg.color }}>{seg.text}</span>
    ));
  };

  const toggleCtx = (k: string) => {
    setCtxActive(prev => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const handleFolderUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = e.target.files;
    if (!filesList) return;
    
    const newFiles: FileData[] = [];
    const filesArray = Array.from(filesList) as File[];
    filesArray.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const ext = file.name.split('.').pop() || 'txt';
        newFiles.push({
          name: file.name,
          lang: ext,
          color: ext === 'js' ? 'var(--color-yellow-primary)' : ext === 'py' ? 'var(--color-blue-primary)' : (ext === 'c' || ext === 'cpp' || ext === 'h') ? 'var(--color-cyan-primary)' : 'var(--color-txt2)',
          raw: content
        });
        if (newFiles.length === filesArray.length) {
          setFiles(prev => [...prev, ...newFiles]);
        }
      };
      reader.readAsText(file);
    });
  };

  const simulateAiEdit = async () => {
    if (curFileIdx === -1 || !files[curFileIdx]) return;
    
    setShowAiSidebar(true);
    const activeEndpoint = endpoints.find(e => e.id === selectedEndpointId);
    if (!activeEndpoint) {
      setAiMessages(prev => [...prev, {role: 'assistant', content: 'ERR: Selected AI endpoint not found or inactive. Configure network in Settings.'}]);
      return;
    }

    const file = files[curFileIdx];
    const prompt = `You are Terminal to Intel (TI2), an autonomous AI Orchestration Rig acting as a direct extension of the user. 
ENVIRONMENT CONTEXT: We operate a "terminal inside a terminal" with native X11 GUI rendering capabilities, robust shell scripting access, a live code editor buffer, and an open network.
WORKFLOW STYLE: We prioritize automated offline AI tool-calling via functiongemma/local Ollama. We favor silent self-modifying, autonomous background action, and precision 'typewrite_code' edits over noisy conversational text.

CURRENT CONTEXT:
Active File: ${file?.name || 'None'}
Active Provider: ${activeEndpoint.name}
Code State:
${file?.raw || ''}

ACTIVE TODOS:
${todos.length === 0 ? 'No pending tasks.' : todos.map((t, i) => `[ID: ${i}] [${t.status}] ${t.task}`).join('\n')}

YOUR DIRECTIVE: Analyze the active workspace. Autonomously utilize provided tools (manage_todos, typewrite_code, fetch_web, clean_workspace, toggle_preview, execute_shell) to assist the user exactly as requested or intuitively repair problems. Ensure exact compliance. Proceed to plan and execute specific tooling.`;
    
    setAiMessages(prev => [...prev, { role: 'user', content: `Analyze ${file.name} for edits...` }]);
    setAiMessages(prev => [...prev, { role: 'assistant', content: `Generating action plan via ${activeEndpoint.name}...` }]);

    const tools = [
      {
        type: 'function',
        function: {
          name: 'delegate_to_swarm',
          description: 'Offload highly specific tasks to the local 33-agent unified Python dispatcher (Junk repo formation).',
          parameters: {
            type: 'object',
            properties: {
              task_query: { type: 'string', description: 'The specialized query to delegate.' },
              target_agent: { type: 'string', enum: ['MFish_Predictor', 'CONDUCTOR_RAG', 'NEMO_Ralph', 'Math_Reuse_Library', 'Graph_Visualizer'], description: 'The specialist agent to invoke.' }
            },
            required: ['task_query', 'target_agent']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'use_computer',
          description: 'Leverage Python/Node physical desktop bindings to operate Linux Ubuntu instances autonomously (take_screenshot, mouse_click, type_keyboard).',
          parameters: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['screenshot', 'click', 'type', 'key'], description: 'Physical action to execute' },
              text: { type: 'string', description: 'Text to type, if applicable' },
              coordinate: { type: 'array', items: { type: 'number' }, description: 'X,Y coordinate array for click events' }
            },
            required: ['action']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'manage_todos',
          description: 'Add, complete, or clear a task on the internal rig Todo list to track long-term multi-step actions.',
          parameters: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['add', 'complete', 'clear'], description: 'The action to perform.' },
              task_id: { type: 'number', description: 'The task ID (array index) to update or complete. Required for complete.' },
              task_text: { type: 'string', description: 'The description of the task when adding.' }
            },
            required: ['action']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'self_modify',
          description: 'Rewrite or modify the contents of the current file in the editor completely.',
          parameters: {
            type: 'object',
            properties: {
              new_content: { type: 'string', description: 'The entire new source code to replace the file with' }
            },
            required: ['new_content']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'fetch_web',
          description: 'Fetch text content or documentation from a URL',
          parameters: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'The absolute URL to fetch' }
            },
            required: ['url']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'typewrite_code',
          description: 'Typewrite or append new lines of code specifically at a line index instead of replacing the entire file.',
          parameters: {
            type: 'object',
            properties: {
              target_line: { type: 'number', description: 'The line number to start inserting the code at (use -1 to append to end).' },
              code_chunk: { type: 'string', description: 'The code chunk to typewrite or inject.' }
            },
            required: ['target_line', 'code_chunk']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'execute_shell',
          description: 'Run a bash/terminal command in the background shell',
          parameters: {
            type: 'object',
            properties: {
              command: { type: 'string', description: 'The CLI command string' }
            },
            required: ['command']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'clean_workspace',
          description: 'Closes all openly loaded files right now in the editor and clears the IDE workspace to a clean state.',
          parameters: { type: 'object', properties: {} }
        }
      },
      {
        type: 'function',
        function: {
          name: 'toggle_preview',
          description: 'Opens or closes the Live Preview panel for HTML/CSS rendering of the current file.',
          parameters: {
            type: 'object',
            properties: {
              show: { type: 'boolean', description: 'True to open preview, false to close preview' }
            },
            required: ['show']
          }
        }
      }
    ];

    try {
      const res = await ProviderSync.getInstance().generateContent(activeEndpoint, prompt, 432, tools);
      
      if (res.functionCalls && res.functionCalls.length > 0) {
        setAiMessages(prev => {
          const stream = [...prev];
          stream[stream.length - 1] = { role: 'assistant', content: 'Execution Blueprint:', toolCalls: res.functionCalls };
          return stream;
        });
        
        for (const call of res.functionCalls) {
          if (call.name === 'self_modify') {
            const next = [...files];
            next[curFileIdx].raw = call.args.new_content || call.args.newContent;
            setFiles(next);
            setIsModified(true);
            setAiMessages(prev => [...prev, { role: 'assistant', content: `[OK] File ${file.name} modified autonomously.` }]);
          } else if (call.name === 'execute_shell') {
            socketsRef.current[activeShellId]?.emit('terminal:input', call.args.command + '\n');
            setNotifications(prev => [...prev, { id: Math.random().toString(), message: `AI Executing Shell: ${call.args.command}` }]);
          } else if (call.name === 'fetch_web') {
             setAiMessages(prev => [...prev, { role: 'assistant', content: `[FETCH] Queued internal data pipeline for ${call.args.url}` }]);
          } else if (call.name === 'typewrite_code') {
             const next = [...files];
             const lines = next[curFileIdx].raw.split('\n');
             const target = call.args.target_line;
             const chunk = call.args.code_chunk;
             if (target === -1 || target > lines.length) {
               next[curFileIdx].raw += '\n' + chunk;
             } else {
               lines.splice(Math.max(0, target - 1), 0, chunk);
               next[curFileIdx].raw = lines.join('\n');
             }
             setFiles(next);
             setIsModified(true);
             setAiMessages(prev => [...prev, { role: 'assistant', content: `[OK] Code selectively appended at Line ${target === -1 ? 'End' : target}.` }]);
          } else if (call.name === 'manage_todos') {
             if (call.args.action === 'add') {
               setTodos(prev => [...prev, { task: call.args.task_text, status: 'PENDING' }]);
               setAiMessages(prev => [...prev, { role: 'assistant', content: `[TODO ADDED] ${call.args.task_text}` }]);
             } else if (call.args.action === 'complete') {
               setTodos(prev => {
                 const next = [...prev];
                 if (next[call.args.task_id]) next[call.args.task_id].status = 'DONE';
                 return next;
               });
               setAiMessages(prev => [...prev, { role: 'assistant', content: `[TODO COMPLETED] Task ID ${call.args.task_id}` }]);
             } else if (call.args.action === 'clear') {
               setTodos([]);
               setAiMessages(prev => [...prev, { role: 'assistant', content: `[TODO CLEARED]` }]);
             }
          } else if (call.name === 'delegate_to_swarm') {
             setAiMessages(prev => [...prev, { role: 'assistant', content: `[SWARM DISPATCH] Routing query to local ${call.args.target_agent} node...` }]);
             socketsRef.current[activeShellId]?.emit('terminal:input', `echo "Dispatching to ${call.args.target_agent}: ${call.args.task_query}"\n`);
          } else if (call.name === 'clean_workspace') {
             setFiles([]);
             setCurFileIdx(-1);
             setIsModified(false);
             setShowPreview(false);
             setAiMessages(prev => [...prev, { role: 'assistant', content: `[OK] Workspace fully cleaned.` }]);
          } else if (call.name === 'toggle_preview') {
             setShowPreview(call.args.show);
             setAiMessages(prev => [...prev, { role: 'assistant', content: `[OK] Live Preview ${call.args.show ? 'Enabled' : 'Disabled'}.` }]);
          }
        }
      } else {
        setAiMessages(prev => {
          const stream = [...prev];
          stream[stream.length - 1] = { role: 'assistant', content: res.text || 'Analysis complete. No structural changes requested.' };
          return stream;
        });
      }
    } catch (e) {
      setAiMessages(prev => [...prev, { role: 'assistant', content: 'ERR: Neural execution payload failed or endpoint crashed.' }]);
    }
  };

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [monitorLogs]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (shellInput.trim()) {
        socketsRef.current[activeShellId]?.emit('terminal:input', shellInput + '\n');
        setShellInputHistory(prev => [shellInput, ...prev.slice(0, 49)]);
        setShellInputHistoryIdx(-1);
        setShellInput('');
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (shellInputHistoryIdx < shellInputHistory.length - 1) {
        const nextIdx = shellInputHistoryIdx + 1;
        setShellInputHistoryIdx(nextIdx);
        setShellInput(shellInputHistory[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (shellInputHistoryIdx > 0) {
        const nextIdx = shellInputHistoryIdx - 1;
        setShellInputHistoryIdx(nextIdx);
        setShellInput(shellInputHistory[nextIdx]);
      } else if (shellInputHistoryIdx === 0) {
        setShellInputHistoryIdx(-1);
        setShellInput('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      const common = ['ls', 'cd', 'cat', 'npm', 'git', 'ollama', 'node', 'ti', 'forge'];
      const match = common.find(c => c.startsWith(shellInput));
      if (match) setShellInput(match);
    }
  };

  const removeFile = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (files.length === 1) return;
    const newFiles = files.filter((_, i) => i !== idx);
    setFiles(newFiles);
    if (curFileIdx >= newFiles.length) {
      setCurFileIdx(newFiles.length - 1);
    } else if (curFileIdx === idx) {
      setCurFileIdx(Math.max(0, idx - 1));
    }
  };

  const addShellTab = () => {
    const newId = Math.random().toString(36).substr(2, 9);
    setShellTabs(prev => [...prev, { id: newId, name: `shell-${prev.length + 1}` }]);
    setActiveShellId(newId);
  };

  const removeShellTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (shellTabs.length === 1) return;
    setShellTabs(prev => prev.filter(t => t.id !== id));
    if (activeShellId === id) {
      const remaining = shellTabs.filter(t => t.id !== id);
      setActiveShellId(remaining[remaining.length - 1].id);
    }
    // Cleanup terminal and socket
    terminalsRef.current[id]?.dispose();
    delete terminalsRef.current[id];
    socketsRef.current[id]?.disconnect();
    delete socketsRef.current[id];
  };

  const renameShellTab = (id: string, newName: string) => {
    setShellTabs(prev => prev.map(t => t.id === id ? { ...t, name: newName } : t));
  };

  const renderEditor = () => {
    const file = files[curFileIdx];
    const lines = (file && typeof file.raw === 'string') ? file.raw.split('\n') : ["No data available"];
    
    return (
      <div className="flex flex-1 overflow-hidden relative">
        {/* File Rail (Premium Source Control) */}
        <AnimatePresence>
          {showFileRail && (
            <motion.div 
              initial={{ width: 0, opacity: 0, x: -20 }}
              animate={{ width: 280, opacity: 1, x: 0 }}
              exit={{ width: 0, opacity: 0, x: -20 }}
              className="border-r border-white/5 bg-[#0a0a0f]/90 backdrop-blur-3xl flex flex-col shrink-0 overflow-hidden shadow-2xl relative"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-blue-primary/10 via-transparent to-[#0a0a0f] pointer-events-none" />
              <div className="h-16 flex items-center justify-between px-5 border-b border-white/5 shrink-0 relative z-10 bg-white/[0.02]">
                <div className="flex flex-col">
                  <span className="text-[12px] font-bold tracking-[3px] text-white uppercase flex items-center gap-2">
                    <FolderOpen size={14} className="text-blue-primary drop-shadow-[0_0_8px_rgba(var(--color-blue-primary),0.8)]" /> SOURCE CONTROL
                  </span>
                  <span className="text-[9px] text-blue-primary/70 uppercase tracking-[2px] mt-0.5">Local Workspace</span>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => setShowSearch(true)} className="text-txt3 hover:text-white transition-colors"><Search size={14} /></button>
                  <button onClick={() => setShowFileRail(false)} className="text-txt3 hover:text-white transition-colors"><X size={14} /></button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-hide relative z-10">
                <div className="text-[10px] font-bold text-txt3/50 uppercase tracking-widest px-2 pb-2 border-b border-white/5 mb-3 flex justify-between">
                  <span>Changes</span>
                  <span>{files.length} Files</span>
                </div>
                {files.map((f, i) => {
                  const isMod = i === curFileIdx ? isModified : false;
                  const isUntracked = !isMod && (!f.raw || f.raw.length < 50); 
                  return (
                    <button 
                      key={i}
                      onClick={() => { setCurFileIdx(i); setIsModified(false); }}
                      className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-300 group border relative overflow-hidden ${i === curFileIdx ? 'bg-blue-primary/10 border-blue-primary/30 text-white shadow-[0_0_20px_rgba(var(--color-blue-primary),0.1)]' : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/10 text-txt3 hover:text-white'}`}
                    >
                      {i === curFileIdx && <div className="absolute inset-y-0 left-0 w-1 bg-blue-primary shadow-[0_0_10px_rgba(var(--color-blue-primary),1)]" />}
                      <div className="flex items-center gap-3 overflow-hidden z-10">
                        <FileCode size={16} className={isMod ? 'text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]' : isUntracked ? 'text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]' : i === curFileIdx ? 'text-blue-primary' : 'text-txt3 group-hover:text-white transition-colors'} />
                        <span className="text-[13px] font-medium tracking-wide truncate text-left drop-shadow-sm">{f.name}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 z-10">
                        {isMod && <span className="flex items-center justify-center w-5 h-5 rounded-full bg-yellow-400/20 text-yellow-400 text-[10px] font-black tracking-tighter">M</span>}
                        {isUntracked && !isMod && <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-400/20 text-green-400 text-[10px] font-black tracking-tighter">U</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col flex-1 overflow-hidden relative">
          
          {/* Global Search / Grep Overlay */}
          <AnimatePresence>
            {showSearch && (
              <motion.div 
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="absolute top-12 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 bg-[#0a0a0f]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col"
              >
                <div className="flex items-center px-4 h-14 border-b border-white/10 shrink-0 gap-3 bg-white/[0.02]">
                  <Search size={18} className="text-blue-primary drop-shadow-[0_0_8px_rgba(var(--color-blue-primary),0.8)]" />
                  <input 
                    autoFocus
                    placeholder="Global Grep Search..."
                    className="flex-1 bg-transparent border-none outline-none text-[15px] text-white font-medium tracking-wide placeholder:text-txt3/40"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Escape' && setShowSearch(false)}
                  />
                  <button onClick={() => setShowSearch(false)} className="text-[10px] font-bold tracking-[2px] text-txt3 bg-white/5 hover:bg-white/10 hover:text-white transition-colors px-2 py-1 rounded cursor-pointer">ESC</button>
                </div>
                {searchQuery && (
                  <div className="max-h-[50vh] overflow-y-auto p-2 scrollbar-hide flex flex-col gap-1">
                    {searchResults.length === 0 ? (
                      <div className="py-12 text-center text-txt3/50 font-medium text-[14px]">No matches found in workspace</div>
                    ) : (
                      searchResults.map((res, idx) => (
                        <button 
                          key={idx}
                          onClick={() => {
                            setCurFileIdx(res.fileIdx);
                            setCurLine(res.lineIdx + 1);
                            setShowSearch(false);
                            setSearchQuery('');
                          }}
                          className="flex flex-col text-left px-4 py-3 rounded-xl hover:bg-blue-primary/10 border border-transparent hover:border-blue-primary/30 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <FileCode size={12} className="text-blue-primary opacity-70 group-hover:opacity-100" />
                            <span className="text-[12px] font-bold tracking-wider text-white bg-white/5 px-2 py-0.5 rounded">{files[res.fileIdx].name}</span>
                            <span className="text-[11px] text-txt3/60">Line {res.lineIdx + 1}</span>
                          </div>
                          <div className="text-[13px] font-mono text-txt2 truncate max-w-full opacity-70 group-hover:opacity-100 group-hover:text-blue-primary transition-colors">{res.text}</div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {!showFileRail && (
            <button 
              onClick={() => setShowFileRail(true)}
              className="absolute left-2 top-11 z-20 p-2 bg-[#0a0a0f]/80 backdrop-blur border border-white/10 rounded-lg shadow-xl text-blue-primary hover:scale-110 transition-transform hover:bg-white/5 hover:border-white/20"
            >
              <FolderOpen size={16} />
            </button>
          )}

          {/* Tabs */}
          <div className="h-9 bg-bg1 border-b border-bd flex overflow-x-auto scrollbar-hide shrink-0">
            {files.map((f, i) => (
              <div 
                key={i}
                onClick={() => { setCurFileIdx(i); setIsModified(false); }}
                className={`flex items-center gap-2 px-3 text-[15px] font-medium tracking-wider cursor-pointer border-r border-bd min-w-[100px] transition-all shrink-0 ${i === curFileIdx ? 'text-blue-primary bg-bg2 border-b-2 border-b-blue-primary' : 'text-txt3 font-medium'}`}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: f.color }}></div>
                <span className="truncate max-w-[80px]">{f.name}</span>
                <X 
                  size={10} 
                  className="ml-auto hover:text-red-primary transition-colors" 
                  onClick={(e) => removeFile(i, e)}
                />
              </div>
            ))}
            <div className="flex items-center justify-center w-9 text-txt3 font-medium cursor-pointer hover:text-txt" onClick={() => {
              const name = prompt('File name:', 'untitled.txt');
              if (name) {
                const isNoColor = name.endsWith('.txt') || name.endsWith('.md');
                setFiles([...files, { 
                  name, 
                  lang: isNoColor ? 'txt' : 'js', 
                  color: isNoColor ? 'var(--color-txt3)' : 'var(--color-txt2)', 
                  raw: isNoColor ? '' : '// ' + name 
                }]);
              }
            }}><Plus size={14} /></div>
            <label className="flex items-center justify-center w-9 text-txt3 font-medium cursor-pointer hover:text-txt border-l border-bd">
              <FolderOpen size={14} />
              <input 
                type="file" 
                className="hidden" 
                {...{ webkitdirectory: "", directory: "" } as any} 
                multiple 
                onChange={handleFolderUpload} 
              />
            </label>
            <div className={`flex items-center justify-center px-3 text-[16px] font-bold font-medium cursor-pointer border-l border-bd font-bold tracking-widest ${showPreview ? 'bg-blue-primary text-black' : 'text-txt3 font-medium hover:text-txt'}`} onClick={() => setShowPreview(!showPreview)}>
              <Monitor size={12} className="mr-1" /> PREVIEW
            </div>
          </div>
          
          {/* Breadcrumb */}
          <div className="h-6 bg-bg1 border-b border-bd flex items-center px-3 gap-2 shrink-0 text-[16px] font-bold font-medium text-txt3 font-medium uppercase tracking-tighter">
            <span>WORKSPACE › SCRIPTS › {file?.name?.toUpperCase() || 'NONE'}</span>
            <span className="ml-auto">LN {curLine}</span>
            <span className="ml-2">{LANG_LABELS[curFileIdx] || 'TXT'}</span>
          </div>

          {/* Editor Body */}
          <div className="flex flex-1 overflow-hidden relative">
            {!file ? (
              <div className="flex-1 flex flex-col items-center justify-center pointer-events-none select-none bg-black/40">
                <Code2 size={64} className="text-bd mb-6 opacity-20" />
                <div className="text-txt3/30 text-2xl font-black uppercase tracking-[4px] mb-3 text-center">Editor Empty</div>
                <div className="text-txt3/20 text-[14px] font-bold uppercase tracking-widest">Load a file or folder to begin</div>
              </div>
            ) : (
              <>
                <div className="w-10 bg-bg1 border-r border-bd py-2 text-right pr-2 text-[15px] font-medium text-txt3 font-medium leading-relaxed shrink-0 select-none">
                  {lines.map((_, i) => (
                    <div key={i} className={i === curLine - 1 ? 'text-blue-primary' : ''}>{i + 1}</div>
                  ))}
                </div>
                <div className="flex-1 overflow-auto scrollbar-thin bg-bg/40 backdrop-blur-md relative">
                  
                  {/* Floating AI Execution Guide */}
                  <button 
                    onClick={simulateAiEdit}
                    className="absolute right-6 top-6 z-30 p-3 bg-blue-primary/10 border border-blue-primary/30 backdrop-blur-md rounded-full shadow-[0_0_15px_rgba(var(--color-blue-primary),0.3)] text-blue-primary hover:bg-blue-primary hover:text-white hover:scale-110 transition-all group flex items-center justify-center"
                    title="AI Autonomous Execution Guide"
                  >
                    <Sparkles size={18} className="group-hover:animate-spin" />
                    <span className="absolute right-full mr-3 whitespace-nowrap bg-black/80 px-3 py-1.5 rounded text-[11px] font-bold tracking-widest text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">AI EXECUTION GUIDE (BG CODE)</span>
                  </button>

                  <div className="absolute inset-0 p-2 text-[15px] font-medium leading-relaxed font-mono pointer-events-none whitespace-pre overflow-hidden opacity-80">
                    {lines.map((line, i) => (
                      <div key={i} className={i === curLine - 1 ? 'bg-blue-primary/10' : ''}>
                        {highlightCode(line)}
                      </div>
                    ))}
                  </div>
                  <textarea
                    className="w-full h-full p-2 text-[15px] font-medium leading-relaxed bg-transparent outline-none resize-none font-mono caret-blue-primary text-transparent selection:bg-blue-primary/30"
                    value={file.raw}
                    onChange={(e) => {
                      const newFiles = [...files];
                      newFiles[curFileIdx].raw = e.target.value;
                      setFiles(newFiles);
                      setIsModified(true);
                    }}
                    onScroll={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      const overlay = target.previousSibling as HTMLElement;
                      if (overlay) {
                        overlay.scrollTop = target.scrollTop;
                        overlay.scrollLeft = target.scrollLeft;
                      }
                      setEditorScroll({
                        top: target.scrollTop,
                        height: target.scrollHeight,
                        viewHeight: target.clientHeight
                      });
                      if (minimapRef.current) {
                        const ratio = target.scrollTop / Math.max(target.scrollHeight - target.clientHeight, 1);
                        const minimapScrollMax = minimapRef.current.scrollHeight - minimapRef.current.clientHeight;
                        minimapRef.current.scrollTop = ratio * minimapScrollMax;
                      }
                    }}
                    onKeyUp={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      const line = target.value.substring(0, target.selectionStart).split('\n').length;
                      setCurLine(line);
                    }}
                    onClick={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      const line = target.value.substring(0, target.selectionStart).split('\n').length;
                      setCurLine(line);
                    }}
                    spellCheck={true}
                  />
                  
                  {/* AI Chatbot Sidebar (Vercel Style) */}
                  <AnimatePresence>
                    {showAiSidebar && (
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: 340 }}
                        exit={{ width: 0 }}
                        className="border-l border-bd bg-bg/95 backdrop-blur-md overflow-hidden flex flex-col z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] h-full absolute right-0 top-0"
                      >
                        <div className="h-10 bg-bg1 border-b border-bd flex items-center px-4 justify-between shrink-0">
                          <div className="flex items-center gap-2">
                            <Sparkles size={14} className="text-blue-primary" />
                            <div className={`w-2 h-2 rounded-full ${endpointHealth[selectedEndpointId] ?? true ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'} transition-colors`} title={endpointHealth[selectedEndpointId] ?? true ? "Endpoint Online" : "Endpoint Offline"} />
                            <select 
                              className="bg-transparent text-[13px] font-bold text-blue-primary font-medium uppercase tracking-widest outline-none cursor-pointer max-w-[140px] truncate"
                              value={selectedEndpointId}
                              onChange={e => setSelectedEndpointId(e.target.value)}
                            >
                              {endpoints.filter(e => e.apiKey || e.type === 'Ollama' || e.type === 'LMStudio').map(e => (
                                <option key={e.id} value={e.id} className="bg-bg1 text-txt font-sans normal-case">{e.name}</option>
                              ))}
                            </select>
                          </div>
                          <X size={14} className="text-txt3 font-medium cursor-pointer hover:text-red-primary transition-colors" onClick={() => setShowAiSidebar(false)} />
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                          {aiMessages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                              <Cpu size={32} className="mb-3 text-blue-primary" />
                              <div className="text-[14px] font-bold uppercase tracking-widest text-blue-primary">AI Standby</div>
                              <div className="text-[12px] font-medium text-txt3 font-medium mt-1">Ready for autonomous background tasks.</div>
                            </div>
                          ) : (
                            aiMessages.map((msg, i) => (
                              <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[85%] rounded-lg p-3 text-[13px] font-medium leading-relaxed font-mono ${msg.role === 'user' ? 'bg-blue-primary/20 text-blue-primary border border-blue-primary/30 rounded-tr-none' : 'bg-bg1 border border-bd rounded-tl-none text-txt2'}`}>
                                  {msg.content}
                                </div>
                                {msg.toolCalls && msg.toolCalls.map((tc, j) => (
                                  <div key={j} className="mt-2 text-[11px] font-bold tracking-widest bg-black/40 border border-bd p-2 rounded w-full">
                                    <div className="text-blue-primary mb-1 flex items-center gap-1"><Zap size={10} /> Tool Executed: {tc.name}</div>
                                    <div className="text-txt3 font-medium truncate font-mono bg-bg p-1 rounded border border-bd/50">{JSON.stringify(tc.args).substring(0, 60)}...</div>
                                    {tc.name === 'self_modify' && (
                                      <button 
                                        className="mt-2 w-full bg-blue-primary/10 hover:bg-blue-primary text-blue-primary hover:text-white border border-blue-primary/50 transition-colors py-1.5 rounded uppercase tracking-widest font-bold"
                                        onClick={() => {
                                          const next = [...files];
                                          next[curFileIdx].raw = tc.args.new_content || tc.args.newContent;
                                          setFiles(next);
                                          setIsModified(true);
                                          setNotifications(prev => [...prev, { id: Math.random().toString(), message: `Applied AI Edit to ${files[curFileIdx].name}` }]);
                                        }}
                                      >
                                        APPLY EDIT
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ))
                          )}
                        </div>
                        <div className="p-3 border-t border-bd bg-bg1 shrink-0">
                           <div className="relative flex">
                             <input type="text" placeholder="Prompt FunctionGemma..." className="flex-1 bg-black/40 border border-bd rounded-l-md pl-3 pr-2 py-2 text-[13px] font-medium focus:border-blue-primary outline-none text-txt font-mono" onKeyDown={(e) => {
                               if (e.key === 'Enter' && e.currentTarget.value) {
                                 const v = e.currentTarget.value;
                                 e.currentTarget.value = '';
                                 setAiMessages(prev => [...prev, { role: 'user', content: v }]);
                               }
                             }}/>
                             <button className="px-3 bg-blue-primary text-black rounded-r-md hover:bg-white transition-colors flex items-center justify-center"><Send size={14} /></button>
                           </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Live Preview Panel */}
                <AnimatePresence>
                  {showPreview && (
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '40%' }}
                      exit={{ width: 0 }}
                      className="border-l border-bd bg-bg overflow-hidden flex flex-col z-10"
                    >
                      <div className="h-6 bg-bg1 border-b border-bd flex items-center px-2 justify-between shrink-0">
                        <span className="text-[15px] font-medium font-medium text-txt3 font-medium uppercase tracking-widest">Live Preview</span>
                        <X size={10} className="text-txt3 font-medium cursor-pointer hover:text-txt" onClick={() => setShowPreview(false)} />
                      </div>
                      <div className="flex-1 p-4 overflow-auto bg-white text-black font-sans text-base font-medium font-medium">
                        {file.lang === 'html' || file.name.endsWith('.html') ? (
                          <div dangerouslySetInnerHTML={{ __html: file.raw }} />
                        ) : (
                          <div className="whitespace-pre-wrap font-mono text-[15px] font-medium text-txt3 font-medium italic">
                            // Preview only available for HTML/CSS files.
                            // Currently viewing raw output of {file.name}
                            <div className="mt-4 text-black not-italic">{file.raw}</div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {/* Optimized See-Thru Minimap */}
                <div className="w-12 bg-transparent border-l border-bd/20 flex flex-col items-center py-2 gap-[1px] overflow-hidden select-none shrink-0 backdrop-blur-sm">
                  <div className="text-[5px] text-txt3 font-medium mb-2 uppercase tracking-[2px] opacity-30">MAP</div>
                  <div ref={minimapRef} className="w-full flex-1 overflow-hidden relative opacity-60">
                    <div className="relative w-full">
                      <div 
                        className="absolute w-full bg-blue-primary/30 border-y border-blue-primary/60 z-10 transition-all duration-75 pointer-events-none"
                        style={{
                          top: `${(editorScroll.top / Math.max(editorScroll.height, 1)) * 100}%`,
                          height: `${Math.max((editorScroll.viewHeight / Math.max(editorScroll.height, 1)) * 100, 2)}%`
                        }}
                      />
                      {lines.map((line, i) => {
                        let color = 'rgba(255,255,255,0.05)';
                        if (line.trim().startsWith('//')) color = 'var(--color-txt3)';
                        else if (line.includes('const') || line.includes('let') || line.includes('function')) color = 'var(--color-purple-primary)';
                        else if (line.includes('"') || line.includes("'")) color = 'var(--color-green-primary)';
                        else if (line.trim()) color = 'var(--color-txt2)';

                        const indent = line.search(/\S/);
                        const leftPad = indent > 0 ? Math.min(indent * 1, 15) : 0;

                        return (
                          <div key={i} className="flex w-full px-1" style={{ height: '1.5px', marginBottom: '1px' }}>
                            <div 
                              className={`h-full rounded-full transition-all ${curLine === i + 1 ? 'opacity-100 scale-y-200' : 'opacity-30'}`}
                              style={{ 
                                backgroundColor: color,
                                marginLeft: `${leftPad}px`,
                                width: line.trim() ? `${Math.min(line.trim().length * 0.5, 25)}px` : '0px'
                              }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Vim Bar (only visible for File Editor) */}
          {activeTabType === 'file' && (
            <div className={`h-6 flex items-center px-3 gap-3 shrink-0 text-[13px] font-medium font-bold transition-colors ${
              vimMode === 'NORMAL' ? 'bg-blue-primary text-black' : 
              vimMode === 'INSERT' ? 'bg-green-primary text-black' : 
              'bg-purple-primary text-white'
            }`}>
              <span className="tracking-widest min-w-[60px]">{vimMode}</span>
              <span className="opacity-80">{file?.name || 'NONE'} {file && (isModified || file.name === '.gitignore') ? '[+]' : ''}</span>
              <span className="ml-auto opacity-50">{curLine}/{lines.length} {Math.round((curLine/lines.length)*100)}%</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderShell = () => {
    const toggleExpand = (key: string) => {
      setMonitorExpanded(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
      <div className="flex flex-1 overflow-hidden bg-bg1">
        {/* Premium Fav Scripts Sidebar */}
        <AnimatePresence>
          {showFavSidebar && (
            <motion.div 
              initial={{ width: 0, opacity: 0, x: -20 }}
              animate={{ width: 280, opacity: 1, x: 0 }}
              exit={{ width: 0, opacity: 0, x: -20 }}
              className="border-r border-white/5 bg-[#0a0a0f]/90 backdrop-blur-3xl flex flex-col shrink-0 overflow-hidden shadow-2xl relative"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-purple-primary/10 via-transparent to-[#0a0a0f] pointer-events-none" />
              <div className="h-16 flex items-center justify-between px-5 border-b border-white/5 shrink-0 relative z-10 bg-white/[0.02]">
                <div className="flex flex-col">
                  <span className="text-[12px] font-bold tracking-[3px] text-white uppercase flex items-center gap-2">
                    <Zap size={14} className="text-purple-primary drop-shadow-[0_0_8px_rgba(var(--color-purple-primary),0.8)]" /> SCRIPTS
                  </span>
                  <span className="text-[9px] text-purple-primary/70 uppercase tracking-[2px] mt-0.5">Automated Tasks</span>
                </div>
                <button onClick={() => setShowFavSidebar(false)} className="text-txt3 hover:text-white transition-colors"><X size={14} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide relative z-10">
                {favScripts.map(cat => (
                  <div key={cat.category}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-[1px] flex-1 bg-white/5" />
                      <span className="text-[10px] font-bold text-txt3/60 uppercase tracking-[4px]">{cat.category}</span>
                      <div className="h-[1px] flex-1 bg-white/5" />
                    </div>
                    <div className="grid grid-cols-1 gap-2.5">
                      {cat.items.map(s => (
                        <button 
                          key={s.name}
                          onClick={() => {
                            if (!socketsRef.current[activeShellId]) return;
                            socketsRef.current[activeShellId]?.emit('terminal:input', s.cmd + '\n');
                            setNotifications(prev => [...prev, { id: Math.random().toString(), message: `Running ${s.name}` }]);
                          }}
                          className="w-full flex items-center p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-purple-primary/10 hover:border-purple-primary/30 text-txt3 hover:text-white transition-all duration-300 group overflow-hidden relative shadow-[0_4px_10px_rgba(0,0,0,0.1)] hover:shadow-[0_0_20px_rgba(var(--color-purple-primary),0.15)]"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full duration-1000 transition-transform pointer-events-none" />
                          <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center shrink-0 mr-3 border border-white/5 group-hover:border-purple-primary/40 group-hover:scale-110 transition-all duration-300 text-purple-primary/50 group-hover:text-purple-primary">
                            <span className="text-[18px] drop-shadow-md">{s.icon}</span>
                          </div>
                          <div className="flex flex-col flex-1 truncate text-left justify-center">
                            <span className="text-[13px] font-bold tracking-wide text-white drop-shadow-sm mb-0.5">{s.name}</span>
                            <span className="text-[10px] font-mono text-txt3/50 truncate group-hover:text-txt3/80 transition-colors">{s.cmd}</span>
                          </div>
                          <Play size={14} className="text-purple-primary opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0 drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <button 
                  onClick={() => setIsAddingScript(true)}
                  className="w-full h-12 rounded-xl border border-dashed border-purple-primary/20 text-purple-primary/70 text-[11px] font-bold tracking-[3px] uppercase hover:bg-purple-primary/10 hover:text-purple-primary hover:border-purple-primary/50 transition-all duration-300 flex items-center justify-center gap-2 mt-6 shadow-sm group"
                >
                  <Plus size={14} className="group-hover:scale-110 transition-transform" /> NEW ALIAS
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 flex flex-col overflow-hidden relative">
          {!showFavSidebar && (
            <button 
              onClick={() => setShowFavSidebar(true)}
              className="absolute left-2 top-10 z-10 p-1.5 bg-bg border border-bd rounded shadow-xl text-blue-primary hover:scale-110 transition-transform"
            >
              <Zap size={14} />
            </button>
          )}
          
          {/* Shell Tabs Bar */}
          <div className="h-8 bg-bg border-b border-bd flex items-center px-2 gap-1 overflow-x-auto scrollbar-hide shrink-0">
            {shellTabs.map(tab => (
              <div 
                key={tab.id}
                onClick={() => setActiveShellId(tab.id)}
                className={`h-6 px-3 flex items-center gap-2 rounded cursor-pointer transition-all border ${
                  activeShellId === tab.id 
                    ? 'bg-bg2 border-blue-primary/50 text-blue-primary' 
                    : 'border-transparent text-txt3 font-medium hover:bg-bg2/50'
                }`}
              >
                <input 
                  className="bg-transparent border-none outline-none text-[13px] font-medium font-bold uppercase tracking-widest w-16 text-center"
                  value={tab.name}
                  onChange={(e) => renameShellTab(tab.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
                <X 
                  size={10} 
                  className="hover:text-red-primary transition-colors" 
                  onClick={(e) => removeShellTab(tab.id, e)}
                />
              </div>
            ))}
            <button 
              onClick={addShellTab}
              className="p-1.5 text-txt3 font-medium hover:text-blue-primary transition-colors"
            >
              <Plus size={14} />
            </button>
            <button 
              onClick={togglePiP}
              title="Open in Picture-in-Picture"
              className="p-1.5 text-txt3 font-medium hover:text-green-primary transition-colors ml-auto"
            >
              <MonitorPlay size={14} />
            </button>
          </div>

          <div className="flex-1 m-4 border-2 border-dashed border-bd/20 rounded-lg overflow-hidden relative bg-black/20">
            {shellTabs.map(tab => (
              <div 
                key={tab.id}
                ref={el => terminalContainersRef.current[tab.id] = el}
                className={`absolute inset-0 p-2 ${activeShellId === tab.id ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
              ></div>
            ))}
            {!hasTerminalActivity && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                <div className="text-txt3 font-medium/10 text-2xl font-black uppercase tracking-[4px] mb-2 text-center px-8">nothing going on cause no fuking work</div>
                <div className="text-txt3 font-medium/5 text-[16px] font-bold font-medium uppercase tracking-widest">Type directly to interact</div>
              </div>
            )}
          </div>
        </div>

        {/* Add Script Modal */}
        <AnimatePresence>
          {isAddingScript && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-bg1 border border-bd rounded-xl w-full max-w-xs overflow-hidden shadow-2xl"
              >
                <div className="h-10 bg-bg2 border-b border-bd flex items-center justify-between px-4">
                  <span className="text-[15px] font-medium font-bold uppercase tracking-widest text-txt">Add Favorite Script</span>
                  <X size={14} className="text-txt3 font-medium cursor-pointer hover:text-txt" onClick={() => setIsAddingScript(false)} />
                </div>
                <div className="p-4 space-y-3">
                  <div className="space-y-1">
                    <label className="text-[16px] font-bold font-medium text-txt3 font-medium uppercase tracking-widest">Name</label>
                    <input 
                      className="w-full bg-bg border border-bd rounded p-2 text-[15px] font-medium text-txt outline-none focus:border-blue-primary"
                      value={newScript.name}
                      onChange={e => setNewScript({...newScript, name: e.target.value})}
                      placeholder="e.g. build app"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[16px] font-bold font-medium text-txt3 font-medium uppercase tracking-widest">Command</label>
                    <input 
                      className="w-full bg-bg border border-bd rounded p-2 text-[15px] font-medium text-txt outline-none focus:border-blue-primary"
                      value={newScript.cmd}
                      onChange={e => setNewScript({...newScript, cmd: e.target.value})}
                      placeholder="e.g. npm run build"
                    />
                  </div>
                  <button 
                    onClick={() => {
                      const next = [...favScripts];
                      next[0].items.push(newScript);
                      setFavScripts(next);
                      setIsAddingScript(false);
                      setNewScript({ name: '', cmd: '', icon: '⚡' });
                    }}
                    className="w-full h-10 bg-blue-primary text-black font-bold text-[15px] font-medium tracking-widest rounded-lg mt-2"
                  >
                    ADD TO FAVORITES
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };


  const renderDisplay = () => {
    return (
      <div className="flex-1 flex flex-col bg-black relative overflow-hidden">
        {!isX11Active ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
            <div className="w-20 h-20 rounded-2xl bg-blue-primary/10 border border-blue-primary/30 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-blue-primary/5 animate-pulse" />
              <Zap size={40} className="text-blue-primary relative z-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-txt font-bold tracking-[5px] uppercase text-base font-medium">X11 GUI Bridge</h2>
              <p className="text-txt3 font-medium text-[15px] font-medium max-w-[240px] leading-relaxed">
                Connect to a high-performance X11 server to run Linux GUI apps (VS Code, Firefox, etc.) directly in your rig.
              </p>
            </div>
            
            <div className="bg-bg1 border border-bd rounded-lg p-4 w-full max-w-sm space-y-3">
              <div className="flex items-center gap-2 text-[16px] font-bold font-medium text-blue-primary font-bold tracking-widest uppercase">
                <Zap size={10} />
                <span>Manual Setup Instructions</span>
              </div>
              <div className="bg-black rounded p-3 font-mono text-[13px] font-medium text-green-primary text-left break-all">
                # 1. Install termux-x11<br/>
                pkg install termux-x11-nightly<br/><br/>
                # 2. Start X11 server in Shell<br/>
                termux-x11 :1 &
              </div>
            </div>

            <button 
              onClick={() => {
                setIsX11Active(true);
                setNotifications(prev => [...prev, { id: Math.random().toString(), message: 'X11 Bridge Initialized' }]);
              }}
              className="px-8 h-12 bg-blue-primary text-black font-bold text-[15px] font-medium tracking-[4px] rounded-xl hover:opacity-90 transition-opacity"
            >
              START X11 SERVER
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="h-8 bg-bg2 border-b border-bd flex items-center px-3 justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-primary animate-pulse" />
                <span className="text-[16px] font-bold font-medium text-txt3 font-medium font-mono uppercase tracking-widest">X11:1 · 1920x1080 · 60FPS</span>
              </div>
              <button 
                onClick={() => setIsX11Active(false)}
                className="text-[16px] font-bold font-medium text-red-500 font-bold hover:underline"
              >
                DISCONNECT
              </button>
            </div>
            <div className="flex-1 bg-[#1a1a1a] flex items-center justify-center relative group">
              {/* Simulated Desktop / VNC View */}
              <div className="w-full h-full bg-[url('https://picsum.photos/seed/circuit/1920/1080')] bg-cover bg-center opacity-40" />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <Monitor size={64} className="text-white/10 mb-4" />
                <span className="text-white/20 font-mono text-base font-medium font-medium tracking-[5px]">DISPLAY_STREAM_ACTIVE</span>
              </div>
              
              {/* Floating Controls */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="h-8 px-4 bg-black/80 border border-white/10 rounded text-[13px] font-medium text-white font-bold tracking-widest">KEYBOARD</button>
                <button className="h-8 px-4 bg-black/80 border border-white/10 rounded text-[13px] font-medium text-white font-bold tracking-widest">MOUSE</button>
                <button className="h-8 px-4 bg-black/80 border border-white/10 rounded text-[13px] font-medium text-white font-bold tracking-widest">RESIZE</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSettings = () => {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin bg-bg p-4 space-y-6 pb-24">
        {/* TUI Status Dashboard */}
        <div className="bg-bg1 border border-bd rounded-xl overflow-hidden shadow-lg">
          <div className="h-10 bg-bg2 border-b border-bd flex items-center px-4 gap-2">
            <Monitor size={14} className="text-green-primary" />
            <span className="text-[15px] font-medium tracking-[3px] text-txt uppercase font-bold">System Dashboard</span>
          </div>
          <div className="p-4 bg-black font-mono text-[13px] font-medium space-y-1">
            <div className="flex justify-between border-b border-bd/30 pb-1 mb-2">
              <span className="text-txt3 font-medium">SYSTEM: TERMINTEL-RIG-V2</span>
              <span className="text-green-primary">ONLINE</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <div className="flex justify-between">
                <span className="text-txt3 font-medium">CPU:</span>
                <span className="text-txt">12.4%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-txt3 font-medium">MEM:</span>
                <span className="text-txt">1.2GB / 8GB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-txt3 font-medium">TUNNEL:</span>
                <span className={authToken ? "text-blue-primary" : "text-red-500"}>{authToken ? "CONNECTED" : "DISCONNECTED"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-txt3 font-medium">UPTIME:</span>
                <span className="text-txt">04:22:11</span>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-bd/30">
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-green-primary animate-pulse" />
                <span className="text-[16px] font-bold font-medium text-green-primary/70">CLAW_TUNNEL: LISTENING ON PORT 8080</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-blue-primary animate-pulse" />
                <span className="text-[16px] font-bold font-medium text-blue-primary/70">WEBHOOK: READY FOR INCOMING PAYLOADS</span>
              </div>
            </div>
          </div>
        </div>

        {/* System Management Section */}
        <div className="bg-bg1 border border-bd rounded-xl overflow-hidden shadow-lg">
          <div className="h-10 bg-bg2 border-b border-bd flex items-center px-4 gap-2">
            <Cpu size={14} className="text-green-primary" />
            <span className="text-[15px] font-medium tracking-[3px] text-txt uppercase font-bold">System Management</span>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between p-3 bg-bg2 border border-bd2 rounded-lg">
              <div className="flex flex-col">
                <span className="text-[15px] font-medium text-txt font-bold tracking-wider">X11 GUI BRIDGE</span>
                <span className="text-[16px] font-bold font-medium text-txt3 font-medium uppercase tracking-widest">Toggle X11 socket for GUI apps</span>
              </div>
              <button 
                onClick={() => {
                  setIsX11Active(!isX11Active);
                  setNotifications(prev => [...prev, { id: Math.random().toString(), message: `X11 Bridge ${!isX11Active ? 'Enabled' : 'Disabled'}` }]);
                }}
                className={`w-10 h-5 rounded-full relative transition-colors ${isX11Active ? 'bg-blue-primary' : 'bg-bd'}`}
              >
                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${isX11Active ? 'left-6' : 'left-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-bg2 border border-bd2 rounded-lg">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-medium text-txt font-bold tracking-wider">PROOT GUEST SANDBOX</span>
                  <span className="text-[15px] font-medium font-medium px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 rounded font-bold">UNROOTED</span>
                </div>
                <span className="text-[16px] font-bold font-medium text-txt3 font-medium uppercase tracking-widest">Isolated Ubuntu/Arch environment</span>
              </div>
              <button 
                onClick={() => {
                  setIsSandboxActive(!isSandboxActive);
                  setNotifications(prev => [...prev, { id: Math.random().toString(), message: `Sandbox ${!isSandboxActive ? 'Initializing' : 'Terminated'}` }]);
                }}
                className={`w-10 h-5 rounded-full relative transition-colors ${isSandboxActive ? 'bg-green-primary' : 'bg-bd'}`}
              >
                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${isSandboxActive ? 'left-6' : 'left-1'}`} />
              </button>
            </div>

            {isSandboxActive && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-black/40 border border-green-primary/20 rounded-lg p-3 space-y-2"
              >
                <div className="flex items-center justify-between text-[16px] font-bold font-medium font-mono">
                  <span className="text-green-primary">GUEST_OS: UBUNTU_22.04</span>
                  <span className="text-txt3 font-medium">VNC_PORT: 5901</span>
                </div>
                <div className="h-1 bg-bd rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2 }}
                    className="h-full bg-green-primary"
                  />
                </div>
                <p className="text-[15px] font-medium font-medium text-txt3 font-medium italic">Sandbox is isolated from host system. Use for experimental dev.</p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Custom Endpoints Section */}
        <div className="bg-bg1 border border-bd rounded-xl overflow-hidden shadow-lg">
          <div className="h-10 bg-bg2 border-b border-bd flex items-center px-4 justify-between">
            <div className="flex items-center gap-2">
              <Box size={14} className="text-blue-primary" />
              <span className="text-[15px] font-medium tracking-[3px] text-txt uppercase font-bold">Custom Endpoints</span>
            </div>
          </div>
          <div className="p-4 space-y-4">
            {endpoints.filter(e => !e.isProvider).map(api => (
              <div key={api.id} className="bg-bg2 border border-bd2 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg text-green-primary">{api.icon || '⚡'}</span>
                  <span className="text-[11px] text-txt font-bold flex-1 uppercase tracking-wider">{api.name}</span>
                  {(api.apiKey || api.secondaryToken) && (
                    <span className="text-[15px] font-medium font-medium px-1 bg-green-primary/10 text-green-primary border border-green-primary/20 rounded font-bold">SECURED</span>
                  )}
                  <span className="text-[16px] font-bold font-medium px-2 py-0.5 rounded border border-blue-primary/30 text-blue-primary uppercase font-bold tracking-tighter">{api.type}</span>
                </div>
                {editingEndpoint === api.id ? (
                  <div className="space-y-2 mt-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        className="bg-bg text-txt border border-bd2 text-[15px] font-medium p-2 rounded outline-none focus:border-blue-primary"
                        value={api.host}
                        onChange={(e) => {
                          const next = [...endpoints];
                          const idx = next.findIndex(x => x.id === api.id);
                          next[idx].host = e.target.value;
                          setEndpoints(next);
                        }}
                        placeholder="Host"
                      />
                      <input 
                        className="bg-bg text-txt border border-bd2 text-[15px] font-medium p-2 rounded outline-none focus:border-blue-primary"
                        value={api.port}
                        onChange={(e) => {
                          const next = [...endpoints];
                          const idx = next.findIndex(x => x.id === api.id);
                          next[idx].port = e.target.value;
                          setEndpoints(next);
                        }}
                        placeholder="Port"
                      />
                    </div>
                    <input 
                      className="w-full bg-bg text-txt border border-bd2 text-[15px] font-medium p-2 rounded outline-none focus:border-blue-primary"
                      value={api.model}
                      onChange={(e) => {
                        const next = [...endpoints];
                        const idx = next.findIndex(x => x.id === api.id);
                        next[idx].model = e.target.value;
                        setEndpoints(next);
                      }}
                      placeholder="Model"
                    />
                    <input 
                      type="password"
                      className="w-full bg-bg text-txt border border-bd2 text-[15px] font-medium p-2 rounded outline-none focus:border-blue-primary"
                      value={api.secondaryToken}
                      onChange={(e) => {
                        const next = [...endpoints];
                        const idx = next.findIndex(x => x.id === api.id);
                        next[idx].secondaryToken = e.target.value;
                        setEndpoints(next);
                      }}
                      placeholder="Secondary Token / Password"
                    />
                    {(api.type === 'SSH Tunneling' || api.type === 'SSH + Docker') && (
                      <textarea 
                        className="w-full bg-bg text-txt border border-bd2 text-[15px] font-medium p-2 rounded outline-none focus:border-blue-primary font-mono h-16 resize-none"
                        value={api.sshKey}
                        onChange={(e) => {
                          const next = [...endpoints];
                          const idx = next.findIndex(x => x.id === api.id);
                          next[idx].sshKey = e.target.value;
                          setEndpoints(next);
                        }}
                        placeholder="SSH Private Key"
                      />
                    )}
                    {(api.type === 'Docker' || api.type === 'SSH + Docker') && (
                      <input 
                        className="w-full bg-bg text-txt border border-bd2 text-[15px] font-medium p-2 rounded outline-none focus:border-blue-primary font-mono"
                        value={api.containerId}
                        onChange={(e) => {
                          const next = [...endpoints];
                          const idx = next.findIndex(x => x.id === api.id);
                          next[idx].containerId = e.target.value;
                          setEndpoints(next);
                        }}
                        placeholder="Container ID / Name"
                      />
                    )}
                    <button 
                      className="w-full h-8 bg-blue-primary text-black text-[13px] font-medium font-bold tracking-wider rounded"
                      onClick={() => {
                        if (validateEndpoint(api)) {
                          setEditingEndpoint(null);
                        }
                      }}
                    >
                      SAVE CHANGES
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="text-[13px] font-medium text-txt3 font-medium font-mono">{api.host}:{api.port} · {api.model || 'No Model'}</div>
                    {discoveredModels[api.id] && discoveredModels[api.id].length > 0 && (
                      <div className="mt-2">
                        <label className="text-[15px] font-medium font-medium text-txt3 font-medium uppercase tracking-widest mb-1 block">Select Model</label>
                        <select 
                          className="w-full bg-bg border border-bd rounded p-1.5 text-[13px] font-medium text-txt outline-none focus:border-blue-primary font-mono"
                          value={api.model}
                          onChange={(e) => {
                            const next = [...endpoints];
                            const idx = next.findIndex(x => x.id === api.id);
                            next[idx].model = e.target.value;
                            setEndpoints(next);
                          }}
                        >
                          <option value="">Select a model...</option>
                          {discoveredModels[api.id].map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {api.containerId && (
                      <div className="text-[16px] font-bold font-medium text-blue-primary mt-1 font-mono uppercase tracking-tighter">
                        Container: {api.containerId}
                      </div>
                    )}
                    {api.sshKey && (
                      <div className="text-[16px] font-bold font-medium text-green-primary mt-1 font-mono uppercase tracking-tighter">
                        SSH Key: Configured
                      </div>
                    )}
                    {api.notes && <div className="text-[16px] font-bold font-medium text-txt3 font-medium mt-1 italic">"{api.notes}"</div>}
                    <div className="flex gap-2 mt-3">
                      <button 
                        className="flex-1 h-8 border border-bd2 text-txt2 text-[13px] font-medium tracking-wider rounded hover:border-blue-primary hover:text-blue-primary transition-colors uppercase font-bold"
                        onClick={() => setEditingEndpoint(api.id)}
                      >
                        EDIT
                      </button>
                      <button 
                        className="flex-1 h-8 bg-blue-primary text-black text-[13px] font-medium font-bold tracking-wider rounded hover:opacity-80 transition-opacity uppercase"
                        onClick={() => syncModels(api)}
                      >
                        SYNC
                      </button>
                      <button 
                        className="w-8 h-8 border border-bd2 text-red-primary flex items-center justify-center rounded hover:bg-red-primary/10 transition-colors"
                        onClick={() => setEndpoints(endpoints.filter(e => e.id !== api.id))}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            <button 
              onClick={() => setIsAddingEndpoint(true)}
              className="w-full h-12 border border-dashed border-blue-primary/50 text-blue-primary text-[15px] font-medium font-bold tracking-[4px] rounded-xl hover:bg-blue-primary/5 transition-colors flex items-center justify-center gap-2"
            >
              ＋ ENDPOINT
            </button>
          </div>
        </div>

        {/* Add New Endpoint Modal */}
        <AnimatePresence>
          {isAddingEndpoint && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-bg1 border border-bd rounded-xl w-full max-w-md overflow-hidden shadow-2xl"
              >
                <div className="h-12 bg-bg2 border-b border-bd flex items-center justify-between px-4">
                  <div className="flex items-center gap-2">
                    <ChevronRight size={14} className="text-green-primary" />
                    <span className="text-[15px] font-medium font-bold uppercase tracking-[3px] text-txt">Add New Endpoint</span>
                  </div>
                  <X size={16} className="text-txt3 font-medium cursor-pointer hover:text-txt" onClick={() => setIsAddingEndpoint(false)} />
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="space-y-1 shrink-0">
                      <label className="text-[16px] font-bold font-medium text-txt3 font-medium uppercase tracking-widest">Icon</label>
                      <div className="grid grid-cols-5 gap-1 bg-bg border border-bd p-1 rounded">
                        {['⚡', '◉', '⬡', '◈', '▣', '◎', '⚙', '⚗', '🔒', '🛡️'].map(icon => (
                          <button 
                            key={icon}
                            onClick={() => setNewEndpoint({...newEndpoint, icon})}
                            className={`w-6 h-6 flex items-center justify-center text-base font-medium font-medium rounded transition-colors ${newEndpoint.icon === icon ? 'bg-blue-primary text-black' : 'text-txt3 font-medium hover:text-txt'}`}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-[16px] font-bold font-medium text-txt3 font-medium uppercase tracking-widest">Name</label>
                      <input 
                        className="w-full bg-bg border border-bd rounded p-2 text-[15px] font-medium text-txt outline-none focus:border-green-primary"
                        value={newEndpoint.name}
                        onChange={e => setNewEndpoint({...newEndpoint, name: e.target.value})}
                        placeholder="My Custom Server"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[16px] font-bold font-medium text-txt3 font-medium uppercase tracking-widest">Type</label>
                    <select 
                      className="w-full bg-bg border border-bd rounded p-2 text-[15px] font-medium text-txt outline-none focus:border-green-primary"
                      value={newEndpoint.type}
                      onChange={e => setNewEndpoint({...newEndpoint, type: e.target.value})}
                    >
                      <option value="API">Generic API</option>
                      <option value="Ollama">Ollama</option>
                      <option value="Docker">Docker Container</option>
                      <option value="SSH Tunneling">SSH Tunneling</option>
                      <option value="SSH + Docker">SSH + Docker</option>
                      <option value="Compute">Compute</option>
                      <option value="Terminal Debug">Terminal Debug</option>
                      <option value="WSL">WSL</option>
                      <option value="Claw Hub">Claw Hub</option>
                      <option value="Telegram Token">Telegram Token</option>
                      <option value="Chat Bot Agent">Chat Bot Agent</option>
                      <option value="MCP">MCP</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 space-y-1">
                      <label className="text-[16px] font-bold font-medium text-txt3 font-medium uppercase tracking-widest">Host</label>
                      <input 
                        className="w-full bg-bg border border-bd rounded p-2 text-[15px] font-medium text-txt outline-none focus:border-green-primary font-mono"
                        value={newEndpoint.host}
                        onChange={e => setNewEndpoint({...newEndpoint, host: e.target.value})}
                        placeholder="localhost"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[16px] font-bold font-medium text-txt3 font-medium uppercase tracking-widest">Port</label>
                      <input 
                        className="w-full bg-bg border border-bd rounded p-2 text-[15px] font-medium text-txt outline-none focus:border-green-primary font-mono"
                        value={newEndpoint.port}
                        onChange={e => setNewEndpoint({...newEndpoint, port: e.target.value})}
                        placeholder="11434"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[16px] font-bold font-medium text-txt3 font-medium uppercase tracking-widest">Model (optional)</label>
                    <input 
                      className="w-full bg-bg border border-bd rounded p-2 text-[15px] font-medium text-txt outline-none focus:border-green-primary font-mono"
                      value={newEndpoint.model}
                      onChange={e => setNewEndpoint({...newEndpoint, model: e.target.value})}
                      placeholder="qwen3.5:0.8b"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[16px] font-bold font-medium text-txt3 font-medium uppercase tracking-widest">API Key (optional)</label>
                    <input 
                      type="password"
                      className="w-full bg-bg border border-bd rounded p-2 text-[15px] font-medium text-txt outline-none focus:border-green-primary font-mono"
                      value={newEndpoint.apiKey}
                      onChange={e => setNewEndpoint({...newEndpoint, apiKey: e.target.value})}
                      placeholder="••••••••••••"
                    />
                  </div>

                  {(newEndpoint.type === 'SSH Tunneling' || newEndpoint.type === 'SSH + Docker') && (
                    <div className="space-y-1">
                      <label className="text-[16px] font-bold font-medium text-txt3 font-medium uppercase tracking-widest">SSH Private Key (optional)</label>
                      <textarea 
                        className="w-full bg-bg border border-bd rounded p-2 text-[15px] font-medium text-txt outline-none focus:border-green-primary font-mono h-20 resize-none"
                        value={newEndpoint.sshKey}
                        onChange={e => setNewEndpoint({...newEndpoint, sshKey: e.target.value})}
                        placeholder="-----BEGIN RSA PRIVATE KEY-----"
                      />
                    </div>
                  )}

                  {(newEndpoint.type === 'Docker' || newEndpoint.type === 'SSH + Docker') && (
                    <div className="space-y-1">
                      <label className="text-[16px] font-bold font-medium text-txt3 font-medium uppercase tracking-widest">Container ID / Name</label>
                      <input 
                        className="w-full bg-bg border border-bd rounded p-2 text-[15px] font-medium text-txt outline-none focus:border-green-primary font-mono"
                        value={newEndpoint.containerId}
                        onChange={e => setNewEndpoint({...newEndpoint, containerId: e.target.value})}
                        placeholder="e.g. t2i-terminal-rig"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[16px] font-bold font-medium text-txt3 font-medium uppercase tracking-widest">Quantization (optional)</label>
                    <input 
                      className="w-full bg-bg border border-bd rounded p-2 text-[15px] font-medium text-txt outline-none focus:border-green-primary font-mono"
                      value={newEndpoint.quantization}
                      onChange={e => setNewEndpoint({...newEndpoint, quantization: e.target.value})}
                      placeholder="e.g. Q4_K_M, airllm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[16px] font-bold font-medium text-txt3 font-medium uppercase tracking-widest">Secondary Token / Password (optional)</label>
                    <input 
                      type="password"
                      className="w-full bg-bg border border-bd rounded p-2 text-[15px] font-medium text-txt outline-none focus:border-green-primary font-mono"
                      value={newEndpoint.secondaryToken}
                      onChange={e => setNewEndpoint({...newEndpoint, secondaryToken: e.target.value})}
                      placeholder="••••••••••••"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[16px] font-bold font-medium text-txt3 font-medium uppercase tracking-widest">Notes</label>
                    <textarea 
                      className="w-full bg-bg border border-bd rounded p-2 text-[15px] font-medium text-txt outline-none focus:border-green-primary h-20 resize-none"
                      value={newEndpoint.notes}
                      onChange={e => setNewEndpoint({...newEndpoint, notes: e.target.value})}
                      placeholder="Additional details..."
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={() => setIsAddingEndpoint(false)}
                      className="flex-1 h-10 border border-bd2 text-txt2 font-bold text-[15px] font-medium tracking-widest rounded-lg"
                    >
                      CANCEL
                    </button>
                    <button 
                      onClick={() => {
                        if (validateEndpoint(newEndpoint)) {
                          const id = Math.random().toString(36).substr(2, 9);
                          setEndpoints([...endpoints, { ...newEndpoint as Endpoint, id, status: 'IDLE', isProvider: false }]);
                          setIsAddingEndpoint(false);
                          setNewEndpoint({ name: '', type: 'API', host: 'localhost', port: '8080', model: '', apiKey: '', secondaryToken: '', sshKey: '', containerId: '', notes: '', quantization: '', icon: '⚡' });
                        }
                      }}
                      className="flex-1 h-10 bg-green-primary text-black font-bold text-[15px] font-medium tracking-widest rounded-lg"
                    >
                      ADD ENDPOINT
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tunnel Settings Section */}
        <div className="bg-bg1 border border-bd rounded-xl overflow-hidden shadow-lg">
          <div className="h-10 bg-bg2 border-b border-bd flex items-center px-4 gap-2">
            <Globe size={14} className="text-blue-primary" />
            <span className="text-[15px] font-medium tracking-[3px] text-txt uppercase font-bold">Tunnel & Webhook Settings</span>
          </div>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-[16px] font-bold font-medium text-txt3 font-medium uppercase tracking-widest">Auth Token (Claw/QR)</label>
              <div className="flex gap-2">
                <input 
                  type="password"
                  className="flex-1 bg-bg text-txt border border-bd2 text-[15px] font-medium p-2 rounded outline-none focus:border-blue-primary font-mono"
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  placeholder="Enter token or scan QR..."
                />
                <button className="px-3 bg-bg2 border border-bd2 text-txt2 text-[13px] font-medium rounded hover:border-blue-primary">
                  SCAN QR
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[16px] font-bold font-medium text-txt3 font-medium uppercase tracking-widest">Termux Webhook URL</label>
              <input 
                className="w-full bg-bg text-txt border border-bd2 text-[15px] font-medium p-2 rounded outline-none focus:border-blue-primary font-mono"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-termux-webhook.com/api/hook"
              />
            </div>
            <button 
              onClick={() => {
                setIsUpdating(true);
                // Simulate git update
                setTimeout(() => {
                  setIsUpdating(false);
                  setNotifications(prev => [...prev, { id: Math.random().toString(), message: 'Git Update Complete' }]);
                }, 2000);
              }}
              className="w-full h-10 bg-blue-primary text-black text-[13px] font-medium font-bold tracking-widest rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <RefreshCw size={14} className={isUpdating ? 'animate-spin' : ''} />
              {isUpdating ? 'UPDATING...' : 'GIT UPDATE (PULL)'}
            </button>
          </div>
        </div>

        {/* Privacy & Compliance */}
        <div className="bg-bg1 border border-bd rounded-xl overflow-hidden shadow-lg">
          <div className="h-10 bg-bg2 border-b border-bd flex items-center px-4 gap-2">
            <Lock size={14} className="text-txt3 font-medium" />
            <span className="text-[15px] font-medium tracking-[3px] text-txt uppercase font-bold">Privacy & Compliance</span>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button className="h-10 bg-bg2 border border-bd2 rounded text-[16px] font-bold font-medium text-txt3 font-medium uppercase tracking-widest hover:text-txt transition-colors">Privacy Policy</button>
              <button className="h-10 bg-bg2 border border-bd2 rounded text-[16px] font-bold font-medium text-txt3 font-medium uppercase tracking-widest hover:text-txt transition-colors">Terms of Service</button>
            </div>
            <div className="p-3 bg-black/40 border border-bd2 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[16px] font-bold font-medium text-txt3 font-medium uppercase tracking-widest">Data Usage</span>
                <span className="text-[16px] font-bold font-medium text-green-primary uppercase font-bold">Local Only</span>
              </div>
              <p className="text-[15px] font-medium font-medium text-txt3 font-medium leading-relaxed">
                Terminal to Intel is designed with a "Local First" philosophy. Your code, keys, and data remain on your device or your private rig. We do not store your data on our servers.
              </p>
            </div>
            <div className="text-center">
              <span className="text-[15px] font-medium font-medium text-txt3 font-medium uppercase tracking-[4px]">Build Version 2.0.4-stable</span>
            </div>
          </div>
        </div>

        {/* Quick Install Reference Section */}
        <div className="bg-bg1 border border-bd rounded-xl overflow-hidden shadow-lg">
          <div className="h-10 bg-bg2 border-b border-bd flex items-center px-4 gap-2">
            <Zap size={14} className="text-yellow-500" />
            <span className="text-[15px] font-medium tracking-[3px] text-txt uppercase font-bold">Quick Install Reference</span>
          </div>
          <div className="p-4 space-y-3">
            {[
              { label: 'NPM / NPX', cmd: 'npm install -g t2i-terminal-rig' },
              { label: 'CURL / BASH', cmd: 'curl -fsSL https://get.t2i.ai | bash' },
              { label: 'BUN', cmd: 'bun install -g t2i-terminal-rig' },
              { label: 'APT (Debian/Ubuntu)', cmd: 'sudo apt install t2i' },
              { label: 'TERMUX (Android)', cmd: 'pkg install t2i' },
              { label: 'F-DROID', cmd: 'Search "Terminal to Intel" in F-Droid' }
            ].map((item, i) => (
              <div key={i} className="bg-bg2 border border-bd2 rounded-lg p-2 flex items-center justify-between group">
                <div className="flex flex-col">
                  <span className="text-[15px] font-medium font-medium text-txt3 font-medium uppercase tracking-widest mb-1">{item.label}</span>
                  <code className="text-[13px] font-medium text-green-primary font-mono">{item.cmd}</code>
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(item.cmd);
                    setNotifications(prev => [...prev, { id: Math.random().toString(), message: 'Copied to clipboard' }]);
                  }}
                  className="p-1.5 text-txt3 font-medium hover:text-blue-primary transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Save size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div 
      className={`w-full h-screen bg-bg flex flex-col relative overflow-hidden mx-auto border-x border-bd transition-all duration-500`}
      style={{ 
        maxWidth: isPhoneRatio ? '430px' : '100%',
        '--color-blue-primary': primaryColor 
      } as any}
    >
      {/* Notifications */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {notifications.map(n => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className="bg-black/80 border border-white/10 p-4 rounded-lg shadow-xl text-white flex items-center gap-3 min-w-[200px]"
          >
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-base font-medium font-mono">{n.message}</span>
          </motion.div>
        ))}
      </div>

      {/* Topbar */}
      <div className="h-11 pt-[env(safe-area-inset-top,0px)] bg-bg1 border-b border-bd flex items-center px-3 gap-2 shrink-0 select-none z-50">
        <div className="flex items-center gap-1.5 flex-1">
          <div className="w-5 h-5 bg-blue-primary rounded flex items-center justify-center">
            <Zap size={12} className="text-black fill-current" />
          </div>
          <span className="text-blue-primary text-base font-medium font-medium font-bold tracking-[3px]">T2I</span>
        </div>
        {curPage === 'editor' && activeTabType === 'file' && (
          <span className={`text-[16px] font-bold font-medium tracking-[2px] px-2 py-0.5 rounded font-bold shrink-0 ${
            vimMode === 'NORMAL' ? 'bg-blue-primary text-black' : 
            vimMode === 'INSERT' ? 'bg-green-primary text-black' : 
            'bg-purple-primary text-white'
          }`}>
            {vimMode}
          </span>
        )}
        <span className="text-[13px] font-medium text-txt3 font-medium shrink-0">{time}</span>
      </div>

      {/* Pages */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 flex flex-col bg-bg">
          {curPage === 'editor' && renderEditor()}
          {curPage === 'shell' && renderShell()}
          {curPage === 'display' && renderDisplay()}
          {curPage === 'settings' && renderSettings()}
        </div>
      </div>

      {/* Bottom Nav */}
      <div className={`${isNavMinimized ? 'h-[32px]' : 'h-[calc(52px+env(safe-area-inset-bottom,0px))]'} pb-[env(safe-area-inset-bottom,0px)] bg-bg1 border-t border-bd flex shrink-0 select-none transition-all duration-300 relative`}>
        <AnimatePresence mode="wait">
          {!isNavMinimized ? (
            <motion.div 
              key="full"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex-1 flex"
            >
              {[
                { id: 'editor', label: 'WORKSPACE', icon: <Code2 size={16} /> },
                { id: 'ai_chat', label: 'AI CHAT', icon: <Sparkles size={16} /> },
                { id: 'display', label: 'DISPLAY', icon: <Monitor size={16} /> },
                { id: 'settings', label: 'SETTINGS', icon: <Settings size={16} /> }
              ].map((item, keyIdx) => (
                <button 
                  key={keyIdx}
                  onClick={() => {
                    if (item.id === 'ai_chat') setShowAiSidebar(prev => !prev);
                    else setCurPage(item.id as PageType);
                  }}
                  className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                    (curPage === item.id) || (item.id === 'ai_chat' && showAiSidebar) ? 'text-blue-primary bg-bg shadow-[inset_0_2px_0_rgba(var(--color-blue-primary),1)]' : 'text-txt3 font-medium hover:bg-bg/50'
                  }`}
                >
                  <div className={`text-lg transition-transform ${(item.id === 'ai_chat' && showAiSidebar) ? 'scale-110' : ''}`}>{item.icon}</div>
                  <span className="text-[12px] font-black tracking-widest font-mono uppercase">{item.label}</span>
                </button>
              ))}
              <button 
                onClick={() => setIsNavMinimized(true)}
                className="w-8 flex items-center justify-center text-txt3 font-medium hover:text-blue-primary"
              >
                <ChevronRight size={14} className="rotate-90" />
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key="min"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex items-center justify-between px-4"
            >
              <div className="flex items-center gap-2">
                <div className="text-blue-primary">
                  {curPage === 'editor' && <Code2 size={14} />}
                  {curPage === 'shell' && <TerminalIcon size={14} />}
                  {curPage === 'display' && <Monitor size={14} />}
                  {curPage === 'settings' && <Settings size={14} />}
                </div>
                <span className="text-[16px] font-bold font-medium tracking-[2px] text-txt2 uppercase font-bold">{curPage}</span>
              </div>
              <button 
                onClick={() => setIsNavMinimized(false)}
                className="text-txt3 font-medium hover:text-blue-primary flex items-center gap-1"
              >
                <span className="text-[15px] font-medium font-medium tracking-widest uppercase">Expand</span>
                <ChevronRight size={14} className="-rotate-90" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
