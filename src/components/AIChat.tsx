
import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User, Bot } from 'lucide-react';
import { getFinancialInsight } from '../services/geminiService';
import { MOCK_TRANSACTIONS } from '../constants';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface AIChatProps {
  isDarkMode: boolean;
}

const AIChat: React.FC<AIChatProps> = ({ isDarkMode }) => {
  // FIX: Removed useApiKey hook as API key is now handled by environment variables.
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Halo! Saya asisten finansial myBCA Anda. Ada yang bisa saya bantu dengan transaksi Anda?', sender: 'bot', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    // FIX: Removed API key check.
    if (!input.trim()) {
      return;
    }

    const userMsg: Message = { id: Date.now().toString(), text: input, sender: 'user', timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // FIX: Call getFinancialInsight without passing the API key.
    const botResponse = await getFinancialInsight(input, MOCK_TRANSACTIONS);
    
    const botMsg: Message = { id: (Date.now() + 1).toString(), text: botResponse, sender: 'bot', timestamp: new Date() };
    setMessages(prev => [...prev, botMsg]);
    setIsTyping(false);
  };

  return (
    <div className={`flex flex-col h-full transition-colors duration-300 ${isDarkMode ? 'bg-[#0f172a]' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`px-6 py-4 border-b flex items-center gap-3 transition-colors shrink-0 ${isDarkMode ? 'bg-[#1e293b] border-[#334155]' : 'bg-white border-gray-100'}`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shadow-inner ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
          <Sparkles size={20} />
        </div>
        <div>
          <h3 className={`font-bold ${isDarkMode ? 'text-gray-100' : 'text-[#004691]'}`}>Smart Assistant</h3>
          <p className="text-xs text-green-500 font-medium tracking-wide">● Online & Siap Membantu</p>
        </div>
      </div>

      {/* Chat Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-5 no-scrollbar">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] flex items-start gap-2.5 ${m.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-colors ${m.sender === 'user' ? (isDarkMode ? 'bg-blue-600' : 'bg-[#004691]') : (isDarkMode ? 'bg-[#1e293b] border border-[#334155]' : 'bg-white border border-gray-100')} text-inherit`}>
                    {m.sender === 'user' ? <User size={16} color="white" /> : <Bot size={16} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />}
                </div>
                <div className={`p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm transition-all ${
                  m.sender === 'user' 
                    ? (isDarkMode ? 'bg-blue-700 text-white rounded-tr-none' : 'bg-[#004691] text-white rounded-tr-none') 
                    : (isDarkMode ? 'bg-[#1e293b] text-gray-200 border border-[#334155] rounded-tl-none' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none')
                }`}>
                {m.text}
                <p className={`text-[11px] mt-1.5 text-right font-medium opacity-70 ${m.sender === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                    {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className={`px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1 border transition-colors ${isDarkMode ? 'bg-[#1e293b] border-[#334155]' : 'bg-white border-gray-100'}`}>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-75"></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce delay-150"></div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className={`px-6 py-4 border-t transition-colors shrink-0 ${isDarkMode ? 'bg-[#1e293b] border-[#334155]' : 'bg-white border-gray-100'}`}>
        <div className="flex gap-3">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Tanya soal pengeluaran..."
            className={`flex-1 rounded-full px-5 py-2.5 text-sm focus:outline-none transition-all ${
              isDarkMode 
                ? 'bg-[#0f172a] border-[#334155] text-white focus:border-blue-500' 
                : 'bg-gray-50 border-gray-200 focus:border-[#004691]'
            } border`}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim()}
            className={`w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-50 active:scale-95 transition-transform shadow-md ${
              isDarkMode ? 'bg-blue-600 shadow-blue-900/40' : 'bg-[#004691] shadow-blue-900/10'
            } text-white`}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
