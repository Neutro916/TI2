import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Activity,
  Clock,
  Wifi,
  Database,
  Search,
  Maximize2,
  Minimize2,
  Layout,
  Layers,
  HardDrive,
  Shield
} from 'lucide-react';

// Unified Types
type PageType = 'core' | 'ai_chat' | 'settings' | 'tools';
interface FileData { name: string; lang: string; color: string; raw: string; originalIdx?: number; }
interface AiMessage { role: 'user' | 'assistant'; content: string; toolCalls?: any[]; }

const TUNNEL_URL = "https://t2i-rig-916.localport.host";

// --- SYNTAX HIGHLIGHTING UTIL ---
const highlightCode = (line: string) => {
  if (!line) return line;
  const p = {
    keyword: /\b(import|export|const|let|var|function|return|if|else|for|while|await|async|type|interface|from|default|class|extends)\b/g,
    string: /(['"`])(.*?)\1/g,
    comment: /\/\/.*|\/\*[\s\S]*?\*\//g,
    bracket: /[{}()[\]]/g,
    tag: /<([a-zA-Z0-9]+)|<\/([a-zA-Z0-9]+)/g,
    number: /\b\d+(\.\d+)?\b/g
  };
  let parts: any[] = [{ text: line, type: 'text' }];
  for (const [type, reg] of Object.entries(p)) {
    let nextParts: any[] = [];
    parts.forEach(part => {
      if (part.type !== 'text') { nextParts.push(part); return; }
      let lastIdx = 0; let match;
      const r = new RegExp(reg);
      while ((match = r.exec(part.text)) !== null) {
        if (match.index > lastIdx) nextParts.push({ text: part.text.substring(lastIdx, match.index), type: 'text' });
        nextParts.push({ text: match[0], type });
        lastIdx = r.lastIndex;
      }
      if (lastIdx < part.text.length) nextParts.push({ text: part.text.substring(lastIdx), type: 'text' });
    });
    parts = nextParts;
  }
  return parts.map((p, i) => (
    <span key={i} className={`
      ${p.type === 'keyword' ? 'text-primary font-bold' : ''}
      ${p.type === 'string' ? 'text-green-400' : ''}
      ${p.type === 'comment' ? 'text-txt3 italic opacity-60' : ''}
      ${p.type === 'bracket' ? 'text-yellow-500 font-bold' : ''}
      ${p.type === 'tag' ? 'text-resonance' : ''}
      ${p.type === 'number' ? 'text-orange-400' : ''}
      ${p.type === 'text' ? 'text-white/80' : ''}
    `}>{p.text}</span>
  ));
};

export default function App() {
  // --- STATE ---
  const [curPage, setCurPage] = useState<PageType>('core');
  const [showAiHub, setShowAiHub] = useState(false);
  const [showDisplay, setShowDisplay] = useState(false);
  const [isCleanMode, setIsCleanMode] = useState(false);
  const [isTermOpen, setIsTermOpen] = useState(true);
  const [curLine, setCurLine] = useState(1);
  const [isModified, setIsModified] = useState(false);
  
  const [files, setFiles] = useState<FileData[]>([
    { name: 'App.tsx', lang: 'tsx', color: '#61dafb', raw: '// T2I Core System V4.8 Reconstruction\n// Source Tree moved to hidden Config layer.' },
    { name: 'index.css', lang: 'css', color: '#2965f1', raw: ':root { --primary: #ffb000; }' },
    { name: 'types.ts', lang: 'ts', color: '#3178c6', raw: '// Common Registry Sync' },
    { name: 'package.json', lang: 'json', color: '#ffca28', raw: '{\n  "name": "t2i-rig",\n  "version": "1.0.0"\n}' }
  ]);
  const [curFileIdx, setCurFileIdx] = useState(0);
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([{ role: 'assistant', content: 'Neural Reconstruction Active. Source Tree migrated to CONF.' }]);
  const [isThinking, setIsThinking] = useState(false);
  const [ragQuery, setRagQuery] = useState("");
  const [showQrPair, setShowQrPair] = useState(false);
  const [sentinelStatus, setSentinelStatus] = useState<any>({ lmstudio: '...', openwebui: '...', openclaw: '...' });
  const [aiProcessLog, setAiProcessLog] = useState<any[]>([]);
  const [token, setToken] = useState<string>(localStorage.getItem('SOVEREIGN_TOKEN') || "");
  const [showAuthModal, setShowAuthModal] = useState(!localStorage.getItem('SOVEREIGN_TOKEN'));

  // Authenticated Fetch Wrapper
  const authFetch = async (url: string, options: any = {}) => {
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`
      }
    });
  };

  // --- NEURAL PERSISTENCE (LocalStorage) ---
  useEffect(() => {
    const saved = localStorage.getItem('t2i_state');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.curPage) setCurPage(data.curPage);
        if (data.curFileIdx !== undefined) setCurFileIdx(data.curFileIdx);
        if (data.isTermOpen !== undefined) setIsTermOpen(data.isTermOpen);
      } catch (e) { console.error("Corrupt Neural Cache", e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('t2i_state', JSON.stringify({ curPage, curFileIdx, isTermOpen }));
  }, [curPage, curFileIdx, isTermOpen]);

  // --- AUTONOMOUS SENTINEL (Error Watcher) ---
  useEffect(() => {
    // Proactive Detection Simulation
    const timer = setTimeout(() => {
      if (curPage === 'core' && isTermOpen) {
        setAiMessages(prev => [...prev, { 
          role: 'assistant', 
          content: '⚠️ [AUTONOMOUS SENTINEL] I detected a potential build mismatch in your Shell. Should I execute a Sync-Repair on the T2I Bridge?' 
        }]);
        setShowAiHub(true);
      }
    }, 15000); // 15s delay for 'sensing'
    return () => clearTimeout(timer);
  }, [curPage, isTermOpen]);

  const editorScrollRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // --- SERVICE SENTINEL POLLING ---
  useEffect(() => {
    const poll = async () => {
        if (!token) return;
        try {
            const res = await authFetch('/api/sentinel/status');
            if (res.status === 401) { setShowAuthModal(true); return; }
            const data = await res.json();
            setSentinelStatus(data);
        } catch (e) {}
    };
    const timer = setInterval(poll, 5000);
    poll();
    return () => clearInterval(timer);
  }, [token]);

  // --- CLI INTEGRATION ---
  useEffect(() => {
    const handleCommand = (e: any) => {
      const { type, payload } = e.detail || e;
      if (type === 'open') {
        const idx = files.findIndex(f => f.name === payload);
        if (idx !== -1) { setCurFileIdx(idx); setCurPage('core'); }
      } else if (type === 'navigate') {
        setCurPage(payload as PageType);
      }
    };
    window.addEventListener('t2i:command' as any, handleCommand);
    return () => window.removeEventListener('t2i:command' as any, handleCommand);
  }, [files]);

  // --- LOGIC ---
  const processDirective = (v: string) => {
    setIsThinking(true);
    setAiProcessLog(prev => [...prev, { id: Math.random().toString(), text: `Task: ${v}`, type: 'status' }]);
    setTimeout(() => { 
      setIsThinking(false); 
      setAiMessages(prev => [...prev, { role: 'assistant', content: '[Neural Sync Stable] Rig logic reconstructed. Context matched via RAG memory.' }]); 
    }, 1000);
  };

  const queryMemory = () => {
    if (!ragQuery.trim()) return;
    setIsThinking(true);
    setAiProcessLog(prev => [...prev, { id: Math.random().toString(), text: `RAG_QUERY: ${ragQuery}`, type: 'status' }]);
    setTimeout(() => {
        setIsThinking(false);
        setAiMessages(prev => [...prev, { role: 'assistant', content: `🧠 [Neural Search] Found 3 matching nodes in Junk/Swarm for "${ragQuery}". Context synchronized.` }]);
        setRagQuery("");
    }, 1200);
  };

  // --- SUB-RENDERERS ---
  const renderTopbar = () => (
    <div className="h-14 bg-bg1 border-b border-bd flex items-center justify-between px-6 shrink-0 relative z-[200] glass-pro select-none">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <img src="/favicon.png" className="w-5 h-5 rounded-sm shadow-lg shadow-primary/20 animate-pulse" alt="Anticlaw Icon" />
          <h1 className="text-[14px] font-black tracking-[3px] text-white animate-resonance-pulse uppercase">ANTICLAW-2 <span className="text-resonance">:: SOVEREIGN</span></h1>
        </div>
        <div className="hidden md:flex items-center gap-4 px-3 py-1 bg-black/40 border border-white/5 rounded-lg text-[10px] font-mono text-primary group">
          <Activity size={10} className="text-resonance animate-resonance-pulse" />
          {TUNNEL_URL} <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        </div>
      </div>
      <div className="flex items-center gap-6 text-[10px] font-mono text-txt3">
        <div className="flex items-center gap-2 cursor-pointer hover:text-primary transition-all" onClick={() => setShowDisplay(!showDisplay)}>
           <Monitor size={12} className={showDisplay ? 'text-primary' : ''} /> {showDisplay ? 'DISPLAY_ON' : 'PREVIEW'}
        </div>
        <div className="flex items-center gap-2 underline decoration-primary/30 cursor-pointer" onClick={() => window.open(TUNNEL_URL)}><Wifi size={12} className="text-primary" /> TUNNEL</div>
        <div className="flex items-center gap-3 px-4 py-1.5 bg-black/40 border border-white/5 rounded-lg">
           <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
           <span className="text-[9px] font-black tracking-widest text-white/50">LIVE_PROD_OK</span>
        </div>
        <div className="px-4 py-1.5 bg-primary text-black rounded-lg font-black tracking-widest uppercase flex items-center gap-2 transition-all hover:brightness-110 cursor-pointer" onClick={() => window.open('https://dashboard.render.com')}><HardDrive size={12} /> DEPLOYED</div>
      </div>
    </div>
  );

  const renderMonacoEditor = () => {
    const file = files[curFileIdx];
    const lines = file ? file.raw.split('\n') : ["No Data"];
    
    let visibleFiles = files.map((f, i) => ({...f, originalIdx: i}));
    if (isCleanMode) visibleFiles = [visibleFiles[curFileIdx]];
    else {
      const start = Math.max(0, curFileIdx - 1);
      const end = Math.min(files.length, start + 3);
      visibleFiles = visibleFiles.slice(start, end);
    }

    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-bg relative">
        <div className="h-9 bg-bg1 border-b border-bd flex overflow-x-auto scrollbar-hide shrink-0">
          {visibleFiles.map((f) => (
            <div key={f.originalIdx} onClick={() => setCurFileIdx(f.originalIdx!)} className={`flex items-center gap-2 px-4 text-[11px] font-black tracking-[3px] cursor-pointer border-r border-bd shrink-0 transition-all uppercase ${f.originalIdx === curFileIdx ? 'text-primary bg-bg2 shadow-[inset_0_-2px_0_rgba(255,176,0,1)]' : 'text-txt3 opacity-40 hover:opacity-100 hover:bg-white/5'}`}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: f.color }} /> {f.name}
            </div>
          ))}
          <button className="px-4 text-[9px] font-bold text-txt3 hover:text-white border-l border-bd" onClick={() => setIsCleanMode(!isCleanMode)}>+ {isCleanMode ? 'EXTEND' : 'CLEAN'}</button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div className="w-10 bg-bg1 border-r border-bd py-2 text-right pr-2 text-[12px] font-medium text-txt3 shrink-0 select-none">
            {lines.map((_, i) => <div key={i} className={i === curLine -1 ? 'bg-primary/10 text-primary' : ''}>{i + 1}</div>)}
          </div>
          <div className="flex-1 flex overflow-hidden relative">
             <div ref={overlayRef} className="absolute inset-0 p-2 pointer-events-none whitespace-pre font-mono text-[14px] leading-relaxed opacity-80 overflow-hidden">
                {lines.map((l, i) => <div key={i} className={i === curLine -1 ? 'bg-primary/5' : ''}>{highlightCode(l)}</div>)}
             </div>
             <textarea 
               ref={editorScrollRef}
               className="flex-1 bg-transparent p-2 outline-none resize-none font-mono text-[14px] leading-relaxed text-transparent caret-primary selection:bg-primary/30 z-10"
               value={file?.raw || ''}
               onChange={(e) => { const n = [...files]; n[curFileIdx].raw = e.target.value; setFiles(n); setIsModified(true); }}
               onScroll={(e) => { if(overlayRef.current) overlayRef.current.scrollTop = e.currentTarget.scrollTop; }}
               onKeyUp={(e) => { const t = e.target as HTMLTextAreaElement; setCurLine(t.value.substring(0, t.selectionStart).split('\n').length); }}
               onClick={(e) => { const t = e.target as HTMLTextAreaElement; setCurLine(t.value.substring(0, t.selectionStart).split('\n').length); }}
               spellCheck={false}
             />

             {/* MASTER FLOATING ICONS (RESTORED) */}
             <div className="absolute top-2 left-[-34px] z-[100] flex flex-col items-center gap-4 pointer-events-none">
                <button 
                  onClick={() => setCurPage('settings')}
                  className="w-7 h-7 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-110 active:scale-95 transition-all pointer-events-auto group"
                >
                  <FolderOpen size={14} className="text-black group-hover:animate-pulse" />
                </button>
             </div>

             <div className="absolute top-10 right-8 z-[100] flex flex-col items-center gap-4 pointer-events-none">
                <button 
                  onClick={() => setShowAiHub(!showAiHub)}
                  className="w-10 h-10 bg-primary/20 backdrop-blur-md border border-primary/40 rounded-full flex items-center justify-center shadow-2xl shadow-primary/10 hover:bg-primary transition-all pointer-events-auto group"
                >
                  <Sparkles size={20} className="text-primary group-hover:text-black transition-colors" />
                </button>
             </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSettings = () => (
    <div className="flex-1 bg-bg flex flex-col p-8 space-y-8 overflow-y-auto scrollbar-hide">
       {/* Workspace Settings (Hidden Tree Restoration) */}
       <div className="space-y-4">
          <div className="flex items-center gap-3"><FolderOpen size={18} className="text-primary" /> <span className="text-sm font-black tracking-[4px] text-white uppercase opacity-70">WORKSPACE SOURCE TREE</span></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
             {files.map((f, i) => (
                <div key={i} onClick={() => { setCurFileIdx(i); setCurPage('core'); }} className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${i === curFileIdx ? 'bg-primary/10 border-primary/40 text-white' : 'bg-bg1 border-white/5 text-txt3 hover:border-white/20'}`}>
                   <div className="flex items-center gap-4">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: f.color }} />
                      <div className="flex flex-col">
                         <span className="text-[14px] font-bold">{f.name}</span>
                         <span className="text-[10px] opacity-50 uppercase tracking-widest">{f.lang || 'txt'} SOURCE</span>
                      </div>
                   </div>
                   <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all text-primary" />
                </div>
             ))}
             <button onClick={() => setFiles([...files, {name:'new_module.ts', lang:'ts', color:'#3178c6', raw:''}])} className="p-4 rounded-xl border border-dashed border-white/10 text-txt3 hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-3 bg-white/[0.02]">
                <Plus size={16} /> ADD NERUAL_SOURCE
             </button>
          </div>
       </div>

       {/* System Config */}
       <div className="space-y-4 pt-8 border-t border-white/5">
          <div className="flex items-center gap-3"><Layers size={18} className="text-resonance" /> <span className="text-sm font-black tracking-[4px] text-white uppercase opacity-70">SYSTEM CONFIGURATION</span></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-bg1 border border-white/5 rounded-2xl p-6 space-y-6">
               <div className="flex justify-between items-center">
                  <div><div className="text-sm font-bold text-white">Tunnel Convenience</div><div className="text-xs text-txt3">Auto-route localport mapping</div></div>
                  <div className="w-10 h-5 bg-primary rounded-full flex items-center px-1"><div className="w-3 h-3 bg-black rounded-full ml-auto" /></div>
               </div>
            </div>
            {/* ANTICLAW 2 SERVICE SENTINEL */}
            <div className="bg-bg1 border border-white/5 rounded-2xl p-6 space-y-4">
               <div className="flex items-center gap-2"><Shield size={16} className="text-primary" /><span className="text-[10px] font-black tracking-widest text-white uppercase">ANTICLAW 2 : SERVICE SENTINEL</span></div>
               <div className="space-y-2">
                  {[
                    { name: 'LM STUDIO (1234)', key: 'lmstudio', desc: 'Neural Inference Engine' },
                    { name: 'OPEN WEBUI (3000)', key: 'openwebui', desc: 'Unified Intelligence Layer' },
                    { name: 'OPENCLAW (18789)', key: 'openclaw', desc: 'Multi-Agent Gateway' }
                  ].map(s => (
                    <div key={s.key} className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl group hover:border-primary/20 transition-all">
                       <div className="flex flex-col">
                          <span className="text-[11px] font-bold text-white">{s.name}</span>
                          <span className="text-[8px] text-txt3 uppercase tracking-tighter">{s.desc}</span>
                       </div>
                       <div className="flex items-center gap-2">
                          <span className={`text-[8px] font-black tracking-widest ${sentinelStatus[s.key] === 'ONLINE' ? 'text-green-500' : 'text-red-500'}`}>{sentinelStatus[s.key]}</span>
                          <div className={`w-1.5 h-1.5 rounded-full ${sentinelStatus[s.key] === 'ONLINE' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                       </div>
                    </div>
                  ))}
               </div>
            </div>

            <div className="bg-bg1 border border-primary/20 rounded-2xl p-6 flex flex-col justify-between group hover:border-primary/50 transition-all cursor-pointer" onClick={() => window.open('https://coderabbit.ai/dashboard')}>
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Sparkles size={16} className="text-primary" />
                    <span className="text-sm font-bold text-white">CodeRabbit AI Audit</span>
                  </div>
                  <ChevronRight size={16} className="text-txt3 group-hover:text-primary transform translate-x-1" />
               </div>
               <div className="text-[10px] text-txt3 mt-2 uppercase tracking-tighter">AI-Enabled PR Integrity :: ANTICLAW Master Sync</div>
            </div>
            {/* LIVE DEPLOYMENT BRIDGE */}
            <div className="bg-primary/5 border border-primary/40 rounded-2xl p-6 flex flex-col justify-between group hover:bg-primary/10 transition-all cursor-pointer" onClick={() => window.open('https://dashboard.render.com')}>
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Globe size={16} className="text-primary" />
                    <span className="text-sm font-bold text-white">Publish to Production</span>
                  </div>
                  <Zap size={16} className="text-primary animate-pulse" />
               </div>
               <div className="text-[10px] text-primary mt-2 uppercase font-black tracking-widest">Master Cloud Deployment :: Starter Tier Active</div>
            </div>
          </div>
       </div>
    </div>
  );

  const renderToolsTab = () => (
    <div className="flex-1 bg-bg flex flex-col p-8 space-y-8 overflow-y-auto scrollbar-hide">
       <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20"><Cpu size={24} className="text-primary animate-pulse" /></div>
             <div>
                <h2 className="text-xl font-black tracking-[8px] text-white uppercase">NEURAL TOOLBOX</h2>
                <p className="text-[10px] text-txt3 uppercase tracking-widest opacity-60">Automation & Vision Core V11.5</p>
             </div>
          </div>
          <div className="flex gap-4">
             {['Node.js', 'Python', 'Playwright', 'OCR'].map(lib => (
                <div key={lib} className="px-4 py-2 bg-black/40 border border-white/5 rounded-xl flex items-center gap-3 group hover:border-resonance/40 transition-all">
                   <div className="w-2 h-2 rounded-full bg-green-500 shadow-lg shadow-green-500/20" />
                   <span className="text-[10px] font-bold text-white uppercase opacity-70 group-hover:opacity-100">{lib}</span>
                </div>
             ))}
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-bg1 border border-white/5 rounded-3xl p-6 space-y-6 hover:border-primary/20 transition-all">
             <div className="flex items-center gap-3 text-primary"><Globe size={18} /><span className="text-[11px] font-black tracking-widest uppercase">Automation</span></div>
             <div className="space-y-3">
                <button className="w-full p-4 bg-black/40 border border-white/5 rounded-2xl text-left hover:bg-primary hover:text-black transition-all group">
                   <div className="flex justify-between items-center mb-1"><span className="text-[12px] font-bold">Playwright Engine</span><Maximize2 size={12} className="opacity-0 group-hover:opacity-100" /></div>
                   <div className="text-[9px] opacity-60 uppercase tracking-tighter">Launch Browser Sentinel (Headless)</div>
                </button>
             </div>
          </div>

          <div className="bg-bg1 border border-white/5 rounded-3xl p-6 space-y-6 hover:border-resonance/20 transition-all">
             <div className="flex items-center gap-3 text-resonance"><Sparkles size={18} /><span className="text-[11px] font-black tracking-widest uppercase">Vision Bridge</span></div>
             <div className="space-y-3">
                <button className="w-full p-4 bg-black/40 border border-white/5 rounded-2xl text-left hover:bg-resonance hover:text-black transition-all group">
                   <div className="flex justify-between items-center mb-1"><span className="text-[12px] font-bold">OCR Processor</span><Activity size={12} className="opacity-0 group-hover:opacity-100" /></div>
                   <div className="text-[9px] opacity-60 uppercase tracking-tighter">Image-to-Text Neural Extraction</div>
                </button>
             </div>
          </div>

          <div className="bg-bg1 border border-white/5 rounded-3xl p-6 space-y-6">
             <div className="flex items-center gap-3 text-white/50"><Clock size={18} /><span className="text-[11px] font-black tracking-widest uppercase">Neural Notes</span></div>
             <textarea 
                className="w-full h-32 bg-black/60 border border-white/5 rounded-2xl p-4 text-[12px] font-mono text-txt3 outline-none focus:border-primary/40 transition-all"
                placeholder="Scratchpad for AI logic & training notes..."
             />
          </div>
       </div>
    </div>
  );

  return (
    <div className="h-screen w-screen bg-bg text-txt flex flex-col overflow-hidden font-mono select-none selection:bg-primary/40">
      {renderTopbar()}
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 flex overflow-hidden">
           {curPage === 'core' ? (
             <div className="flex-1 flex flex-col overflow-hidden relative">
                <div className="flex-1 flex overflow-hidden">
                   {renderMonacoEditor()}
                   {showDisplay && (
                     <div className="w-1/2 bg-black/40 border-l border-white/5 flex flex-col overflow-hidden opacity-80 backdrop-blur-md">
                        <div className="h-9 bg-bg1 border-b border-bd px-4 flex items-center text-[10px] font-black tracking-[4px] text-primary uppercase">Neural Preview</div>
                        <div className="flex-1 p-8 flex items-center justify-center text-txt3 text-xs uppercase tracking-widest text-center">Syncing Artifact Buffer...</div>
                     </div>
                   )}
                </div>
                {isTermOpen && (
                   <div className="h-[35%] bg-black/95 border-t-2 border-primary/20 flex flex-col overflow-hidden shadow-2xl z-50">
                      <div className="h-8 bg-bg1 border-b border-white/5 flex items-center justify-between px-4">
                         <div className="flex items-center gap-3"><TerminalIcon size={12} className="text-primary" /> <span className="text-[9px] font-black tracking-[4px] text-white opacity-50 uppercase">Unified Shell v11.5 :: ANTICLAW-2 MASTER</span></div>
                       <div className="flex items-center gap-4">
                          <button className="text-[8px] font-black text-txt3 hover:text-white flex items-center gap-1.5" onClick={() => setShowQrPair(true)}><Wifi size={10} className="text-primary" /> PAIR BRIDGE</button>
                          <button onClick={() => setIsTermOpen(false)} className="text-txt3 hover:text-white"><Minimize2 size={12} /></button>
                       </div>
                    </div>
                    <div className="flex-1 p-4 text-primary text-[12px] font-mono">
                       <span className="text-resonance opacity-50 font-black tracking-widest">[83.33Hz] ANTICLAW SOVEREIGN CORE ACTIVE.</span><br/>
                       RIG@ANTICLAW_HUB:V11.5 :: Ready. Neural Toolbox Sync OK.<br/>
                       $ <span className="animate-pulse">_</span>
                    </div>
                   </div>
                )}
             </div>
           ) : curPage === 'settings' ? renderSettings() : curPage === 'tools' ? renderToolsTab() : null}
        </div>
        
        <AnimatePresence>{showAiHub && (
          <motion.div initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }} className="absolute right-0 top-0 h-full w-[480px] bg-bg/20 backdrop-blur-3xl border-l border-white/10 flex flex-col z-[500] shadow-2xl">
            <div className="h-14 flex items-center justify-between px-6 border-b border-white/5 bg-black/60"><span className="text-[11px] font-black tracking-[4px] text-white">NEURAL HUB</span><button onClick={() => setShowAiHub(false)} className="text-txt3 hover:text-white"><X size={20} /></button></div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {aiMessages.map((m, i) => (<div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}><div className={`max-w-[85%] p-3 rounded-2xl text-[13px] border ${m.role === 'user' ? 'bg-primary text-black border-primary font-bold' : 'bg-black/60 text-white border-white/10'}`}>{m.content}</div></div>))}
            </div>
            <div className="p-4 bg-bg1 border-t border-bd space-y-3 pb-8">
               <div className="relative group">
                  <div className="absolute left-3 top-2.5 text-resonance group-focus-within:animate-pulse"><Database size={14} /></div>
                  <input 
                    value={ragQuery}
                    onChange={(e) => setRagQuery(e.target.value)}
                    onKeyDown={(e) => { if(e.key === 'Enter') queryMemory(); }}
                    className="w-full bg-black/60 border border-resonance/20 rounded-lg py-2 pl-10 pr-3 text-[11px] text-resonance placeholder:text-resonance/30 focus:border-resonance/60 outline-none transition-all" 
                    placeholder="Search Neural Memory (Junk/Brain)..." 
                  />
               </div>
               <input onKeyDown={(e) => { if(e.key === 'Enter') { const t = e.target as HTMLInputElement; processDirective(t.value); setAiMessages([...aiMessages, {role:'user', content:t.value}]); t.value=''; } }} className="w-full bg-black/40 border border-white/5 rounded-lg py-2 px-3 text-[12px] text-white" placeholder="Direct Order..." />
            </div>
          </motion.div>
        )}</AnimatePresence>

        {/* SOVEREIGN ACCESS MODAL */}
        <AnimatePresence>{showAuthModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[2000] flex items-center justify-center p-6">
            <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="bg-bg1 border border-primary/20 rounded-3xl p-8 max-w-sm w-full space-y-8 shadow-2xl">
               <div className="flex flex-col items-center gap-4 text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/10">
                    <Shield size={32} className="text-primary animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-[18px] font-black tracking-[4px] text-white uppercase">Sovereign Access</h2>
                    <p className="text-[10px] text-txt3 uppercase tracking-widest opacity-60">Neural Bridge Security v14.5</p>
                  </div>
               </div>
               <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black tracking-widest text-primary uppercase ml-1">Authentication Token</label>
                    <input 
                      type="password"
                      className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 text-[12px] font-mono text-white outline-none focus:border-primary/40 transition-all text-center tracking-widest"
                      placeholder="••••••••••••••••"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = (e.target as HTMLInputElement).value;
                          setToken(val);
                          localStorage.setItem('SOVEREIGN_TOKEN', val);
                          setShowAuthModal(false);
                        }
                      }}
                    />
                  </div>
                  <div className="text-[8px] text-txt3 text-center uppercase tracking-tighter opacity-40">Verification via OPENCLAW_GATEWAY_TOKEN</div>
               </div>
            </motion.div>
          </motion.div>
        )}</AnimatePresence>
      </div>

      <div className="h-16 bg-bg1 border-t border-bd flex divide-x divide-bd/30 z-[600]">
        {[
          { id: 'core', label: 'CORE', icon: <Code2 size={18} /> },
          { id: 'ai_chat', label: 'HUB', icon: <Sparkles size={16} /> },
          { id: 'tools', label: 'TOOLS', icon: <Cpu size={16} /> },
          { id: 'settings', label: 'CONF', icon: <Settings size={16} /> }
        ].map(item => (
          <button key={item.id} onClick={() => { if(item.id === 'ai_chat') setShowAiHub(!showAiHub); else setCurPage(item.id as PageType); }} className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${ (curPage === item.id && item.id !== 'ai_chat') || (showAiHub && item.id === 'ai_chat') ? 'text-primary bg-primary/5 shadow-[inset_0_-2px_0_rgba(255,176,0,1)]' : 'text-txt3' }`}> {item.icon} <span className="text-[9px] font-black tracking-[3px] uppercase">{item.label}</span> </button>
        ))}
      </div>
    </div>
  );
}
