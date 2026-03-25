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
  HardDrive
} from 'lucide-react';

// Unified Types
type PageType = 'core' | 'ai_chat' | 'settings';
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
  const [aiProcessLog, setAiProcessLog] = useState<any[]>([]);

  const editorScrollRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // --- CLI INTEGRATION ---
  useEffect(() => {
    // Note: In a real environment, you'd use socket.io-client. 
    // For this unified restoration, we'll implement a simple window listener 
    // or assume the socket is handled by the parent/server bridge.
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
    setTimeout(() => { setIsThinking(false); setAiMessages(prev => [...prev, { role: 'assistant', content: '[Neural Sync Stable] Rig logic reconstructed.' }]); }, 1000);
  };

  // --- SUB-RENDERERS ---
  const renderTopbar = () => (
    <div className="h-14 bg-bg1 border-b border-bd flex items-center justify-between px-6 shrink-0 relative z-[200] glass-pro select-none">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <Zap size={18} className="text-primary fill-primary animate-pulse" />
          <h1 className="text-[14px] font-black tracking-[3px] text-white">T2I-RIG <span className="text-txt3">V4.8</span></h1>
        </div>
        <div className="hidden md:flex items-center gap-4 px-3 py-1 bg-black/40 border border-white/5 rounded-lg text-[10px] font-mono text-primary">
          {TUNNEL_URL} <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        </div>
      </div>
      <div className="flex items-center gap-6 text-[10px] font-mono text-txt3">
        <div className="flex items-center gap-2 cursor-pointer hover:text-primary transition-all" onClick={() => setShowDisplay(!showDisplay)}>
           <Monitor size={12} className={showDisplay ? 'text-primary' : ''} /> {showDisplay ? 'DISPLAY_ON' : 'PREVIEW'}
        </div>
        <div className="flex items-center gap-2 underline decoration-primary/30 cursor-pointer" onClick={() => window.open(TUNNEL_URL)}><Wifi size={12} className="text-primary" /> TUNNEL</div>
        <div className="px-4 py-1.5 bg-primary text-black rounded-lg font-black tracking-widest uppercase flex items-center gap-2 transition-all hover:brightness-110"><HardDrive size={12} /> SYNCED</div>
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
          <div className="bg-bg1 border border-white/5 rounded-2xl p-6 space-y-6">
             <div className="flex justify-between items-center">
                <div><div className="text-sm font-bold text-white">Tunnel Convenience</div><div className="text-xs text-txt3">Auto-route localport mapping</div></div>
                <div className="w-10 h-5 bg-primary rounded-full flex items-center px-1"><div className="w-3 h-3 bg-black rounded-full ml-auto" /></div>
             </div>
             <div className="flex justify-between items-center opacity-50">
                <div><div className="text-sm font-bold text-white">Neural Cache</div><div className="text-xs text-txt3">Persistent skill indexing</div></div>
                <div className="w-10 h-5 bg-white/10 rounded-full flex items-center px-1"><div className="w-3 h-3 bg-white/20 rounded-full" /></div>
             </div>
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
                         <div className="flex items-center gap-3"><TerminalIcon size={12} className="text-primary" /> <span className="text-[9px] font-black tracking-[4px] text-white opacity-50 uppercase">Unified Shell v4.8</span></div>
                         <div className="flex items-center gap-4">
                            <button className="text-[8px] font-black text-txt3 hover:text-white flex items-center gap-1.5" onClick={() => window.open(TUNNEL_URL)}><Wifi size={10} className="text-primary" /> TUNNEL SETTINGS</button>
                            <button onClick={() => setIsTermOpen(false)} className="text-txt3 hover:text-white"><Minimize2 size={12} /></button>
                         </div>
                      </div>
                      <div className="flex-1 p-4 text-primary text-[12px]">RIG@T2I_CORE:V4.8 :: Ready.<br/>$ <span className="animate-pulse">_</span></div>
                   </div>
                )}
             </div>
           ) : curPage === 'settings' ? renderSettings() : null}
        </div>
        
        <AnimatePresence>{showAiHub && (
          <motion.div initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }} className="absolute right-0 top-0 h-full w-[480px] bg-bg/20 backdrop-blur-3xl border-l border-white/10 flex flex-col z-[500] shadow-2xl">
            <div className="h-14 flex items-center justify-between px-6 border-b border-white/5 bg-black/60"><span className="text-[11px] font-black tracking-[4px] text-white">NEURAL HUB</span><button onClick={() => setShowAiHub(false)} className="text-txt3 hover:text-white"><X size={20} /></button></div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {aiMessages.map((m, i) => (<div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}><div className={`max-w-[85%] p-3 rounded-2xl text-[13px] border ${m.role === 'user' ? 'bg-primary text-black border-primary font-bold' : 'bg-black/60 text-white border-white/10'}`}>{m.content}</div></div>))}
            </div>
            <div className="p-4 bg-bg1 border-t border-bd pb-8"><input onKeyDown={(e) => { if(e.key === 'Enter') { const t = e.target as HTMLInputElement; processDirective(t.value); setAiMessages([...aiMessages, {role:'user', content:t.value}]); t.value=''; } }} className="w-full bg-black/40 border border-white/5 rounded-lg py-2 px-3 text-[12px] text-white" placeholder="Direct Order..." /></div>
          </motion.div>
        )}</AnimatePresence>
      </div>

      <div className="h-16 bg-bg1 border-t border-bd flex divide-x divide-bd/30 z-[600]">
        {[
          { id: 'core', label: 'CORE', icon: <Code2 size={18} /> },
          { id: 'ai_chat', label: 'HUB', icon: <Sparkles size={16} /> },
          { id: 'settings', label: 'CONF', icon: <Settings size={16} /> }
        ].map(item => (
          <button key={item.id} onClick={() => { if(item.id === 'ai_chat') setShowAiHub(!showAiHub); else setCurPage(item.id as PageType); }} className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all ${ (curPage === item.id && item.id !== 'ai_chat') || (showAiHub && item.id === 'ai_chat') ? 'text-primary bg-primary/5 shadow-[inset_0_-2px_0_rgba(255,176,0,1)]' : 'text-txt3' }`}> {item.icon} <span className="text-[9px] font-black tracking-[3px] uppercase">{item.label}</span> </button>
        ))}
      </div>
    </div>
  );
}
