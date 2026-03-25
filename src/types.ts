import { ReactNode } from 'react';

export type PageType = 'editor' | 'shell' | 'display' | 'ai_chat' | 'settings';

export interface FileData {
  name: string;
  lang: string;
  color: string;
  raw: string;
}

export interface Todo {
  task: string;
  status: 'pending' | 'completed';
}

export interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: Array<{ name: string; args: any }>;
}

export interface ShellTab {
  id: string;
  name: string;
}

export interface Endpoint {
  id: string;
  name: string;
  url: string;
  type: string;
  active?: boolean;
  host?: string;
  port?: string;
  model?: string;
  apiKey?: string;
  secondaryToken?: string;
  sshKey?: string;
  containerId?: string;
  notes?: string;
  quantization?: string;
  icon?: string;
}

export interface Notification {
  id: string;
  message: string;
}

export interface Script {
  name: string;
  cmd: string;
}
export interface ShellLine {
  text: string;
  type: 'input' | 'output' | 'error' | 'status';
}

export type VimMode = 'NORMAL' | 'INSERT' | 'VISUAL';
export type ChatMode = 'direct' | 'thought' | 'tool';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
