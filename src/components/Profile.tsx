
import React from 'react';
import { AppView } from '../types';
import { useAuth } from '../contexts/AuthContext';
// FIX: Removed useApiKey and Settings icon as API key management UI is removed.
import { ShieldCheck, Info, LogOut, ChevronRight } from 'lucide-react';

interface ProfileProps {
  isDarkMode: boolean;
  setActiveView: (view: AppView) => void;
}

const Profile: React.FC<ProfileProps> = ({ isDarkMode, setActiveView }) => {
  const { profile, logout } = useAuth();

  if (!profile) return null;

  return (
    <div className={`h-full ${isDarkMode ? 'bg-[#0f172a]' : 'bg-gray-50'}`}>
      <div className={`${isDarkMode ? 'bg-[#1e293b] border-[#334155]' : 'bg-white border-b'} px-6 py-10 flex flex-col items-center shadow-sm`}>
        <div className={`w-28 h-28 rounded-full mb-4 border-4 overflow-hidden shadow-xl transition-all ${isDarkMode ? 'border-blue-400/30' : 'border-white'}`}>
          <img src={profile.avatar_url || ''} alt={profile.full_name || ''} className="w-full h-full object-cover" />
        </div>
        <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-[#004691]'}`}>{profile.full_name}</h2>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-tight ${isDarkMode ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-100 text-[#004691]'}`}>STAFF</span>
          <p className="text-gray-500 text-sm font-medium">{profile.position}</p>
        </div>
        <p className="text-gray-400 text-xs mt-2 opacity-70">{profile.id}</p>
      </div>
      <div className="px-6 py-6 space-y-3">
        {/* FIX: Removed API Key settings section to adhere to guidelines. */}
        <MenuLink isDarkMode={isDarkMode} icon={<ShieldCheck size={18} />} title="Keamanan & Password" />
        <MenuLink isDarkMode={isDarkMode} icon={<Info size={18} />} title="Pusat Bantuan" />
        <div className="h-4"></div>
        <MenuLink isDarkMode={isDarkMode} icon={<LogOut size={18} className="text-red-500" />} title="Log Out" color="text-red-500" onClick={logout} />
      </div>
    </div>
  );
};

const MenuLink: React.FC<{ icon: React.ReactNode, title: string, color?: string, isDarkMode: boolean, onClick?: () => void }> = ({ icon, title, color, isDarkMode, onClick }) => (
  <button onClick={onClick} className={`flex items-center justify-between p-4 rounded-2xl w-full active:scale-[0.98] transition-all border shadow-sm ${isDarkMode ? 'bg-[#1e293b] border-[#334155]' : 'bg-white border-gray-100'}`}>
    <div className={`flex items-center gap-4 ${color || (isDarkMode ? 'text-gray-200' : 'text-gray-700')}`}>
      <div className="opacity-80">{icon}</div>
      <span className="text-sm font-semibold">{title}</span>
    </div>
    <ChevronRight size={16} className="text-gray-400" />
  </button>
);

export default Profile;
