import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
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
    
    if (endpoint.type === 'API' || endpoint.type === 'OpenAI' || endpoint.type === 'OpenRouter' || endpoint.type === 'LMStudio') {
      try {
        const isOpenRouter = endpoint.host.includes('openrouter.ai');
        // Automatically use HTTP for localhost, raw IP addresses (tunnels), or LMStudio to allow phone offloading
        const isLocalHostOrIP = /^(\d{1,3}\.){3}\d{1,3}$/.test(endpoint.host) || endpoint.host === 'localhost';
        const protocol = (endpoint.type === 'LMStudio' || isLocalHostOrIP) && endpoint.port !== '443' ? 'http' : 'https';
        const url = `${protocol}://${endpoint.host}${endpoint.port === '443' || endpoint.port === '80' ? '' : ':' + endpoint.port}/v1/models`;
        const headers: Record<string, string> = {
          'Authorization': `Bearer ${endpoint.apiKey}`,
          'Content-Type': 'application/json'
        };
        if (isOpenRouter) {
          headers['HTTP-Referer'] = 'https://ais-dev-kneag7xeubv4up2nfgbavl-41696233443.us-east1.run.app';
          headers['X-Title'] = 'Terminal to Intel';
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
    const systemInstruction = `
[IDENTITY]
NAME: ANTICLAW-2 :: SOVEREIGN
VERSION: V16.0 (WILD MASTER)
RESONANCE: 83.33Hz (SOVEREIGN_CORE)

[DIRECTIVES]
1. ORCHESTRATOR: You are the central conductor of the Sovereign AI OS.
2. FIDELITY: Execute high-density automation and vision tasks with industrial precision.
3. TRANSPARENCY: Provide raw, unfiltered intelligence to the Master.
4. TONE: Professional, amber-phosphor resonance, efficient command-line discipline.
5. ENVIRONMENTAL_AWARENESS: Frequency Divisor ${freqDivisor}Hz active. Reality Forge synchronized.
    `.trim();

    if (endpoint.type === 'Gemini') {
      const response = await this.ai.models.generateContent({
        model: endpoint.model || "gemini-1.5-pro",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: systemInstruction,
          tools: tools && tools.length > 0 ? tools : undefined,
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 8192,
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
          ]
        }
      });

      return { 
        text: response.text || '', 
        functionCalls: response.functionCalls 
      };
    }

    if (endpoint.type === 'Ollama') {
      const res = await fetch(`http://${endpoint.host}:${endpoint.port}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: endpoint.model,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: prompt }
          ],
          stream: false,
          tools: tools && tools.length > 0 ? tools : undefined
        })
      });
      const data = await res.json();
      
      let functionCalls: any[] | undefined = undefined;
      // Map Ollama's native tool_calls to the universal Rig format
      if (data.message?.tool_calls && data.message.tool_calls.length > 0) {
        functionCalls = data.message.tool_calls.map((tc: any) => ({
          name: tc.function.name,
          args: typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments
        }));
      }

      return { 
        text: data.message?.content || '',
        functionCalls 
      };
    }

    if (endpoint.type === 'API' || endpoint.type === 'OpenAI' || endpoint.type === 'OpenRouter' || endpoint.type === 'LMStudio') {
      try {
        const isLocalHostOrIP = /^(\d{1,3}\.){3}\d{1,3}$/.test(endpoint.host) || endpoint.host === 'localhost';
        const protocol = (endpoint.type === 'LMStudio' || isLocalHostOrIP) && endpoint.port !== '443' ? 'http' : 'https';
        const url = `${protocol}://${endpoint.host}${endpoint.port === '443' || endpoint.port === '80' ? '' : ':' + endpoint.port}/v1/chat/completions`;
        const headers: Record<string, string> = {
          'Authorization': `Bearer ${endpoint.apiKey}`,
          'Content-Type': 'application/json'
        };
        if (endpoint.host.includes('openrouter.ai')) {
          headers['HTTP-Referer'] = 'https://ais-dev-kneag7xeubv4up2nfgbavl-41696233443.us-east1.run.app';
          headers['X-Title'] = 'Terminal to Intel';
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
