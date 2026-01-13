
import React, { useState, useEffect } from 'react';
import {
  ChevronLeft, History, MapPin, LogOut,
  FileText, Stethoscope, CalendarOff, AlertCircle, CheckCircle2,
  Calendar, RefreshCw, Fingerprint, X,
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

  // State for logic
  const [todayLog, setTodayLog] = useState<AttendanceType | null>(null);
  const [locationName, setLocationName] = useState<string>("Mendeteksi lokasi...");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceType[]>([]);
  const [activeModal, setActiveModal] = useState<ModalType>('none');
  const [modalLoading, setModalLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch History Effect - Fix to sort by created_at desc to get latest status
  const fetchHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const history = await getAttendanceHistory(user.id);
      setAttendanceHistory(history);
      const today = new Date().toISOString().split('T')[0];
      // Find the *latest* log for today
      const todayLogs = history.filter(log => log.date === today);
      const latestLog = todayLogs.length > 0 ? todayLogs[0] : null; // Assuming history is sorted desc
      setTodayLog(latestLog);
    } catch (error) {
      console.error("Error fetching attendance history", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  // Geolocation Effect (Matches Dashboard & User Request Logic)
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationName("GPS tidak didukung");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });

        // Only fetch address name if we haven't successfully fetched it yet or if we want to refresh (simplified to fetch once or on significant change, but for now strict watch as requested)
        if (!isFetchingLocation) {
          try {
            // We don't want to spam the API, but user requested 'watchPosition'. 
            // We'll limit actual API calls for reverse geocoding to initial or explicit refresh if possible, 
            // but implementation below follows the user's snippet logic.
            setIsFetchingLocation(true);
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
              { headers: { 'Accept-Language': 'id', 'User-Agent': 'xcodera-app' } }
            );
            const data = await response.json();
            const name = data.display_name ? data.display_name.split(',').slice(0, 3).join(',') : '';
            setLocationName(name || "Lokasi tidak dikenal");
          } catch (error) {
            console.error("Reverse Geocoding Error:", error);
            setLocationName(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          } finally {
            setIsFetchingLocation(false);
          }
        }
      },
      (error) => {
        console.error("Geolocation Error:", error);
        setLocationName("Izin lokasi ditolak");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []); // Logic matches user request

  const timeString = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateString = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }).format(currentTime);

  const handleClockIn = async () => {
    // Allow Clock In if NO log today OR if the latest log has a clock_out (start new session)
    if (!user) return;
    if (todayLog && !todayLog.clock_out) return; // Prevent double clock-in if currently active

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
      fetchHistory();
    } catch (error) {
      console.error("Clock in failed:", error);
    }
  };

  const handleClockOut = async () => {
    // Allow Clock Out only if we have an active session
    if (!user || !todayLog || todayLog.clock_out) return;
    try {
      await updateAttendance(todayLog.id, { clock_out: new Date().toISOString() });
      fetchHistory();
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
      case 'Sakit': case 'Izin - Half Day': case 'Izin - Full Day': return 'text-orange-500 bg-orange-500/10';
      case 'Cuti': return 'text-purple-500 bg-purple-500/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const handleModalSubmit = async (e: React.FormEvent, finalStatus: AttendanceStatus) => {
    e.preventDefault();
    if (!user) return;
    setModalLoading(true);

    const now = new Date();
    const formData = new FormData(e.currentTarget as HTMLFormElement);

    // Extract dates and notes
    const purpose = formData.get('purpose') as string;
    const startDate = formData.get('startDate') as string;
    const endDate = formData.get('endDate') as string;

    let notes = purpose || 'Pengajuan via aplikasi';
    if (startDate) notes += ` | Mulai: ${startDate}`;
    if (endDate) notes += ` | Sampai: ${endDate}`;

    try {
      // Create new record for the permission
      await addAttendance({
        user_id: user.id,
        date: startDate || now.toISOString().split('T')[0], // Use selected start date or today
        clock_in: now.toISOString(),
        clock_out: now.toISOString(), // Auto-close permission records
        status: finalStatus,
        notes,
        location_name: locationName,
        coordinates: coords ? { latitude: coords.lat, longitude: coords.lng } : null,
      });
      fetchHistory();
      setActiveModal('none');
    } catch (error) {
      console.error("Submission failed:", error);
    } finally {
      setModalLoading(false);
    }
  };

  if (!profile) return <div className="flex justify-center items-center h-full"><Spinner /></div>;

  return (
    <div className={`flex flex-col h-full transition-colors duration-300 relative ${isDarkMode ? 'bg-[#0f172a]' : 'bg-gray-50'}`}>
      {/* ... Header & Profile & Clock (Keep as is) ... */}
      <div className={`px-6 py-4 flex justify-between items-center transition-colors ${isDarkMode ? 'bg-[#1e293b]' : 'bg-white border-b border-gray-100'}`}>
        <button onClick={() => setActiveView('home')} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-200' : 'hover:bg-gray-100 text-[#004691]'}`}>
          <ChevronLeft size={24} />
        </button>
        <h2 className={`text-lg font-bold ${isDarkMode ? 'text-gray-100' : 'text-[#004691]'}`}>Absensi Kehadiran</h2>
        <button onClick={() => setActiveView('history')} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-200' : 'hover:bg-gray-100 text-[#004691]'}`}>
          <History size={22} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-6 space-y-6">
        <div className={`p-4 rounded-3xl flex items-center gap-4 border transition-colors ${isDarkMode ? 'bg-[#1e293b] border-[#334155]' : 'bg-white border-gray-100 shadow-sm shadow-blue-900/5'}`}>
          <div className="w-12 h-12 bg-[#004691] rounded-full flex items-center justify-center text-white font-bold text-sm border-2 border-white/20 overflow-hidden">
            {profile.avatar_url ? <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" /> : profile.full_name?.charAt(0)}
          </div>
          <div className="flex flex-col">
            <h4 className={`font-bold text-sm leading-tight ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}>{profile.full_name}</h4>
            <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5 tracking-wider">{profile.id.substring(0, 8)} • {profile.position}</p>
          </div>
        </div>

        <div className={`p-8 rounded-[2.5rem] text-center relative overflow-hidden transition-all duration-500 shadow-2xl ${isDarkMode ? 'bg-gradient-to-br from-[#1e3a8a] to-[#0f172a]' : 'bg-[#004691] text-white shadow-[#004691]/30'}`}>
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-10 -mt-10 blur-3xl"></div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50 mb-3">Waktu Saat Ini</p>
          <h1 className="text-5xl font-black font-mono tracking-tighter mb-2">{timeString}</h1>
          <div className="flex items-center justify-center gap-2 opacity-80">
            <Calendar size={14} className="text-blue-300" />
            <p className="text-xs font-bold">{dateString}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleClockIn}
            // Disabled if active session exists (has clock_in but no clock_out),
            // BUT ENABLED if no session or last session is finished (has clock_out).
            disabled={!!todayLog && !todayLog.clock_out}
            className={`group relative h-32 rounded-[2.5rem] font-bold text-sm overflow-hidden transition-all active:scale-95 flex flex-col items-center justify-center gap-2 shadow-xl border-2 backdrop-blur-xl ${todayLog && !todayLog.clock_out
                ? 'bg-gray-200/50 border-gray-300 text-gray-400 cursor-not-allowed opacity-60'
                : `border-green-500/30 text-green-600 ${isDarkMode ? 'bg-green-500/10' : 'bg-green-50/70'}`
              }`}
          >
            <div className={`absolute inset-0 bg-green-500 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300 ${todayLog && !todayLog.clock_out ? 'hidden' : ''}`}></div>
            <Fingerprint size={40} className={`relative z-10 transition-colors duration-300 ${!(todayLog && !todayLog.clock_out) ? 'group-hover:text-white' : ''}`} />
            <span className={`relative z-10 text-[10px] font-black tracking-[0.3em] transition-colors duration-300 ${!(todayLog && !todayLog.clock_out) ? 'group-hover:text-white' : ''}`}>CLOCK IN</span>
          </button>

          <button
            onClick={handleClockOut}
            // Disabled if user is NOT currently clocked in
            disabled={!todayLog || !!todayLog.clock_out}
            className={`group relative h-32 rounded-[2.5rem] font-bold text-sm overflow-hidden transition-all active:scale-95 flex flex-col items-center justify-center gap-2 shadow-xl border-2 backdrop-blur-xl ${!todayLog || !!todayLog.clock_out
                ? 'bg-gray-200/50 border-gray-300 text-gray-400 cursor-not-allowed opacity-60'
                : `border-red-500/30 text-red-600 ${isDarkMode ? 'bg-red-500/10' : 'bg-red-50/70'}`
              }`}
          >
            <div className={`absolute inset-0 bg-red-500 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-300 ${(!todayLog || !!todayLog.clock_out) ? 'hidden' : ''}`}></div>
            <LogOut size={40} className={`relative z-10 transition-colors duration-300 ${todayLog && !todayLog.clock_out ? 'group-hover:text-white' : ''}`} />
            <span className={`relative z-10 text-[10px] font-black tracking-[0.3em] transition-colors duration-300 ${todayLog && !todayLog.clock_out ? 'group-hover:text-white' : ''}`}>CLOCK OUT</span>
          </button>
        </div>

        {/* ... Daily Log & History Sections (Keep as is) ... */}
        <div className={`p-5 rounded-[2rem] border space-y-4 shadow-sm transition-colors ${isDarkMode ? 'bg-[#1e293b] border-[#334155]' : 'bg-white border-gray-100'}`}>
          <div className="flex justify-between items-center px-1">
            <h3 className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-blue-400' : 'text-[#004691]'}`}>Log Harian</h3>
            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${getStatusColor()}`}>
              {getStatus()}
            </div>
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
              {isFetchingLocation && (
                <RefreshCw size={10} className="absolute -top-1 -right-1 text-blue-500 animate-spin" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] text-gray-500 font-black uppercase flex justify-between items-center tracking-wider">
                <span>Lokasi Terkini</span>
                {coords && (<span className="text-[8px] opacity-40 font-mono">{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}</span>)}
              </p>
              <p className={`text-xs font-bold truncate leading-relaxed ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                {locationName}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <LeaveMenuButton isDarkMode={isDarkMode} onClick={() => setActiveModal('izin')} icon={<FileText size={22} className="text-orange-500" />} label="Izin" />
          <LeaveMenuButton isDarkMode={isDarkMode} onClick={() => setActiveModal('sakit')} icon={<Stethoscope size={22} className="text-blue-500" />} label="Sakit" />
          <LeaveMenuButton isDarkMode={isDarkMode} onClick={() => setActiveModal('cuti')} icon={<CalendarOff size={22} className="text-purple-500" />} label="Cuti" />
        </div>

        <div className="space-y-4 pt-2 pb-12">
          {/* History List */}
          <div className="flex justify-between items-center px-1">
            <h3 className={`font-bold ${isDarkMode ? 'text-gray-200' : 'text-[#004691]'}`}>Riwayat Presensi</h3>
            {attendanceHistory.length > 0 && (
              <button onClick={() => setActiveView('history')} className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-blue-400' : 'text-[#004691]'}`}>Lihat Semua</button>
            )}
          </div>

          <div className={`rounded-[2rem] divide-y shadow-sm border transition-colors overflow-hidden ${isDarkMode ? 'bg-[#1e293b] divide-[#334155] border-[#334155]' : 'bg-white divide-gray-50 border-gray-100'
            }`}>
            {attendanceHistory.length > 0 ? (
              attendanceHistory.map((log) => (
                <AttendanceLogItem key={log.id} log={log} isDarkMode={isDarkMode} />
              ))
            ) : (
              <div className="py-20 flex flex-col items-center justify-center text-center px-6 gap-4">
                <div className={`p-6 rounded-full ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                  <ClipboardList size={48} className="text-gray-200" />
                </div>
                <div className="space-y-1">
                  <p className={`text-sm font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Belum Ada Riwayat</p>
                  <p className="text-xs text-gray-400">Log kehadiran harian Anda akan muncul di sini.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {activeModal !== 'none' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-8 bg-black/60 backdrop-blur-sm transition-opacity duration-300">
          <div className={`w-full max-w-[320px] rounded-[2rem] shadow-2xl p-5 transition-all transform animate-pop-in ${isDarkMode ? 'bg-[#1e293b] border border-[#334155]' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-4 px-1">
              {/* Modal Header */}
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${activeModal === 'izin' ? 'bg-orange-100 text-orange-600' :
                    activeModal === 'sakit' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
                  }`}>
                  {activeModal === 'izin' && <FileText size={18} />}
                  {activeModal === 'sakit' && <Stethoscope size={18} />}
                  {activeModal === 'cuti' && <CalendarOff size={18} />}
                </div>
                <div className="flex flex-col">
                  <h3 className={`text-base font-black leading-tight ${isDarkMode ? 'text-white' : 'text-[#004691]'}`}>
                    {activeModal === 'izin' ? 'Pengajuan Izin' : activeModal === 'sakit' ? 'Laporan Sakit' : 'Pengajuan Cuti'}
                  </h3>
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Lengkapi data Anda</p>
                </div>
              </div>
              <button onClick={() => setActiveModal('none')} className={`p-1.5 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            {/* Modal Forms with Name attributes for FormData */}
            {activeModal === 'izin' && (
              <form onSubmit={(e) => {
                const formData = new FormData(e.currentTarget);
                const type = formData.get('type') as string;
                handleModalSubmit(e, type === 'Half Day' ? 'Izin - Half Day' : 'Izin - Full Day');
              }} className="space-y-3.5">
                <AttendanceField label="Durasi" isDarkMode={isDarkMode}>
                  <div className="grid grid-cols-2 gap-2">
                    <label className={`flex items-center justify-center p-2.5 rounded-xl border-2 cursor-pointer transition-all active:scale-95 ${isDarkMode ? 'border-[#334155] bg-[#0f172a]' : 'border-gray-100 bg-gray-50'} has-[:checked]:border-[#004691] has-[:checked]:bg-[#004691]/5`}>
                      <input type="radio" name="type" value="Half Day" defaultChecked className="hidden" />
                      <span className={`text-[10px] font-black ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Setengah Hari</span>
                    </label>
                    <label className={`flex items-center justify-center p-2.5 rounded-xl border-2 cursor-pointer transition-all active:scale-95 ${isDarkMode ? 'border-[#334155] bg-[#0f172a]' : 'border-gray-100 bg-gray-50'} has-[:checked]:border-[#004691] has-[:checked]:bg-[#004691]/5`}>
                      <input type="radio" name="type" value="Full Day" className="hidden" />
                      <span className={`text-[10px] font-black ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Satu Hari</span>
                    </label>
                  </div>
                </AttendanceField>
                <AttendanceField label="Alasan" isDarkMode={isDarkMode}>
                  <textarea name="purpose" required placeholder="Tulis alasan..." className={`w-full py-2.5 px-3.5 rounded-xl text-xs border-2 focus:outline-none focus:border-[#004691] min-h-[70px] resize-none font-semibold ${isDarkMode ? 'bg-[#0f172a] border-[#334155] text-white' : 'bg-white border-gray-100 text-gray-800'}`}></textarea>
                </AttendanceField>
                <SubmitButton loading={modalLoading} />
              </form>
            )}

            {activeModal === 'sakit' && (
              <form onSubmit={(e) => handleModalSubmit(e, 'Sakit')} className="space-y-3.5">
                <AttendanceField label="Tanggal Mulai" isDarkMode={isDarkMode}>
                  <input name="startDate" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className={`w-full py-2.5 px-3.5 rounded-xl text-xs border-2 focus:outline-none focus:border-[#004691] font-semibold ${isDarkMode ? 'bg-[#0f172a] border-[#334155] text-white' : 'bg-white border-gray-100 text-gray-800'}`} />
                </AttendanceField>
                <AttendanceField label="Keterangan" isDarkMode={isDarkMode}>
                  <textarea name="purpose" required placeholder="Gejala singkat..." className={`w-full py-2.5 px-3.5 rounded-xl text-xs border-2 focus:outline-none focus:border-[#004691] min-h-[70px] resize-none font-semibold ${isDarkMode ? 'bg-[#0f172a] border-[#334155] text-white' : 'bg-white border-gray-100 text-gray-800'}`}></textarea>
                </AttendanceField>
                <SubmitButton loading={modalLoading} />
              </form>
            )}

            {activeModal === 'cuti' && (
              <form onSubmit={(e) => handleModalSubmit(e, 'Cuti')} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-2">
                  <AttendanceField label="Mulai" isDarkMode={isDarkMode}>
                    <input name="startDate" type="date" required className={`w-full py-2.5 px-2 rounded-xl text-[10px] border-2 focus:outline-none focus:border-[#004691] font-semibold ${isDarkMode ? 'bg-[#0f172a] border-[#334155] text-white' : 'bg-white border-gray-100 text-gray-800'}`} />
                  </AttendanceField>
                  <AttendanceField label="Selesai" isDarkMode={isDarkMode}>
                    <input name="endDate" type="date" required className={`w-full py-2.5 px-2 rounded-xl text-[10px] border-2 focus:outline-none focus:border-[#004691] font-semibold ${isDarkMode ? 'bg-[#0f172a] border-[#334155] text-white' : 'bg-white border-gray-100 text-gray-800'}`} />
                  </AttendanceField>
                </div>
                <AttendanceField label="Keperluan" isDarkMode={isDarkMode}>
                  <textarea name="purpose" required placeholder="Tujuan cuti..." className={`w-full py-2.5 px-3.5 rounded-xl text-xs border-2 focus:outline-none focus:border-[#004691] min-h-[70px] resize-none font-semibold ${isDarkMode ? 'bg-[#0f172a] border-[#334155] text-white' : 'bg-white border-gray-100 text-gray-800'}`}></textarea>
                </AttendanceField>
                <SubmitButton loading={modalLoading} />
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const SubmitButton: React.FC<{ loading: boolean }> = ({ loading }) => (
  <button
    type="submit"
    disabled={loading}
    className="w-full py-3.5 bg-[#004691] hover:bg-[#003d7e] text-white rounded-xl font-black text-xs shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:active:scale-100"
  >
    {loading ? (<> <RefreshCw size={16} className="animate-spin" /> PROSES... </>) : (<> <CheckCircle2 size={16} /> KIRIM PENGAJUAN </>)}
  </button>
);

const LeaveMenuButton: React.FC<{ isDarkMode: boolean; icon: React.ReactNode; label: string; onClick: () => void }> = ({ isDarkMode, icon, label, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center gap-2 p-5 rounded-3xl border transition-all active:scale-90 shadow-sm ${isDarkMode ? 'bg-[#1e293b] border-[#334155] shadow-black/20' : 'bg-white border-gray-100 shadow-blue-900/5'
    }`}>
    <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
      {icon}
    </div>
    <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>{label}</span>
  </button>
);

const AttendanceLogItem: React.FC<{
  isDarkMode: boolean;
  log: AttendanceType;
}> = ({ isDarkMode, log }) => {
  const status = log.status;
  const date = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(log.date));
  const time = log.clock_in ? new Date(log.clock_in).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
  const location = log.location_name || 'Lokasi Terdeteksi';

  return (
    <div className="p-4 flex justify-between items-center active:bg-gray-500/5 transition-colors cursor-pointer group">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${status.includes('Hadir') ? (isDarkMode ? 'bg-green-900/30' : 'bg-green-50') :
          status.includes('Terlambat') ? (isDarkMode ? 'bg-red-900/30' : 'bg-red-50') :
            (isDarkMode ? 'bg-orange-900/30' : 'bg-orange-50')
          }`}>
          {status.includes('Hadir') ? <CheckCircle2 size={18} className="text-green-500" /> :
            status.includes('Terlambat') ? <AlertCircle size={18} className="text-red-500" /> :
              <FileText size={18} className="text-orange-500" />}
        </div>
        <div className="flex flex-col">
          <p className={`font-bold text-sm leading-none group-hover:text-blue-500 transition-colors ${isDarkMode ? 'text-gray-100' : 'text-gray-800'}`}> {status} </p>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1 leading-none">{date} • {location}</p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className={`font-black text-sm leading-none ${isDarkMode ? 'text-gray-200' : 'text-[#004691]'}`}> {time} </p>
        <p className="text-[9px] text-gray-400 font-black uppercase mt-1 leading-none">WIB</p>
      </div>
    </div>
  );
};

export default Attendance;
