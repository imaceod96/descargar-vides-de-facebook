import React, { useState } from 'react';
import { Download, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export default function App() {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'downloading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('Esperando enlace de Facebook...');

  const handleDownload = async () => {
    if (!url.trim()) {
      setStatus('error');
      setMessage('Por favor, pega una URL válida de Facebook.');
      return;
    }

    setStatus('downloading');
    setMessage('Descargando video en baja resolución (360p SD)...');

    try {
      // Intentar primero con la API nativa de Tauri si estamos en la app compilada
      if (typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window) {
        const { invoke } = await import('@tauri-apps/api/core');
        const res = await invoke<{ success: boolean; message: string }>('download_facebook_video', {
          url: url,
          browser: 'chrome'
        });
        setStatus('success');
        setMessage(res.message || '¡Descarga completada en ~/Downloads!');
        setUrl('');
        return;
      }

      // De lo contrario, usar la descarga real del servidor web (para vista previa en navegador)
      const response = await fetch('/api/download-fb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'No se pudo descargar el video.');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `facebook_video_360p_${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      setStatus('success');
      setMessage('¡Descarga completada con éxito!');
      setUrl('');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'Error durante la descarga.');
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex items-center justify-center p-4 selection:bg-blue-500 selection:text-white">
      
      {/* TARJETA PRINCIPAL MINIMALISTA Y LIMPIA */}
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-xl space-y-6">
        
        {/* TÍTULO Y SUBTÍTULO */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-bold flex items-center justify-center mx-auto shadow-md text-xl">
            f
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            Descargador de Facebook
          </h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
            Descarga videos públicos y privados en baja resolución (360p SD) a tu carpeta de Descargas.
          </p>
        </div>

        {/* CAMPO DE ENTRADA DE URL */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            Pega el enlace del video:
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleDownload()}
            placeholder="https://www.facebook.com/watch/?v=123456789..."
            className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
          />
        </div>

        {/* BOTÓN DE DESCARGA PRINCIPAL */}
        <button
          onClick={handleDownload}
          disabled={status === 'downloading'}
          className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white transition-all shadow-md flex items-center justify-center gap-2 active:scale-98 ${
            status === 'downloading'
              ? 'bg-blue-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
          }`}
        >
          {status === 'downloading' ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Descargando video...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Descargar Video</span>
            </>
          )}
        </button>

        {/* MENSAJE Y ESTADO DINÁMICO */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
          <div className="flex items-center justify-center gap-2 text-xs font-medium">
            {status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
            {status === 'error' && <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
            
            <p className={`transition-colors ${
              status === 'idle' ? 'text-slate-500 dark:text-slate-400' :
              status === 'downloading' ? 'text-amber-600 dark:text-amber-400' :
              status === 'success' ? 'text-emerald-600 dark:text-emerald-400 font-bold' :
              'text-red-600 dark:text-red-400'
            }`}>
              {message}
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
