
import React, { useState, useEffect } from 'react';
import { AppView, CombinedActivity } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getCombinedActivityHistory } from '../services/supabaseService';
import { ChevronLeft, ChevronRight, Search, History as HistoryIcon, BarChart3, UserCheck, ShieldCheck } from 'lucide-react';
import Spinner from './Spinner';

interface HistoryProps {
  isDarkMode: boolean;
  setActiveView: (view: AppView) => void;
}

const History: React.FC<HistoryProps> = ({ isDarkMode, setActiveView }) => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<CombinedActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const fetchHistory = async () => {
        setLoading(true);
        try {
          const data = await getCombinedActivityHistory(user.id, 20); // Fetch more for history page
          setActivities(data);
        } catch (error) {
          console.error("Failed to fetch history:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchHistory();
    }
  }, [user]);

  return (
    <div className={`flex flex-col h-full transition-colors duration-300 ${isDarkMode ? 'bg-[#0f172a]' : 'bg-gray-50'}`}>
      <div className={`px-6 py-4 flex justify-between items-center transition-colors shrink-0 ${isDarkMode ? 'bg-[#1e293b]' : 'bg-white border-b border-gray-100'}`}>
        <button onClick={() => setActiveView('home')} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-200' : 'hover:bg-gray-100 text-[#004691]'}`}><ChevronLeft size={24} /></button>
        <h2 className={`text-lg font-bold ${isDarkMode ? 'text-gray-100' : 'text-[#004691]'}`}>Riwayat Aktivitas</h2>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-6 space-y-4">
        <div className={`p-4 rounded-2xl border flex items-center gap-3 ${isDarkMode ? 'bg-[#1e293b] border-[#334155]' : 'bg-white border-gray-100'}`}>
          <Search size={18} className="text-gray-400" />
          <input type="text" placeholder="Cari aktivitas..." className="flex-1 bg-transparent focus:outline-none text-sm" />
        </div>

        {loading ? <div className="pt-20 flex justify-center"><Spinner /></div> : (
          <div className={`rounded-[2rem] divide-y shadow-sm border transition-colors overflow-hidden ${isDarkMode ? 'bg-[#1e293b] divide-white/5 border-white/5' : 'bg-white divide-gray-50 border-gray-100'}`}>
            {activities.map(activity => <ActivityItem key={activity.id} activity={activity} isDarkMode={isDarkMode} />)}
          </div>
        )}
      </div>
    </div>
  );
};

const ActivityItem: React.FC<{ activity: CombinedActivity; isDarkMode: boolean }> = ({ activity, isDarkMode }) => {
  const getIcon = () => {
    switch (activity.type) {
      case 'Absensi': return { icon: <UserCheck size={20} className='text-green-500' />, bg: isDarkMode ? 'bg-green-900/30' : 'bg-green-50' };
      case 'Slik': return { icon: <ShieldCheck size={20} className='text-indigo-500' />, bg: isDarkMode ? 'bg-indigo-900/30' : 'bg-indigo-50' };
      default: return { icon: <HistoryIcon size={20} className='text-gray-500' />, bg: isDarkMode ? 'bg-gray-700' : 'bg-gray-100' };
    }
  };

  const timestamp = new Date(activity.created_at);
  const formattedDate = timestamp.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  const formattedTime = timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const { icon, bg } = getIcon();

  return (
    <div className="p-4 flex justify-between items-center active:bg-gray-500/5 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors shrink-0 ${bg}`}>{icon}</div>
        <div className="flex flex-col">
          <p className={`font-bold text-sm leading-none ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>{activity.title}</p>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5 leading-none">{formattedDate}</p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className={`font-black text-sm leading-none ${isDarkMode ? 'text-gray-200' : 'text-[#004691]'}`}>{formattedTime}</p>
        <ChevronRight size={16} className="text-gray-400 mt-1 ml-auto" />
      </div>
    </div>
  );
};

export default History;
