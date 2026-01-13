
import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft, Camera, Upload, X, RefreshCw, Copy, Check, Scissors, Search, History,
  Database, RotateCw, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { AppView, KtpData, SliksKtp } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import { useAuth } from '../contexts/AuthContext';
import { addSliksData, getSliksHistory } from '../services/supabaseService';
import Spinner from './Spinner';

interface SliksProps {
  isDarkMode: boolean;
  setActiveView: (view: AppView) => void;
}

const Sliks: React.FC<SliksProps> = ({ isDarkMode, setActiveView }) => {
  // FIX: Removed useApiKey hook as API key is now handled by environment variables.
  const { user } = useAuth();

  const [step, setStep] = useState<'summary' | 'processing' | 'review'>('summary');
  const [image, setImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [ktpData, setKtpData] = useState<KtpData | null>(null);
  const [showJsonResult, setShowJsonResult] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SliksKtp[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const fetchHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const data = await getSliksHistory(user.id, 5);
      setHistory(data);
    } catch (err) {
      console.error("Failed to fetch SLIKS history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // FIX: Removed API key check.
    setError(null);
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageData = reader.result as string;
        setImage(imageData);
        startExtraction(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  const cropImage = (originalSrc: string, box: [number, number, number, number]): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(originalSrc);
        const [ymin, xmin, ymax, xmax] = box;
        const x = (xmin / 1000) * img.width;
        const y = (ymin / 1000) * img.height;
        const width = ((xmax - xmin) / 1000) * img.width;
        const height = ((ymax - ymin) / 1000) * img.height;
        canvas.width = width; canvas.height = height;
        ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      };
      img.src = originalSrc;
    });
  };

  const startExtraction = async (imageData: string) => {
    setStep('processing');
    setShowJsonResult(false);
    try {
      const apiKey = import.meta.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
        throw new Error("API Key belum disetting. Harap masukkan GEMINI_API_KEY di Vercel.");
      }

      const ai = new GoogleGenAI({ apiKey });
      const base64Data = imageData.split(',')[1];
      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: {
          role: 'user',
          parts: [
            { text: "Ekstrak data dari KTP Indonesia ini. Kembalikan JSON dengan field: nik, nama, tempat_tgl_lahir, jenis_kelamin, alamat, rt_rw, kel_desa, kecamatan, agama, status_perkawinan, pekerjaan, kewarganegaraan, berlaku_hingga. Tambahkan 'card_box' [ymin, xmin, ymax, xmax] (0-1000) untuk crop KTP. Pastikan output HANYA JSON valid tanpa markdown." },
            { inlineData: { mimeType: "image/jpeg", data: base64Data } }
          ]
        },
        config: { responseMimeType: "application/json" }
      });

      const resultText = response.text;
      const result = JSON.parse(resultText) as KtpData;
      setKtpData(result);

      if (result.card_box) {
        try {
          const cropped = await cropImage(imageData, result.card_box);
          setCroppedImage(cropped);
        } catch (e) {
          setCroppedImage(imageData);
        }
      } else {
        setCroppedImage(imageData);
      }

      setStep('review');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Gagal mengekstrak data. Pastikan gambar KTP jelas.");
      setStep('summary');
    }
  };

  const finalizeVerification = async () => {
    if (!ktpData || !user) return;
    const [tempat_lahir, tglLahirStr] = ktpData.tempat_tgl_lahir ? ktpData.tempat_tgl_lahir.split(',').map(s => s.trim()) : ['', ''];

    // Basic date parsing attempt
    let tanggal_lahir = null;
    if (tglLahirStr) {
      const parts = tglLahirStr.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
      if (parts) {
        tanggal_lahir = `${parts[3]}-${parts[2]}-${parts[1]}`;
      }
    }

    try {
      await addSliksData({
        user_id: user.id,
        nik: ktpData.nik,
        nama_lengkap: ktpData.nama,
        tempat_lahir,
        tanggal_lahir: tanggal_lahir || undefined,
        jenis_kelamin: ktpData.jenis_kelamin,
        alamat: ktpData.alamat,
        rt_rw: ktpData.rt_rw,
        kel_desa: ktpData.kel_desa,
        kecamatan: ktpData.kecamatan,
        agama: ktpData.agama,
        status_perkawinan: ktpData.status_perkawinan,
        pekerjaan: ktpData.pekerjaan,
        kewarganegaraan: ktpData.kewarganegaraan,
        berlaku_hingga: ktpData.berlaku_hingga,
      });
      fetchHistory();
      setStep('summary');
      setImage(null);
      setKtpData(null);
    } catch (err) {
      setError("Gagal menyimpan data ke database.");
    }
  };

  const resetUpload = () => {
    setImage(null); setCroppedImage(null); setKtpData(null);
    setShowJsonResult(false); setStep('summary');
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCopyJson = () => {
    if (ktpData) {
      navigator.clipboard.writeText(JSON.stringify(ktpData, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`flex flex-col h-full transition-colors duration-300 relative ${isDarkMode ? 'bg-[#0f172a]' : 'bg-gray-50'}`}>
      <div className={`px-6 py-4 flex justify-between items-center transition-colors ${isDarkMode ? 'bg-[#1e293b]' : 'bg-white border-b border-gray-100'}`}>
        <button onClick={() => step === 'summary' ? setActiveView('home') : resetUpload()} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-200' : 'hover:bg-gray-100 text-[#004691]'}`}><ChevronLeft size={24} /></button>
        <h2 className={`text-lg font-bold ${isDarkMode ? 'text-gray-100' : 'text-[#004691]'}`}>{step === 'summary' ? 'Layanan SLIK' : step === 'processing' ? 'Smart Scanner' : 'Review Identitas'}</h2>
        <div className="w-10"></div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-6 space-y-6 pb-32">
        {step === 'summary' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {error && <div className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-bold border ${isDarkMode ? 'bg-red-900/30 border-red-500/20 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}><AlertTriangle size={24} /><p>{error}</p></div>}
            <div className={`p-8 rounded-[2.5rem] border-2 border-dashed flex flex-col items-center text-center gap-5 transition-all shadow-sm ${isDarkMode ? 'bg-[#1e293b] border-[#334155]' : 'bg-white border-blue-100 shadow-blue-900/5'}`}>
              <button onClick={() => fileInputRef.current?.click()} className={`p-7 rounded-full transition-all active:scale-90 relative group ${isDarkMode ? 'bg-blue-900/40 text-blue-400' : 'bg-blue-50 text-[#004691] shadow-inner shadow-blue-100'}`}><Camera size={48} /><div className="absolute -bottom-1 -right-1 p-2 bg-blue-500 rounded-full text-white shadow-lg border-2 border-white"><Upload size={14} /></div></button>
              <div>
                <h4 className={`text-lg font-black ${isDarkMode ? 'text-white' : 'text-[#004691]'}`}>Verifikasi Cepat</h4>
                <p className="text-xs text-gray-400 mt-1 leading-relaxed px-4">Upload foto KTP. AI akan memproses data Anda secara otomatis.</p>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-end px-1">
                <div className="flex flex-col"><h3 className={`font-black text-sm ${isDarkMode ? 'text-gray-200' : 'text-[#004691]'}`}>Riwayat SLIK</h3><p className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.1em]">5 Pengecekan Terakhir</p></div>
                {history.length > 5 && <button onClick={() => setActiveView('history')} className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-blue-400' : 'text-[#004691]'}`}>Lihat Semua</button>}
              </div>

              <div className={`rounded-[2rem] divide-y shadow-sm border transition-colors overflow-hidden ${isDarkMode ? 'bg-[#1e293b] divide-white/5 border-white/5' : 'bg-white divide-gray-50 border-gray-100 shadow-blue-900/5'}`}>
                {loadingHistory ? <div className="p-10 flex justify-center"><Spinner /></div> : history.length > 0 ? (
                  history.slice(0, 5).map((log) => <SlikLogItem key={log.id} log={log} isDarkMode={isDarkMode} />)
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-center px-6 gap-3"><div className={`p-4 rounded-full ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}><Database size={36} className="text-gray-200" /></div><div className="space-y-0.5"><p className={`text-xs font-bold ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Belum Ada Riwayat</p><p className="text-[10px] text-gray-400 px-4">Data riwayat pengecekan SLIK Anda akan muncul di sini.</p></div></div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 animate-in fade-in duration-500">
            <div className="relative">
              <div className="w-24 h-24 rounded-full border-4 border-blue-100 border-t-blue-500 animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center"><RotateCw size={32} className="text-blue-500 animate-pulse" /></div>
            </div>
            <div className="space-y-2">
              <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Sedang Menganalisis...</h3>
              <p className="text-sm text-gray-400 max-w-xs mx-auto">AI kami sedang membaca data KTP Anda. Mohon tunggu sebentar.</p>
            </div>
          </div>
        )}

        {step === 'review' && ktpData && croppedImage && (
          <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500">
            <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-lg border-2 border-white/20 relative group">
              <img src={croppedImage} alt="KTP Cropped" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors"></div>
            </div>

            <div className={`p-6 rounded-3xl space-y-4 border ${isDarkMode ? 'bg-[#1e293b] border-[#334155]' : 'bg-white border-gray-100 shadow-md'}`}>
              <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-white/5">
                <h3 className={`font-bold ${isDarkMode ? 'text-gray-100' : 'text-[#004691]'}`}>Hasil Ekstraksi</h3>
                <button onClick={() => setShowJsonResult(!showJsonResult)} className="p-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"><Scissors size={16} className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} /></button>
              </div>

              {showJsonResult ? (
                <div className="relative group">
                  <pre className={`text-[10px] p-4 rounded-xl overflow-x-auto font-mono leading-relaxed ${isDarkMode ? 'bg-[#0f172a] text-green-400' : 'bg-gray-900 text-green-400'}`}>
                    {JSON.stringify(ktpData, null, 2)}
                  </pre>
                  <button onClick={handleCopyJson} className="absolute top-2 right-2 p-2 rounded-md bg-white/10 hover:bg-white/20 text-white transition-colors">
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <SlikField label="NIK" value={ktpData.nik} isDarkMode={isDarkMode} />
                    <SlikField label="Nama Lengkap" value={ktpData.nama} isDarkMode={isDarkMode} />
                    <div className="grid grid-cols-2 gap-4">
                      <SlikField label="Tempat/Tgl Lahir" value={ktpData.tempat_tgl_lahir} isDarkMode={isDarkMode} />
                      <SlikField label="Jenis Kelamin" value={ktpData.jenis_kelamin} isDarkMode={isDarkMode} />
                    </div>
                    <SlikField label="Alamat" value={`${ktpData.alamat}, ${ktpData.rt_rw}, ${ktpData.kel_desa}, ${ktpData.kecamatan}`} multiline isDarkMode={isDarkMode} />
                    <div className="grid grid-cols-2 gap-4">
                      <SlikField label="Agama" value={ktpData.agama} isDarkMode={isDarkMode} />
                      <SlikField label="Status Perkawinan" value={ktpData.status_perkawinan} isDarkMode={isDarkMode} />
                    </div>
                    <SlikField label="Pekerjaan" value={ktpData.pekerjaan} isDarkMode={isDarkMode} />
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-6 pt-4 bg-gradient-to-t from-[#0f172a] to-transparent">
              <button onClick={finalizeVerification} className="w-full py-4 rounded-2xl bg-[#004691] hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-900/20 active:scale-95 transition-all flex items-center justify-center gap-2">
                <CheckCircle2 size={20} />
                Simpan & Verifikasi
              </button>
              <button onClick={resetUpload} className="w-full mt-3 py-3 rounded-2xl bg-transparent hover:bg-white/5 text-gray-500 font-bold transition-all">
                Ulangi Scan
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper Components
const SlikField: React.FC<{ label: string; value: string; isDarkMode: boolean; multiline?: boolean }> = ({ label, value, isDarkMode, multiline }) => (
  <div className={`p-3 rounded-xl border ${isDarkMode ? 'bg-[#0f172a] border-[#334155]' : 'bg-gray-50 border-gray-100'}`}>
    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-1">{label}</p>
    <p className={`font-semibold text-sm ${multiline ? 'break-words' : 'truncate'} ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{value || '-'}</p>
  </div>
);

const SlikLogItem: React.FC<{ log: SliksKtp; isDarkMode: boolean; }> = ({ log, isDarkMode }) => {
  const date = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(log.created_at));
  const time = new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="py-3 px-4 flex justify-between items-center active:bg-gray-500/5 transition-colors cursor-pointer group">
      {/* ... Slik Log Item UI ... */}
    </div>
  );
};

export default Sliks;
