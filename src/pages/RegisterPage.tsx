
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Spinner from '../components/Spinner';

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

const RegisterPage: React.FC<RegisterPageProps> = ({ onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`,
          },
        },
      });
      if (error) throw error;
      if (data.user) {
        // Manually update profile with email to allow "Login by Username" lookup later
        // Note: This relies on the table having an 'email' column or JSONB. 
        // We will try to update it, ignoring errors if column doesn't exist yet (soft fail).
        try {
          await supabase.from('profiles').update({
            // @ts-ignore: email column might not exist in types yet
            email: email
          }).eq('id', data.user.id);
        } catch (err) {
          console.warn("Could not save email to profile (column might be missing)", err);
        }

        setSuccess('Registrasi berhasil! Silakan periksa email Anda untuk verifikasi akun.');
      }
    } catch (error: any) {
      setError(error.message || 'Gagal mendaftar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-[#0f172a]">
      <div className="w-full max-w-sm p-8 space-y-6 bg-white dark:bg-[#1e293b] rounded-2xl shadow-xl">
        <h1 className="text-2xl font-bold text-center text-[#004691] dark:text-blue-400">Buat Akun Baru</h1>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        {success && <p className="text-green-500 text-sm text-center">{success}</p>}
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="text-sm font-medium text-gray-700 dark:text-gray-300">Nama Lengkap</label>
            <input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-[#0f172a] dark:border-[#334155] dark:text-gray-100" />
          </div>
          <div>
            <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-[#0f172a] dark:border-[#334155] dark:text-gray-100" />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-[#0f172a] dark:border-[#334155] dark:text-gray-100" />
          </div>
          <button type="submit" disabled={loading} className="w-full py-2.5 font-semibold text-white bg-[#004691] rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center">
            {loading ? <Spinner size="sm" color="border-white" /> : 'Register'}
          </button>
        </form>
        <p className="text-sm text-center text-gray-600 dark:text-gray-400">
          Sudah punya akun? <button onClick={onSwitchToLogin} className="font-semibold text-blue-600 hover:underline dark:text-blue-400">Login di sini</button>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
