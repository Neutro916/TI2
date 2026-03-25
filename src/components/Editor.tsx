import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  FolderOpen, 
  Search, 
  FileCode, 
  Plus, 
  Monitor, 
  Code2, 
  Trash2, 
  Zap, 
  Sparkles
} from 'lucide-react';
import { FileData, PageType } from '../types';
import { highlightCode, LANG_LABELS } from '../utils/editorUtils.tsx';

interface EditorProps {
  files: FileData[];
  curFileIdx: number;
  isModified: boolean;
  showFileRail: boolean;
  showPreview: boolean;
  showSearch: boolean;
  searchQuery: string;
  searchResults: any[];
  editorScroll: { top: number; height: number; viewHeight: number };
  curLine: number;
  isCompact: boolean;
  setCurFileIdx: (idx: number) => void;
  setIsModified: (v: boolean) => void;
  setFiles: (files: FileData[]) => void;
  setShowFileRail: (v: boolean) => void;
  setShowPreview: (v: boolean) => void;
  setShowSearch: (v: boolean) => void;
  setSearchQuery: (v: string) => void;
  setEditorScroll: (v: any) => void;
  setCurLine: (v: number) => void;
  handleFolderUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeFile: (idx: number, e: React.MouseEvent) => void;
  highlightMatch: (res: any) => void;
  minimapRef: React.RefObject<HTMLDivElement>;
}

const Editor: React.FC<EditorProps> = ({
  files,
  curFileIdx,
  isModified,
  showFileRail,
  showPreview,
  showSearch,
  searchQuery,
  searchResults,
  editorScroll,
  curLine,
  isCompact,
  setCurFileIdx,
  setIsModified,
  setFiles,
  setShowFileRail,
  setShowPreview,
  setShowSearch,
  setSearchQuery,
  setEditorScroll,
  setCurLine,
  handleFolderUpload,
  removeFile,
  highlightMatch,
  minimapRef
}) => {
  const file = files[curFileIdx];
  const lines = (file && typeof file.raw === 'string') ? file.raw.split('\n') : ["No data available"];

  // Tab Compression Logic: Only show primary files (e.g. .tsx, .ts, .css) if isCompact is true
  const visibleFiles = isCompact 
    ? files.filter(f => f.name.endsWith('.tsx') || f.name.endsWith('.ts') || f.name.endsWith('.css') || f.name.indexOf('.') === -1)
    : files;

  return (
    <div className="flex flex-1 overflow-hidden relative">
      {/* Source Control Sidebar */}
      <AnimatePresence>
        {showFileRail && (
          <motion.div 
            initial={{ width: 0, opacity: 0, x: -20 }}
            animate={{ width: 280, opacity: 1, x: 0 }}
            exit={{ width: 0, opacity: 0, x: -20 }}
            className="border-r border-white/5 bg-[#0a0a0f]/90 backdrop-blur-3xl flex flex-col shrink-0 overflow-hidden shadow-2xl relative"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-[#0a0a0f] pointer-events-none" />
            <div className="h-16 flex items-center justify-between px-5 border-b border-white/5 shrink-0 relative z-10 bg-white/[0.02]">
              <div className="flex flex-col">
                <span className="text-[12px] font-bold tracking-[3px] text-white uppercase flex items-center gap-2">
                  <FolderOpen size={14} className="text-primary drop-shadow-[0_0_8px_rgba(255,176,0,0.8)]" />
                  SOURCE CONTROL
                </span>
                <span className="text-[9px] text-primary/70 uppercase tracking-[2px] mt-0.5">Workspace Tree</span>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => setShowSearch(true)} className="text-txt3 hover:text-white transition-colors"><Search size={14} /></button>
                <button onClick={() => setShowFileRail(false)} className="text-txt3 hover:text-white transition-colors"><X size={14} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-hide relative z-10">
              <div className="text-[10px] font-bold text-txt3/50 uppercase tracking-widest px-2 pb-2 border-b border-white/5 mb-3 flex justify-between">
                <span>All Changes</span>
                <span>{files.length} Files</span>
              </div>
              {files.map((f, i) => {
                const isMod = i === curFileIdx ? isModified : false;
                return (
                  <button 
                    key={i}
                    onClick={() => { setCurFileIdx(i); setIsModified(false); }}
                    className={`w-full flex items-center justify-between px-3 py-3 rounded-xl transition-all duration-300 group border relative overflow-hidden ${i === curFileIdx ? 'bg-primary/10 border-primary/30 text-white shadow-[0_0_20px_rgba(255,176,0,0.1)]' : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/10 text-txt3 hover:text-white'}`}
                  >
                    {i === curFileIdx && <div className="absolute inset-y-0 left-0 w-1 bg-primary shadow-[0_0_10px_rgba(255,176,0,1)]" />}
                    <div className="flex items-center gap-3 overflow-hidden z-10">
                      <FileCode size={16} className={isMod ? 'text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.5)]' : i === curFileIdx ? 'text-primary' : 'text-txt3 group-hover:text-white transition-colors'} />
                      <span className="text-[13px] font-medium tracking-wide truncate text-left drop-shadow-sm">{f.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col flex-1 overflow-hidden relative">
        {!showFileRail && (
          <button 
            onClick={() => setShowFileRail(true)}
            className="absolute left-2 top-11 z-20 p-2 bg-[#0a0a0f]/80 backdrop-blur border border-white/10 rounded-lg shadow-xl text-primary hover:scale-110 transition-transform"
          >
            <FolderOpen size={16} />
          </button>
        )}

        {/* Tab Bar */}
        <div className="h-9 bg-bg1 border-b border-bd flex overflow-x-auto scrollbar-hide shrink-0">
          {visibleFiles.map((f, i) => {
            const actualIdx = files.indexOf(f);
            return (
              <div 
                key={i}
                onClick={() => { setCurFileIdx(actualIdx); setIsModified(false); }}
                className={`flex items-center gap-2 px-3 text-[14px] font-medium tracking-wider cursor-pointer border-r border-bd min-w-[100px] transition-all shrink-0 ${actualIdx === curFileIdx ? 'text-primary bg-bg2 border-b-2 border-b-primary' : 'text-txt3 font-medium'}`}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: f.color }}></div>
                <span className="truncate max-w-[80px]">{f.name}</span>
                <X size={10} className="ml-auto hover:text-red-primary transition-colors" onClick={(e) => removeFile(actualIdx, e)} />
              </div>
            );
          })}
          <div className="flex items-center justify-center w-9 text-txt3 font-medium cursor-pointer hover:text-txt" onClick={() => {
             const name = prompt('File name:', 'untitled.txt');
             if (name) setFiles([...files, { name, lang: 'txt', color: '#666666', raw: '' }]);
          }}><Plus size={14} /></div>
          <div className={`flex items-center justify-center px-4 text-[14px] font-bold cursor-pointer border-l border-bd tracking-widest ${showPreview ? 'bg-primary text-black' : 'text-txt3 hover:text-white'}`} onClick={() => setShowPreview(!showPreview)}>
            <Monitor size={12} className="mr-2" /> PREVIEW
          </div>
        </div>
        
        {/* Breadcrumb Feed */}
        <div className="h-6 bg-bg1 border-b border-bd flex items-center px-4 gap-2 shrink-0 text-[10px] font-bold text-txt3 uppercase tracking-tighter">
          <span>WORKSPACE › SOURCE › {file?.name?.toUpperCase() || 'NONE'}</span>
          <span className="ml-auto opacity-50">LN {curLine}</span>
          <span className="ml-2 opacity-50">{LANG_LABELS[curFileIdx] || 'TXT'}</span>
        </div>

        {/* Workspace Body */}
        <div className="flex-1 flex overflow-hidden relative">
          {!file ? (
            <div className="flex-1 flex flex-col items-center justify-center pointer-events-none select-none bg-black/40">
              <Code2 size={64} className="text-bd mb-6 opacity-20" />
              <div className="text-txt3/30 text-2xl font-black uppercase tracking-[4px] mb-3 text-center">Empty Hub</div>
              <div className="text-txt3/20 text-[14px] font-bold uppercase tracking-widest">Select source to begin</div>
            </div>
          ) : (
            <>
              {/* Line Numbers */}
              <div className="w-10 bg-bg1 border-r border-bd py-2 text-right pr-2 text-[13px] font-medium text-txt3 shrink-0 select-none">
                {lines.map((_, i) => (
                  <div key={i} className={i === curLine - 1 ? 'text-primary bg-primary/5' : ''}>{i + 1}</div>
                ))}
              </div>
              
              {/* Syntax Highlighting Overlay + Textarea */}
              <div className="flex-1 overflow-auto bg-bg relative">
                <div className="absolute inset-0 p-2 text-[14px] font-medium leading-relaxed font-mono pointer-events-none whitespace-pre overflow-hidden opacity-80">
                  {lines.map((line, i) => (
                    <div key={i} className={i === curLine - 1 ? 'bg-primary/10' : ''}>
                      {highlightCode(line)}
                    </div>
                  ))}
                </div>
                <textarea
                  className="w-full h-full p-2 text-[14px] font-medium leading-relaxed bg-transparent outline-none resize-none font-mono caret-primary text-transparent selection:bg-primary/30"
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
                  spellCheck={false}
                />
              </div>

              {/* Minimap (Compact Navigation) */}
              <div ref={minimapRef} className="w-16 bg-black/40 border-l border-bd overflow-hidden shrink-0 hidden lg:block opacity-50 relative">
                 <div className="absolute top-0 left-0 right-0 h-4 bg-primary/20 border-y border-primary/40 pointer-events-none" style={{ top: `${(curLine/lines.length)*100}%` }} />
                 <div className="scale-[0.2] origin-top-left p-1 whitespace-pre font-mono text-txt3 pointer-events-none">
                    {file.raw}
                 </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Editor;
