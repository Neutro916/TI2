export interface FileData {
  name: string;
  lang: string;
  color: string;
  raw: string;
  type?: 'file' | 'bash' | 'powershell';
  shellId?: string;
}

export interface ShellLine {
  text: string;
  color: string;
}

export interface Endpoint {
  id: string;
  name: string;
  type: string;
  host: string;
  port: string;
  model?: string;
  apiKey?: string;
  secondaryToken?: string;
  sshKey?: string;
  containerId?: string;
  notes?: string;
  quantization?: string;
  config?: string;
  status: 'LIVE' | 'IDLE' | 'API';
  icon?: string;
  isProvider?: boolean;
}

export interface BridgeConfig {
  enabled: boolean;
  url: string; // The tunnel URL to the local bridge.js
}

export interface MCPConfig {
  id: string;
  name: string;
  command: string;
  args: string[];
  status: 'connected' | 'disconnected';
}

export interface Message {
  role: 'user' | 'ai' | 'system';
  content: string;
  code?: string;
  thinking?: string;
}

export interface TerminalSession {
  id: string;
  name: string;
  type: 'bash' | 'powershell' | 'endpoint';
  endpointId?: string;
}

export type PageType = 'editor' | 'shell' | 'display' | 'settings' | 'hub' | 'terminal';
export type VimMode = 'NORMAL' | 'INSERT' | 'VISUAL' | 'COMMAND';
export type ChatMode = 'aider' | 'chat' | 'freq';
