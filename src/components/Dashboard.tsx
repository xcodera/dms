
import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell, Moon, Sun, UserCheck, ShieldAlert, BarChart3, LayoutGrid, MapPin,
  LogOut, ShieldCheck, Calendar, Users, Search, Landmark, TrendingUp
} from 'lucide-react';
import { AppView, CombinedActivity } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getCombinedActivityHistory } from '../services/supabaseService';
import Spinner from './Spinner';

interface DashboardProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  setActiveView: (view: AppView) => void;
}

const HAPPY_ICONS = ["😊", "✨", "🌟", "🌞", "🍀", "🚀"];

const TimeBox: React.FC<{ value: string; label: string; isDarkMode: boolean }> = ({ value, label, isDarkMode }) => (
  <div className="flex flex-col items-center">
    <div className={`rounded-xl p-2.5 min-w-[60px] md:min-w-[80px] flex items-center justify-center shadow-inner ${isDarkMode ? 'bg-black/20' : 'bg-gray-200'}`}>
      <span className={`text-5xl font-black font-mono tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{value}</span>
    </div>
    <p className="text-xs text-gray-500 mt-2 uppercase font-bold tracking-wider">{label}</p>
  </div>
);


export const Dashboard: React.FC<DashboardProps> = ({ isDarkMode, toggleDarkMode, setActiveView }) => {
  const { user, profile } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [locationName, setLocationName] = useState('Mendeteksi lokasi...');
  const [activities, setActivities] = useState<CombinedActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  const randomIcon = useMemo(() => HAPPY_ICONS[Math.floor(Math.random() * HAPPY_ICONS.length)], []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=id`);
            const data = await response.json();
            const address = data.address;
            const location = `${address.suburb || address.village || address.town || ''}, ${address.state || ''}`;
            setLocationName(location.startsWith(',') ? location.substring(2) : location || data.display_name.split(',').slice(0, 2).join(', '));
          } catch (error) {
            console.error("Error fetching location name", error);
            setLocationName("Gagal mengambil nama lokasi");
          }
        },
        () => setLocationName("Izin lokasi ditolak"),
        { enableHighAccuracy: true }
      );
    } else {
      setLocationName("Geolocation tidak didukung");
    }
  }, []);

  useEffect(() => {
    if (user) {
      const fetchActivities = async () => {
        setLoadingActivities(true);
        try {
          const data = await getCombinedActivityHistory(user.id, 5);
          setActivities(data);
        } catch (error) {
          console.error("Failed to fetch activities:", error);
        } finally {
          setLoadingActivities(false);
        }
      };
      fetchActivities();
    }
  }, [user]);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 11) return `Selamat Pagi ${randomIcon}`;
    if (hour < 15) return "Selamat Siang";
    if (hour < 18) return "Selamat Sore";
    return "Selamat Malam";
  };

  const hours = currentTime.getHours().toString().padStart(2, '0');
  const minutes = currentTime.getMinutes().toString().padStart(2, '0');
  const seconds = currentTime.getSeconds().toString().padStart(2, '0');
  const formattedDate = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(currentTime);
  const userFirstName = profile?.full_name?.split(' ')[0] || 'User';
  const greeting = getGreeting();
  const motivationText = useMemo(() => ` ${greeting} • Tetap semangat dan jangan pernah menyerah. • Setiap hari adalah kesempatan baru.`, [greeting]);

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner />
      </div>
    );
  }

  return (
    <div className={`flex flex-col min-h-full transition-colors duration-300 ${isDarkMode ? 'bg-[#0f172a]' : 'bg-[#F8FAFC]'}`}>
      <div className={`px-6 pt-12 pb-6 relative overflow-hidden transition-colors duration-500 flex justify-between items-center rounded-b-[2.5rem] ${isDarkMode ? 'bg-gradient-to-r from-blue-900/40 to-indigo-900/40' : 'bg-gradient-to-r from-[#004691] to-[#00AEEF]'} text-white`}>
        <div className="absolute -top-4 -right-4 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
        <div className="flex items-center gap-4 z-10">
          <div className={`w-14 h-14 rounded-full border-2 border-white/20 overflow-hidden shadow-md bg-gray-500`}>
            <img src={profile.avatar_url || `https://ui-avatars.com/api/?name=${profile.full_name}&background=004691&color=fff`} alt="Profile" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-sm font-light text-blue-200">Welcome Back,</p>
            <h1 className="text-white font-black text-xl leading-tight tracking-tight">{profile.full_name}</h1>
            <p className="text-xs text-blue-200/80 mt-0.5">{profile.position || 'Staff'}</p>
          </div>
        </div>
        <div className="flex gap-2 z-10">
          <button onClick={toggleDarkMode} className="p-2.5 rounded-lg bg-white/10 backdrop-blur-md text-white border border-white/10 active:scale-90 transition-transform">
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="p-2.5 rounded-lg bg-white/10 backdrop-blur-md text-white border border-white/10 relative active:scale-90 transition-transform">
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
          </button>
          <button onClick={() => setActiveView('profile')} className="p-2.5 rounded-lg bg-white/10 backdrop-blur-md text-white border border-white/10 active:scale-90 transition-transform">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      <div className="px-6 pt-8 pb-8 space-y-8">
        <div className={`p-4 rounded-3xl shadow-lg transition-colors ${isDarkMode ? 'bg-[#1e293b] text-white border border-white/10' : 'bg-gray-100 text-gray-800'}`}>
          <div className="flex items-baseline mb-3 overflow-hidden whitespace-nowrap">
            <h2 className={`font-bold text-lg shrink-0 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>Hello, {userFirstName}</h2>
            <div className="relative flex overflow-x-hidden text-sm text-gray-500 ml-2 w-full">
              <div className="animate-marquee whitespace-nowrap"><span className="mx-4">{motivationText}</span></div>
              <div className="animate-marquee absolute top-0 whitespace-nowrap"><span className="mx-4">{motivationText}</span></div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 text-center my-3">
            <TimeBox value={hours} label="Hours" isDarkMode={isDarkMode} />
            <span className={`text-4xl font-bold pb-8 ${isDarkMode ? 'text-blue-400' : 'text-gray-400'}`}>:</span>
            <TimeBox value={minutes} label="Minute" isDarkMode={isDarkMode} />
            <span className={`text-4xl font-bold pb-8 ${isDarkMode ? 'text-blue-400' : 'text-gray-400'}`}>:</span>
            <TimeBox value={seconds} label="Second" isDarkMode={isDarkMode} />
          </div>
          <div className={`border-t my-3 ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}></div>
          <div className="flex justify-between items-center text-xs font-bold">
            <div className="flex items-center gap-2"><Calendar size={16} className="text-red-500" /><span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>{formattedDate}</span></div>
            <div className="flex items-center gap-2 max-w-[50%]"><MapPin size={16} className="text-red-500 flex-shrink-0" /><span className={`truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{locationName}</span></div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-y-6">
          <MenuIcon isDarkMode={isDarkMode} onClick={() => setActiveView('attendance')} icon={<UserCheck size={24} className="text-red-500" />} label="Absensi" />
          <MenuIcon isDarkMode={isDarkMode} onClick={() => setActiveView('sliks')} icon={<ShieldAlert size={24} className="text-indigo-500" />} label="SLIKs" />
          <MenuIcon isDarkMode={isDarkMode} icon={<BarChart3 size={24} className="text-yellow-600" />} label="Laporan" />
          <MenuIcon isDarkMode={isDarkMode} icon={<LayoutGrid size={24} className="text-gray-500" />} label="Lainnya" />
        </div>

        <div className="space-y-4">
          <h3 className={`font-bold px-1 ${isDarkMode ? 'text-gray-200' : 'text-[#004691]'}`}>Ringkasan Akun & Kinerja</h3>
          <div className="grid grid-cols-2 gap-4">
            <StatCard isDarkMode={isDarkMode} icon={<Users size={20} className="text-blue-500" />} label="Total Leads" value="152" detail="Update 5m ago" />
            <StatCard isDarkMode={isDarkMode} icon={<Search size={20} className="text-yellow-500" />} label="Total Sliks" value="84" detail="Bulan Ini" />
            <StatCard isDarkMode={isDarkMode} icon={<TrendingUp size={20} className="text-green-500" />} label="Peningkatan Penjualan" value="24.8%" detail="+12% target" />
            <StatCard isDarkMode={isDarkMode} icon={<Landmark size={20} className="text-indigo-500" />} label="Total BAST" value="42" detail="Terverifikasi" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className={`font-bold ${isDarkMode ? 'text-gray-200' : 'text-[#004691]'}`}>Aktivitas Terakhir</h3>
            <button onClick={() => setActiveView('history')} className={`text-xs font-black uppercase tracking-widest ${isDarkMode ? 'text-blue-400' : 'text-[#004691]'}`}>Lihat Semua</button>
          </div>
          <div className={`rounded-[2.2rem] overflow-hidden shadow-sm border transition-all ${isDarkMode ? 'bg-[#1e293b] border-white/5' : 'bg-white border-gray-100 shadow-blue-900/5'}`}>
            {loadingActivities ? <div className="p-10 flex justify-center"><Spinner /></div> :
              <div className={`divide-y ${isDarkMode ? 'divide-white/5' : 'divide-gray-50'}`}>
                {activities.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} isDarkMode={isDarkMode} />
                ))}
              </div>}
          </div>
        </div>
      </div>
    </div>
  );
};

const ActivityItem: React.FC<{ activity: CombinedActivity; isDarkMode: boolean }> = ({ activity, isDarkMode }) => {
  const getIcon = () => {
    switch (activity.type) {
      case 'Absensi': return { icon: <UserCheck size={20} className='text-green-500' />, bg: isDarkMode ? 'bg-green-900/30' : 'bg-green-50' };
      case 'Slik': return { icon: <ShieldCheck size={20} className='text-indigo-500' />, bg: isDarkMode ? 'bg-indigo-900/30' : 'bg-indigo-50' };
      default: return { icon: <UserCheck size={20} className='text-gray-500' />, bg: isDarkMode ? 'bg-gray-700' : 'bg-gray-100' };
    }
  };

  const status = activity.type === 'Absensi' ? activity.status : "Berhasil";
  const timestamp = new Date(activity.created_at);
  const formattedTime = timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  const { icon, bg } = getIcon();

  return (
    <div className="p-4 flex justify-between items-center active:bg-gray-500/5 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors shrink-0 ${bg}`}>{icon}</div>
        <div className="flex flex-col">
          <p className={`font-bold text-sm leading-none ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>{activity.title}</p>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5 leading-none">{status}</p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className={`font-black text-sm leading-none ${isDarkMode ? 'text-gray-200' : 'text-[#004691]'}`}>{formattedTime}</p>
        <p className="text-[9px] text-gray-400 font-black uppercase mt-0.5 leading-none">{activity.type}</p>
      </div>
    </div>
  );
};

const MenuIcon: React.FC<{ icon: React.ReactNode; label: string; isDarkMode: boolean; onClick?: () => void }> = ({ icon, label, isDarkMode, onClick }) => (
  <button onClick={onClick} className="flex flex-col items-center gap-2 group">
    <div className={`w-14 h-14 rounded-2xl shadow-sm flex items-center justify-center group-active:scale-90 transition-all border ${isDarkMode ? 'bg-white/5 border-white/10 group-hover:bg-white/10' : 'bg-white border-gray-100 shadow-blue-900/5 group-hover:shadow-md'}`}>{icon}</div>
    <span className={`text-[11px] font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{label}</span>
  </button>
);

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; detail: string; isDarkMode: boolean; }> = ({ icon, label, value, detail, isDarkMode }) => (
  <div className={`p-4 rounded-3xl border transition-all shadow-sm ${isDarkMode ? 'bg-[#1e293b] border-white/5' : 'bg-white border-gray-100 shadow-blue-900/5'}`}>
    <div className="flex items-center gap-3 mb-2">
      <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>{icon}</div>
      <p className={`text-[11px] font-bold leading-tight ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}</p>
    </div>
    <p className={`text-lg font-black tracking-tight leading-none ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{value}</p>
    <p className={`text-[10px] font-bold uppercase tracking-wider mt-1.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{detail}</p>
  </div>
);
