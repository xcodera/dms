
import { supabase } from '../lib/supabaseClient';
import { AttendanceInsert, SliksKtpInsert, CombinedActivity } from '../types';

// Profile Service
export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
};

export const updateProfile = async (userId: string, updates: { full_name?: string; avatar_url?: string; position?: string; }) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// Attendance Service
export const getAttendanceHistory = async (userId: string, limit = 10) => {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
};

export const addAttendance = async (attendanceData: AttendanceInsert) => {
  const { data, error } = await supabase
    .from('attendance')
    .insert([attendanceData])
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateAttendance = async (recordId: string, updates: { clock_out?: string | null; status?: string; notes?: string }) => {
    const { data, error } = await supabase
      .from('attendance')
      .update(updates)
      .eq('id', recordId)
      .select()
      .single();
    if (error) throw error;
    return data;
};

// SLIKs Service
export const getSliksHistory = async (userId: string, limit = 10) => {
  const { data, error } = await supabase
    .from('sliks_ktp')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
};

export const addSliksData = async (sliksData: SliksKtpInsert) => {
  const { data, error } = await supabase
    .from('sliks_ktp')
    .insert([sliksData])
    .select()
    .single();
  if (error) throw error;
  return data;
};

// Combined Activity Service
export const getCombinedActivityHistory = async (userId: string, limit = 5): Promise<CombinedActivity[]> => {
    const [attendanceRes, sliksRes] = await Promise.all([
        supabase.from('attendance').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit),
        // FIX: Changed select to fetch all columns to match the `CombinedActivity` type definition.
        supabase.from('sliks_ktp').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(limit)
    ]);

    if (attendanceRes.error) throw attendanceRes.error;
    if (sliksRes.error) throw sliksRes.error;

    const attendanceActivities: CombinedActivity[] = attendanceRes.data.map(a => ({ ...a, type: 'Absensi', title: `Absensi: ${a.status}` }));
    const sliksActivities: CombinedActivity[] = sliksRes.data.map(s => ({ ...s, type: 'Slik', title: `SLIK: ${s.nama_lengkap}` }));
    
    const combined = [...attendanceActivities, ...sliksActivities];
    
    return combined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, limit);
}
