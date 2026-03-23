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
  Activity,
  Zap,
  Globe,
  Trash2,
  FileCode,
  FolderOpen,
  Monitor,
  Wifi,
  WifiOff,
  Edit2,
  Save
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
  const [isNavMinimized, setIsNavMinimized] = useState(false);
  const [curFileIdx, setCurFileIdx] = useState(3);
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
  
  const [primaryColor, setPrimaryColor] = useState('#1a9fff');
  const [isPhoneRatio, setIsPhoneRatio] = useState(true);
  const [freqDivisor, setFreqDivisor] = useState(83.3333);
  const [showFavSidebar, setShowFavSidebar] = useState(true);
  const [showFileRail, setShowFileRail] = useState(true);
  const [monitorExpanded, setMonitorExpanded] = useState<Record<string, boolean>>({
    preview: true,
    resonance: true,
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
  const filesRef = useRef(files);
  useEffect(() => { filesRef.current = files; }, [files]);

  const [shellTabs, setShellTabs] = useState<{id: string, name: string}[]>([
    { id: '1', name: 'forge' },
    { id: '2', name: 'worker' },
    { id: '3', name: 'monitor' }
  ]);
  const [activeShellId, setActiveShellId] = useState('1');
  const [shellInput, setShellInput] = useState('');
  const [favScripts, setFavScripts] = useState([
    { category: 'SCRIPTS', items: [
      { name: 'ollama serve', cmd: 'ollama serve', icon: '◉' },
      { name: 'ollama list', cmd: 'ollama list', icon: '=' },
      { name: 'freq scan', cmd: 'freq scan', icon: '⚡' },
      { name: 'pemf test', cmd: 'pemf test', icon: '◉' },
    ]},
    { category: 'TOOLS', items: [
      { name: 'code-server', cmd: 'code-server', icon: '⬡' },
    ]},
    { category: 'NETWORK', items: [
      { name: 'ngrok :3000', cmd: 'ngrok http 3000', icon: '↻' },
    ]}
  ]);
  
  const [isAddingScript, setIsAddingScript] = useState(false);
  const [newScript, setNewScript] = useState({ name: '', cmd: '', icon: '⚡' });
  const [notifications, setNotifications] = useState<{id: string, message: string}[]>([]);
  
  const [chatMode, setChatMode] = useState<ChatMode>('aider');
  const [ctxActive, setCtxActive] = useState<Set<string>>(new Set(['file']));
  const [discoveredModels, setDiscoveredModels] = useState<Record<string, ModelInfo[]>>({});

  const [endpoints, setEndpoints] = useState<Endpoint[]>([
    { id: '1', name: 'Ollama API', type: 'Ollama', host: 'localhost', port: '11434', proto: 'HTTP', model: 'qwen3.5:0.8b', status: 'LIVE' },
    { id: '2', name: 'Gemini API', type: 'Gemini', host: 'generativelanguage.googleapis.com', port: '443', proto: 'HTTPS', model: 'gemini-3-flash', status: 'API' }
  ]);

  const [editingEndpoint, setEditingEndpoint] = useState<string | null>(null);
  const terminalsRef = useRef<Record<string, Terminal>>({});
  const socketsRef = useRef<Record<string, Socket>>({});
  const terminalContainersRef = useRef<Record<string, HTMLDivElement | null>>({});

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
            cursor: '#1a9fff',
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
        term.writeln('\x1b[34mTermIntel v2 – Reality Forge OS\x1b[0m');
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



  const syncModels = async (endpoint: Endpoint) => {
    try {
      const models = await ProviderSync.getInstance().discoverModels(endpoint);
      setDiscoveredModels(prev => ({ ...prev, [endpoint.id]: models }));
      if (models.length > 0 && !endpoint.model) {
        const next = [...endpoints];
        const idx = next.findIndex(x => x.id === endpoint.id);
        next[idx].model = models[0].id;
        setEndpoints(next);
      }
      terminalsRef.current[activeShellId]?.writeln(`\x1b[32m[OK] Discovered ${models.length} models for ${endpoint.name}\x1b[0m`);
    } catch (e) {
      terminalsRef.current[activeShellId]?.writeln(`\x1b[31m[ERR] Failed to sync models for ${endpoint.name}\x1b[0m`);
    }
  };


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
          color: ext === 'js' ? 'var(--color-yellow-primary)' : ext === 'py' ? 'var(--color-blue-primary)' : 'var(--color-txt2)',
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

  const renderEditor = () => {
    const file = files[curFileIdx];
    const lines = (file && typeof file.raw === 'string') ? file.raw.split('\n') : ["No data available"];
    
    return (
      <div className="flex flex-1 overflow-hidden">
        {/* File Rail (Sidebar) */}
        <AnimatePresence>
          {showFileRail && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 160, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-r border-bd bg-bg flex flex-col shrink-0 overflow-hidden"
            >
              <div className="h-9 flex items-center justify-between px-3 border-b border-bd shrink-0">
                <span className="text-[8px] tracking-[2px] text-txt3 uppercase font-bold">Workspace</span>
                <X size={12} className="text-txt3 cursor-pointer hover:text-blue-primary" onClick={() => setShowFileRail(false)} />
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-hide">
                {files.map((f, i) => (
                  <button 
                    key={i}
                    onClick={() => { setCurFileIdx(i); setIsModified(false); }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded transition-colors group ${i === curFileIdx ? 'bg-blue-primary/10 text-blue-primary' : 'hover:bg-bg2 text-txt3 hover:text-txt'}`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: f.color }}></div>
                    <span className="text-[9px] font-mono truncate">{f.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-col flex-1 overflow-hidden relative">
          {!showFileRail && (
            <button 
              onClick={() => setShowFileRail(true)}
              className="absolute left-2 top-11 z-20 p-1.5 bg-bg border border-bd rounded shadow-xl text-blue-primary hover:scale-110 transition-transform"
            >
              <FolderOpen size={14} />
            </button>
          )}

          {/* Tabs */}
          <div className="h-9 bg-bg1 border-b border-bd flex overflow-x-auto scrollbar-hide shrink-0">
            {files.map((f, i) => (
              <div 
                key={i}
                onClick={() => { setCurFileIdx(i); setIsModified(false); }}
                className={`flex items-center gap-2 px-3 text-[10px] tracking-wider cursor-pointer border-r border-bd min-w-[100px] transition-all shrink-0 ${i === curFileIdx ? 'text-blue-primary bg-bg2 border-b-2 border-b-blue-primary' : 'text-txt3'}`}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: f.color }}></div>
                <span>{f.name}</span>
              </div>
            ))}
            <div className="flex items-center justify-center w-9 text-txt3 cursor-pointer hover:text-txt" onClick={() => {
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
            <label className="flex items-center justify-center w-9 text-txt3 cursor-pointer hover:text-txt border-l border-bd">
              <FolderOpen size={14} />
              <input 
                type="file" 
                className="hidden" 
                {...{ webkitdirectory: "", directory: "" } as any} 
                multiple 
                onChange={handleFolderUpload} 
              />
            </label>
            <div className="flex items-center justify-center px-3 text-[8px] text-blue-primary cursor-pointer hover:bg-blue-primary/10 border-l border-bd font-bold tracking-widest" onClick={simulateAiEdit}>
              <Zap size={12} className="mr-1" /> AI SCAN
            </div>
            <div className={`flex items-center justify-center px-3 text-[8px] cursor-pointer border-l border-bd font-bold tracking-widest ${showPreview ? 'bg-blue-primary text-black' : 'text-txt3 hover:text-txt'}`} onClick={() => setShowPreview(!showPreview)}>
              <Monitor size={12} className="mr-1" /> PREVIEW
            </div>
            <div 
              className="flex items-center justify-center px-3 text-[8px] text-blue-primary cursor-pointer hover:bg-blue-primary/10 border-l border-bd font-bold tracking-widest"
              onClick={() => {
                const next = [...favScripts];
                next[0].items.push({ name: file.name, cmd: `node ${file.name}`, icon: '⚡' });
                setFavScripts(next);
              }}
            >
              <Plus size={12} className="mr-1" /> FAV
            </div>
          </div>
          
          {/* Breadcrumb */}
          <div className="h-6 bg-bg1 border-b border-bd flex items-center px-3 gap-2 shrink-0 text-[8px] text-txt3 uppercase tracking-tighter">
            <span>WORKSPACE › SCRIPTS › {file?.name?.toUpperCase() || 'NONE'}</span>
            <span className="ml-auto">LN {curLine}</span>
            <span className="ml-2">{LANG_LABELS[curFileIdx] || 'TXT'}</span>
          </div>

          {/* Editor Body */}
          <div className="flex flex-1 overflow-hidden relative">
            {!file ? (
              <div className="flex-1 flex items-center justify-center text-txt3 text-[10px] tracking-widest uppercase">
                No file selected
              </div>
            ) : (
              <>
                <div className="w-10 bg-bg1 border-r border-bd py-2 text-right pr-2 text-[10px] text-txt3 leading-relaxed shrink-0 select-none">
                  {lines.map((_, i) => (
                    <div key={i} className={i === curLine - 1 ? 'text-blue-primary' : ''}>{i + 1}</div>
                  ))}
                </div>
                <div className="flex-1 overflow-auto scrollbar-thin bg-bg/40 backdrop-blur-md relative">
                  <div className="absolute inset-0 p-2 text-[10px] leading-relaxed font-mono pointer-events-none whitespace-pre overflow-hidden opacity-80">
                    {lines.map((line, i) => (
                      <div key={i} className={i === curLine - 1 ? 'bg-blue-primary/10' : ''}>
                        {highlightCode(line)}
                      </div>
                    ))}
                  </div>
                  <textarea
                    className="w-full h-full p-2 text-[10px] leading-relaxed bg-transparent outline-none resize-none font-mono caret-blue-primary text-transparent selection:bg-blue-primary/30"
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
                  
                  {/* AI Working Preview Overlay */}
                  <AnimatePresence>
                    {aiWorkingOn === curFileIdx && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-blue-primary/5 pointer-events-none flex flex-col items-center justify-center backdrop-blur-[1px] z-20"
                      >
                        <div className="bg-bg1 border border-blue-primary/30 p-4 rounded-lg shadow-2xl max-w-[200px] w-full">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[8px] text-blue-primary font-bold tracking-[2px]">AI WORKING</span>
                            <span className="text-[8px] text-blue-primary font-mono">{aiProgress}%</span>
                          </div>
                          <div className="h-1 bg-bg border border-bd rounded-full overflow-hidden mb-3">
                            <motion.div 
                              className="h-full bg-blue-primary"
                              initial={{ width: 0 }}
                              animate={{ width: `${aiProgress}%` }}
                            />
                          </div>
                          <div className="space-y-1">
                            {aiLog.slice(-3).map((log, i) => (
                              <div key={i} className="text-[7px] text-txt3 font-mono truncate opacity-60">
                                › {log}
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Ghost Edits Effect */}
                        <div className="absolute top-1/4 left-1/4 right-1/4 bottom-1/4 border-2 border-dashed border-blue-primary/20 rounded animate-pulse" />
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
                        <span className="text-[7px] text-txt3 uppercase tracking-widest">Live Preview</span>
                        <X size={10} className="text-txt3 cursor-pointer hover:text-txt" onClick={() => setShowPreview(false)} />
                      </div>
                      <div className="flex-1 p-4 overflow-auto bg-white text-black font-sans text-xs">
                        {file.lang === 'html' || file.name.endsWith('.html') ? (
                          <div dangerouslySetInnerHTML={{ __html: file.raw }} />
                        ) : (
                          <div className="whitespace-pre-wrap font-mono text-[10px] text-txt3 italic">
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
                  <div className="text-[5px] text-txt3 mb-2 uppercase tracking-[2px] opacity-30">MAP</div>
                  <div className="w-full flex-1 overflow-hidden relative opacity-60">
                    {lines.map((line, i) => {
                      let color = 'rgba(255,255,255,0.05)';
                      if (line.trim().startsWith('//')) color = 'var(--color-txt3)';
                      else if (line.includes('const') || line.includes('let') || line.includes('function')) color = 'var(--color-purple-primary)';
                      else if (line.includes('"') || line.includes("'")) color = 'var(--color-green-primary)';
                      else if (line.trim()) color = 'var(--color-txt2)';

                      const indent = line.search(/\S/);
                      const leftPad = indent > 0 ? Math.min(indent * 1, 15) : 0;

                      return (
                        <div key={i} className="flex w-full px-1" style={{ height: '1.5px' }}>
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
              </>
            )}
          </div>

          {/* Vim Bar */}
          <div className={`h-6 flex items-center px-3 gap-3 shrink-0 text-[9px] font-bold transition-colors ${
            vimMode === 'NORMAL' ? 'bg-blue-primary text-black' : 
            vimMode === 'INSERT' ? 'bg-green-primary text-black' : 
            'bg-purple-primary text-white'
          }`}>
            <span className="tracking-widest min-w-[60px]">{vimMode}</span>
            <span className="opacity-80">{file?.name || 'NONE'} {file && (isModified || file.name === '.gitignore') ? '[+]' : ''}</span>
            <span className="ml-auto opacity-50">{curLine}/{lines.length} {Math.round((curLine/lines.length)*100)}%</span>
          </div>
        </div>
      </div>
    );
  };

  const renderShell = () => {
    const addTab = () => {
      const newId = Math.random().toString(36).substr(2, 9);
      setShellTabs(prev => [...prev, { id: newId, name: `shell-${prev.length + 1}` }]);
      setActiveShellId(newId);
    };

    const removeTab = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (shellTabs.length === 1) return;
      setShellTabs(prev => prev.filter(t => t.id !== id));
      if (activeShellId === id) {
        setActiveShellId(shellTabs.find(t => t.id !== id)?.id || '');
      }
      // Cleanup terminal and socket
      terminalsRef.current[id]?.dispose();
      delete terminalsRef.current[id];
      socketsRef.current[id]?.disconnect();
      delete socketsRef.current[id];
    };

    const renameTab = (id: string, newName: string) => {
      setShellTabs(prev => prev.map(t => t.id === id ? { ...t, name: newName } : t));
    };

    return (
      <div className="flex flex-1 overflow-hidden bg-bg1">
        {/* Fav Scripts Sidebar */}
        <AnimatePresence>
          {showFavSidebar && (
            <motion.div 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 180, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-r border-bd bg-bg flex flex-col shrink-0 overflow-hidden"
            >
              <div className="h-8 flex items-center justify-between px-3 border-b border-bd shrink-0">
                <span className="text-[8px] tracking-[2px] text-txt3 uppercase font-bold">Fav Scripts</span>
                <X size={12} className="text-txt3 cursor-pointer hover:text-blue-primary" onClick={() => setShowFavSidebar(false)} />
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-4 scrollbar-hide">
                {favScripts.map(cat => (
                  <div key={cat.category}>
                    <div className="text-[7px] text-txt3 uppercase tracking-widest mb-2 px-1">{cat.category}</div>
                    <div className="space-y-1">
                      {cat.items.map(s => (
                        <button 
                          key={s.name}
                          onClick={() => socketsRef.current[activeShellId]?.emit('terminal:input', s.cmd + '\n')}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-bg2 text-txt3 hover:text-txt transition-colors group"
                        >
                          <span className="text-[10px] group-hover:text-blue-primary">{s.icon}</span>
                          <span className="text-[9px] font-mono truncate">{s.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="mt-4 px-1">
                  <button 
                    onClick={() => setIsAddingScript(true)}
                    className="text-[8px] text-blue-primary hover:underline uppercase tracking-widest"
                  >
                    ＋ add script
                  </button>
                </div>
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
                    : 'border-transparent text-txt3 hover:bg-bg2/50'
                }`}
              >
                <input 
                  className="bg-transparent border-none outline-none text-[9px] font-bold uppercase tracking-widest w-16 text-center"
                  value={tab.name}
                  onChange={(e) => renameTab(tab.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
                <X 
                  size={10} 
                  className="hover:text-red-primary transition-colors" 
                  onClick={(e) => removeTab(tab.id, e)}
                />
              </div>
            ))}
            <button 
              onClick={addTab}
              className="p-1.5 text-txt3 hover:text-blue-primary transition-colors"
            >
              <Plus size={14} />
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
                <div className="text-txt3/10 text-2xl font-black uppercase tracking-[4px] mb-2 text-center px-8">nothing going on cause no fuking work</div>
                <div className="text-txt3/5 text-[8px] uppercase tracking-widest">Type directly to interact</div>
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
                  <span className="text-[10px] font-bold uppercase tracking-widest text-txt">Add Favorite Script</span>
                  <X size={14} className="text-txt3 cursor-pointer hover:text-txt" onClick={() => setIsAddingScript(false)} />
                </div>
                <div className="p-4 space-y-3">
                  <div className="space-y-1">
                    <label className="text-[8px] text-txt3 uppercase tracking-widest">Name</label>
                    <input 
                      className="w-full bg-bg border border-bd rounded p-2 text-[10px] text-txt outline-none focus:border-blue-primary"
                      value={newScript.name}
                      onChange={e => setNewScript({...newScript, name: e.target.value})}
                      placeholder="e.g. build app"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] text-txt3 uppercase tracking-widest">Command</label>
                    <input 
                      className="w-full bg-bg border border-bd rounded p-2 text-[10px] text-txt outline-none focus:border-blue-primary"
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
                    className="w-full h-10 bg-blue-primary text-black font-bold text-[10px] tracking-widest rounded-lg mt-2"
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

  const renderMonitor = () => {
    const toggleExpand = (key: string) => {
      setMonitorExpanded(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
      <div className="flex flex-col flex-1 overflow-hidden bg-bg">
        {/* Top Section: Live Preview & Resonance Monitor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Live Preview */}
          <div className={`flex flex-col border-b border-bd overflow-hidden transition-all duration-300 ${monitorExpanded.preview ? 'flex-1' : 'h-8'}`}>
            <div className="h-8 bg-bg1 border-b border-bd flex items-center px-3 gap-2 shrink-0 cursor-pointer" onClick={() => toggleExpand('preview')}>
              <Globe size={12} className="text-blue-primary" />
              <div className="flex items-center gap-2 flex-1" onClick={e => e.stopPropagation()}>
                <span className="text-[9px] tracking-widest text-txt3 uppercase font-bold shrink-0">Live Preview</span>
                <input 
                  className="bg-bg2/50 border border-bd rounded px-2 py-0.5 text-[8px] text-txt2 font-mono w-full max-w-[200px] outline-none focus:border-blue-primary transition-all"
                  value={previewUrl}
                  onChange={(e) => setPreviewUrl(e.target.value)}
                  placeholder="URL (e.g. /)"
                />
              </div>
              <div className="ml-auto flex gap-2 items-center">
                <div className="w-2 h-2 rounded-full bg-green-primary animate-pulse"></div>
                <span className="text-[8px] text-txt3 uppercase tracking-widest">Live</span>
                <ChevronRight size={10} className={`text-txt3 transition-transform ${monitorExpanded.preview ? 'rotate-90' : ''}`} />
              </div>
            </div>
            {monitorExpanded.preview && (
              <div className="flex-1 bg-white">
                <iframe 
                  src={previewUrl || '/'} 
                  className="w-full h-full border-none"
                  title="Preview"
                />
              </div>
            )}
          </div>

          {/* Frequency Monitor (Resonance Monitor) */}
          <div className={`border-b border-bd flex flex-col overflow-hidden bg-black/20 transition-all duration-300 ${monitorExpanded.resonance ? 'h-40' : 'h-7'}`}>
            <div className="h-7 bg-bg1 border-b border-bd flex items-center px-3 gap-2 shrink-0 cursor-pointer" onClick={() => toggleExpand('resonance')}>
              <Activity size={12} className="text-orange-primary" />
              <span className="text-[9px] tracking-widest text-txt3 uppercase font-bold">Resonance Monitor</span>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[8px] text-blue-primary font-mono">{freqDivisor.toFixed(4)} Hz</span>
                <ChevronRight size={10} className={`text-txt3 transition-transform ${monitorExpanded.resonance ? 'rotate-90' : ''}`} />
              </div>
            </div>
            {monitorExpanded.resonance && (
              <div className="flex-1 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-around px-4 opacity-20">
                  {[...Array(20)].map((_, i) => (
                    <motion.div 
                      key={i}
                      animate={{ height: [10, 40, 10] }}
                      transition={{ duration: 1 + Math.random(), repeat: Infinity, ease: 'easeInOut' }}
                      className="w-0.5 bg-blue-primary"
                    />
                  ))}
                </div>
                <div className="z-10 text-[10px] text-txt3 tracking-[4px] uppercase font-bold">Resonance Active</div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section: Logs (30%) */}
        <div className={`flex flex-col overflow-hidden transition-all duration-300 ${monitorExpanded.logs ? 'h-[30%]' : 'h-7'}`}>
          <div className="h-7 bg-bg1 border-b border-bd flex items-center px-3 gap-2 shrink-0 cursor-pointer" onClick={() => toggleExpand('logs')}>
            <TerminalIcon size={12} className="text-txt3" />
            <span className="text-[9px] tracking-widest text-txt3 uppercase font-bold">System Logs</span>
            <div className="ml-auto flex items-center gap-2" onClick={e => e.stopPropagation()}>
              <button 
                onClick={() => setMonitorLogs([])}
                className="text-[7px] text-txt3 hover:text-blue-primary uppercase tracking-widest border border-bd px-1.5 py-0.5 rounded"
              >
                Clear
              </button>
              <ChevronRight size={10} className={`text-txt3 transition-transform ${monitorExpanded.logs ? 'rotate-90' : ''}`} />
            </div>
          </div>
          
          {monitorExpanded.logs && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-2 font-mono text-[9px] text-green-primary/80 leading-tight scrollbar-hide">
                  {monitorLogs.map((log, i) => (
                    <div key={i} className={log.includes('[RF]') ? 'text-blue-primary' : log.includes('[LOG]') ? 'text-txt2' : ''}>{log}</div>
                  ))}
                  <div className="animate-pulse">_</div>
                  <div ref={logEndRef} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSettings = () => {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin bg-bg p-4 space-y-6">
        {/* AI Endpoints Section */}
        <div className="bg-bg1 border border-bd rounded-xl overflow-hidden shadow-lg">
          <div className="h-10 bg-bg2 border-b border-bd flex items-center px-4 gap-2">
            <Sparkles size={14} className="text-purple-primary" />
            <span className="text-[10px] tracking-[3px] text-txt uppercase font-bold">AI Endpoint Management</span>
          </div>
          <div className="p-4 space-y-4">
            {endpoints.map(api => (
              <div key={api.id} className="bg-bg2 border border-bd2 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${api.type === 'Gemini' ? 'bg-purple-primary' : 'bg-green-primary'}`}></div>
                  <span className="text-[11px] text-txt font-bold flex-1">{api.name}</span>
                  <span className={`text-[8px] px-2 py-0.5 rounded border ${api.type === 'Gemini' ? 'border-purple-primary/30 text-purple-primary' : 'border-green-primary/30 text-green-primary'}`}>{api.type}</span>
                </div>
                {editingEndpoint === api.id ? (
                  <div className="space-y-2 mt-2">
                    <input 
                      className="w-full bg-bg text-txt border border-bd2 text-[10px] p-2 rounded outline-none focus:border-blue-primary"
                      value={api.host}
                      onChange={(e) => {
                        const next = [...endpoints];
                        const idx = next.findIndex(x => x.id === api.id);
                        next[idx].host = e.target.value;
                        setEndpoints(next);
                      }}
                    />
                    <input 
                      className="w-full bg-bg text-txt border border-bd2 text-[10px] p-2 rounded outline-none focus:border-blue-primary"
                      value={api.model}
                      onChange={(e) => {
                        const next = [...endpoints];
                        const idx = next.findIndex(x => x.id === api.id);
                        next[idx].model = e.target.value;
                        setEndpoints(next);
                      }}
                    />
                    <button 
                      className="w-full h-8 bg-blue-primary text-black text-[9px] font-bold tracking-wider rounded"
                      onClick={() => setEditingEndpoint(null)}
                    >
                      SAVE CHANGES
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="text-[9px] text-txt3 font-mono">{api.host} · {api.model}</div>
                    <div className="flex gap-2 mt-3">
                      <button 
                        className="flex-1 h-8 border border-bd2 text-txt2 text-[9px] tracking-wider rounded hover:border-blue-primary hover:text-blue-primary transition-colors"
                        onClick={() => setEditingEndpoint(api.id)}
                      >
                        EDIT CONFIG
                      </button>
                      <button 
                        className="flex-1 h-8 bg-blue-primary text-black text-[9px] font-bold tracking-wider rounded hover:opacity-80 transition-opacity"
                        onClick={() => syncModels(api)}
                      >
                        SYNC MODELS
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            <button className="w-full h-10 border border-dashed border-blue-primary/50 text-blue-primary text-[9px] tracking-widest rounded-lg hover:bg-blue-primary/5 transition-colors">
              ＋ ADD NEW ENDPOINT
            </button>
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
            <span className="text-sm font-mono">{n.message}</span>
          </motion.div>
        ))}
      </div>

      {/* Topbar */}
      <div className="h-11 pt-[env(safe-area-inset-top,0px)] bg-bg1 border-b border-bd flex items-center px-3 gap-2 shrink-0 select-none z-50">
        <span className="text-blue-primary text-xs font-bold tracking-[3px]">TI</span>
        <span className="text-bd3 text-xs">|</span>
        <span className="text-txt2 text-[9px] tracking-wider flex-1 truncate">
          {curPage === 'editor' ? files[curFileIdx].name : 
           curPage === 'shell' ? shellTabs.find(t => t.id === activeShellId)?.name : 
           curPage === 'monitor' ? 'Reality Forge Monitor' : 'System Settings'}
        </span>
        {curPage === 'editor' && (
          <span className={`text-[8px] tracking-[2px] px-2 py-0.5 rounded font-bold shrink-0 ${
            vimMode === 'NORMAL' ? 'bg-blue-primary text-black' : 
            vimMode === 'INSERT' ? 'bg-green-primary text-black' : 
            'bg-purple-primary text-white'
          }`}>
            {vimMode}
          </span>
        )}
        <span className="text-[9px] text-txt3 shrink-0">{time}</span>
      </div>

      {/* Pages */}
      <div className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 flex flex-col bg-bg">
          {curPage === 'editor' && renderEditor()}
          {curPage === 'shell' && renderShell()}
          {curPage === 'monitor' && renderMonitor()}
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
                { id: 'editor', label: 'EDITOR', icon: <Code2 size={16} /> },
                { id: 'shell', label: 'SHELL', icon: <TerminalIcon size={16} /> },
                { id: 'monitor', label: 'MONITOR', icon: <Monitor size={16} /> },
                { id: 'settings', label: 'SETTINGS', icon: <Settings size={16} /> }
              ].map(item => (
                <button 
                  key={item.id}
                  onClick={() => setCurPage(item.id as PageType)}
                  className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${curPage === item.id ? 'text-blue-primary' : 'text-txt3'}`}
                >
                  <div className="text-lg">{item.icon}</div>
                  <span className="text-[7px] tracking-wider font-mono">{item.label}</span>
                </button>
              ))}
              <button 
                onClick={() => setIsNavMinimized(true)}
                className="w-8 flex items-center justify-center text-txt3 hover:text-blue-primary"
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
                  {curPage === 'monitor' && <Monitor size={14} />}
                  {curPage === 'settings' && <Settings size={14} />}
                </div>
                <span className="text-[8px] tracking-[2px] text-txt2 uppercase font-bold">{curPage}</span>
              </div>
              <button 
                onClick={() => setIsNavMinimized(false)}
                className="text-txt3 hover:text-blue-primary flex items-center gap-1"
              >
                <span className="text-[7px] tracking-widest uppercase">Expand</span>
                <ChevronRight size={14} className="-rotate-90" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
