import React from 'react';

interface ShellProps {
  activeShellId: string;
  shellTabs: any[];
  setActiveShellId: (id: string) => void;
}

const Shell: React.FC<ShellProps> = ({ activeShellId, shellTabs, setActiveShellId }) => {
  return (
    <div className="flex-1 bg-black flex flex-col p-4 font-mono text-green-400 text-sm overflow-hidden">
      <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
        {shellTabs.map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveShellId(tab.id)}
            className={`px-3 py-1 rounded-t-md text-[10px] uppercase tracking-widest ${activeShellId === tab.id ? 'bg-white/10 text-white' : 'text-txt3 hover:text-white'}`}
          >
            {tab.name}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-hide">
         <div className="text-txt3 mb-2">Establishing T2I-Secure-Bridge [83.33Hz]...</div>
         <div className="text-primary mt-2">RIG@T2I:~$ <span className="text-white animate-pulse">_</span></div>
      </div>
    </div>
  );
};

export default Shell;
