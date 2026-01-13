
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      attendance: {
        Row: {
          clock_in: string | null
          clock_out: string | null
          coordinates: Json | null
          created_at: string
          date: string
          id: string
          location_name: string | null
          notes: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          clock_in?: string | null
          clock_out?: string | null
          coordinates?: Json | null
          created_at?: string
          date: string
          id?: string
          location_name?: string | null
          notes?: string | null
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          clock_in?: string | null
          clock_out?: string | null
          coordinates?: Json | null
          created_at?: string
          date?: string
          id?: string
          location_name?: string | null
          notes?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      profiles: {
        Row: {
          alias: string | null
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          position: string | null
          updated_at: string
        }
        Insert: {
          alias?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          position?: string | null
          updated_at?: string
        }
        Update: {
          alias?: string | null
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          position?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      sliks_ktp: {
        Row: {
          agama: string | null
          alamat: string | null
          berlaku_hingga: string | null
          created_at: string
          id: string
          jenis_kelamin: string | null
          kecamatan: string | null
          kel_desa: string | null
          kewarganegaraan: string | null
          nama_lengkap: string | null
          nik: string | null
          pekerjaan: string | null
          rt_rw: string | null
          status_perkawinan: string | null
          tanggal_lahir: string | null
          tempat_lahir: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agama?: string | null
          alamat?: string | null
          berlaku_hingga?: string | null
          created_at?: string
          id?: string
          jenis_kelamin?: string | null
          kecamatan?: string | null
          kel_desa?: string | null
          kewarganegaraan?: string | null
          nama_lengkap?: string | null
          nik?: string | null
          pekerjaan?: string | null
          rt_rw?: string | null
          status_perkawinan?: string | null
          tanggal_lahir?: string | null
          tempat_lahir?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agama?: string | null
          alamat?: string | null
          berlaku_hingga?: string | null
          created_at?: string
          id?: string
          jenis_kelamin?: string | null
          kecamatan?: string | null
          kel_desa?: string | null
          kewarganegaraan?: string | null
          nama_lengkap?: string | null
          nik?: string | null
          pekerjaan?: string | null
          rt_rw?: string | null
          status_perkawinan?: string | null
          tanggal_lahir?: string | null
          tempat_lahir?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sliks_ktp_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
