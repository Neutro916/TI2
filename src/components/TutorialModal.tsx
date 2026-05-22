import React, { useState, useEffect } from 'react';
import { TerminalIcon, Activity, FileCode, X, ChevronRight, Check } from 'lucide-react';

export function TutorialModal() {
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);

  useEffect(() => {
    // Check if tutorial is already completed, and wait 2500ms (boot time) before showing
    const isCompleted = localStorage.getItem('t2i_tutorial_done');
    if (isCompleted !== 'true') {
      const timer = setTimeout(() => setShowTutorial(true), 2500);
      return () => clearTimeout(timer);
    }
    
    // Listen for custom event to restart tutorial
    const handleRestart = () => {
      setShowTutorial(true);
      setTutorialStep(0);
    };
    window.addEventListener('t2i:restart-tutorial', handleRestart);
    return () => window.removeEventListener('t2i:restart-tutorial', handleRestart);
  }, []);

  const tutorialSteps = [
    {
      title: "SYSTEM INITIALIZED",
      desc: "Welcome to Sovereign. This local-first tactical IDE features core functions: File Sync, AI Chat Hub, Terminal Emulators, and Script Execution.",
      icon: <TerminalIcon size={40} className="text-primary" />,
      action: "NEXT"
    },
    {
      title: "RIG ORCHESTRATION",
      desc: "Deploy bash shells and local terminals to interact with your filesystem and remote environments. Use the '+' icon to spawn sessions.",
      icon: <TerminalIcon size={40} className="text-primary" />,
      action: "NEXT"
    },
    {
      title: "T2I TUNNELING",
      desc: "Navigate to Settings to configure endpoints. Sovereign supports Ollama, LM Studio, SSH Tunnels, and Dockerized environments.",
      icon: <Activity size={40} className="text-primary" />,
      action: "NEXT"
    },
    {
      title: "SOVEREIGN DATA",
      desc: "The workspace uses a 'Tactical Registry' for notes and files. Everything is served locally, ensuring your cryptographic notes never leave your rig.",
      icon: <FileCode size={40} className="text-primary" />,
      action: "INITIATE"
    }
  ];

  const handleNext = () => {
    if (tutorialStep < tutorialSteps.length - 1) {
      setTutorialStep(prev => prev + 1);
    } else {
      localStorage.setItem('t2i_tutorial_done', 'true');
      setShowTutorial(false);
    }
  };

  if (!showTutorial) return null;

  const currentStep = tutorialSteps[tutorialStep];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0a0a0a] border border-[#333] rounded-xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col font-mono relative">
        <button 
          onClick={() => {
            localStorage.setItem('t2i_tutorial_done', 'true');
            setShowTutorial(false);
          }}
          className="absolute top-3 right-3 text-[#666] hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        <div className="p-6 flex-1 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-[#111] border border-[#333] p-3 rounded-lg text-[#FFB000]">
              {currentStep.icon}
            </div>
            <div>
              <div className="text-xs text-[#FFB000] font-bold tracking-widest uppercase mb-1">
                Step {tutorialStep + 1} / {tutorialSteps.length}
              </div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                {currentStep.title}
              </h2>
            </div>
          </div>
          
          <div className="text-[#888] text-sm leading-relaxed border-l-2 border-[#FFB000] pl-3 mt-2">
            {currentStep.desc}
          </div>
        </div>

        <div className="bg-[#111] p-4 border-t border-[#333] flex justify-between items-center">
          <div className="flex gap-1">
            {tutorialSteps.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-1 rounded-full transition-all duration-300 ${idx === tutorialStep ? 'w-6 bg-[#FFB000]' : 'w-2 bg-[#333]'}`}
              />
            ))}
          </div>
          <button 
            onClick={handleNext}
            className="flex items-center gap-2 bg-[#FFB000] text-black px-4 py-2 rounded font-bold text-xs hover:bg-white transition-colors"
          >
            {currentStep.action}
            {tutorialStep === tutorialSteps.length - 1 ? <Check size={14} /> : <ChevronRight size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
