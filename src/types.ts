export interface FileData {
  name: string;
  lang: string;
  color: string;
  raw: string;
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
  proto: string;
  model: string;
  status: 'LIVE' | 'IDLE' | 'API';
  apiKey?: string;
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

export type PageType = 'editor' | 'shell' | 'host' | 'aider' | 'config';
export type VimMode = 'NORMAL' | 'INSERT' | 'VISUAL' | 'COMMAND';
export type ChatMode = 'aider' | 'chat' | 'freq';
