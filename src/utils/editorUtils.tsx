import React from 'react';

export const LANG_LABELS: Record<number, string> = {
  0: 'TSX',
  1: 'CSS',
  2: 'JSON'
};

export const highlightCode = (line: string) => {
  if (!line) return line;
  const parts = line.split(/([{}()[\].,:;+\-*/=<>!&|? \t\n])/);
  return parts.map((p, i) => {
    if (['const', 'let', 'var', 'function', 'return', 'import', 'export', 'from', 'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue', 'new', 'this', 'class', 'extends', 'super', 'interface', 'type', 'enum', 'default', 'as', 'async', 'await', 'void', 'null', 'undefined', 'true', 'false'].includes(p)) {
      return <span key={i} className="text-resonance font-bold">{p}</span>;
    }
    if (p.startsWith('"') || p.startsWith("'") || p.startsWith('`')) {
      return <span key={i} className="text-green-400">{p}</span>;
    }
    if (!isNaN(Number(p)) && p.trim() !== '') {
      return <span key={i} className="text-primary">{p}</span>;
    }
    if (p.startsWith('//') || p.startsWith('/*')) {
      return <span key={i} className="text-txt3 italic">{p}</span>;
    }
    if (['{', '}', '(', ')', '[', ']'].includes(p)) {
      return <span key={i} className="text-primary font-black scale-110 inline-block">{p}</span>;
    }
    return p as any;
  });
};
