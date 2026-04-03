import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { io } from 'socket.io-client';
import '@xterm/xterm/css/xterm.css';

interface LocalShellProps {
  type: 'bash' | 'powershell';
  shellId: string;
}

export const LocalShell: React.FC<LocalShellProps> = ({ type, shellId }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'JetBrains Mono', monospace",
      theme: {
        background: '#050505',
        foreground: '#FFB000',
        cursor: '#FFB000',
        selectionBackground: '#332600',
      },
      allowTransparency: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    
    // Small delay to ensure container is sized
    setTimeout(() => {
      try {
        fitAddon.fit();
      } catch (e) {}
    }, 100);

    const socket = io();

    let currentLine = '';
    let history: string[] = [];
    let historyIndex = -1;

    socket.on('connect', () => {
      term.writeln(`\x1b[32m[OK] Connected to local ${type} shell\x1b[0m`);
    });

    socket.on('terminal:output', (data: string) => {
      // Write output, converting newlines to CRLF
      term.write(data.replace(/\n/g, '\r\n'));
    });

    socket.on('connect_error', () => {
      term.writeln('\x1b[31m[ERR] Failed to connect to local bridge\x1b[0m');
    });

    socket.on('disconnect', () => {
      term.writeln('\r\n\x1b[33m[WARN] Connection to local bridge closed\x1b[0m');
    });

    term.onData((data) => {
      if (!socket.connected) return;

      // Handle Enter
      if (data === '\r') {
        term.write('\r\n');
        if (currentLine.trim()) {
          history.push(currentLine);
          historyIndex = history.length;
        }
        socket.emit('terminal:input', currentLine + '\n');
        currentLine = '';
      }
      // Handle Backspace
      else if (data === '\x7f') {
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1);
          term.write('\b \b');
        }
      }
      // Handle Up Arrow
      else if (data === '\x1b[A') {
        if (historyIndex > 0) {
          historyIndex--;
          while (currentLine.length > 0) {
            term.write('\b \b');
            currentLine = currentLine.slice(0, -1);
          }
          currentLine = history[historyIndex];
          term.write(currentLine);
        }
      }
      // Handle Down Arrow
      else if (data === '\x1b[B') {
        if (historyIndex < history.length - 1) {
          historyIndex++;
          while (currentLine.length > 0) {
            term.write('\b \b');
            currentLine = currentLine.slice(0, -1);
          }
          currentLine = history[historyIndex];
          term.write(currentLine);
        } else if (historyIndex === history.length - 1) {
          historyIndex++;
          while (currentLine.length > 0) {
            term.write('\b \b');
            currentLine = currentLine.slice(0, -1);
          }
          currentLine = '';
        }
      }
      // Handle Left/Right Arrow (ignore for now to keep it simple)
      else if (data === '\x1b[C' || data === '\x1b[D') {
        // Do nothing
      }
      // Handle printable characters
      else if (data >= String.fromCharCode(0x20) && data <= String.fromCharCode(0x7E)) {
        currentLine += data;
        term.write(data);
      }
    });

    const handleResize = () => {
      try {
        fitAddon.fit();
      } catch (e) {}
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
      socket.disconnect();
    };
  }, [type]);

  return <div ref={containerRef} className="w-full h-full bg-[#050505] p-4" />;
};
