import React, { useEffect, useRef } from 'react';
import { TranscriptMessage } from '../types';
import { User, Bot, Terminal } from 'lucide-react';

interface TranscriptProps {
  messages: TranscriptMessage[];
}

const Transcript: React.FC<TranscriptProps> = ({ messages }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Helper to detect code blocks (simple detection)
  const formatText = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        // Extract content and language
        const content = part.slice(3, -3).replace(/^[a-z]+\n/, '');
        return (
          <div key={index} className="my-2 rounded-md bg-slate-900 border border-slate-700 overflow-hidden">
             <div className="bg-slate-800 px-3 py-1 text-xs text-slate-400 flex items-center gap-2">
                <Terminal size={12} />
                <span>Code Snippet</span>
             </div>
             <pre className="p-3 overflow-x-auto text-sm font-mono text-green-400">
               <code>{content}</code>
             </pre>
          </div>
        );
      }
      return <span key={index} className="whitespace-pre-wrap">{part}</span>;
    });
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-60">
           <Bot size={48} className="mb-4" />
           <p>Start chatting with Priya to see the conversation here.</p>
        </div>
      )}
      
      {messages.map((msg, idx) => (
        <div 
          key={idx} // Using index as key for simplicity with partial updates 
          className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          {msg.role === 'model' && (
            <div className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center flex-shrink-0 mt-1">
              <Bot size={18} className="text-white" />
            </div>
          )}
          
          <div 
            className={`max-w-[85%] rounded-2xl px-5 py-3 shadow-sm ${
              msg.role === 'user' 
                ? 'bg-slate-700 text-slate-100 rounded-tr-none' 
                : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
            }`}
          >
            <div className="text-sm leading-relaxed">
              {formatText(msg.text)}
            </div>
            {msg.isPartial && (
               <span className="inline-block w-2 h-2 ml-2 bg-sky-400 rounded-full animate-pulse"/>
            )}
          </div>

          {msg.role === 'user' && (
             <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0 mt-1">
               <User size={18} className="text-white" />
             </div>
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};

export default Transcript;
