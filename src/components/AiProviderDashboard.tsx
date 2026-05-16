import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu,
  Zap,
  Globe,
  Activity,
  Wifi,
  Server,
  Database,
  Shield,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCcw,
  Settings,
  Terminal,
  Code2,
  Sparkles,
  Layers,
  HardDrive,
  Bot
} from 'lucide-react';

interface ServiceStatus {
  name: string;
  url: string;
  status: 'online' | 'offline' | 'loading';
  latency?: number;
  model?: string;
  type: 'ai' | 'code' | 'tunnel' | 'storage';
}

interface ProviderConfig {
  id: string;
  name: string;
  endpoint: string;
  apiKey?: string;
  enabled: boolean;
  models: string[];
  defaultModel: string;
}

const AiProviderDashboard: React.FC = () => {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('openwebui');
  const [showConfig, setShowConfig] = useState(false);

  const [providers, setProviders] = useState<ProviderConfig[]>([
    {
      id: 'openwebui',
      name: 'OpenWebUI',
      endpoint: 'http://localhost:3001',
      enabled: true,
      models: ['gemma-2-9b-it', 'llama-3.1-8b', 'mistral-7b'],
      defaultModel: 'gemma-2-9b-it'
    },
    {
      id: 'lmstudio',
      name: 'LM Studio',
      endpoint: 'http://localhost:1234',
      enabled: true,
      models: ['local-model'],
      defaultModel: 'local-model'
    },
    {
      id: 'ollama',
      name: 'Ollama',
      endpoint: 'http://localhost:11434',
      enabled: true,
      models: ['gemma-2-9b-it', 'llama-3.1-8b', 'mistral-7b', 'nomic-embed-text'],
      defaultModel: 'gemma-2-9b-it'
    },
    {
      id: 'gemini',
      name: 'Google Gemini',
      endpoint: 'https://generativelanguage.googleapis.com',
      apiKey: '',
      enabled: false,
      models: ['gemini-2.0-flash', 'gemini-3-flash', 'gemini-3.1-pro'],
      defaultModel: 'gemini-2.0-flash'
    },
    {
      id: 'openrouter',
      name: 'OpenRouter',
      endpoint: 'https://openrouter.ai/api',
      apiKey: '',
      enabled: false,
      models: ['meta-llama/llama-3.1-405b-instruct', 'google/gemma-2-9b-it'],
      defaultModel: 'meta-llama/llama-3.1-405b-instruct'
    }
  ]);

  const checkServiceStatus = async () => {
    setIsRefreshing(true);
    
    const serviceChecks: ServiceStatus[] = [
      {
        name: 'OpenWebUI',
        url: 'http://localhost:3001',
        status: 'loading',
        type: 'ai' as const
      },
      {
        name: 'LM Studio',
        url: 'http://localhost:1234',
        status: 'loading',
        type: 'ai' as const
      },
      {
        name: 'Ollama',
        url: 'http://localhost:11434',
        status: 'loading',
        type: 'ai' as const
      },
      {
        name: 'T2I Server',
        url: 'http://localhost:3000',
        status: 'loading',
        type: 'code' as const
      },
      {
        name: 'code-server',
        url: 'http://localhost:8080',
        status: 'loading',
        type: 'code' as const
      },
      {
        name: 'Ngrok Tunnel',
        url: 'http://localhost:4040',
        status: 'loading',
        type: 'tunnel' as const
      }
    ];

    setServices(serviceChecks);

    // Check each service
    const checked = await Promise.all(
      serviceChecks.map(async (service) => {
        const startTime = Date.now();
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          
          const response = await fetch(service.url, {
            signal: controller.signal,
            method: 'HEAD'
          });
          
          clearTimeout(timeoutId);
          const latency = Date.now() - startTime;
          
          return {
            ...service,
            status: response.ok ? 'online' : 'offline' as const,
            latency
          };
        } catch (error) {
          return {
            ...service,
            status: 'offline' as const
          };
        }
      })
    );

    setServices(checked);
    setIsRefreshing(false);
  };

  useEffect(() => {
    checkServiceStatus();
    const interval = setInterval(checkServiceStatus, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle2 className="text-green-500" size={20} />;
      case 'offline':
        return <XCircle className="text-red-500" size={20} />;
      case 'loading':
        return <RefreshCcw className="text-yellow-500 animate-spin" size={20} />;
      default:
        return <AlertCircle className="text-gray-500" size={20} />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'ai':
        return <Bot className="text-purple-400" size={16} />;
      case 'code':
        return <Code2 className="text-blue-400" size={16} />;
      case 'tunnel':
        return <Globe className="text-green-400" size={16} />;
      case 'storage':
        return <Database className="text-orange-400" size={16} />;
      default:
        return <Server className="text-gray-400" size={16} />;
    }
  };

  const onlineCount = services.filter(s => s.status === 'online').length;
  const totalCount = services.length;

  return (
    <div className="flex-1 bg-[#0a0a0f] flex flex-col p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
            <Cpu size={24} className="text-primary animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-[6px] text-white uppercase">
              AI Provider Hub
            </h2>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest">
              Unified Intelligence Layer
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={checkServiceStatus}
            disabled={isRefreshing}
            className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-xl text-primary hover:bg-primary/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCcw size={14} className={isRefreshing ? 'animate-spin' : ''} />
            <span className="text-[10px] font-black uppercase tracking-wider">
              {isRefreshing ? 'Checking...' : 'Refresh'}
            </span>
          </button>
          
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white hover:bg-zinc-700 transition-all flex items-center gap-2"
          >
            <Settings size={14} />
            <span className="text-[10px] font-black uppercase tracking-wider">Config</span>
          </button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Activity size={16} className="text-green-500" />
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Status</span>
          </div>
          <div className="text-2xl font-black text-white">
            {onlineCount}/{totalCount}
          </div>
          <div className="text-[9px] text-zinc-400 uppercase tracking-wider mt-1">
            Services Online
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Zap size={16} className="text-yellow-500" />
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Avg Latency</span>
          </div>
          <div className="text-2xl font-black text-white">
            {services.filter(s => s.latency).length > 0
              ? Math.round(services.filter(s => s.latency).reduce((acc, s) => acc + (s.latency || 0), 0) / services.filter(s => s.latency).length)
              : '--'
            }ms
          </div>
          <div className="text-[9px] text-zinc-400 uppercase tracking-wider mt-1">
            Response Time
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Wifi size={16} className="text-blue-500" />
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Tunnels</span>
          </div>
          <div className="text-2xl font-black text-white">
            {services.filter(s => s.type === 'tunnel' && s.status === 'online').length}
          </div>
          <div className="text-[9px] text-zinc-400 uppercase tracking-wider mt-1">
            Active Tunnels
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <Shield size={16} className="text-purple-500" />
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Security</span>
          </div>
          <div className="text-2xl font-black text-white">
            {providers.filter(p => p.apiKey).length}/{providers.length}
          </div>
          <div className="text-[9px] text-zinc-400 uppercase tracking-wider mt-1">
            API Keys Configured
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Provider List */}
        <div className="w-80 flex flex-col gap-3 overflow-y-auto">
          <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">
            AI Providers
          </h3>
          
          {providers.map((provider) => (
            <button
              key={provider.id}
              onClick={() => setSelectedProvider(provider.id)}
              className={`p-4 rounded-xl border transition-all text-left ${
                selectedProvider === provider.id
                  ? 'bg-primary/10 border-primary/40 shadow-lg shadow-primary/10'
                  : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-600'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    provider.enabled ? 'bg-green-500 animate-pulse' : 'bg-zinc-600'
                  }`} />
                  <span className="text-sm font-bold text-white">{provider.name}</span>
                </div>
                {provider.enabled ? (
                  <CheckCircle2 size={14} className="text-green-500" />
                ) : (
                  <XCircle size={14} className="text-zinc-600" />
                )}
              </div>
              <div className="text-[9px] text-zinc-400 truncate">
                {provider.endpoint}
              </div>
              <div className="text-[8px] text-zinc-500 mt-2 uppercase tracking-wider">
                {provider.models[0]}
              </div>
            </button>
          ))}
        </div>

        {/* Service Status */}
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
          <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">
            Service Status
          </h3>
          
          {services.map((service, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  {getTypeIcon(service.type)}
                  <div>
                    <div className="text-sm font-bold text-white">{service.name}</div>
                    <div className="text-[9px] text-zinc-500">{service.url}</div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {service.latency && (
                  <div className="text-[10px] font-mono text-zinc-400">
                    {service.latency}ms
                  </div>
                )}
                {getStatusIcon(service.status)}
              </div>
            </motion.div>
          ))}

          {/* Quick Actions */}
          <div className="mt-auto pt-6">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button className="p-3 bg-primary/10 border border-primary/20 rounded-xl text-primary hover:bg-primary/20 transition-all">
                <div className="flex items-center gap-2">
                  <Terminal size={14} />
                  <span className="text-[10px] font-black uppercase tracking-wider">Open Terminal</span>
                </div>
              </button>
              <button className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400 hover:bg-purple-500/20 transition-all">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} />
                  <span className="text-[10px] font-black uppercase tracking-wider">AI Chat</span>
                </div>
              </button>
              <button className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 hover:bg-blue-500/20 transition-all">
                <div className="flex items-center gap-2">
                  <Code2 size={14} />
                  <span className="text-[10px] font-black uppercase tracking-wider">Editor</span>
                </div>
              </button>
              <button className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 hover:bg-green-500/20 transition-all">
                <div className="flex items-center gap-2">
                  <HardDrive size={14} />
                  <span className="text-[10px] font-black uppercase tracking-wider">Deploy</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiProviderDashboard;
