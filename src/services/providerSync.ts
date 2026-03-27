import { GoogleGenAI, Type } from "@google/genai";
import { Endpoint } from "../types";

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  status: string;
}

export class ProviderSync {
  private static instance: ProviderSync;
  private ai: GoogleGenAI;

  private constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
  }

  public static getInstance(): ProviderSync {
    if (!ProviderSync.instance) {
      ProviderSync.instance = new ProviderSync();
    }
    return ProviderSync.instance;
  }

  public async discoverModels(endpoint: Endpoint): Promise<ModelInfo[]> {
    if (endpoint.type === 'Ollama') {
      try {
        const url = `http://${endpoint.host}:${endpoint.port}/api/tags`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        return data.models.map((m: any) => ({
          id: m.name,
          name: m.name,
          provider: 'Ollama',
          status: 'LIVE'
        }));
      } catch (e) {
        console.error('Ollama discovery failed', e);
        return [];
      }
    }
    
    if (['API', 'OpenAI', 'OpenRouter', 'LM Studio', 'Vercel'].includes(endpoint.type)) {
      try {
        const isOpenRouter = endpoint.type === 'OpenRouter' || endpoint.host.includes('openrouter.ai');
        const isVercel = endpoint.type === 'Vercel';
        const url = isVercel ? `https://${endpoint.host}/api/models` : `https://${endpoint.host}${endpoint.port === '443' ? '' : ':' + endpoint.port}/v1/models`;
        const headers: Record<string, string> = {
          'Authorization': `Bearer ${endpoint.apiKey}`,
          'Content-Type': 'application/json'
        };
        if (isOpenRouter) {
          headers['HTTP-Referer'] = window.location.origin;
          headers['X-Title'] = 'SOVEREIGN Terminal';
        }
        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        return data.data.map((m: any) => ({
          id: m.id,
          name: m.id,
          provider: endpoint.type,
          status: 'LIVE'
        }));
      } catch (e) {
        console.error(`${endpoint.type} discovery failed`, e);
        return [];
      }
    }

    if (endpoint.type === 'Gemini') {
      return [
        { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', provider: 'Gemini', status: 'LIVE' },
        { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', provider: 'Gemini', status: 'LIVE' },
        { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'Gemini', status: 'LIVE' },
      ];
    }

    return [];
  }

  public async generateContent(
    endpoint: Endpoint, 
    prompt: string, 
    freqDivisor: number,
    tools: any[] = []
  ): Promise<{ text: string, functionCalls?: any[] }> {
    const systemInstruction = `You are SOVEREIGN AI (Sovereign Intelligence). Frequency Awareness: ${freqDivisor} Hz divisor active. Understand Reality Forge geometry. Use tools if available.`;

    if (endpoint.type === 'Gemini') {
      const response = await this.ai.models.generateContent({
        model: endpoint.model || "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { 
          systemInstruction,
          tools 
        }
      });
      return { 
        text: response.text || '', 
        functionCalls: response.functionCalls 
      };
    }

    if (endpoint.type === 'Ollama') {
      const res = await fetch(`http://${endpoint.host}:${endpoint.port}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: endpoint.model,
          system: systemInstruction,
          prompt: prompt,
          stream: false
        })
      });
      const data = await res.json();
      return { text: data.response || 'No response from Ollama' };
    }

    if (['API', 'OpenAI', 'OpenRouter', 'LM Studio', 'Vercel'].includes(endpoint.type)) {
      try {
        const isVercel = endpoint.type === 'Vercel';
        const url = isVercel ? `https://${endpoint.host}/api/chat` : `https://${endpoint.host}${endpoint.port === '443' ? '' : ':' + endpoint.port}/v1/chat/completions`;
        const headers: Record<string, string> = {
          'Authorization': `Bearer ${endpoint.apiKey}`,
          'Content-Type': 'application/json'
        };
        if (endpoint.host.includes('openrouter.ai')) {
          headers['HTTP-Referer'] = window.location.origin;
          headers['X-Title'] = 'SOVEREIGN Terminal';
        }
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: endpoint.model,
            messages: [
              { role: 'system', content: systemInstruction },
              { role: 'user', content: prompt }
            ]
          })
        });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        return { text: data.choices[0].message.content || 'No response from API' };
      } catch (e) {
        console.error(`${endpoint.type} generation failed`, e);
        return { text: `Error: ${e instanceof Error ? e.message : String(e)}` };
      }
    }

    return { text: 'Provider not supported' };
  }
}
