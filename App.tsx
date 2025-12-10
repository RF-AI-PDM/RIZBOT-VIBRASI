import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Activity, 
  Mic, 
  MessageSquare, 
  Bolt, 
  Menu,
  X,
  Send,
  RefreshCw,
  ArrowUpRight
} from 'lucide-react';
import { getFastConsultation, createChatSession } from './services/geminiService';
import { VibrationAnalyzer } from './components/VibrationAnalyzer';
import { LiveMaintenance } from './components/LiveMaintenance';
import { AppView, ChatMessage } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatInstance, setChatInstance] = useState<any>(null);
  const [isTyping, setIsTyping] = useState(false);

  // Fast Consult (Dashboard)
  const [fastQuery, setFastQuery] = useState("");
  const [fastResponse, setFastResponse] = useState("");
  const [isFastLoading, setIsFastLoading] = useState(false);

  // Init Chat
  useEffect(() => {
    if (!chatInstance) {
      setChatInstance(createChatSession());
    }
  }, []);

  const handleChatSend = async () => {
    if (!chatInput.trim() || !chatInstance) return;
    
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: chatInput, timestamp: new Date() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setIsTyping(true);

    try {
      const result = await chatInstance.sendMessage({ message: userMsg.text });
      const botMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: result.text, timestamp: new Date() };
      setChatMessages(prev => [...prev, botMsg]);
    } catch (e) {
      console.error(e);
      // Optional: Add error message to chat
    } finally {
      setIsTyping(false);
    }
  };

  const handleFastConsult = async () => {
    if (!fastQuery) return;
    setIsFastLoading(true);
    const res = await getFastConsultation(fastQuery);
    setFastResponse(res);
    setIsFastLoading(false);
  };

  const NavItem = ({ view, icon: Icon, label }: { view: AppView, icon: any, label: string }) => (
    <button
      onClick={() => { setCurrentView(view); setIsSidebarOpen(false); }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
        currentView === view 
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
          : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  // Custom renderer for chat messages to handle bold and simple lists
  const MessageRenderer = ({ text }: { text: string }) => {
    // Split by lines to handle formatting line by line
    const lines = text.split('\n');
    return (
      <div className="text-sm leading-relaxed space-y-1">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          
          // Handle Bullet Points
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const content = trimmed.substring(2);
            return (
              <div key={idx} className="flex gap-2 ml-2">
                <span className="text-blue-300 mt-1.5 w-1 h-1 bg-current rounded-full shrink-0" />
                <span>
                   {content.split(/(\*\*.*?\*\*)/g).map((part, i) => 
                      part.startsWith('**') && part.endsWith('**') 
                        ? <strong key={i} className="font-bold text-white/90">{part.slice(2, -2)}</strong> 
                        : part
                   )}
                </span>
              </div>
            );
          }

          // Handle Headers (Simple ### support)
          if (trimmed.startsWith('### ')) {
             return <h4 key={idx} className="font-bold text-blue-200 mt-2 mb-1">{trimmed.substring(4)}</h4>
          }

          // Handle Standard Text with Bold support
          if (trimmed === '') return <div key={idx} className="h-2" />;
          
          return (
            <p key={idx}>
              {line.split(/(\*\*.*?\*\*)/g).map((part, i) => 
                  part.startsWith('**') && part.endsWith('**') 
                    ? <strong key={i} className="font-bold text-white/90">{part.slice(2, -2)}</strong> 
                    : part
              )}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans selection:bg-blue-500/30">
      {/* Mobile Header */}
      <div className="lg:hidden p-4 flex items-center justify-between border-b border-slate-800 bg-[#0f172a]/80 backdrop-blur sticky top-0 z-50">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">Vibro Analysis</h1>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-300">
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0f172a] border-r border-slate-800 transform transition-transform duration-300 lg:translate-x-0 lg:static ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="p-6">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent mb-1">Vibro Analysis</h1>
            <p className="text-xs text-slate-500 font-mono">LITE EDITION v1.0</p>
          </div>
          
          <nav className="px-4 space-y-2">
            <NavItem view={AppView.DASHBOARD} icon={LayoutDashboard} label="Dashboard" />
            <NavItem view={AppView.VIBRATION} icon={Activity} label="Vibro Lite" />
            <NavItem view={AppView.LIVE_MONITOR} icon={Mic} label="Live Voice" />
            <NavItem view={AppView.CHAT_ASSISTANT} icon={MessageSquare} label="AI Consultant" />
          </nav>

          <div className="absolute bottom-6 left-0 w-full px-6">
            <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
              <div className="flex items-center gap-2 mb-2">
                <Bolt size={16} className="text-yellow-400" />
                <span className="text-xs font-bold text-slate-300">SYSTEM STATUS</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-green-400">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                Online: Gemini 2.5 Flash
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-hidden max-w-[1600px] mx-auto w-full">
          
          {/* Dashboard View */}
          {currentView === AppView.DASHBOARD && (
            <div className="space-y-8 animate-fade-in">
              <header className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Vibrasi Analysis</h2>
                <p className="text-slate-400">Welcome back, Engineer. Systems are running within nominal parameters.</p>
              </header>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { title: "Vibro Analysis", val: "Active", icon: Activity, color: "text-blue-400", target: AppView.VIBRATION },
                  { title: "Voice Link", val: "Ready", icon: Mic, color: "text-green-400", target: AppView.LIVE_MONITOR },
                  { title: "Consultant", val: "Idle", icon: MessageSquare, color: "text-orange-400", target: AppView.CHAT_ASSISTANT },
                ].map((stat, i) => (
                  <button 
                    key={i} 
                    onClick={() => setCurrentView(stat.target)}
                    className="text-left bg-slate-800 p-6 rounded-xl border border-slate-700 hover:border-blue-500/50 hover:bg-slate-700/50 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-slate-400 text-sm font-medium group-hover:text-blue-200 transition-colors">{stat.title}</span>
                      <div className="relative">
                        <stat.icon className={`${stat.color}`} size={20} />
                        <ArrowUpRight size={14} className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-white group-hover:text-blue-100 transition-colors">{stat.val}</div>
                  </button>
                ))}
              </div>

              {/* Fast Consult Widget */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-xl border border-slate-700">
                <div className="flex items-center gap-2 mb-4">
                  <Bolt className="text-yellow-400" />
                  <h3 className="text-xl font-bold">Fast Consult (Flash Lite)</h3>
                </div>
                <div className="flex gap-4 mb-4">
                  <input 
                    type="text" 
                    value={fastQuery}
                    onChange={(e) => setFastQuery(e.target.value)}
                    placeholder="Ask a quick maintenance question..."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button 
                    onClick={handleFastConsult}
                    disabled={isFastLoading}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 rounded-lg font-bold flex items-center gap-2 transition-all"
                  >
                    {isFastLoading ? <RefreshCw className="animate-spin" /> : <Send size={18} />}
                    Ask
                  </button>
                </div>
                {fastResponse && (
                  <div className="p-4 bg-slate-950/50 rounded-lg border border-slate-700 text-slate-300">
                    <MessageRenderer text={fastResponse} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Vibration Analyzer View */}
          {currentView === AppView.VIBRATION && <VibrationAnalyzer />}

          {/* Live Monitor View */}
          {currentView === AppView.LIVE_MONITOR && <LiveMaintenance />}

          {/* Chat Assistant View */}
          {currentView === AppView.CHAT_ASSISTANT && (
            <div className="flex flex-col h-[calc(100vh-8rem)] bg-slate-800 rounded-xl border border-slate-700 overflow-hidden animate-fade-in">
              <div className="p-4 border-b border-slate-700 bg-slate-800/50 flex items-center gap-2">
                <MessageSquare className="text-orange-400" />
                <h3 className="font-bold text-white">Gemini 2.5 Flash Consultant</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.length === 0 && (
                  <div className="text-center text-slate-500 mt-20">
                    <p>Start a conversation about PLTU maintenance protocols.</p>
                  </div>
                )}
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] md:max-w-[75%] p-4 rounded-2xl shadow-md ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-br-none' 
                        : 'bg-slate-700 text-slate-100 rounded-bl-none border border-slate-600'
                    }`}>
                      <MessageRenderer text={msg.text} />
                      <p className="text-[10px] opacity-50 mt-2 text-right border-t border-white/10 pt-1">{msg.timestamp.toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-slate-700 p-4 rounded-2xl rounded-bl-none flex gap-1">
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-800 border-t border-slate-700">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
                    placeholder="Describe the issue or ask for standards..."
                    className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors placeholder-slate-500"
                  />
                  <button 
                    onClick={handleChatSend}
                    disabled={!chatInput.trim() || isTyping}
                    className={`p-3 rounded-lg transition-all ${
                      !chatInput.trim() || isTyping 
                        ? 'bg-slate-700 text-slate-500' 
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                    }`}
                  >
                    <Send size={20} />
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default App;