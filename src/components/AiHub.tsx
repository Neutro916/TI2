import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Cpu, 
  Terminal as TerminalIcon, 
  ChevronRight,
  Send,
  Trash2,
  Clock,
  Activity,
  Layers,
  Database,
  Globe,
  Settings,
  X
} from 'lucide-react';
import { AiMessage, Endpoint, Notification, PageType } from '../types';

interface AiHubProps {
  aiMessages: AiMessage[];
  isThinking: boolean;
  lastTool: string;
  aiProcessLog: any[];
  endpoints: Endpoint[];
  selectedEndpointId: string;
  setSelectedEndpointId: (id: string) => void;
  processDirective: (v: string) => void;
  setShowAiSidebar: (v: boolean) => void;
  endpointHealth: Record<string, 'online' | 'offline' | 'warning'>;
  setCurPage: (v: PageType) => void;
  setAiMessages: React.Dispatch<React.SetStateAction<AiMessage[]>>;
}

const AiHub: React.FC<AiHubProps> = ({
  aiMessages,
  isThinking,
  lastTool,
  aiProcessLog,
  endpoints,
  selectedEndpointId,
  setSelectedEndpointId,
  processDirective,
  setShowAiSidebar,
  endpointHealth,
  setAiMessages,
  setCurPage
}) => {
  const chatEndRef = useRef<HTMLDivElement>(null);
  const processLogEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiMessages]);

  useEffect(() => {
    processLogEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiProcessLog]);

  const activeEndpoint = endpoints.find(e => e.id === selectedEndpointId) || endpoints[0];

  return (
    <motion.div 
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute right-0 top-0 h-full w-[380px] sm:w-[450px] bg-bg/40 backdrop-blur-xl border-l border-white/10 flex flex-col shrink-0 overflow-hidden z-[100] shadow-[-10px_0_30px_rgba(0,0,0,0.5)]"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-resonance/10 pointer-events-none" />
      
      {/* AI Hub Header */}
      <div className="h-14 flex items-center justify-between px-5 border-b border-white/5 bg-white/[0.02] shrink-0 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/30 shadow-[0_0_15px_rgba(255,176,0,0.2)]">
            <Sparkles size={16} className="text-primary animate-pulse" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-black tracking-[3px] text-white uppercase leading-none">Intelligence</span>
            <span className="text-[8px] text-primary/70 font-mono tracking-[2px] mt-1 uppercase">Personal Rig Core</span>
          </div>
        </div>
        <button onClick={() => setShowAiSidebar(false)} className="text-txt3 hover:text-white transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Endpoint Selector Tabs */}
      <div className="flex bg-black/40 border-b border-bd overflow-x-auto scrollbar-hide shrink-0 relative z-10">
        {endpoints.map(ep => (
          <button 
            key={ep.id}
            onClick={() => setSelectedEndpointId(ep.id)}
            className={`flex-1 min-w-[100px] h-10 px-3 flex items-center justify-center gap-2 border-r border-bd transition-all relative overflow-hidden ${selectedEndpointId === ep.id ? 'bg-primary/10 text-primary' : 'text-txt3 hover:bg-white/5'}`}
          >
            {selectedEndpointId === ep.id && <motion.div layoutId="ep-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(255,176,0,1)]" />}
            <div className={`w-1.5 h-1.5 rounded-full ${endpointHealth[ep.id] === 'online' ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-red-500 opacity-50'}`} />
            <span className="text-[9px] font-black tracking-widest uppercase truncate">{ep.name}</span>
          </button>
        ))}
        <button className="px-3 border-l border-bd text-txt3 hover:text-white transition-colors" onClick={() => setCurPage('settings')}>
          <Settings size={12} />
        </button>
      </div>

      {/* AI Chat History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide relative z-10">
        {aiMessages.map((msg, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div className={`max-w-[90%] p-3 rounded-2xl text-[13px] leading-relaxed shadow-lg border relative group overflow-hidden ${msg.role === 'user' ? 'bg-primary text-black font-medium border-primary/50' : 'bg-bg2/80 text-txt1 border-white/5'}`}>
              {msg.role === 'assistant' && <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary/50 transition-colors" />}
              {msg.content}
              {msg.toolCalls && (
                <div className="mt-2 space-y-1">
                  {msg.toolCalls.map((call, ci) => (
                    <div key={ci} className="bg-black/50 p-2 rounded text-[10px] font-mono border border-primary/20 text-primary flex items-center gap-2">
                      <TerminalIcon size={10} />
                      <span className="opacity-70">EX_SKILL:</span>
                      <span className="font-bold">{call.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <span className="text-[8px] text-txt3 font-bold uppercase tracking-widest mt-1 px-2">{msg.role === 'user' ? 'LOCAL_INPUT' : activeEndpoint.name}</span>
          </motion.div>
        ))}
        {isThinking && (
          <div className="flex flex-col items-start">
            <div className="bg-bg2/80 p-3 rounded-2xl border border-white/5 flex items-center gap-3">
              <div className="flex gap-1">
                {[0, 1, 2].map(d => (
                  <motion.div 
                    key={d}
                    animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                    transition={{ repeat: Infinity, duration: 1, delay: d * 0.2 }}
                    className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_5px_rgba(255,176,0,0.5)]"
                  />
                ))}
              </div>
              <span className="text-[10px] text-txt3 font-mono uppercase tracking-[2px]">{lastTool || 'Thinking...'}</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Neural Process Log (Bottom Half) */}
      <div className="h-[220px] bg-black/60 border-t border-bd flex flex-col shrink-0 relative z-10">
        <div className="h-8 flex items-center justify-between px-4 border-b border-white/5 bg-white/[0.02]">
           <div className="flex items-center gap-2">
              <Activity size={10} className="text-primary animate-pulse" />
              <span className="text-[9px] font-black tracking-[4px] text-white uppercase">Neural Log</span>
           </div>
           <span className="text-[8px] text-txt3 font-mono">{aiProcessLog.length} EVENTS</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 font-mono text-[10px] scrollbar-hide">
           {aiProcessLog.map(log => (
             <div key={log.id} className="flex gap-3 group">
               <span className="text-txt3/40 shrink-0">[{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
               <span className={`${log.type === 'error' ? 'text-red-400' : log.type === 'tool' ? 'text-primary' : log.type === 'status' ? 'text-resonance' : 'text-txt2'} break-all group-hover:translate-x-1 transition-transform cursor-default whitespace-pre-wrap`}>
                 {log.type === 'tool' && '○ '}
                 {log.text}
               </span>
             </div>
           ))}
           <div ref={processLogEndRef} />
        </div>
      </div>

      {/* Prompt Bar Overlay */}
      <div className="p-4 bg-bg1 border-t border-bd shrink-0 relative z-20">
        <div className="relative flex items-center group">
          <input 
            className="w-full bg-black/60 border border-white/5 group-hover:border-primary/30 transition-all rounded-xl py-3 pl-4 pr-12 text-[13px] text-white placeholder:text-txt3/40 outline-none font-medium tracking-wide shadow-2xl focus:border-primary/50"
            placeholder="Direct Neural Order..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const target = e.target as HTMLInputElement;
                if (target.value.trim()) {
                  setAiMessages(prev => [...prev, { role: 'user', content: target.value }]);
                  processDirective(target.value);
                  target.value = '';
                }
              }
            }}
          />
          <button className="absolute right-2 p-2 bg-primary/10 text-primary hover:bg-primary hover:text-black transition-all rounded-lg group-focus-within:bg-primary group-focus-within:text-black">
            <Send size={16} />
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between px-1">
           <div className="flex gap-3">
              <button 
                onClick={() => setAiMessages([{ role: 'assistant', content: 'Rig Core Ready. System history purged.' }])}
                className="text-[8px] font-black tracking-widest text-txt3 hover:text-red-primary flex items-center gap-1.5 transition-colors"
                title="Purge Memory"
              >
                <Trash2 size={10} /> CLEAR
              </button>
              <button className="text-[8px] font-black tracking-widest text-txt3 hover:text-primary flex items-center gap-1.5 transition-colors">
                <Database size={10} /> SYNC SKILLS
              </button>
           </div>
           <span className="text-[8px] text-txt3 font-bold uppercase tracking-widest opacity-30">Shift + Ent for Multiline</span>
        </div>
      </div>
    </motion.div>
  );
};

export default AiHub;
