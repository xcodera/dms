
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Spinner from '../components/Spinner';

interface LoginPageProps {
  onSwitchToRegister: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // The onAuthStateChange listener in AuthContext will handle the redirect
    } catch (error: any) {
      setError(error.message || 'Failed to log in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-[#0f172a]">
      <div className="w-full max-w-sm p-8 space-y-6 bg-white dark:bg-[#1e293b] rounded-2xl shadow-xl">
        <h1 className="text-2xl font-bold text-center text-[#004691] dark:text-blue-400">myBCA Operations</h1>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-[#0f172a] dark:border-[#334155]" />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-2 mt-1 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-[#0f172a] dark:border-[#334155]" />
          </div>
          <button type="submit" disabled={loading} className="w-full py-2.5 font-semibold text-white bg-[#004691] rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center">
            {loading ? <Spinner size="sm" color="border-white"/> : 'Login'}
          </button>
        </form>
        <p className="text-sm text-center text-gray-600 dark:text-gray-400">
          Belum punya akun? <button onClick={onSwitchToRegister} className="font-semibold text-blue-600 hover:underline dark:text-blue-400">Daftar di sini</button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
