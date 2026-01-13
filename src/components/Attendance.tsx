
import React, { useState, useEffect } from 'react';
import {
  ChevronLeft, History, MapPin, Fingerprint, LogOut, FileText,
  Stethoscope, CalendarOff, CheckCircle2, Calendar, RefreshCw, X,
  ClipboardList
} from 'lucide-react';
import { AppView, Attendance as AttendanceType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getAttendanceHistory, addAttendance, updateAttendance } from '../services/supabaseService';
import Spinner from './Spinner';

interface AttendanceProps {
  isDarkMode: boolean;
  setActiveView: (view: AppView) => void;
}

type AttendanceStatus = 'Belum Absen' | 'Hadir' | 'Terlambat' | 'Izin - Half Day' | 'Izin - Full Day' | 'Sakit' | 'Cuti';
type ModalType = 'none' | 'izin' | 'sakit' | 'cuti';

const AttendanceField: React.FC<{
  label: string;
  isDarkMode: boolean;
  children: React.ReactNode;
}> = ({ label, isDarkMode, children }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-bold text-gray-500 pl-1 uppercase tracking-wider">{label}</label>
    {children}
  </div>
);

const Attendance: React.FC<AttendanceProps> = ({ isDarkMode, setActiveView }) => {
  const { user, profile } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayLog, setTodayLog] = useState<AttendanceType | null>(null);
  const [locationName, setLocationName] = useState<string>("Mendeteksi lokasi...");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceType[]>([]);
  const [activeModal, setActiveModal] = useState<ModalType>('none');
  const [modalLoading, setModalLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const history = await getAttendanceHistory(user.id);
      setAttendanceHistory(history);
      const today = new Date().toISOString().split('T')[0];
      const logForToday = history.find(log => log.date === today) || null;
      setTodayLog(logForToday);
    } catch (error) {
      console.error("Error fetching attendance history", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  useEffect(() => {
    // Geolocation logic
    if (!navigator.geolocation) {
      setLocationName("GPS tidak didukung");
      return;
    }
    setIsFetchingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, { headers: { 'Accept-Language': 'id' } });
          const data = await response.json();
          setLocationName(data.display_name.split(',').slice(0, 3).join(',') || "Lokasi tidak dikenal");
        } catch (error) {
          setLocationName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        } finally {
          setIsFetchingLocation(false);
        }
      },
      () => setLocationName("Izin lokasi ditolak"),
      { enableHighAccuracy: true }
    );
  }, []);

  const timeString = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateString = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }).format(currentTime);

  const handleClockIn = async () => {
    if (!user || todayLog) return;
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    let newStatus: AttendanceStatus = (hours > 9 || (hours === 9 && minutes > 15)) ? 'Terlambat' : 'Hadir';

    try {
      await addAttendance({
        user_id: user.id,
        date: now.toISOString().split('T')[0],
        clock_in: now.toISOString(),
        status: newStatus,
        location_name: locationName,
        coordinates: coords ? { latitude: coords.lat, longitude: coords.lng } : null,
      });
      fetchHistory(); // Refresh data
    } catch (error) {
      console.error("Clock in failed:", error);
    }
  };

  const handleClockOut = async () => {
    if (!user || !todayLog || todayLog.clock_out) return;
    try {
      await updateAttendance(todayLog.id, { clock_out: new Date().toISOString() });
      fetchHistory(); // Refresh data
    } catch (error) {
      console.error("Clock out failed:", error);
    }
  };

  const getStatus = (): AttendanceStatus => {
    if (!todayLog) return 'Belum Absen';
    return todayLog.status as AttendanceStatus;
  }

  const getStatusColor = () => {
    const currentStatus = getStatus();
    switch (currentStatus) {
      case 'Hadir': return 'text-green-500 bg-green-500/10';
      case 'Terlambat': return 'text-red-500 bg-red-500/10';
      case 'Sakit': case 'Izin - Full Day': case 'Izin - Half Day': return 'text-orange-500 bg-orange-500/10';
      case 'Cuti': return 'text-purple-500 bg-purple-500/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const handleModalSubmit = async (e: React.FormEvent, finalStatus: AttendanceStatus) => {
    e.preventDefault();
    if (!user) return;
    setModalLoading(true);

    const now = new Date();
    const notes = (e.currentTarget.querySelector('textarea') as HTMLTextAreaElement)?.value || 'N/A';

    try {
      if (todayLog) {
        await updateAttendance(todayLog.id, { status: finalStatus, notes });
      } else {
        await addAttendance({
          user_id: user.id,
          date: now.toISOString().split('T')[0],
          clock_in: now.toISOString(),
          status: finalStatus,
          notes,
          location_name: locationName,
          coordinates: coords ? { latitude: coords.lat, longitude: coords.lng } : null,
        });
      }
      fetchHistory();
    } catch (error) {
      console.error("Leave submission failed:", error);
    } finally {
      setModalLoading(false);
      setActiveModal('none');
    }
  };

  if (!profile) return <div className="flex justify-center items-center h-full"><Spinner /></div>;

  return (
    <div className={`flex flex-col h-full transition-colors duration-300 relative ${isDarkMode ? 'bg-[#0f172a]' : 'bg-gray-50'}`}>
      <div className={`px-6 py-4 flex justify-between items-center transition-colors ${isDarkMode ? 'bg-[#1e293b]' : 'bg-white border-b border-gray-100'}`}>
        <button onClick={() => setActiveView('home')} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-200' : 'hover:bg-gray-100 text-[#004691]'}`}><ChevronLeft size={24} /></button>
        <h2 className={`text-lg font-bold ${isDarkMode ? 'text-gray-100' : 'text-[#004691]'}`}>Absensi Kehadiran</h2>
        <button onClick={() => setActiveView('history')} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-200' : 'hover:bg-gray-100 text-[#004691]'} relative`}><History size={22} /></button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-6 space-y-6">
        <div className={`p-4 rounded-3xl flex items-center gap-4 border transition-colors ${isDarkMode ? 'bg-[#1e293b] border-[#334155]' : 'bg-white border-gray-100 shadow-sm shadow-blue-900/5'}`}>
          <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center border-2 border-white/20"><img src={profile.avatar_url || ''} alt={profile.full_name || ''} /></div>
          <div className="flex flex-col">
            <h4 className={`font-bold text-sm leading-tight ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>{profile.full_name}</h4>
            <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5 tracking-wider">{profile.id.substring(0, 8)} • {profile.position}</p>
          </div>
        </div>

        <div className={`p-8 rounded-[2.5rem] text-center relative overflow-hidden transition-all duration-500 shadow-2xl ${isDarkMode ? 'bg-gradient-to-br from-[#1e3a8a] to-[#0f172a]' : 'bg-[#004691] text-white shadow-[#004691]/30'}`}>
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-10 -mt-10 blur-3xl"></div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50 mb-3">Waktu Saat Ini</p>
          <h1 className="text-5xl font-black font-mono tracking-tighter mb-2">{timeString}</h1>
          <div className="flex items-center justify-center gap-2 opacity-80"><Calendar size={14} className="text-blue-300" /><p className="text-xs font-bold">{dateString}</p></div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button onClick={handleClockIn} disabled={!!todayLog} className={`...`}>
            {/* Clock-in button UI */}
            <Fingerprint size={40} /><span>CLOCK IN</span>
          </button>
          <button onClick={handleClockOut} disabled={!todayLog?.clock_in || !!todayLog?.clock_out} className={`...`}>
            {/* Clock-out button UI */}
            <LogOut size={40} /><span>CLOCK OUT</span>
          </button>
        </div>

        {/* Daily Log & History Sections */}
        <div className={`p-5 rounded-[2rem] border space-y-4 shadow-sm transition-colors ${isDarkMode ? 'bg-[#1e293b] border-[#334155]' : 'bg-white border-gray-100'}`}>
          <div className="flex justify-between items-center px-1">
            <h3 className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-blue-400' : 'text-[#004691]'}`}>Log Harian</h3>
            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${getStatusColor()}`}>{getStatus()}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center ${isDarkMode ? 'bg-[#0f172a] border-[#334155]' : 'bg-gray-50 border-gray-100'}`}>
              <p className="text-[9px] text-gray-400 font-black uppercase mb-1">Masuk</p>
              <p className={`text-sm font-black ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>{todayLog?.clock_in ? new Date(todayLog.clock_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-- : --'}</p>
            </div>
            <div className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center ${isDarkMode ? 'bg-[#0f172a] border-[#334155]' : 'bg-gray-50 border-gray-100'}`}>
              <p className="text-[9px] text-gray-400 font-black uppercase mb-1">Pulang</p>
              <p className={`text-sm font-black ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>{todayLog?.clock_out ? new Date(todayLog.clock_out).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-- : --'}</p>
            </div>
          </div>
          <div className={`p-4 rounded-2xl border flex items-center gap-3 ${isDarkMode ? 'bg-[#0f172a] border-[#334155]' : 'bg-gray-50 border-gray-100'}`}>
            <div className={`p-2.5 rounded-xl relative ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
              <MapPin size={20} className={isDarkMode ? 'text-blue-400' : 'text-[#004691]'} />
              {isFetchingLocation && <RefreshCw size={10} className="absolute -top-1 -right-1 text-blue-500 animate-spin" />}
            </div>
            <div className="flex-1 min-w-0"><p className="text-[9px] text-gray-500 font-black uppercase flex justify-between items-center tracking-wider"><span>Lokasi Terkini</span>{coords && (<span className="text-[8px] opacity-40 font-mono">{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</span>)}</p><p className={`text-xs font-bold truncate leading-relaxed ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{locationName}</p></div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <LeaveMenuButton isDarkMode={isDarkMode} onClick={() => setActiveModal('izin')} icon={<FileText size={22} className="text-orange-500" />} label="Izin" />
          <LeaveMenuButton isDarkMode={isDarkMode} onClick={() => setActiveModal('sakit')} icon={<Stethoscope size={22} className="text-blue-500" />} label="Sakit" />
          <LeaveMenuButton isDarkMode={isDarkMode} onClick={() => setActiveModal('cuti')} icon={<CalendarOff size={22} className="text-purple-500" />} label="Cuti" />
        </div>

        <div className="space-y-4 pt-2 pb-12">
          <h3 className={`font-bold px-1 ${isDarkMode ? 'text-gray-200' : 'text-[#004691]'}`}>Riwayat Presensi</h3>
          <div className={`rounded-[2rem] divide-y shadow-sm border transition-colors overflow-hidden ${isDarkMode ? 'bg-[#1e293b] divide-[#334155] border-[#334155]' : 'bg-white divide-gray-50 border-gray-100'}`}>
            {loadingHistory ? <div className="p-10 flex justify-center"><Spinner /></div> : attendanceHistory.length > 0 ? (
              attendanceHistory.map((log) => <AttendanceLogItem key={log.id} log={log} isDarkMode={isDarkMode} />)
            ) : (
              <div className="py-20 flex flex-col items-center justify-center text-center px-6 gap-4"><div className={`p-6 rounded-full ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}><ClipboardList size={48} className="text-gray-200" /></div><div className="space-y-1"><p className={`text-sm font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Belum Ada Riwayat</p><p className="text-xs text-gray-400">Log kehadiran harian Anda akan muncul di sini.</p></div></div>
            )}
          </div>
        </div>
      </div>

      {activeModal !== 'none' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-8 bg-black/60 backdrop-blur-sm">
          {/* Modal Implementation with handleModalSubmit */}
        </div>
      )}
    </div>
  );
};

const LeaveMenuButton: React.FC<{ isDarkMode: boolean; icon: React.ReactNode; label: string; onClick: () => void }> = ({ isDarkMode, icon, label, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center gap-2 p-5 rounded-3xl border transition-all active:scale-90 shadow-sm ${isDarkMode ? 'bg-[#1e293b] border-[#334155]' : 'bg-white border-gray-100'}`}>
    {/* ... */}
  </button>
);

const AttendanceLogItem: React.FC<{ log: AttendanceType, isDarkMode: boolean }> = ({ log, isDarkMode }) => {
  const time = log.clock_in ? new Date(log.clock_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
  const date = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(log.date));
  return (
    <div className="p-4 flex justify-between items-center">
      {/* ... Log Item UI ... */}
    </div>
  );
};

export default Attendance;
