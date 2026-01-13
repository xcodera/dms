
import React from 'react';
import { Home, History, QrCode, MessageSquare, User } from 'lucide-react';
import { AppView } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  isDarkMode: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, activeView, setActiveView, isDarkMode }) => {
  return (
    <div className={`flex flex-col h-screen max-w-md mx-auto overflow-hidden relative shadow-2xl transition-colors duration-300 ${isDarkMode ? 'bg-[#0f172a]' : 'bg-gray-50'}`}>
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className={`absolute bottom-0 left-0 right-0 border-t px-6 py-2 flex justify-around items-center safe-bottom z-50 transition-colors duration-300 ${
        isDarkMode ? 'bg-[#1e293b] border-[#334155] shadow-[0_-4px_20px_rgba(0,0,0,0.4)]' : 'bg-white border-gray-100 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]'
      }`}>
        <NavItem 
          icon={<Home size={24} />} 
          label="Home" 
          active={activeView === 'home'} 
          onClick={() => setActiveView('home')} 
          isDarkMode={isDarkMode}
        />
        <NavItem 
          icon={<History size={24} />} 
          label="History" 
          active={activeView === 'history'} 
          onClick={() => setActiveView('history')} 
          isDarkMode={isDarkMode}
        />
        <div 
          onClick={() => setActiveView('sliks')}
          className={`relative -top-6 bg-[#004691] p-4 rounded-full shadow-lg border-4 cursor-pointer transform active:scale-95 transition-transform flex items-center justify-center ${isDarkMode ? 'border-[#1e293b]' : 'border-white'}`}
        >
          <QrCode size={30} color="white" />
          <span className={`absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold ${activeView === 'sliks' ? 'text-blue-500' : (isDarkMode ? 'text-blue-400' : 'text-[#004691]')}`}>SLIK</span>
        </div>
        <NavItem 
          icon={<MessageSquare size={24} />} 
          label="AI Chat" 
          active={activeView === 'ai-assistant'} 
          onClick={() => setActiveView('ai-assistant')} 
          isDarkMode={isDarkMode}
        />
        <NavItem 
          icon={<User size={24} />} 
          label="Profile" 
          active={activeView === 'profile'} 
          onClick={() => setActiveView('profile')} 
          isDarkMode={isDarkMode}
        />
      </nav>
    </div>
  );
};

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  isDarkMode: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick, isDarkMode }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center gap-1 transition-colors ${
      active 
        ? (isDarkMode ? 'text-blue-400' : 'text-[#004691]') 
        : (isDarkMode ? 'text-gray-500' : 'text-gray-400')
    }`}
  >
    {icon}
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);

export default Layout;
