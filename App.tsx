import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Power, Info, Github } from 'lucide-react';
import { GeminiLiveService } from './services/geminiLiveService';
import { ConnectionState, TranscriptMessage } from './types';
import AudioVisualizer from './components/AudioVisualizer';
import Transcript from './components/Transcript';

const App: React.FC = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const liveService = useRef<GeminiLiveService | null>(null);

  // Initialize service on mount
  useEffect(() => {
    liveService.current = new GeminiLiveService();
    
    liveService.current.onConnectionStateChange = (state) => {
      setConnectionState(state);
      if (state === ConnectionState.CONNECTED) {
        setErrorMsg(null);
      } else if (state === ConnectionState.ERROR) {
        setErrorMsg("Connection failed. Please check your API key and try again.");
      }
    };

    liveService.current.onTranscriptUpdate = (newMsg) => {
      setMessages(prev => {
        // Find if we already have a message with this ID (for streaming updates)
        const last = prev[prev.length - 1];
        if (last && last.role === newMsg.role && last.isPartial) {
           const updated = [...prev];
           updated[updated.length - 1] = { ...last, text: last.text + newMsg.text }; 
           return updated;
        }
        return [...prev, newMsg];
      });
    };

    liveService.current.onAudioLevel = (level) => {
      setAudioLevel(level);
    };

    return () => {
      liveService.current?.disconnect();
    };
  }, []);

  const toggleConnection = async () => {
    if (connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.CONNECTING) {
      liveService.current?.disconnect();
    } else {
      await liveService.current?.connect();
    }
  };

  const isConnected = connectionState === ConnectionState.CONNECTED;
  const isConnecting = connectionState === ConnectionState.CONNECTING;

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans selection:bg-sky-500/30">
      
      {/* Sidebar / Info Panel */}
      <div className="hidden md:flex flex-col w-80 border-r border-slate-800 bg-slate-900/50 p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent mb-2">
            Priya
          </h1>
          <p className="text-sm text-slate-400">
            Your friendly AI Assistant powered by Gemini Live.
          </p>
        </div>

        <div className="space-y-6 flex-1">
          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <h3 className="text-sm font-semibold text-slate-300 mb-2 flex items-center gap-2">
              <Info size={16} /> Capabilities
            </h3>
            <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside">
              <li>Real-time voice conversation</li>
              <li>General knowledge</li>
              <li>Problem solving</li>
              <li>Friendly Indian persona</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
             <h3 className="text-sm font-semibold text-slate-300 mb-2">Status</h3>
             <div className="flex items-center gap-2 text-xs">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></span>
                <span className="uppercase tracking-wider font-medium text-slate-400">
                  {connectionState}
                </span>
             </div>
          </div>
        </div>

        <div className="mt-auto pt-6 border-t border-slate-800 text-xs text-slate-500 flex items-center gap-2">
          <Github size={14} />
          <span>Built with Gemini 2.5 Live API</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">
        
        {/* Header (Mobile only) */}
        <div className="md:hidden h-14 border-b border-slate-800 flex items-center px-4 justify-between bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
           <span className="font-bold text-sky-400">Priya Bot</span>
           <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-slate-600'}`}></div>
        </div>

        {/* Transcript Area */}
        <Transcript messages={messages} />

        {/* Floating Visualizer & Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent pt-20 pb-8 px-4 flex flex-col items-center justify-end pointer-events-none">
          
          <div className="mb-8 pointer-events-auto">
             <AudioVisualizer level={audioLevel} isActive={isConnected} />
          </div>

          {errorMsg && (
            <div className="mb-4 text-red-400 text-sm bg-red-900/20 px-4 py-2 rounded-lg border border-red-900/50 pointer-events-auto">
              {errorMsg}
            </div>
          )}

          <div className="flex items-center gap-6 pointer-events-auto">
            <button
              onClick={toggleConnection}
              disabled={isConnecting}
              className={`
                relative group flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300
                ${isConnected 
                  ? 'bg-red-500 hover:bg-red-600 shadow-[0_0_30px_rgba(239,68,68,0.3)]' 
                  : 'bg-sky-500 hover:bg-sky-400 shadow-[0_0_30px_rgba(14,165,233,0.3)]'
                }
                ${isConnecting ? 'opacity-80 cursor-wait' : ''}
              `}
            >
              {isConnected ? (
                <MicOff size={28} className="text-white" />
              ) : (
                <Mic size={28} className="text-white" />
              )}
              
              {/* Ring animation when connecting */}
              {isConnecting && (
                <span className="absolute inset-0 rounded-full border-2 border-sky-400 animate-ping opacity-75"></span>
              )}
            </button>
          </div>
          
          <p className="mt-4 text-xs text-slate-500 font-medium tracking-wide uppercase">
            {isConnected ? "Listening..." : "Tap to Start Conversation"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;