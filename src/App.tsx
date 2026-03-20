import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal, 
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
  Monitor
} from 'lucide-react';
import { GoogleGenAI, Type } from "@google/genai";
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
  const [curPage, setCurPage] = useState<PageType>('editor');
  const [curFileIdx, setCurFileIdx] = useState(0);
  const [files, setFiles] = useState<FileData[]>(INITIAL_FILES);
  const [vimMode, setVimMode] = useState<VimMode>('NORMAL');
  const [curLine, setCurLine] = useState(1);
  const [isModified, setIsModified] = useState(false);
  
  const [curShellTab, setCurShellTab] = useState(0);
  const [shellLines, setShellLines] = useState<ShellLine[][]>([[], [], []]);
  const [shellInput, setShellInput] = useState('');
  
  const [chatMode, setChatMode] = useState<ChatMode>('aider');
  const [chatMessages, setChatMessages] = useState<Message[]>([
    { role: 'system', content: 'AIDER MODE — AI coding assistant' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [ctxActive, setCtxActive] = useState<Set<string>>(new Set(['file']));

  const [endpoints, setEndpoints] = useState<Endpoint[]>([
    { id: '1', name: 'Ollama API', type: 'Ollama', host: 'localhost', port: '11434', proto: 'HTTP', model: 'qwen3.5:0.8b', status: 'LIVE' },
    { id: '2', name: 'Gemini API', type: 'Gemini', host: 'generativelanguage.googleapis.com', port: '443', proto: 'HTTPS', model: 'gemini-3-flash', status: 'API' }
  ]);

  const [showModal, setShowModal] = useState<string | null>(null);
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));

  const shellEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    shellEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [shellLines]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const addShellLine = (tab: number, text: string, color: string = 'var(--color-blue-primary)') => {
    setShellLines(prev => {
      const next = [...prev];
      next[tab] = [...next[tab], { text, color }];
      return next;
    });
  };

  const [bridgeConfig, setBridgeConfig] = useState({ enabled: false, url: '' });
  const [mcpServers, setMcpServers] = useState<any[]>([]);

  // Helper to get the correct API base (Local Container vs Remote Bridge)
  const getApiUrl = (path: string) => {
    if (bridgeConfig.enabled && bridgeConfig.url) {
      const base = bridgeConfig.url.endsWith('/') ? bridgeConfig.url.slice(0, -1) : bridgeConfig.url;
      return `${base}${path}`;
    }
    return path;
  };

  const handleCommand = async (cmd: string) => {
    const c = cmd.toLowerCase().trim();
    const tab = curShellTab;
    
    addShellLine(tab, `${SHELL_PROMPTS[tab]} ${cmd}`, 'var(--color-blue-primary)');

    if (c === 'help') {
      addShellLine(tab, 'Commands: help, clear, ls, status, freq, pemf, [any shell command]', 'var(--color-txt2)');
      return;
    }
    if (c === 'clear') {
      setShellLines(prev => {
        const next = [...prev];
        next[tab] = [];
        return next;
      });
      return;
    }

    try {
      const response = await fetch(getApiUrl('/api/shell'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: cmd })
      });
      const data = await response.json();
      if (data.stdout) addShellLine(tab, data.stdout, 'var(--color-txt)');
      if (data.stderr) addShellLine(tab, data.stderr, 'var(--color-red-primary)');
    } catch (error) {
      addShellLine(tab, `Failed to connect to ${bridgeConfig.enabled ? 'Remote Bridge' : 'Local Container'}.`, 'var(--color-red-primary)');
    }
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const text = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: text }]);
    setIsTyping(true);

    try {
      const tools = [{
        functionDeclarations: [
          {
            name: "read_file",
            parameters: {
              type: Type.OBJECT,
              properties: {
                path: { type: Type.STRING, description: "Path to the file to read" }
              },
              required: ["path"]
            },
            description: "Read the contents of a file in the local workspace"
          },
          {
            name: "list_files",
            parameters: { type: Type.OBJECT, properties: {} },
            description: "List all files in the local workspace"
          },
          {
            name: "write_file",
            parameters: {
              type: Type.OBJECT,
              properties: {
                path: { type: Type.STRING, description: "Path to write to" },
                content: { type: Type.STRING, description: "Content to write" }
              },
              required: ["path", "content"]
            },
            description: "Write content to a file"
          }
        ]
      }];

      const model = ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: `You are TermIntel AI. You have access to the ${bridgeConfig.enabled ? 'Remote (Termux/PC)' : 'Local (Container)'} filesystem. User: ${text}` }] }],
        config: { tools }
      });

      const result = await model;
      
      if (result.functionCalls) {
        for (const call of result.functionCalls) {
          if (call.name === 'list_files') {
            const res = await fetch(getApiUrl('/api/files'));
            const filesList = await res.json();
            setChatMessages(prev => [...prev, { role: 'ai', content: `Files in ${bridgeConfig.enabled ? 'Remote' : 'Local'} workspace: ${Array.isArray(filesList) ? filesList.join(', ') : 'Error fetching list'}` }]);
          }
          if (call.name === 'read_file') {
            const res = await fetch(getApiUrl(`/api/files/read?path=${call.args.path}`));
            const data = await res.json();
            setChatMessages(prev => [...prev, { role: 'ai', content: `Content of ${call.args.path}:\n\`\`\`\n${data.content}\n\`\`\`` }]);
          }
          if (call.name === 'write_file') {
            const res = await fetch(getApiUrl('/api/files/write'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ path: call.args.path, content: call.args.content })
            });
            const data = await res.json();
            setChatMessages(prev => [...prev, { role: 'ai', content: data.success ? `Successfully wrote to ${call.args.path}` : `Failed to write to ${call.args.path}` }]);
          }
        }
      } else {
        setChatMessages(prev => [...prev, { role: 'ai', content: result.text || 'No response.' }]);
      }
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'system', content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }]);
    } finally {
      setIsTyping(false);
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

  const toggleCtx = (k: string) => {
    setCtxActive(prev => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const renderEditor = () => {
    const file = files[curFileIdx];
    const lines = file.raw.split('\n');
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
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
            const name = prompt('File name:', 'untitled.js');
            if (name) setFiles([...files, { name, lang: 'js', color: 'var(--color-txt2)', raw: '// ' + name }]);
          }}><Plus size={14} /></div>
        </div>
        
        {/* Breadcrumb */}
        <div className="h-6 bg-bg1 border-b border-bd flex items-center px-3 gap-2 shrink-0 text-[8px] text-txt3 uppercase tracking-tighter">
          <span>workspace › scripts › {file.name}</span>
          <span className="ml-auto">Ln {curLine}</span>
          <span className="ml-2">{LANG_LABELS[curFileIdx] || 'TXT'}</span>
        </div>

        {/* Editor Body */}
        <div className="flex flex-1 overflow-hidden">
          <div className="w-10 bg-bg1 border-r border-bd py-2 text-right pr-2 text-[10px] text-txt3 leading-relaxed shrink-0 select-none">
            {lines.map((_, i) => (
              <div key={i} className={i === curLine - 1 ? 'text-blue-primary' : ''}>{i + 1}</div>
            ))}
          </div>
          <div className="flex-1 overflow-auto scrollbar-thin bg-bg relative">
            <textarea
              className="w-full h-full p-2 text-[10px] leading-relaxed bg-transparent outline-none resize-none font-mono caret-blue-primary"
              value={file.raw}
              onChange={(e) => {
                const newFiles = [...files];
                newFiles[curFileIdx].raw = e.target.value;
                setFiles(newFiles);
                setIsModified(true);
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
              spellCheck={false}
            />
          </div>
        </div>

        {/* Vim Bar */}
        <div className={`h-6 flex items-center px-3 gap-3 shrink-0 text-[9px] font-bold transition-colors ${
          vimMode === 'NORMAL' ? 'bg-blue-primary text-black' : 
          vimMode === 'INSERT' ? 'bg-green-primary text-black' : 
          'bg-purple-primary text-white'
        }`}>
          <span className="tracking-widest min-w-[60px]">{vimMode}</span>
          <span className="opacity-60">{file.name} {isModified ? '[+]' : ''}</span>
          <span className="ml-auto opacity-50">{curLine}/{lines.length} {Math.round((curLine/lines.length)*100)}%</span>
        </div>
      </div>
    );
  };

  const renderShell = () => {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="h-8 bg-bg1 border-b border-bd flex shrink-0">
          {['BASH', 'NODE', 'PYTHON'].map((label, i) => (
            <div 
              key={i}
              onClick={() => setCurShellTab(i)}
              className={`flex-1 flex items-center justify-center text-[9px] tracking-widest cursor-pointer border-r border-bd transition-all ${i === curShellTab ? 'text-blue-primary bg-bg2 border-b-2 border-b-blue-primary' : 'text-txt3'}`}
            >
              {label}
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-3 text-[10px] leading-relaxed scrollbar-thin font-mono">
          {shellLines[curShellTab].map((line, i) => (
            <div key={i} style={{ color: line.color }} className="whitespace-pre-wrap break-all mb-0.5">
              {line.text}
            </div>
          ))}
          <div ref={shellEndRef} />
        </div>
        <div className="h-11 flex items-center border-t border-bd px-3 bg-bg1 gap-2 shrink-0">
          <span className="text-txt3 text-[9px] shrink-0">{SHELL_PROMPTS[curShellTab]}</span>
          <input 
            className="flex-1 bg-transparent border-none text-blue-primary text-[10px] outline-none caret-blue-primary"
            value={shellInput}
            onChange={(e) => setShellInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { handleCommand(shellInput); setShellInput(''); } }}
            placeholder="enter command..."
            autoComplete="off"
          />
          <button 
            className="w-9 h-8 bg-blue-primary text-black rounded text-xs"
            onClick={() => { handleCommand(shellInput); setShellInput(''); }}
          >
            ▶
          </button>
        </div>
      </div>
    );
  };

  const renderHost = () => {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-3 border-b border-bd">
          <div className="text-[8px] tracking-[3px] text-txt3 mb-2 uppercase">Remote Bridge (Termux/PC)</div>
          <div className="bg-bg2 border border-bd2 rounded p-3">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2 h-2 rounded-full ${bridgeConfig.enabled ? 'bg-green-primary' : 'bg-zinc-800'}`}></div>
              <span className="text-[10px] text-txt tracking-wider flex-1">Bridge Status</span>
              <div 
                className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors ${bridgeConfig.enabled ? 'bg-blue-primary' : 'bg-bd2'}`}
                onClick={() => setBridgeConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
              >
                <div className={`w-4 h-4 rounded-full bg-black absolute top-0.5 transition-all ${bridgeConfig.enabled ? 'left-4.5' : 'left-0.5'}`}></div>
              </div>
            </div>
            <div className="fi">
              <div className="fi-label">BRIDGE URL (Tunnel)</div>
              <input 
                className="w-full bg-bg text-txt border border-bd2 text-[10px] p-2 rounded outline-none focus:border-blue-primary" 
                placeholder="https://your-tunnel.ngrok.io" 
                value={bridgeConfig.url}
                onChange={(e) => setBridgeConfig(prev => ({ ...prev, url: e.target.value }))}
              />
            </div>
            <div className="text-[7px] text-txt3 mt-2 leading-relaxed">
              Run <code className="text-blue-primary">bridge.js</code> locally to expose your filesystem.
            </div>
          </div>
        </div>

        <div className="p-3 border-b border-bd">
          <div className="text-[8px] tracking-[3px] text-txt3 mb-2 uppercase">Local Services</div>
          {endpoints.filter(e => e.type !== 'Gemini').map(svc => (
            <div key={svc.id} className="bg-bg2 border border-bd2 rounded p-3 mb-2 hover:border-blue-primary transition-colors">
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`w-2 h-2 rounded-full ${svc.status === 'LIVE' ? 'bg-green-primary animate-pulse' : 'bg-orange-primary'}`}></div>
                <span className="text-[10px] text-txt tracking-wider flex-1">{svc.name}</span>
                <span className="text-[8px] px-2 py-0.5 rounded border border-white/10 text-txt3">{svc.status}</span>
              </div>
              <div className="text-[8px] text-txt3 tracking-wider">{svc.host}:{svc.port} · {svc.proto} · {svc.model}</div>
              <div className="flex gap-2 mt-2">
                <button className="flex-1 h-8 border border-bd2 text-txt2 text-[8px] tracking-wider rounded hover:border-blue-primary hover:text-blue-primary">LOGS</button>
                <button className="flex-1 h-8 bg-blue-primary text-black text-[8px] font-bold tracking-wider rounded">CONFIG</button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-3 border-b border-bd">
          <div className="text-[8px] tracking-[3px] text-txt3 mb-2 uppercase">AI Endpoints</div>
          {endpoints.filter(e => e.type === 'Gemini').map(api => (
            <div key={api.id} className="bg-bg2 border border-bd2 rounded p-3 mb-2">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-2 h-2 rounded-full bg-purple-primary"></div>
                <span className="text-[10px] text-txt tracking-wider flex-1">{api.name}</span>
                <span className="text-[8px] px-2 py-0.5 rounded border border-purple-primary/30 text-purple-primary">API</span>
              </div>
              <div className="text-[8px] text-txt3 tracking-wider">{api.host} · {api.model}</div>
              <div className="flex gap-2 mt-2">
                <button className="flex-1 h-8 border border-bd2 text-txt2 text-[8px] tracking-wider rounded hover:border-blue-primary hover:text-blue-primary" onClick={() => setCurPage('aider')}>OPEN CHAT</button>
                <button className="flex-1 h-8 bg-blue-primary text-black text-[8px] font-bold tracking-wider rounded">CONFIGURE</button>
              </div>
            </div>
          ))}
          <button className="w-full h-10 border border-blue-primary text-blue-primary text-[8px] tracking-wider rounded mt-1">＋ ADD ENDPOINT / MCP</button>
        </div>

        <div className="p-3">
          <div className="text-[8px] tracking-[3px] text-txt3 mb-2 uppercase">Network Tunnel</div>
          <div className="bg-bg2 border border-bd2 rounded p-3">
            <div className="mb-2">
              <div className="text-[8px] tracking-wider text-txt3 mb-1 uppercase">Cloudflare URL</div>
              <input className="w-full bg-bg text-txt border border-bd2 text-[10px] p-2 rounded outline-none focus:border-blue-primary" placeholder="*.trycloudflare.com" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-zinc-800"></div>
              <span className="text-[8px] text-zinc-600 tracking-wider">NO_TUNNEL</span>
              <button className="ml-auto h-8 px-3 bg-blue-primary text-black text-[8px] font-bold tracking-wider rounded">CONNECT</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAider = () => {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="h-10 bg-bg1 border-b border-bd flex items-center px-3 gap-2 shrink-0">
          <div className="flex bg-bg border border-bd2 rounded overflow-hidden shrink-0">
            {(['aider', 'chat', 'freq'] as ChatMode[]).map(m => (
              <button 
                key={m}
                onClick={() => setChatMode(m)}
                className={`text-[8px] px-2.5 py-1.5 tracking-widest transition-all ${chatMode === m ? 'bg-blue-primary text-black font-bold' : 'text-txt3'}`}
              >
                {m.toUpperCase()}
              </button>
            ))}
          </div>
          <span className="text-[9px] text-txt3 ml-auto tracking-wider">gemini-3-flash</span>
          <div className="w-2 h-2 rounded-full bg-green-primary animate-pulse"></div>
        </div>
        
        <div className="p-1.5 bg-bg1 border-b border-bd flex gap-1.5 overflow-x-auto scrollbar-hide shrink-0">
          <div className={`text-[8px] px-2 py-1 border rounded-full whitespace-nowrap cursor-pointer transition-all ${ctxActive.has('file') ? 'border-blue-primary text-blue-primary' : 'border-bd2 text-txt3'}`} onClick={() => toggleCtx('file')}>📄 {files[curFileIdx].name}</div>
          <div className={`text-[8px] px-2 py-1 border rounded-full whitespace-nowrap cursor-pointer transition-all ${ctxActive.has('shell') ? 'border-blue-primary text-blue-primary' : 'border-bd2 text-txt3'}`} onClick={() => toggleCtx('shell')}>⌨ shell</div>
          <div className={`text-[8px] px-2 py-1 border rounded-full whitespace-nowrap cursor-pointer transition-all ${ctxActive.has('rf') ? 'border-blue-primary text-blue-primary' : 'border-bd2 text-txt3'}`} onClick={() => toggleCtx('rf')}>⚡ reality forge</div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 scrollbar-thin">
          {chatMessages.map((msg, i) => (
            <div 
              key={i} 
              className={`max-w-[85%] text-[10px] leading-relaxed p-2.5 rounded-lg ${
                msg.role === 'user' ? 'self-end bg-blue-primary text-black rounded-br-none' : 
                msg.role === 'ai' ? 'self-start bg-bg2 text-txt border border-bd2 rounded-bl-none' : 
                'self-center bg-transparent text-txt3 border border-bd px-3 py-1 rounded-full text-[9px]'
              }`}
            >
              {msg.content}
              {msg.code && (
                <div className="bg-bg border border-bd2 rounded p-2 mt-1.5 text-[9px] text-cyan-primary overflow-x-auto whitespace-pre font-mono">
                  {msg.code}
                </div>
              )}
            </div>
          ))}
          {isTyping && (
            <div className="self-start bg-bg2 p-2.5 rounded-lg border border-bd2 flex gap-1">
              <div className="w-1 h-1 rounded-full bg-txt3 animate-bounce"></div>
              <div className="w-1 h-1 rounded-full bg-txt3 animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-1 h-1 rounded-full bg-txt3 animate-bounce [animation-delay:0.4s]"></div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="border-t border-bd bg-bg1 p-3 shrink-0">
          <div className="flex gap-2 items-end">
            <textarea 
              className="flex-1 bg-bg text-txt border border-bd2 text-[10px] p-2 rounded outline-none focus:border-blue-primary resize-none min-h-[40px] max-h-[100px]"
              placeholder={chatMode === 'aider' ? 'Ask about code...' : 'Chat with AI...'}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
            />
            <button 
              disabled={isTyping}
              className="w-10 h-10 bg-blue-primary text-black rounded flex items-center justify-center disabled:bg-txt3"
              onClick={sendChat}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderConfig = () => {
    return (
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="text-[8px] tracking-[3px] text-txt3 px-3 pt-3 pb-1 uppercase">Editor</div>
        <div className="flex items-center h-12 px-3 border-b border-white/5 hover:bg-bg2 cursor-pointer transition-colors">
          <span className="text-[10px] text-txt tracking-wider flex-1">VIM KEYBINDINGS</span>
          <div className="w-9 h-5 rounded-full bg-blue-primary relative cursor-pointer">
            <div className="w-4 h-4 rounded-full bg-black absolute top-0.5 left-4.5 transition-all"></div>
          </div>
        </div>
        <div className="flex items-center h-12 px-3 border-b border-white/5 hover:bg-bg2 cursor-pointer transition-colors">
          <span className="text-[10px] text-txt tracking-wider flex-1">THEME</span>
          <span className="text-[9px] text-txt3">NAVY · BLACK</span>
        </div>
        <div className="flex items-center h-12 px-3 border-b border-white/5 hover:bg-bg2 cursor-pointer transition-colors">
          <span className="text-[10px] text-txt tracking-wider flex-1">FONT SIZE</span>
          <span className="text-[9px] text-txt3">10px MONO</span>
        </div>

        <div className="text-[8px] tracking-[3px] text-txt3 px-3 pt-3 pb-1 uppercase">AI Config</div>
        <div className="flex items-center h-12 px-3 border-b border-white/5 hover:bg-bg2 cursor-pointer transition-colors">
          <span className="text-[10px] text-txt tracking-wider flex-1">GEMINI API KEY</span>
          <span className="text-[9px] text-txt3">••••••••</span>
        </div>

        <div className="text-[8px] tracking-[3px] text-txt3 px-3 pt-3 pb-1 uppercase">System</div>
        <div className="flex items-center h-12 px-3 border-b border-white/5 hover:bg-bg2 cursor-pointer transition-colors">
          <span className="text-[10px] text-txt tracking-wider flex-1">BUILD</span>
          <span className="text-[9px] text-txt3">#neutro_916</span>
        </div>
        <div className="flex items-center h-12 px-3 border-b border-white/5 hover:bg-bg2 cursor-pointer transition-colors">
          <span className="text-[10px] text-txt tracking-wider flex-1">VERSION</span>
          <span className="text-[9px] text-txt3">v2.0.0</span>
        </div>

        <button className="w-[calc(100%-24px)] mx-3 my-4 h-12 border border-red-primary text-red-primary text-[9px] tracking-[2px] rounded hover:bg-red-primary/10 transition-colors uppercase font-bold">
          ⚠ Delete Account
        </button>
      </div>
    );
  };

  return (
    <div className="w-full max-w-[430px] h-screen bg-bg flex flex-col relative overflow-hidden mx-auto border-x border-bd">
      {/* Topbar */}
      <div className="h-11 pt-[env(safe-area-inset-top,0px)] bg-bg1 border-b border-bd flex items-center px-3 gap-2 shrink-0 select-none z-50">
        <span className="text-blue-primary text-xs font-bold tracking-[3px]">TI</span>
        <span className="text-bd3 text-xs">|</span>
        <span className="text-txt2 text-[9px] tracking-wider flex-1 truncate">
          {curPage === 'editor' ? files[curFileIdx].name : 
           curPage === 'shell' ? SHELL_PROMPTS[curShellTab] : 
           curPage === 'host' ? 'host manager' : 
           curPage === 'aider' ? chatMode + ' · ai assistant' : 'configuration'}
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
        <AnimatePresence mode="wait">
          <motion.div
            key={curPage}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute inset-0 flex flex-col bg-bg"
          >
            {curPage === 'editor' && renderEditor()}
            {curPage === 'shell' && renderShell()}
            {curPage === 'host' && renderHost()}
            {curPage === 'aider' && renderAider()}
            {curPage === 'config' && renderConfig()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Nav */}
      <div className="h-[calc(52px+env(safe-area-inset-bottom,0px))] pb-[env(safe-area-inset-bottom,0px)] bg-bg1 border-t border-bd flex shrink-0 select-none">
        {[
          { id: 'editor', label: 'EDITOR', icon: <Code2 size={16} /> },
          { id: 'shell', label: 'SHELL', icon: <Terminal size={16} /> },
          { id: 'host', label: 'HOST', icon: <Cpu size={16} /> },
          { id: 'aider', label: 'AIDER', icon: <Sparkles size={16} /> },
          { id: 'config', label: 'CONFIG', icon: <Settings size={16} /> }
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
      </div>
    </div>
  );
}
