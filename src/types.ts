
import { Database } from './database.types';

// Original App Types
export interface Transaction {
  id: string;
  title: string;
  amount: number;
  date: string;
  type: 'debit' | 'credit';
  category: string;
}

export interface AccountInfo {
  name: string;
  accountNumber: string;
  balance: number;
  points: number;
  jobTitle: string;
  role: string;
  avatarUrl: string;
}

export type AppView = 'home' | 'history' | 'qris' | 'ai-assistant' | 'profile' | 'attendance' | 'sliks' | 'settings';

// Supabase-derived Types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Attendance = Database['public']['Tables']['attendance']['Row'];
export type AttendanceInsert = Database['public']['Tables']['attendance']['Insert'];
export type SliksKtp = Database['public']['Tables']['sliks_ktp']['Row'];
export type SliksKtpInsert = Database['public']['Tables']['sliks_ktp']['Insert'];

// Combined/Feature-specific Types
export type CombinedActivity = (
  | (Omit<Attendance, 'user_id'> & { type: 'Absensi'; title: string; })
  | (Omit<SliksKtp, 'user_id' | 'berlaku_hingga' | 'kel_desa' | 'kecamatan' | 'pekerjaan' | 'status_perkawinan'> & { type: 'Slik'; title: string; })
)

export interface KtpData {
  nik: string;
  nama: string;
  tempat_tgl_lahir: string;
  jenis_kelamin: string;
  alamat: string;
  rt_rw: string;
  kel_desa: string;
  kecamatan: string;
  agama: string;
  status_perkawinan: string;
  pekerjaan: string;
  kewarganegaraan: string;
  berlaku_hingga: string;
  card_box?: [number, number, number, number];
}
