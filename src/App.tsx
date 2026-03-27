import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal as TerminalIcon, 
  Code2, 
  Info,
  Settings, 
  Cpu, 
  Sparkles, 
  Plus, 
  ChevronRight, 
  ChevronLeft,
  Menu,
  Activity,
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
  Square,
  Camera,
  Mic,
  Folder,
  Lock,
  RefreshCw,
  ExternalLink,
  MonitorPlay,
  ArrowUpRight,
  Upload
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
  const [bridgeConfig, setBridgeConfig] = useState({ enabled: false, url: '', token: '' });
  const [curPage, setCurPage] = useState<PageType>('hub');
  const [showTerminal, setShowTerminal] = useState(true);
  const [terminalHeight, setTerminalHeight] = useState(35);
  const [isResizing, setIsResizing] = useState(false);
  const [isChatHubOpen, setIsChatHubOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([
    { role: 'ai', content: 'Welcome to T2I :: SOVEREIGN. How can I assist you today?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatWorking, setIsChatWorking] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isNavMinimized, setIsNavMinimized] = useState(false);
  const [curFileIdx, setCurFileIdx] = useState(0);
  const [files, setFiles] = useState<FileData[]>(INITIAL_FILES);
  const [vimMode, setVimMode] = useState<VimMode>('NORMAL');
  const [curLine, setCurLine] = useState(1);
  const [curCol, setCurCol] = useState(1);
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
    config: '',
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
      'T2I Hub': '▣',
      'Telegram Token': '◎',
      'Chat Bot Agent': '◉',
      'MCP': '⬡'
    };
    if (newEndpoint.type && typeToIcon[newEndpoint.type]) {
      setNewEndpoint(prev => ({ ...prev, icon: typeToIcon[newEndpoint.type!] }));
    }
  }, [newEndpoint.type]);
  
  const [primaryColor, setPrimaryColor] = useState('#FFB000');
  const [isPhoneRatio, setIsPhoneRatio] = useState(false);
  const [freqDivisor, setFreqDivisor] = useState(83.3333);
  const [showFileRail, setShowFileRail] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'explorer' | 'terminal' | 'scripts' | 'settings'>('explorer');
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
  const [editorConfig, setEditorConfig] = useState({
    theme: "Sovereign-Amber-Phosphor",
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 13,
    lineHeight: 1.6,
    renderWhitespace: "none",
    minimapEnabled: false,
    cursorStyle: "block",
    cursorBlinking: "solid",
    colors: {
      background: "#0D0D0D",
      foreground: "#FFB000",
      lineHighlightBackground: "#1A1A1A",
      selectionBackground: "#332600",
      cursorForeground: "#FFB000",
      terminalBackground: "#050505"
    }
  });

  const [favScripts, setFavScripts] = useState([
    { category: 'FORGE', items: [
      { name: 'Forge UI', cmd: 'echo "Installing Sovereign-Amber-Phosphor UI preferences..." && sleep 1 && echo "Done."', icon: '⚒' },
      { name: 'Sync Rig', cmd: 'git pull origin main && npm install', icon: '🔄' },
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
    { category: 'T2I/CODE', items: [
      { name: 'claudecode', cmd: 'claudecode', icon: '🤖' },
      { name: 't2i', cmd: 't2i', icon: '🤖' },
      { name: 'opencode', cmd: 'opencode .', icon: '⌨' },
    ]},
    { category: 'NETWORK', items: [
      { name: 'ngrok :3000', cmd: 'ngrok http 3000', icon: '↻' },
    ]}
  ]);
  
  const [isAddingScript, setIsAddingScript] = useState(false);
  const [newScript, setNewScript] = useState({ name: '', cmd: '', icon: '⚡' });
  const [notifications, setNotifications] = useState<{id: string, message: string}[]>([]);
  
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

  const [endpoints, setEndpoints] = useState<Endpoint[]>([
    { id: 'openai', name: 'OpenAI', type: 'API', host: 'api.openai.com', port: '443', apiKey: '', status: 'IDLE', icon: '◉', isProvider: true },
    { id: 'anthropic', name: 'Anthropic', type: 'API', host: 'api.anthropic.com', port: '443', apiKey: '', status: 'IDLE', icon: '⬡', isProvider: true },
    { id: 'gemini', name: 'Google Gemini', type: 'API', host: 'generativelanguage.googleapis.com', port: '443', apiKey: '', status: 'API', icon: '⚡', isProvider: true },
    { id: 'mistral', name: 'Mistral AI', type: 'API', host: 'api.mistral.ai', port: '443', apiKey: '', status: 'IDLE', icon: '◈', isProvider: true },
    { id: 'groq', name: 'Groq', type: 'API', host: 'api.groq.com', port: '443', apiKey: '', status: 'IDLE', icon: '▣', isProvider: true },
    { id: 'perplexity', name: 'Perplexity', type: 'API', host: 'api.perplexity.ai', port: '443', apiKey: '', status: 'IDLE', icon: '◎', isProvider: true },
  ]);

  const [editingEndpoint, setEditingEndpoint] = useState<string | null>(null);
  const [wakeLock, setWakeLock] = useState<any>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    const height = ((window.innerHeight - e.clientY) / window.innerHeight) * 100;
    if (height > 10 && height < 80) {
      setTerminalHeight(height);
    }
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

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
    if (window.self !== window.top) {
      const id = Math.random().toString(36).substr(2, 9);
      setNotifications(prev => [...prev, { id, message: 'PiP is restricted in iframes. Open in a new tab to use.' }]);
      setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
      return;
    }

    if (!('documentPictureInPicture' in window)) {
      const id = Math.random().toString(36).substr(2, 9);
      setNotifications(prev => [...prev, { id, message: 'Document PiP is not supported in this browser.' }]);
      setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
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
        term.writeln('\x1b[34mT2I :: SOVEREIGN – Reality Forge OS\x1b[0m');
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

  useEffect(() => {
    if (editorConfig.cursorStyle !== 'block') return;
    
    const updateCursor = () => {
      const textarea = document.querySelector('textarea');
      const cursor = document.getElementById('custom-cursor');
      const lineNumbers = document.getElementById('line-numbers');
      if (!textarea || !cursor) return;
      
      const { selectionStart, value } = textarea;
      const textBefore = value.substring(0, selectionStart);
      const linesBefore = textBefore.split('\n');
      const curLineIdx = linesBefore.length - 1;
      const curColIdx = linesBefore[curLineIdx].length;
      
      setCurLine(curLineIdx + 1);
      setCurCol(curColIdx + 1);
      
      // Sync line numbers scroll
      if (lineNumbers) {
        lineNumbers.scrollTop = textarea.scrollTop;
      }
      
      // Approximate position based on font size and line height
      const charWidth = 7.8; // Approximate for JetBrains Mono at 13px
      const lineHeight = editorConfig.fontSize * editorConfig.lineHeight;
      
      cursor.style.width = `${charWidth}px`;
      cursor.style.height = `${editorConfig.fontSize}px`;
      cursor.style.backgroundColor = editorConfig.colors.cursorForeground;
      cursor.style.left = `${16 + curColIdx * charWidth - textarea.scrollLeft}px`;
      cursor.style.top = `${16 + curLineIdx * lineHeight - textarea.scrollTop + (lineHeight - editorConfig.fontSize)/2}px`;
      cursor.style.display = (textarea.selectionStart === textarea.selectionEnd) ? 'block' : 'none';
      
      // Handle blinking
      if (editorConfig.cursorBlinking === 'solid') {
        cursor.style.animation = 'none';
        cursor.style.opacity = '1';
      } else {
        cursor.style.animation = 'blink 1s step-end infinite';
      }
    };

    const textarea = document.querySelector('textarea');
    if (textarea) {
      textarea.addEventListener('input', updateCursor);
      textarea.addEventListener('keyup', updateCursor);
      textarea.addEventListener('click', updateCursor);
      textarea.addEventListener('scroll', updateCursor);
      // Initial update
      setTimeout(updateCursor, 0);
    }
    
    return () => {
      if (textarea) {
        textarea.removeEventListener('input', updateCursor);
        textarea.removeEventListener('keyup', updateCursor);
        textarea.removeEventListener('click', updateCursor);
        textarea.removeEventListener('scroll', updateCursor);
      }
    };
  }, [editorConfig, curFileIdx, files]);

  const fetchFiles = async (retries = 3) => {
    const url = getApiUrl('/api/files');
    console.log('Fetching files from:', url);
    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      };
      if (bridgeConfig.token) {
        headers['Authorization'] = `Bearer ${bridgeConfig.token}`;
      }
      
      const res = await fetch(url, { headers });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      console.log('Fetched files data:', data);
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
        if (newFiles.length > 0 && curFileIdx >= newFiles.length) {
          setCurFileIdx(0);
        }
      }
    } catch (e) {
      console.error('Failed to fetch files', e);
      if (retries > 0) {
        console.log(`Retrying fetchFiles... (${retries} left)`);
        setTimeout(() => fetchFiles(retries - 1), 1000);
      } else {
        const id = Date.now().toString();
        setNotifications(prev => [...prev, { 
          id, 
          message: `Failed to fetch files: ${e instanceof Error ? e.message : String(e)}`,
          action: () => {
            setNotifications(p => p.filter(n => n.id !== id));
            fetchFiles(3);
          }
        }]);
      }
    }
  };

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          console.log('Server health check passed');
        } else {
          console.error('Server health check failed');
        }
      } catch (e) {
        console.error('Server health check failed', e);
      }
    };
    checkHealth();
    fetchFiles();
  }, [bridgeConfig.enabled]);

  useEffect(() => {
    const file = files[curFileIdx];
    if (file && !file.raw) {
      const fetchContent = async () => {
        try {
          const headers: Record<string, string> = {};
          if (bridgeConfig.token) {
            headers['Authorization'] = `Bearer ${bridgeConfig.token}`;
          }
          const res = await fetch(getApiUrl(`/api/files/read?path=${file.name}`), { headers });
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
  }, [curFileIdx, files[curFileIdx]?.name, bridgeConfig.enabled]);

  useEffect(() => {
    const pollStatus = async () => {
      const urls = endpoints.map(e => {
        const protocol = e.port === '443' ? 'https' : 'http';
        return `${protocol}://${e.host}:${e.port}`;
      }).join(',');
      
      try {
        const headers: Record<string, string> = {};
        if (bridgeConfig.token) {
          headers['Authorization'] = `Bearer ${bridgeConfig.token}`;
        }
        const res = await fetch(getApiUrl(`/api/sentinel/status?endpoints=${encodeURIComponent(urls)}`), { headers });
        if (res.ok) {
          const statusMap = await res.json();
          setEndpoints(prev => prev.map(e => {
            const protocol = e.port === '443' ? 'https' : 'http';
            const url = `${protocol}://${e.host}:${e.port}`;
            return { ...e, status: statusMap[url] || 'OFFLINE' };
          }));
        }
      } catch (e) {
        console.error('Failed to poll status', e);
      }
    };
    
    const interval = setInterval(pollStatus, 15000);
    pollStatus();
    return () => clearInterval(interval);
  }, [endpoints.length, bridgeConfig.token, bridgeConfig.enabled]);

  useEffect(() => {
    const s = io();
    
    // CLI-to-App Command Bridge
    s.on('app:command', (data: { type: string, payload: any }) => {
      if (data.type === 'navigate') setCurPage(data.payload);
      if (data.type === 'open') {
        const idx = filesRef.current.findIndex(f => f.name === data.payload);
        if (idx !== -1) {
          setCurFileIdx(idx);
          setCurPage('hub');
        } else {
          // If file not in list, try to fetch it
          fetchFiles().then(() => {
            const newIdx = filesRef.current.findIndex(f => f.name === data.payload);
            if (newIdx !== -1) {
              setCurFileIdx(newIdx);
              setCurPage('hub');
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
    // Use relative path for local container to avoid origin issues
    return path;
  };






  const saveFile = async () => {
    const file = files[curFileIdx];
    if (!file) return;
    
    try {
      const res = await fetch(getApiUrl('/api/files/write'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: file.name, content: file.raw })
      });
      if (res.ok) {
        setIsModified(false);
        setNotifications(prev => [...prev, { id: Date.now().toString(), message: `Saved: ${file.name}` }]);
      } else {
        throw new Error('Failed to save');
      }
    } catch (e) {
      console.error('Save failed', e);
      setNotifications(prev => [...prev, { id: Date.now().toString(), message: `Save failed: ${file.name}` }]);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsChatHubOpen(false);
        setEditingEndpoint(null);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveFile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [curFileIdx, files]);

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
    // Simple regex-based syntax highlighting for JS/TS
    const tokens = [
      { regex: /\b(const|let|var|function|return|if|else|for|while|import|export|from|class|extends|interface|type|async|await)\b/g, color: 'var(--color-purple-primary)' },
      { regex: /\b(true|false|null|undefined)\b/g, color: 'var(--color-orange-primary)' },
      { regex: /\b(\d+)\b/g, color: 'var(--color-orange-primary)' },
      { regex: /(".*?"|'.*?'|`.*?`)/g, color: 'var(--color-green-primary)' },
      { regex: /(\/\/.*$)/g, color: 'var(--color-txt3)' },
      { regex: /\b(console|window|document|Math|JSON)\b/g, color: 'var(--color-cyan-primary)' },
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
          color: ext === 'js' ? 'var(--color-yellow-primary)' : ext === 'py' ? 'var(--color-primary)' : 'var(--color-txt2)',
          raw: content
        });
        if (newFiles.length === filesArray.length) {
          setFiles(prev => [...prev, ...newFiles]);
        }
      };
      reader.readAsText(file);
    });
  };

  const simulateAiEdit = () => {
    setAiWorkingOn(curFileIdx);
    setAiProgress(0);
    const logs = [
      'Initializing AI engine...', 
      'Scanning codebase...', 
      'Analyzing frequency patterns...', 
      'Applying Solfeggio modulations...',
      'Optimizing for 528Hz resonance...',
      'Refactoring harmonics...',
      'Injecting neural logic...',
      'Finalizing modulation stack...'
    ];
    setAiLog([logs[0]]);
    
    let logIdx = 1;
    const interval = setInterval(() => {
      setAiProgress(prev => {
        if (prev % 15 === 0 && logIdx < logs.length) {
          setAiLog(l => [...l, logs[logIdx++]]);
        }
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setAiWorkingOn(null);
            setAiLog([]);
          }, 1500);
          return 100;
        }
        return prev + 1;
      });
    }, 40);
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

  const renderExplorerContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-3 space-y-1">
        {files.map((f, i) => (
          <button 
            key={i}
            onClick={() => { setCurFileIdx(i); setIsModified(false); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative ${i === curFileIdx ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' : 'hover:bg-bg2 text-txt3 hover:text-txt border border-transparent'}`}
          >
            <div className="w-2 h-2 rounded-full shrink-0 shadow-[0_0_8px_rgba(0,0,0,0.2)]" style={{ backgroundColor: f.color }}></div>
            <span className="text-[10px] font-bold tracking-wider truncate flex-1 text-left uppercase">{f.name}</span>
            <Trash2 
              size={12} 
              className="opacity-0 group-hover:opacity-100 hover:text-red-primary transition-all shrink-0" 
              onClick={(e) => removeFile(i, e)}
            />
            {i === curFileIdx && (
              <motion.div 
                layoutId="activeFile"
                className="absolute left-0 w-1 h-4 bg-primary rounded-r-full"
              />
            )}
          </button>
        ))}
      </div>
      
      <div className="mt-auto p-3 border-t border-bd/30 bg-bg2/30 flex flex-col gap-2">
        <button 
          onClick={() => {
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
          }}
          className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-primary/5 hover:bg-primary/10 text-primary transition-all border border-dashed border-primary/30 group"
        >
          <Plus size={14} className="group-hover:rotate-90 transition-transform" />
          <span className="text-[9px] font-black uppercase tracking-[2px]">New Source</span>
        </button>
        <label className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-bg1 hover:bg-bg2 text-txt3 hover:text-txt transition-all border border-bd cursor-pointer group">
          <Upload size={14} className="group-hover:-translate-y-0.5 transition-transform" />
          <span className="text-[9px] font-black uppercase tracking-[2px]">Open Local</span>
          <input 
            type="file" 
            className="hidden" 
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = (event) => {
                const content = event.target?.result as string;
                const name = file.name;
                const isNoColor = name.endsWith('.txt') || name.endsWith('.md');
                setFiles([...files, { 
                  name, 
                  lang: isNoColor ? 'txt' : name.split('.').pop() || 'js', 
                  color: isNoColor ? 'var(--color-txt3)' : 'var(--color-txt2)', 
                  raw: content 
                }]);
                setCurFileIdx(files.length);
              };
              reader.readAsText(file);
              e.target.value = '';
            }}
          />
        </label>
      </div>
    </div>
  );

  const renderTerminalContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between px-2 mb-2">
          <span className="text-[8px] text-txt3 uppercase font-black tracking-[3px] opacity-50">Active Sessions</span>
          <button onClick={addShellTab} className="p-1.5 hover:bg-primary/10 rounded-lg text-primary transition-colors">
            <Plus size={14} />
          </button>
        </div>
        <div className="space-y-1.5">
          {shellTabs.map(tab => (
            <div 
              key={tab.id}
              onClick={() => setActiveShellId(tab.id)}
              className={`group flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all border ${
                activeShellId === tab.id 
                  ? 'bg-primary/10 border-primary/30 text-primary shadow-sm' 
                  : 'border-transparent text-txt3 hover:bg-bg2 hover:text-txt'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${activeShellId === tab.id ? 'bg-primary animate-pulse shadow-[0_0_8px_rgba(255,176,0,0.5)]' : 'bg-txt3/30'}`} />
              <input 
                className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest flex-1 cursor-pointer"
                value={tab.name}
                onChange={(e) => renameShellTab(tab.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
              <button 
                onClick={(e) => removeShellTab(tab.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1.5 hover:text-red-primary transition-all"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderScriptsContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-3 space-y-6">
        <div className="flex items-center justify-between px-2">
          <span className="text-[8px] text-txt3 uppercase font-black tracking-[3px] opacity-50">Quick Scripts</span>
          <button onClick={() => setIsAddingScript(true)} className="p-1.5 hover:bg-primary/10 rounded-lg text-primary transition-colors">
            <Zap size={14} />
          </button>
        </div>
        
        {favScripts.map(cat => (
          <div key={cat.category} className="space-y-3">
            <div className="text-[7px] text-primary/60 uppercase tracking-[3px] font-black px-2 flex items-center gap-2">
              <div className="w-1 h-1 bg-primary/40 rounded-full" />
              {cat.category}
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {cat.items.map(s => (
                <button 
                  key={s.name}
                  onClick={() => {
                    const socket = socketsRef.current[activeShellId];
                    if (socket) socket.emit('terminal:input', s.cmd + '\n');
                    setNotifications(prev => [...prev, { id: Date.now().toString(), message: `Running: ${s.name}` }]);
                  }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-bg2/50 hover:bg-bg2 border border-bd/30 hover:border-primary/30 text-txt3 hover:text-txt transition-all group text-left shadow-sm"
                >
                  <span className="text-sm group-hover:scale-125 transition-transform duration-300">{s.icon}</span>
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    <span className="text-[10px] font-black uppercase tracking-wider truncate">{s.name}</span>
                    <span className="text-[7px] font-mono opacity-40 truncate">{s.cmd}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderEditor = (noSidebar = false) => {
    const file = curFileIdx >= 0 && curFileIdx < files.length ? files[curFileIdx] : null;
    const lines = file ? file.raw.split('\n') : [];
    
    return (
      <div className="flex flex-1 overflow-hidden h-full w-full">
        <div className="flex flex-col flex-1 overflow-hidden relative">
          {/* Merged Top Bar (Vim Bar + Breadcrumb) */}
          <div className={`h-6 flex items-center px-3 gap-3 shrink-0 text-[9px] font-bold transition-colors ${
            !file ? 'bg-bg2 text-txt3' :
            vimMode === 'NORMAL' ? 'bg-primary text-black' : 
            vimMode === 'INSERT' ? 'bg-green-primary text-black' : 
            'bg-purple-primary text-white'
          }`}>
            <span className="tracking-widest min-w-[60px]">{!file ? 'IDLE' : vimMode}</span>
            <span className="opacity-80">{file?.name || 'NO FILE'} {file && (isModified || file.name === '.gitignore') ? '[+]' : ''}</span>
            
            {file && (
              <>
                <div className="h-3 w-[1px] bg-black/20 mx-2" />
                <div className="flex items-center gap-2 opacity-80">
                  <Code2 size={10} />
                  <span>{file.lang?.toUpperCase() || 'TXT'}</span>
                </div>

                <div className="ml-auto flex items-center gap-4 opacity-80">
                  <span>LN {curLine}</span>
                  <span>COL {curCol}</span>
                  <span>UTF-8</span>
                  <span>{lines.length > 0 ? Math.round((curLine/lines.length)*100) : 0}%</span>
                </div>
              </>
            )}
          </div>

          {/* Editor Body */}
          <div className="flex flex-1 overflow-hidden relative" style={{ backgroundColor: editorConfig.colors.background }}>
            {!file ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 rounded-full bg-bd/10 flex items-center justify-center border border-bd/20">
                  <FileCode size={32} className="text-txt3/20" />
                </div>
                <span className="text-txt3 text-[10px] font-black tracking-[4px] uppercase opacity-30">Select a file to begin</span>
                <button 
                  onClick={() => {
                    const name = `untitled-${files.length + 1}.txt`;
                    setFiles([...files, { 
                      name, 
                      lang: 'txt', 
                      color: 'var(--color-txt3)', 
                      raw: '' 
                    }]);
                    setCurFileIdx(files.length);
                  }}
                  className="mt-4 px-6 py-2 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-all text-[10px] font-bold tracking-widest uppercase flex items-center gap-2"
                >
                  <Plus size={14} />
                  New Note
                </button>
              </div>
            ) : (
              <>
                <div 
                  id="line-numbers"
                  className="w-12 bg-bg1/50 border-r border-bd py-4 text-right pr-3 text-[10px] font-mono text-txt3/40 shrink-0 select-none overflow-hidden" 
                  style={{ lineHeight: editorConfig.lineHeight }}
                >
                  {lines.map((_, i) => (
                    <div key={i} className={i === curLine - 1 ? 'text-primary font-bold' : ''}>{i + 1}</div>
                  ))}
                </div>
                <div className="flex-1 overflow-auto no-scrollbar bg-transparent relative">
                  <div 
                    className="absolute inset-0 p-4 font-mono pointer-events-none whitespace-pre overflow-hidden opacity-90"
                    style={{ 
                      fontSize: `${editorConfig.fontSize}px`, 
                      lineHeight: editorConfig.lineHeight,
                      color: editorConfig.colors.foreground
                    }}
                  >
                    {lines.map((line, i) => (
                      <div 
                        key={i} 
                        className={i === curLine - 1 ? 'border-l-2 border-primary -ml-4 pl-[14px]' : ''}
                        style={{ backgroundColor: i === curLine - 1 ? editorConfig.colors.lineHighlightBackground : 'transparent' }}
                      >
                        {highlightCode(line)}
                      </div>
                    ))}
                  </div>
                  <textarea
                    className="w-full h-full p-4 bg-transparent outline-none resize-none font-mono text-transparent selection:bg-primary/20"
                    style={{ 
                      fontSize: `${editorConfig.fontSize}px`, 
                      lineHeight: editorConfig.lineHeight,
                      caretColor: editorConfig.cursorStyle === 'block' ? 'transparent' : 'var(--color-primary)'
                    }}
                    spellCheck={false}
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
                      const lineNumbers = document.getElementById('line-numbers');
                      if (overlay) {
                        overlay.scrollTop = target.scrollTop;
                        overlay.scrollLeft = target.scrollLeft;
                      }
                      if (lineNumbers) {
                        lineNumbers.scrollTop = target.scrollTop;
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
                  />
                  
                  {/* Block Cursor Simulation */}
                  {editorConfig.cursorStyle === 'block' && (
                    <div className="absolute pointer-events-none" id="custom-cursor" />
                  )}
                  
                  {/* AI Working Preview Overlay */}
                  <AnimatePresence>
                    {aiWorkingOn === curFileIdx && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-bg/80 backdrop-blur-md z-30 flex items-center justify-center p-8"
                      >
                        <div className="bg-bg1 border border-primary/30 p-6 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-sm w-full relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-full h-1 bg-primary/20">
                            <motion.div 
                              className="h-full bg-primary shadow-[0_0_10px_rgba(255,176,0,0.8)]"
                              initial={{ width: 0 }}
                              animate={{ width: `${aiProgress}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                                <Sparkles size={16} className="text-primary animate-pulse" />
                              </div>
                              <div>
                                <h3 className="text-[10px] text-txt font-black tracking-[2px] uppercase">Sovereign AI</h3>
                                <p className="text-[7px] text-txt3 font-bold uppercase tracking-widest">Refactoring Core Logic</p>
                              </div>
                            </div>
                            <span className="text-[14px] text-primary font-mono font-black">{aiProgress}%</span>
                          </div>
                          <div className="space-y-2 bg-black/40 p-3 rounded-lg border border-bd/50">
                            {aiLog.slice(-4).map((log, i) => (
                              <div key={i} className={`text-[8px] font-mono truncate transition-all ${i === aiLog.slice(-4).length - 1 ? 'text-primary' : 'text-txt3 opacity-40'}`}>
                                <span className="mr-2">›</span>{log}
                              </div>
                            ))}
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
                      animate={{ width: '45%' }}
                      exit={{ width: 0 }}
                      className="border-l border-bd bg-bg overflow-hidden flex flex-col z-10 shadow-2xl"
                    >
                      <div className="h-10 bg-bg1 border-b border-bd flex items-center px-4 justify-between shrink-0">
                        <div className="flex items-center gap-2">
                          <Monitor size={14} className="text-primary" />
                          <span className="text-[9px] text-txt font-black uppercase tracking-[2px]">Live Preview</span>
                        </div>
                        <button onClick={() => setShowPreview(false)} className="p-1 hover:bg-bd rounded transition-colors">
                          <X size={14} className="text-txt3" />
                        </button>
                      </div>
                      <div className="flex-1 bg-white overflow-auto">
                        {file.lang === 'html' || file.name.endsWith('.html') ? (
                          <iframe 
                            srcDoc={file.raw} 
                            className="w-full h-full border-none"
                            title="Preview"
                          />
                        ) : (
                          <div className="p-8 flex flex-col items-center justify-center h-full text-center space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-bd/5 flex items-center justify-center border border-bd/10">
                              <Info size={32} className="text-txt3/20" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-black font-bold text-xs uppercase tracking-widest">No Visual Output</p>
                              <p className="text-gray-400 text-[10px] max-w-[200px]">Preview is optimized for HTML/CSS. Viewing raw source for {file.name}.</p>
                            </div>
                            <pre className="bg-gray-50 p-4 rounded-lg text-[10px] text-gray-600 font-mono text-left w-full max-h-[200px] overflow-auto border border-gray-100">
                              {file.raw}
                            </pre>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>


        </div>
      </div>
    );
  };

  const renderShell = (noSidebar = false) => {
    return (
      <div className={`flex flex-1 h-full overflow-hidden ${noSidebar ? 'bg-bg' : 'bg-bg1'}`}>
        {/* Main Terminal Area */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Header / Toolbar - Hidden in split view to merge with divider */}
          {!noSidebar && (
            <div className="h-10 bg-bg border-b border-bd flex items-center px-4 justify-between shrink-0">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-primary animate-pulse" />
                  <span className="text-[10px] text-txt font-black uppercase tracking-[2px]">
                    {shellTabs.find(t => t.id === activeShellId)?.name || 'Terminal'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button onClick={() => setCurPage('display')} className="p-2 text-txt3 hover:text-primary transition-colors rounded hover:bg-bd/30" title="GUI Display">
                  <Monitor size={14} />
                </button>
                <button onClick={migrateShellOutput} className="p-2 text-txt3 hover:text-primary transition-colors rounded hover:bg-bd/30" title="Migrate to Editor">
                  <ArrowUpRight size={14} />
                </button>
                <button onClick={togglePiP} className="p-2 text-txt3 hover:text-green-primary transition-colors rounded hover:bg-bd/30" title="Picture-in-Picture">
                  <MonitorPlay size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Terminal Container */}
          <div className={`flex-1 relative bg-black/40 rounded-xl border border-bd/30 overflow-hidden shadow-inner ${noSidebar ? 'm-2' : 'm-4'}`}>
            {shellTabs.map(tab => (
              <div 
                key={tab.id}
                ref={el => { if (el) terminalContainersRef.current[tab.id] = el; }}
                className={`absolute inset-0 p-3 font-mono ${activeShellId === tab.id ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
              />
            ))}
            
            {!hasTerminalActivity && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none p-8 text-center">
                <TerminalIcon size={noSidebar ? 24 : 32} className="text-txt3/10 mb-4" />
                <h2 className={`text-txt3/10 font-black uppercase tracking-[8px] mb-1 ${noSidebar ? 'text-sm' : 'text-xl'}`}>Idle</h2>
              </div>
            )}

            {/* Quick Actions Overlay in Split View */}
            {noSidebar && (
              <div className="absolute top-2 right-2 flex gap-1 z-20">
                <button onClick={migrateShellOutput} className="p-1.5 bg-black/60 border border-bd/50 rounded text-txt3 hover:text-primary transition-all backdrop-blur-sm" title="Migrate">
                  <ArrowUpRight size={10} />
                </button>
                <button onClick={togglePiP} className="p-1.5 bg-black/60 border border-bd/50 rounded text-txt3 hover:text-green-primary transition-all backdrop-blur-sm" title="PiP">
                  <MonitorPlay size={10} />
                </button>
              </div>
            )}
          </div>

          {/* Terminal Footer Info */}
          <div className="h-5 bg-bg1/50 border-t border-bd flex items-center px-4 gap-4 text-[7px] text-txt3 font-bold uppercase tracking-widest shrink-0">
            <div className="flex items-center gap-1.5">
              <Cpu size={8} />
              <span>12%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Activity size={8} />
              <span>14ms</span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="text-primary">Connected</span>
            </div>
          </div>
        </div>

        {/* Add Script Modal */}
        <AnimatePresence>
          {isAddingScript && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="bg-bg border border-bd rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
              >
                <div className="h-12 bg-bg1 border-b border-bd flex items-center justify-between px-6">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[2px] text-txt">New Quick Script</span>
                  </div>
                  <button onClick={() => setIsAddingScript(false)} className="p-1 hover:bg-bd rounded transition-colors">
                    <X size={16} className="text-txt3" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="space-y-2">
                    <label className="text-[8px] text-txt3 uppercase tracking-[2px] font-bold">Script Name</label>
                    <input 
                      className="w-full bg-bg1 border border-bd rounded-xl p-3 text-xs text-txt outline-none focus:border-primary transition-colors font-bold"
                      value={newScript.name}
                      onChange={e => setNewScript({...newScript, name: e.target.value})}
                      placeholder="e.g. Build Production"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] text-txt3 uppercase tracking-[2px] font-bold">CLI Command</label>
                    <input 
                      className="w-full bg-bg1 border border-bd rounded-xl p-3 text-xs text-txt outline-none focus:border-primary transition-colors font-mono"
                      value={newScript.cmd}
                      onChange={e => setNewScript({...newScript, cmd: e.target.value})}
                      placeholder="npm run build"
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
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-black font-black text-[10px] tracking-[3px] rounded-xl mt-4 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
                  >
                    SAVE TO SIDEBAR
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
            <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-primary/5 animate-pulse" />
              <Zap size={40} className="text-primary relative z-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-txt font-bold tracking-[5px] uppercase text-sm">X11 GUI Bridge</h2>
              <p className="text-txt3 text-[10px] max-w-[240px] leading-relaxed">
                Connect to a high-performance X11 server to run Linux GUI apps (VS Code, Firefox, etc.) directly in your rig.
              </p>
            </div>
            
            <div className="bg-bg1 border border-bd rounded-lg p-4 w-full max-w-sm space-y-3">
              <div className="flex items-center gap-2 text-[8px] text-primary font-bold tracking-widest uppercase">
                <Zap size={10} />
                <span>Manual Setup Instructions</span>
              </div>
              <div className="bg-black rounded p-3 font-mono text-[9px] text-green-primary text-left break-all">
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
              className="px-8 h-12 bg-primary text-black font-bold text-[10px] tracking-[4px] rounded-xl hover:opacity-90 transition-opacity"
            >
              START X11 SERVER
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="h-8 bg-bg2 border-b border-bd flex items-center px-3 justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-primary animate-pulse" />
                <span className="text-[8px] text-txt3 font-mono uppercase tracking-widest">X11:1 · 1920x1080 · 60FPS</span>
              </div>
              <button 
                onClick={() => setIsX11Active(false)}
                className="text-[8px] text-red-500 font-bold hover:underline"
              >
                DISCONNECT
              </button>
            </div>
            <div className="flex-1 bg-[#1a1a1a] flex items-center justify-center relative group">
              {/* Simulated Desktop / VNC View */}
              <div className="w-full h-full bg-[url('https://picsum.photos/seed/circuit/1920/1080')] bg-cover bg-center opacity-40" />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <Monitor size={64} className="text-white/10 mb-4" />
                <span className="text-white/20 font-mono text-xs tracking-[5px]">DISPLAY_STREAM_ACTIVE</span>
              </div>
              
              {/* Floating Controls */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="h-8 px-4 bg-black/80 border border-white/10 rounded text-[9px] text-white font-bold tracking-widest">KEYBOARD</button>
                <button className="h-8 px-4 bg-black/80 border border-white/10 rounded text-[9px] text-white font-bold tracking-widest">MOUSE</button>
                <button className="h-8 px-4 bg-black/80 border border-white/10 rounded text-[9px] text-white font-bold tracking-widest">RESIZE</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const migrateShellOutput = () => {
    // In a real app, we'd get the actual terminal content. 
    // For this demo, we'll use a placeholder or the last command.
    const content = "Terminal Output Migration\n---\n" + monitorLogs.join('\n');
    migrateIdea(content);
  };

  const renderHub = () => {
    const tabLabels: Record<string, string> = {
      explorer: 'Explorer',
      terminal: 'Sessions',
      scripts: 'Forge',
      settings: 'Config'
    };

    return (
      <div className="flex flex-1 overflow-hidden relative bg-bg">
        {/* Unified System Rail */}
        <AnimatePresence>
          {showFileRail && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-r border-bd bg-bg1 flex flex-col shrink-0 overflow-hidden shadow-2xl z-40"
            >
              {/* Sidebar Header */}
              <div className="h-12 flex items-center justify-between px-4 border-b border-bd shrink-0 bg-bg2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(255,176,0,0.4)]" />
                  <span className="text-[10px] tracking-[4px] text-txt font-black uppercase">
                    {tabLabels[sidebarTab] || 'System Rail'}
                  </span>
                </div>
                <button onClick={() => setShowFileRail(false)} className="p-1.5 hover:bg-bd rounded-lg transition-colors">
                  <ChevronLeft size={16} className="text-txt3" />
                </button>
              </div>

              {/* Sidebar Tabs Selector */}
              <div className="flex border-b border-bd bg-bg">
                {[
                  { id: 'explorer', icon: <FolderOpen size={14} />, label: 'Files' },
                  { id: 'terminal', icon: <TerminalIcon size={14} />, label: 'Shell' },
                  { id: 'scripts', icon: <Zap size={14} />, label: 'Forge' },
                  { id: 'settings', icon: <Settings size={14} />, label: 'Config' }
                ].map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => setSidebarTab(tab.id as any)}
                    className={`flex-1 flex flex-col items-center justify-center py-2 gap-1 transition-all ${sidebarTab === tab.id ? 'text-primary bg-primary/5' : 'text-txt3 hover:text-txt hover:bg-bg2'}`}
                  >
                    {tab.icon}
                    <span className="text-[6px] font-black uppercase tracking-widest">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Sidebar Content */}
              <div className="flex-1 overflow-y-auto no-scrollbar">
                {sidebarTab === 'explorer' && renderExplorerContent()}
                {sidebarTab === 'terminal' && renderTerminalContent()}
                {sidebarTab === 'scripts' && renderScriptsContent()}
                {sidebarTab === 'settings' && (
                  <div className="p-4 space-y-6">
                    <div className="space-y-4">
                      <div className="text-[8px] text-txt3 uppercase tracking-widest font-bold">Quick Actions</div>
                      <button 
                        onClick={() => setCurPage('settings')}
                        className={`w-full h-10 border rounded-lg text-[9px] font-bold tracking-widest transition-colors ${curPage === 'settings' ? 'bg-primary text-black border-primary' : 'bg-bg2 border-bd text-txt hover:border-primary'}`}
                      >
                        {curPage === 'settings' ? 'BACK TO WORKSPACE' : 'OPEN FULL SETTINGS'}
                      </button>
                      <button 
                        onClick={() => setCurPage(curPage === 'display' ? 'hub' : 'display')}
                        className={`w-full h-10 border rounded-lg text-[9px] font-bold tracking-widest transition-colors ${curPage === 'display' ? 'bg-primary text-black border-primary' : 'bg-bg2 border-bd text-txt hover:border-primary'}`}
                      >
                        {curPage === 'display' ? 'EXIT GUI MODE' : 'OPEN GUI DISPLAY'}
                      </button>
                    </div>
                    <div className="h-px bg-bd/50" />
                    <div className="space-y-4">
                      <div className="text-[8px] text-txt3 uppercase tracking-widest font-bold">Theme Engine</div>
                      <div className="grid grid-cols-4 gap-2">
                        {['#FFB000', '#00E5FF', '#FF00E5', '#00FF66'].map(c => (
                          <button 
                            key={c}
                            onClick={() => setPrimaryColor(c)}
                            className="w-full aspect-square rounded-full border-2 border-bd"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar Footer */}
              <div className="p-4 bg-bg2 border-t border-bd">
                <div className="flex items-center justify-between text-[8px] text-txt3 font-bold uppercase tracking-widest mb-2">
                  <span>System Health</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-green-primary" />
                </div>
                <div className="space-y-1.5 opacity-50">
                  <div className="h-1 bg-bd rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-[45%]" />
                  </div>
                  <div className="h-1 bg-bd rounded-full overflow-hidden">
                    <div className="h-full bg-blue-primary w-[62%]" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 flex flex-col overflow-hidden relative">
          {/* Main Content Workspace */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {curPage === 'settings' ? (
              <div className="flex-1 overflow-y-auto p-6 bg-bg">
                {renderSettings()}
              </div>
            ) : curPage === 'display' ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {renderDisplay()}
              </div>
            ) : curPage === 'shell' ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {renderShell(true)}
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 min-h-0 relative flex flex-col">
                  {renderEditor(true)}
                </div>
              </div>
            )}
          </div>

          {/* Unified Header (Moved to Bottom) */}
          <div className="h-12 bg-bg1 border-t border-bd flex items-center shrink-0 overflow-hidden shadow-sm pb-[env(safe-area-inset-bottom,0px)]">
            {!showFileRail && (
              <button 
                onClick={() => setShowFileRail(true)}
                className="p-3 text-txt3 hover:text-primary transition-colors shrink-0"
              >
                <Menu size={18} />
              </button>
            )}
            
            {curPage === 'hub' || curPage === 'shell' ? (
              <div className="flex-1 flex overflow-x-auto no-scrollbar h-full">
                {curPage === 'hub' && curFileIdx >= 0 && curFileIdx < files.length && (
                  <div 
                    className="flex items-center gap-2 px-4 text-[11px] font-bold tracking-widest cursor-pointer border-r border-bd min-w-[120px] transition-all shrink-0 relative group text-primary bg-bg"
                  >
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary shadow-[0_0_10px_rgba(255,176,0,0.5)]" />
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: files[curFileIdx].color }}></div>
                    <span className="truncate max-w-[80px]">{files[curFileIdx].name}</span>
                    <X 
                      size={12} 
                      className="ml-auto opacity-0 group-hover:opacity-100 hover:text-red-primary transition-all" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurFileIdx(-1);
                      }}
                    />
                  </div>
                )}
                {curPage === 'shell' && (
                  <div
                    className="flex items-center gap-2 px-4 text-[11px] font-bold tracking-widest cursor-pointer border-r border-bd min-w-[120px] transition-all shrink-0 relative group text-primary bg-bg"
                  >
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary shadow-[0_0_10px_rgba(255,176,0,0.5)]" />
                    <TerminalIcon size={12} />
                    <span>TERMINAL</span>
                    <X 
                      size={12} 
                      className="ml-auto opacity-0 group-hover:opacity-100 hover:text-red-primary transition-all" 
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurPage('hub');
                        setCurFileIdx(-1);
                      }}
                    />
                  </div>
                )}
                <button 
                  onClick={() => {
                    const name = `untitled-${files.length + 1}.txt`;
                    setFiles([...files, { 
                      name, 
                      lang: 'txt', 
                      color: 'var(--color-txt3)', 
                      raw: '' 
                    }]);
                    setCurFileIdx(files.length);
                    setCurPage('hub');
                  }} 
                  className="flex items-center justify-center w-10 shrink-0 text-txt3 hover:text-txt hover:bg-bg2/50 transition-all border-r border-bd"
                  title="New Note"
                >
                  <Plus size={14} />
                </button>
              </div>
            ) : (
              <div className="flex-1 flex items-center px-4">
                <span className="text-[11px] font-black tracking-widest text-primary uppercase">
                  {curPage === 'settings' ? 'Settings' : curPage === 'display' ? 'GUI Monitor' : curPage}
                </span>
              </div>
            )}

            <div className="flex items-center px-2 gap-1 border-l border-bd bg-bg1 shadow-[-10px_0_15px_rgba(0,0,0,0.2)] shrink-0">
              {(curPage === 'hub' || curPage === 'shell') && (
                <>
                  <button onClick={saveFile} className={`p-2 rounded hover:bg-bg2 transition-all ${isModified ? 'text-primary animate-pulse' : 'text-txt3'}`} title="Save">
                    <Save size={16} />
                  </button>
                </>
              )}
              <button onClick={() => setIsChatHubOpen(true)} className="p-2 rounded hover:bg-bg2 transition-all text-txt3 hover:text-primary" title="Chat Hub">
                <Sparkles size={16} />
              </button>
              <button onClick={() => setCurPage(curPage === 'settings' ? 'hub' : 'settings')} className={`p-2 rounded hover:bg-bg2 transition-all ${curPage === 'settings' ? 'text-primary' : 'text-txt3'}`} title="Settings">
                <Settings size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatWorking) return;

    const userMsg: Message = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatWorking(true);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [...chatMessages, userMsg].map(m => ({
          role: m.role === 'ai' ? 'model' : m.role,
          parts: [{ text: m.content }]
        })),
        config: {
          systemInstruction: "You are T2I :: SOVEREIGN, a powerful AI orchestration rig. You assist the user with coding, system administration, and AI orchestration. Be concise, technical, and efficient. If the user is stuck, suggest checking service status (pkg install, ollama serve), verifying AI endpoints in settings, and checking git synchronization."
        }
      });

      const aiMsg: Message = { role: 'ai', content: response.text || 'No response.' };
      setChatMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error('Chat failed', err);
      setChatMessages(prev => [...prev, { role: 'ai', content: 'Error: Failed to connect to AI.' }]);
    } finally {
      setIsChatWorking(false);
    }
  };

  const migrateIdea = (content: string) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    let found = false;
    const newFiles = [...files];

    while ((match = codeBlockRegex.exec(content)) !== null) {
      const lang = match[1] || 'txt';
      const code = match[2];
      const ext = lang === 'javascript' || lang === 'js' ? 'js' : 
                  lang === 'typescript' || lang === 'ts' ? 'ts' : 
                  lang === 'python' || lang === 'py' ? 'py' : 
                  lang === 'html' ? 'html' :
                  lang === 'css' ? 'css' :
                  lang === 'json' ? 'json' : 'txt';
      
      const name = `idea_${newFiles.length}.${ext}`;
      
      newFiles.push({
        name,
        lang: lang === 'js' ? 'javascript' : lang === 'ts' ? 'typescript' : lang === 'py' ? 'python' : lang,
        color: '#FFB000',
        raw: code
      });
      setNotifications(prev => [...prev, { id: Date.now().toString(), message: `Migrated: ${name}` }]);
      found = true;
    }

    if (!found) {
      const name = `idea_${newFiles.length}.txt`;
      newFiles.push({
        name,
        lang: 'text',
        color: '#FFB000',
        raw: content
      });
      setNotifications(prev => [...prev, { id: Date.now().toString(), message: `Migrated: ${name}` }]);
    }

    setFiles(newFiles);
    setCurFileIdx(newFiles.length - 1);
    setCurPage('hub');
    setIsChatHubOpen(false);
  };

  const renderChatHub = () => {
    return (
      <AnimatePresence>
        {isChatHubOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed inset-y-0 right-0 w-80 bg-bg border-l border-bd z-[60] flex flex-col shadow-2xl"
          >
            <div className="h-11 border-b border-bd flex items-center justify-between px-4 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-primary rounded-md flex items-center justify-center">
                  <Cpu size={12} className="text-black" />
                </div>
                <span className="text-[10px] font-bold tracking-[2px] uppercase">Sovereign</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setChatMessages([{ role: 'ai', content: 'Chat history cleared. How can I assist you today?' }])}
                  className="p-1.5 text-txt3 hover:text-red-500 transition-colors"
                  title="Clear Chat"
                >
                  <Trash2 size={14} />
                </button>
                <button onClick={() => setIsChatHubOpen(false)} className="text-txt3 hover:text-txt">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[90%] p-3 rounded-lg text-[11px] leading-relaxed relative group ${
                    m.role === 'user' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-bg2 text-txt border border-bd'
                  }`}>
                    {m.content}
                    {m.role === 'ai' && (
                      <button 
                        onClick={() => migrateIdea(m.content)}
                        className="absolute -bottom-2 -right-2 bg-primary text-black text-[8px] font-bold px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                      >
                        <ArrowUpRight size={10} /> MIGRATE
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {isChatWorking && (
                <div className="flex items-center gap-2 text-txt3 text-[10px] animate-pulse">
                  <Sparkles size={12} className="animate-spin" />
                  <span>Sovereign is thinking...</span>
                </div>
              )}
            </div>
            <form onSubmit={handleChatSubmit} className="p-4 border-t border-bd bg-bg1">
              <div className="relative">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask Sovereign..."
                  className="w-full bg-bg border border-bd rounded-lg py-2 pl-3 pr-10 text-[11px] outline-none focus:border-primary transition-colors"
                />
                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-primary hover:scale-110 transition-transform">
                  <Send size={14} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  const renderSettings = () => {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin bg-bg p-4 space-y-6">
        {/* TUI Status Dashboard */}
        <div className="bg-bg1 border border-bd rounded-xl overflow-hidden shadow-lg">
          <div className="h-10 bg-bg2 border-b border-bd flex items-center px-4 gap-2">
            <Monitor size={14} className="text-green-primary" />
            <span className="text-[10px] tracking-[3px] text-txt uppercase font-bold">System Dashboard</span>
          </div>
          <div className="p-4 bg-black font-mono text-[9px] space-y-1">
            <div className="flex justify-between border-b border-bd/30 pb-1 mb-2">
              <span className="text-txt3">SYSTEM: SOVEREIGN-RIG-V13</span>
              <span className="text-green-primary">ONLINE</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <div className="flex justify-between">
                <span className="text-txt3">CPU:</span>
                <span className="text-txt">12.4%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-txt3">MEM:</span>
                <span className="text-txt">1.2GB / 8GB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-txt3">TUNNEL:</span>
                <span className={authToken ? "text-primary" : "text-red-500"}>{authToken ? "CONNECTED" : "DISCONNECTED"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-txt3">UPTIME:</span>
                <span className="text-txt">04:22:11</span>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-bd/30">
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-green-primary animate-pulse" />
                <span className="text-[8px] text-green-primary/70">T2I_TUNNEL: LISTENING ON PORT 8080</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                <span className="text-[8px] text-primary/70">WEBHOOK: READY FOR INCOMING PAYLOADS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Troubleshooting Section */}
        <div className="bg-bg1 border border-bd rounded-xl overflow-hidden shadow-lg">
          <div className="h-10 bg-bg2 border-b border-bd flex items-center px-4 gap-2">
            <Shield size={14} className="text-primary" />
            <span className="text-[10px] tracking-[3px] text-txt uppercase font-bold">Troubleshooting</span>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between p-3 bg-bg rounded border border-bd">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-txt">Backend Connectivity</span>
                <span className="text-[8px] text-txt3 uppercase tracking-widest">Socket.io Bridge Status</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-primary animate-pulse" />
                <span className="text-[9px] font-mono text-green-primary">CONNECTED</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => {
                  setNotifications(prev => [...prev, { id: Date.now().toString(), message: "Running system check..." }]);
                  setTimeout(() => {
                    setNotifications(prev => [...prev, { id: Date.now().toString(), message: "All services operational." }]);
                  }, 2000);
                }}
                className="h-9 bg-bg border border-bd rounded text-[9px] font-bold tracking-widest hover:bg-bg2 transition-colors uppercase"
              >
                Run Health Check
              </button>
              <button 
                onClick={() => {
                  setNotifications(prev => [...prev, { id: Date.now().toString(), message: "Refreshing AI Endpoints..." }]);
                  endpoints.forEach(ep => syncModels(ep));
                }}
                className="h-9 bg-bg border border-bd rounded text-[9px] font-bold tracking-widest hover:bg-bg2 transition-colors uppercase"
              >
                Sync All Endpoints
              </button>
            </div>
            <div className="p-3 bg-black/40 rounded border border-bd/50 space-y-2">
              <div className="flex items-center gap-2 text-[8px] text-primary font-bold tracking-widest uppercase">
                <Zap size={10} /> Quick Fixes
              </div>
              <div className="space-y-1">
                <button 
                  onClick={() => socketsRef.current[activeShellId]?.emit('terminal:input', 'pkg install\n')}
                  className="w-full text-left text-[9px] text-txt3 hover:text-txt font-mono"
                >
                  {'>'} Run 'pkg install'
                </button>
                <button 
                  onClick={() => socketsRef.current[activeShellId]?.emit('terminal:input', 'ollama serve\n')}
                  className="w-full text-left text-[9px] text-txt3 hover:text-txt font-mono"
                >
                  {'>'} Run 'ollama serve'
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bridge Configuration */}
        <div className="bg-bg1 border border-bd rounded-xl overflow-hidden shadow-lg">
          <div className="h-10 bg-bg2 border-b border-bd flex items-center px-4 gap-2">
            <Globe size={14} className="text-primary" />
            <span className="text-[10px] tracking-[3px] text-txt uppercase font-bold">Bridge Configuration</span>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-txt uppercase tracking-widest">Enable Bridge</span>
                <span className="text-[8px] text-txt3 uppercase tracking-widest">Connect to remote rig</span>
              </div>
              <button 
                onClick={() => setBridgeConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                className={`w-10 h-5 rounded-full relative transition-colors ${bridgeConfig.enabled ? 'bg-primary' : 'bg-bg2 border border-bd'}`}
              >
                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${bridgeConfig.enabled ? 'left-6' : 'left-1'}`} />
              </button>
            </div>
            
            <div className="space-y-2">
              <label className="text-[8px] text-txt3 uppercase tracking-widest font-bold">Bridge URL</label>
              <input 
                type="text" 
                value={bridgeConfig.url}
                onChange={(e) => setBridgeConfig(prev => ({ ...prev, url: e.target.value }))}
                placeholder="https://your-rig-url.com"
                className="w-full h-9 bg-bg border border-bd rounded px-3 text-[10px] text-txt focus:border-primary outline-none font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[8px] text-txt3 uppercase tracking-widest font-bold">Bridge Token (Optional)</label>
              <input 
                type="password" 
                value={bridgeConfig.token}
                onChange={(e) => setBridgeConfig(prev => ({ ...prev, token: e.target.value }))}
                placeholder="Bearer Token"
                className="w-full h-9 bg-bg border border-bd rounded px-3 text-[10px] text-txt focus:border-primary outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* System Management Section */}
        <div className="bg-bg1 border border-bd rounded-xl overflow-hidden shadow-lg">
          <div className="h-10 bg-bg2 border-b border-bd flex items-center px-4 gap-2">
            <Cpu size={14} className="text-green-primary" />
            <span className="text-[10px] tracking-[3px] text-txt uppercase font-bold">System Management</span>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between p-3 bg-bg2 border border-bd2 rounded-lg">
              <div className="flex flex-col">
                <span className="text-[10px] text-txt font-bold tracking-wider">X11 GUI BRIDGE</span>
                <span className="text-[8px] text-txt3 uppercase tracking-widest">Toggle X11 socket for GUI apps</span>
              </div>
              <button 
                onClick={() => {
                  setIsX11Active(!isX11Active);
                  setNotifications(prev => [...prev, { id: Math.random().toString(), message: `X11 Bridge ${!isX11Active ? 'Enabled' : 'Disabled'}` }]);
                }}
                className={`w-10 h-5 rounded-full relative transition-colors ${isX11Active ? 'bg-primary' : 'bg-bd'}`}
              >
                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${isX11Active ? 'left-6' : 'left-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 bg-bg2 border border-bd2 rounded-lg">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-txt font-bold tracking-wider">PROOT GUEST SANDBOX</span>
                  <span className="text-[7px] px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 rounded font-bold">UNROOTED</span>
                </div>
                <span className="text-[8px] text-txt3 uppercase tracking-widest">Isolated Ubuntu/Arch environment</span>
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
                <div className="flex items-center justify-between text-[8px] font-mono">
                  <span className="text-green-primary">GUEST_OS: UBUNTU_22.04</span>
                  <span className="text-txt3">VNC_PORT: 5901</span>
                </div>
                <div className="h-1 bg-bd rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 2 }}
                    className="h-full bg-green-primary"
                  />
                </div>
                <p className="text-[7px] text-txt3 italic">Sandbox is isolated from host system. Use for experimental dev.</p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Custom Endpoints Section */}
        <div className="bg-bg1 border border-bd rounded-xl overflow-hidden shadow-lg">
          <div className="h-10 bg-bg2 border-b border-bd flex items-center px-4 justify-between">
            <div className="flex items-center gap-2">
              <Box size={14} className="text-primary" />
              <span className="text-[10px] tracking-[3px] text-txt uppercase font-bold">Custom Endpoints</span>
            </div>
          </div>
          <div className="p-4 space-y-4">
            {endpoints.filter(e => !e.isProvider).map(api => (
              <div key={api.id} className="bg-bg2 border border-bd2 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg text-green-primary">{api.icon || '⚡'}</span>
                  <span className="text-[11px] text-txt font-bold flex-1 uppercase tracking-wider">{api.name}</span>
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/40 border border-bd/30">
                    <div className={`w-1.5 h-1.5 rounded-full ${api.status === 'ONLINE' ? 'bg-green-primary animate-pulse' : api.status === 'OFFLINE' ? 'bg-red-500' : 'bg-txt3'}`} />
                    <span className={`text-[7px] font-bold tracking-widest ${api.status === 'ONLINE' ? 'text-green-primary' : api.status === 'OFFLINE' ? 'text-red-500' : 'text-txt3'}`}>
                      {api.status || 'IDLE'}
                    </span>
                  </div>
                  {(api.apiKey || api.secondaryToken) && (
                    <span className="text-[7px] px-1 bg-green-primary/10 text-green-primary border border-green-primary/20 rounded font-bold">SECURED</span>
                  )}
                  <span className="text-[8px] px-2 py-0.5 rounded border border-primary/30 text-primary uppercase font-bold tracking-tighter">{api.type}</span>
                </div>
                {editingEndpoint === api.id ? (
                  <div className="space-y-2 mt-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        className="bg-bg text-txt border border-bd2 text-[10px] p-2 rounded outline-none focus:border-primary"
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
                        className="bg-bg text-txt border border-bd2 text-[10px] p-2 rounded outline-none focus:border-primary"
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
                      className="w-full bg-bg text-txt border border-bd2 text-[10px] p-2 rounded outline-none focus:border-primary"
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
                      className="w-full bg-bg text-txt border border-bd2 text-[10px] p-2 rounded outline-none focus:border-primary"
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
                        className="w-full bg-bg text-txt border border-bd2 text-[10px] p-2 rounded outline-none focus:border-primary font-mono h-16 resize-none"
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
                        className="w-full bg-bg text-txt border border-bd2 text-[10px] p-2 rounded outline-none focus:border-primary font-mono"
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
                    <input 
                      className="w-full bg-bg text-txt border border-bd2 text-[10px] p-2 rounded outline-none focus:border-primary"
                      value={api.quantization}
                      onChange={(e) => {
                        const next = [...endpoints];
                        const idx = next.findIndex(x => x.id === api.id);
                        next[idx].quantization = e.target.value;
                        setEndpoints(next);
                      }}
                      placeholder="Quantization (e.g. Q4_K_M)"
                    />
                    <textarea 
                      className="w-full bg-bg text-txt border border-bd2 text-[10px] p-2 rounded outline-none focus:border-primary font-mono h-16 resize-none"
                      value={api.config}
                      onChange={(e) => {
                        const next = [...endpoints];
                        const idx = next.findIndex(x => x.id === api.id);
                        next[idx].config = e.target.value;
                        setEndpoints(next);
                      }}
                      placeholder="Custom Config (JSON/AirLLM)"
                    />
                    <button 
                      className="w-full h-8 bg-primary text-black text-[9px] font-bold tracking-wider rounded"
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
                    <div className="text-[9px] text-txt3 font-mono">{api.host}:{api.port} · {api.model || 'No Model'}</div>
                    {discoveredModels[api.id] && discoveredModels[api.id].length > 0 && (
                      <div className="mt-2">
                        <label className="text-[7px] text-txt3 uppercase tracking-widest mb-1 block">Select Model</label>
                        <select 
                          className="w-full bg-bg border border-bd rounded p-1.5 text-[9px] text-txt outline-none focus:border-primary font-mono"
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
                      <div className="text-[8px] text-primary mt-1 font-mono uppercase tracking-tighter">
                        Container: {api.containerId}
                      </div>
                    )}
                    {api.sshKey && (
                      <div className="text-[8px] text-green-primary mt-1 font-mono uppercase tracking-tighter">
                        SSH Key: Configured
                      </div>
                    )}
                    {api.notes && <div className="text-[8px] text-txt3 mt-1 italic">"{api.notes}"</div>}
                    <div className="flex gap-2 mt-3">
                      <button 
                        className="flex-1 h-8 border border-bd2 text-txt2 text-[9px] tracking-wider rounded hover:border-primary hover:text-primary transition-colors uppercase font-bold"
                        onClick={() => setEditingEndpoint(api.id)}
                      >
                        EDIT
                      </button>
                      <button 
                        className="flex-1 h-8 bg-primary text-black text-[9px] font-bold tracking-wider rounded hover:opacity-80 transition-opacity uppercase"
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
              className="w-full h-12 border border-dashed border-primary/50 text-primary text-[10px] font-bold tracking-[4px] rounded-xl hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
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
                    <span className="text-[10px] font-bold uppercase tracking-[3px] text-txt">Add New Endpoint</span>
                  </div>
                  <X size={16} className="text-txt3 cursor-pointer hover:text-txt" onClick={() => setIsAddingEndpoint(false)} />
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="space-y-1 shrink-0">
                      <label className="text-[8px] text-txt3 uppercase tracking-widest">Icon</label>
                      <div className="grid grid-cols-5 gap-1 bg-bg border border-bd p-1 rounded">
                        {['⚡', '◉', '⬡', '◈', '▣', '◎', '⚙', '⚗', '🔒', '🛡️'].map(icon => (
                          <button 
                            key={icon}
                            onClick={() => setNewEndpoint({...newEndpoint, icon})}
                            className={`w-6 h-6 flex items-center justify-center text-xs rounded transition-colors ${newEndpoint.icon === icon ? 'bg-blue-primary text-black' : 'text-txt3 hover:text-txt'}`}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-[8px] text-txt3 uppercase tracking-widest">Name</label>
                      <input 
                        className="w-full bg-bg border border-bd rounded p-2 text-[10px] text-txt outline-none focus:border-green-primary"
                        value={newEndpoint.name}
                        onChange={e => setNewEndpoint({...newEndpoint, name: e.target.value})}
                        placeholder="My Custom Server"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] text-txt3 uppercase tracking-widest">Type</label>
                    <select 
                      className="w-full bg-bg border border-bd rounded p-2 text-[10px] text-txt outline-none focus:border-green-primary"
                      value={newEndpoint.type}
                      onChange={e => setNewEndpoint({...newEndpoint, type: e.target.value})}
                    >
                      <option value="API">Generic API</option>
                      <option value="Ollama">Ollama</option>
                      <option value="LM Studio">LM Studio</option>
                      <option value="Vercel">Vercel AI</option>
                      <option value="OpenRouter">OpenRouter</option>
                      <option value="Docker">Docker Container</option>
                      <option value="SSH Tunneling">SSH Tunneling</option>
                      <option value="SSH + Docker">SSH + Docker</option>
                      <option value="Compute">Compute</option>
                      <option value="Terminal Debug">Terminal Debug</option>
                      <option value="WSL">WSL</option>
                      <option value="T2I Hub">T2I Hub</option>
                      <option value="Telegram Token">Telegram Token</option>
                      <option value="Chat Bot Agent">Chat Bot Agent</option>
                      <option value="MCP">MCP</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 space-y-1">
                      <label className="text-[8px] text-txt3 uppercase tracking-widest">Host</label>
                      <input 
                        className="w-full bg-bg border border-bd rounded p-2 text-[10px] text-txt outline-none focus:border-green-primary font-mono"
                        value={newEndpoint.host}
                        onChange={e => setNewEndpoint({...newEndpoint, host: e.target.value})}
                        placeholder="localhost"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] text-txt3 uppercase tracking-widest">Port</label>
                      <input 
                        className="w-full bg-bg border border-bd rounded p-2 text-[10px] text-txt outline-none focus:border-green-primary font-mono"
                        value={newEndpoint.port}
                        onChange={e => setNewEndpoint({...newEndpoint, port: e.target.value})}
                        placeholder="11434"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] text-txt3 uppercase tracking-widest">Model (optional)</label>
                    <input 
                      className="w-full bg-bg border border-bd rounded p-2 text-[10px] text-txt outline-none focus:border-green-primary font-mono"
                      value={newEndpoint.model}
                      onChange={e => setNewEndpoint({...newEndpoint, model: e.target.value})}
                      placeholder="qwen3.5:0.8b"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] text-txt3 uppercase tracking-widest">API Key (optional)</label>
                    <input 
                      type="password"
                      className="w-full bg-bg border border-bd rounded p-2 text-[10px] text-txt outline-none focus:border-green-primary font-mono"
                      value={newEndpoint.apiKey}
                      onChange={e => setNewEndpoint({...newEndpoint, apiKey: e.target.value})}
                      placeholder="••••••••••••"
                    />
                  </div>

                  {(newEndpoint.type === 'SSH Tunneling' || newEndpoint.type === 'SSH + Docker') && (
                    <div className="space-y-1">
                      <label className="text-[8px] text-txt3 uppercase tracking-widest">SSH Private Key (optional)</label>
                      <textarea 
                        className="w-full bg-bg border border-bd rounded p-2 text-[10px] text-txt outline-none focus:border-green-primary font-mono h-20 resize-none"
                        value={newEndpoint.sshKey}
                        onChange={e => setNewEndpoint({...newEndpoint, sshKey: e.target.value})}
                        placeholder="-----BEGIN RSA PRIVATE KEY-----"
                      />
                    </div>
                  )}

                  {(newEndpoint.type === 'Docker' || newEndpoint.type === 'SSH + Docker') && (
                    <div className="space-y-1">
                      <label className="text-[8px] text-txt3 uppercase tracking-widest">Container ID / Name</label>
                      <input 
                        className="w-full bg-bg border border-bd rounded p-2 text-[10px] text-txt outline-none focus:border-green-primary font-mono"
                        value={newEndpoint.containerId}
                        onChange={e => setNewEndpoint({...newEndpoint, containerId: e.target.value})}
                        placeholder="e.g. t2i-terminal-rig"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[8px] text-txt3 uppercase tracking-widest">Quantization (optional)</label>
                    <input 
                      className="w-full bg-bg border border-bd rounded p-2 text-[10px] text-txt outline-none focus:border-green-primary font-mono"
                      value={newEndpoint.quantization}
                      onChange={e => setNewEndpoint({...newEndpoint, quantization: e.target.value})}
                      placeholder="e.g. Q4_K_M, airllm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] text-txt3 uppercase tracking-widest">Secondary Token / Password (optional)</label>
                    <input 
                      type="password"
                      className="w-full bg-bg border border-bd rounded p-2 text-[10px] text-txt outline-none focus:border-green-primary font-mono"
                      value={newEndpoint.secondaryToken}
                      onChange={e => setNewEndpoint({...newEndpoint, secondaryToken: e.target.value})}
                      placeholder="••••••••••••"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] text-txt3 uppercase tracking-widest">Custom Config (optional)</label>
                    <textarea 
                      className="w-full bg-bg border border-bd rounded p-2 text-[10px] text-txt outline-none focus:border-green-primary font-mono h-20 resize-none"
                      value={newEndpoint.config}
                      onChange={e => setNewEndpoint({...newEndpoint, config: e.target.value})}
                      placeholder="e.g. { 'airllm': true, 'webhook': '...' }"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] text-txt3 uppercase tracking-widest">Notes</label>
                    <textarea 
                      className="w-full bg-bg border border-bd rounded p-2 text-[10px] text-txt outline-none focus:border-green-primary h-20 resize-none"
                      value={newEndpoint.notes}
                      onChange={e => setNewEndpoint({...newEndpoint, notes: e.target.value})}
                      placeholder="Additional details..."
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={() => setIsAddingEndpoint(false)}
                      className="flex-1 h-10 border border-bd2 text-txt2 font-bold text-[10px] tracking-widest rounded-lg"
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
                      className="flex-1 h-10 bg-green-primary text-black font-bold text-[10px] tracking-widest rounded-lg"
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
            <span className="text-[10px] tracking-[3px] text-txt uppercase font-bold">Tunnel & Webhook Settings</span>
          </div>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-[8px] text-txt3 uppercase tracking-widest">Auth Token (T2I/QR)</label>
              <div className="flex gap-2">
                <input 
                  type="password"
                  className="flex-1 bg-bg text-txt border border-bd2 text-[10px] p-2 rounded outline-none focus:border-blue-primary font-mono"
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  placeholder="Enter token or scan QR..."
                />
                <button className="px-3 bg-bg2 border border-bd2 text-txt2 text-[9px] rounded hover:border-blue-primary">
                  SCAN QR
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[8px] text-txt3 uppercase tracking-widest">Termux Webhook URL</label>
              <input 
                className="w-full bg-bg text-txt border border-bd2 text-[10px] p-2 rounded outline-none focus:border-blue-primary font-mono"
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
              className="w-full h-10 bg-blue-primary text-black text-[9px] font-bold tracking-widest rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <RefreshCw size={14} className={isUpdating ? 'animate-spin' : ''} />
              {isUpdating ? 'UPDATING...' : 'GIT UPDATE (PULL)'}
            </button>
          </div>
        </div>

        {/* Privacy & Compliance */}
        <div className="bg-bg1 border border-bd rounded-xl overflow-hidden shadow-lg">
          <div className="h-10 bg-bg2 border-b border-bd flex items-center px-4 gap-2">
            <Lock size={14} className="text-txt3" />
            <span className="text-[10px] tracking-[3px] text-txt uppercase font-bold">Privacy & Compliance</span>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button className="h-10 bg-bg2 border border-bd2 rounded text-[8px] text-txt3 uppercase tracking-widest hover:text-txt transition-colors">Privacy Policy</button>
              <button className="h-10 bg-bg2 border border-bd2 rounded text-[8px] text-txt3 uppercase tracking-widest hover:text-txt transition-colors">Terms of Service</button>
            </div>
            <div className="p-3 bg-black/40 border border-bd2 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[8px] text-txt3 uppercase tracking-widest">Data Usage</span>
                <span className="text-[8px] text-green-primary uppercase font-bold">Local Only</span>
              </div>
              <p className="text-[7px] text-txt3 leading-relaxed">
                SOVEREIGN is designed with a "Local First" philosophy. Your code, keys, and data remain on your device or your private rig. We do not store your data on our servers.
              </p>
            </div>
            <div className="text-center">
              <span className="text-[7px] text-txt3 uppercase tracking-[4px]">Build Version 2.0.4-stable</span>
            </div>
          </div>
        </div>

        {/* Quick Install Reference Section */}
        <div className="bg-bg1 border border-bd rounded-xl overflow-hidden shadow-lg">
          <div className="h-10 bg-bg2 border-b border-bd flex items-center px-4 gap-2">
            <Zap size={14} className="text-yellow-500" />
            <span className="text-[10px] tracking-[3px] text-txt uppercase font-bold">Quick Install Reference</span>
          </div>
          <div className="p-4 space-y-3">
            {[
              { label: 'NPM / NPX', cmd: 'npm install -g t2i-terminal-rig' },
              { label: 'CURL / BASH', cmd: 'curl -fsSL https://get.t2i.ai | bash' },
              { label: 'BUN', cmd: 'bun install -g t2i-terminal-rig' },
              { label: 'APT (Debian/Ubuntu)', cmd: 'sudo apt install t2i' },
              { label: 'TERMUX (Android)', cmd: 'pkg install t2i' },
              { label: 'F-DROID', cmd: 'Search "SOVEREIGN" in F-Droid' }
            ].map((item, i) => (
              <div key={i} className="bg-bg2 border border-bd2 rounded-lg p-2 flex items-center justify-between group">
                <div className="flex flex-col">
                  <span className="text-[7px] text-txt3 uppercase tracking-widest mb-1">{item.label}</span>
                  <code className="text-[9px] text-green-primary font-mono">{item.cmd}</code>
                </div>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(item.cmd);
                    setNotifications(prev => [...prev, { id: Math.random().toString(), message: 'Copied to clipboard' }]);
                  }}
                  className="p-1.5 text-txt3 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
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
      className={`w-full h-[100dvh] bg-bg flex flex-col relative overflow-hidden mx-auto border-x border-bd transition-all duration-500`}
      style={{ 
        maxWidth: isPhoneRatio ? '430px' : '100%',
        '--color-primary': primaryColor 
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
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-mono flex-1">{n.message}</span>
            {n.action && (
              <button 
                onClick={n.action}
                className="px-2 py-1 bg-primary text-black text-[8px] font-bold rounded hover:opacity-80 transition-opacity pointer-events-auto"
              >
                RETRY
              </button>
            )}
          </motion.div>
        ))}
      </div>

      {/* Pages */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 flex flex-col bg-bg">
          {renderHub()}
        </div>
      </div>
      {renderChatHub()}
    </div>
  );
}
