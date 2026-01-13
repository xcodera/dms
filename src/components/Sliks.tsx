
import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft, Camera, Upload, X, RefreshCw, Copy, Check, Scissors, Search, History,
  Database, RotateCw, AlertTriangle
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
      // FIX: Use environment variable for API key.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const base64Data = imageData.split(',')[1];
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        // FIX: Corrected `contents` structure for a single multi-part request.
        contents: { parts: [{ text: "Ekstrak data dari KTP Indonesia ini dan deteksi koordinat kartu KTP. Kembalikan JSON dengan urutan field: nik, nama, tempat_tgl_lahir, jenis_kelamin, alamat, rt_rw, kel_desa, kecamatan, agama, status_perkawinan, pekerjaan, kewarganegaraan, berlaku_hingga. Tambahkan field 'card_box' berisi array [ymin, xmin, ymax, xmax] yang mendeteksi batas kartu KTP dalam koordinat ternormalisasi (0-1000). Kembalikan HANYA JSON." }, { inlineData: { mimeType: "image/jpeg", data: base64Data } }] },
        config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { nik: { type: Type.STRING }, nama: { type: Type.STRING }, tempat_tgl_lahir: { type: Type.STRING }, jenis_kelamin: { type: Type.STRING }, alamat: { type: Type.STRING }, rt_rw: { type: Type.STRING }, kel_desa: { type: Type.STRING }, kecamatan: { type: Type.STRING }, agama: { type: Type.STRING }, status_perkawinan: { type: Type.STRING }, pekerjaan: { type: Type.STRING }, kewarganegaraan: { type: Type.STRING }, berlaku_hingga: { type: Type.STRING }, card_box: { type: Type.ARRAY, items: { type: Type.NUMBER } } }, required: ["nik", "nama", "card_box"] } }
      });
      const result = JSON.parse(response.text) as KtpData;
      setKtpData(result);
      if (result.card_box) {
        const cropped = await cropImage(imageData, result.card_box);
        setCroppedImage(cropped);
      } else { setCroppedImage(imageData); }
      setStep('review');
    } catch (err) {
      // FIX: Updated error message to remove mention of API key.
      setError("Gagal mengekstrak data. Pastikan gambar jelas dan coba lagi.");
      setStep('summary');
    }
  };

  const finalizeVerification = async () => {
    if (!ktpData || !user) return;
    const [tempat_lahir, tglLahirStr] = ktpData.tempat_tgl_lahir.split(',').map(s => s.trim());
    const dateParts = tglLahirStr?.match(/(\d{2})-(\d{2})-(\d{4})/);
    let tanggal_lahir: string | undefined = undefined;
    if (dateParts) {
      const [, day, month, year] = dateParts;
      tanggal_lahir = `${year}-${month}-${day}`;
    }

    try {
      await addSliksData({
        user_id: user.id,
        nik: ktpData.nik,
        nama_lengkap: ktpData.nama,
        tempat_lahir,
        tanggal_lahir,
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
      resetUpload();
    } catch (err) {
      setError("Gagal menyimpan data ke database.");
    }
  };

  const resetUpload = () => {
    setImage(null); setCroppedImage(null); setKtpData(null);
    setShowJsonResult(false); setStep('summary');
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Other helper functions: updateKtpField, getCleanJson, handleCopyJson etc.

  return (
    <div className={`flex flex-col h-full transition-colors duration-300 relative ${isDarkMode ? 'bg-[#0f172a]' : 'bg-gray-50'}`}>
      <div className={`px-6 py-4 flex justify-between items-center transition-colors ${isDarkMode ? 'bg-[#1e293b]' : 'bg-white border-b border-gray-100'}`}>
        <button onClick={() => step === 'summary' ? setActiveView('home') : setStep('summary')} className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-white/10 text-gray-200' : 'hover:bg-gray-100 text-[#004691]'}`}><ChevronLeft size={24} /></button>
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

        {step === 'processing' && <div className="..."><RotateCw /></div> /* Processing UI */}
        {step === 'review' && ktpData && croppedImage && <div className="... animate-in slide-in-from-bottom-4 duration-500">{/* Review Form UI */}</div>}
      </div>
    </div>
  );
};

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
