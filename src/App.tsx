import React, { useState } from 'react';
import { 
  Download, 
  Copy, 
  Check, 
  Terminal, 
  FileCode, 
  ShieldCheck, 
  Cookie, 
  Cpu, 
  Monitor, 
  FolderDown, 
  Layers,
  Box,
  Code2,
  ExternalLink,
  Zap,
  Lock,
  Globe,
  Settings,
  FolderGit2,
  ChevronRight,
  AlertTriangle,
  Play,
  Info
} from 'lucide-react';

const RUST_MAIN_RS = `// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

#[derive(Debug, Serialize, Deserialize)]
pub struct DownloadResponse {
    pub success: bool,
    pub message: String,
    pub path: Option<String>,
}

/// Comando de Tauri v2 invocado desde la interfaz en React / JS
/// Ejecuta el binario sidecar 'yt-dlp' extrayendo cookies de Chrome y descargando en SD (360p)
#[tauri::command]
async fn download_facebook_video(
    app_handle: tauri::AppHandle,
    url: String,
    browser: Option<String>,
) -> Result<DownloadResponse, String> {
    let target_browser = browser.unwrap_or_else(|| "chrome".to_string());

    // Obtener la ruta de la carpeta ~/Downloads del usuario en macOS
    let downloads_dir = dirs::download_dir().ok_or_else(|| {
        "No se pudo determinar la carpeta de Descargas (~/Downloads) del sistema.".to_string()
    })?;

    // Plantilla de salida para la descarga
    let output_template = format!("{}/%(title)s_SD.%(ext)s", downloads_dir.to_string_lossy());

    let args = vec![
        "--cookies-from-browser".to_string(),
        target_browser,
        "-f".to_string(),
        "worstvideo[height<=360]+worstaudio/worst[height<=360]/worstvideo+worstaudio/worst".to_string(),
        "-o".to_string(),
        output_template,
        "--no-warnings".to_string(),
        "--no-check-certificate".to_string(),
        url.clone(),
    ];

    // En Tauri v2 se usa app_handle.shell().sidecar("yt-dlp")
    let sidecar_command = app_handle
        .shell()
        .sidecar("yt-dlp")
        .map_err(|e| format!("Error al inicializar el binario sidecar yt-dlp: {}", e))?
        .args(args);

    let (mut rx, _child) = sidecar_command
        .spawn()
        .map_err(|e| format!("Error al ejecutar el sidecar yt-dlp: {}", e))?;

    let mut log_output = String::new();

    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line) => {
                let text = String::from_utf8_lossy(&line);
                log_output.push_str(&text);
                log_output.push('\n');
            }
            CommandEvent::Stderr(line) => {
                let text = String::from_utf8_lossy(&line);
                log_output.push_str(&text);
                log_output.push('\n');
            }
            CommandEvent::Terminated(payload) => {
                if payload.code == Some(0) {
                    return Ok(DownloadResponse {
                        success: true,
                        message: "¡Descarga completada con éxito en ~/Downloads!".to_string(),
                        path: Some(downloads_dir.to_string_lossy().to_string()),
                    });
                } else {
                    return Err(format!(
                        "yt-dlp finalizó con código {:?}. Logs del proceso:\n{}",
                        payload.code, log_output
                    ));
                }
            }
            _ => {}
        }
    }

    Ok(DownloadResponse {
        success: true,
        message: "Proceso completado.".to_string(),
        path: None,
    })
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![download_facebook_video])
        .run(tauri::generate_context!())
        .expect("Error al iniciar la aplicación Tauri v2");
}
`;

const TAURI_CONF_JSON = `{
  "$schema": "https://schema.tauri.app/config/2",
  "productName": "FBDownloaderMac",
  "version": "1.0.0",
  "identifier": "com.fbdownloader.mac",
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devUrl": "http://localhost:3000",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [
      {
        "title": "Descargador de Facebook - macOS (Tauri v2)",
        "width": 640,
        "height": 450,
        "resizable": true
      }
    ],
    "security": {
      "csp": null
    }
  },
  "bundle": {
    "active": true,
    "category": "Utility",
    "copyright": "Copyright © 2026",
    "externalBin": [
      "binaries/yt-dlp"
    ],
    "icon": [],
    "targets": ["dmg", "app"]
  },
  "plugins": {
    "shell": {
      "open": true
    }
  }
}`;

const CARGO_TOML = `[package]
name = "fb-downloader-mac"
version = "1.0.0"
description = "Descargador nativo de videos de Facebook para macOS con Tauri v2 y yt-dlp"
authors = ["Desarrollador macOS"]
edition = "2021"

[build-dependencies]
tauri-build = { version = "2.0", features = [] }

[dependencies]
tauri = { version = "2.0", features = [] }
tauri-plugin-shell = "2.0"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
dirs = "5.0"

[features]
default = ["custom-protocol"]
custom-protocol = ["tauri/custom-protocol"]
`;

const PYTHON_CODE = `#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
APLICACIÓN DE ESCRITORIO: DESCARGADOR DE VIDEOS DE FACEBOOK PARA macOS
=============================================================================
Desarrollado con Python 3, Tkinter (GUI) y yt-dlp.
"""

import os
import sys
import threading
import tkinter as tk
from tkinter import ttk, messagebox
import yt_dlp


class FacebookDownloaderApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Descargador de Facebook - macOS")
        self.root.geometry("580x360")
        
        self.bg_color = "#f5f5f7"
        self.card_bg = "#ffffff"
        self.accent_color = "#0066cc"

        self.root.configure(bg=self.bg_color)
        
        self.lbl_title = tk.Label(self.root, text="Descargador de Facebook", font=("Helvetica", 18, "bold"), bg=self.bg_color)
        self.lbl_title.pack(pady=15)

        self.entry_url = ttk.Entry(self.root, font=("Helvetica", 12))
        self.entry_url.pack(fill="x", padx=30, pady=10)

        self.btn_download = tk.Button(self.root, text="Descargar Video", bg=self.accent_color, fg="white", font=("Helvetica", 12, "bold"), command=self.iniciar_descarga)
        self.btn_download.pack(pady=15)

        self.lbl_status = tk.Label(self.root, text="Esperando enlace...", font=("Helvetica", 11, "italic"), bg=self.bg_color)
        self.lbl_status.pack()

    def iniciar_descarga(self):
        url = self.entry_url.get().strip()
        if not url:
            messagebox.showwarning("Campo Vacío", "Ingresa una URL de Facebook.")
            return

        self.lbl_status.config(text="Descargando video en baja resolución...", fg="#d97706")
        threading.Thread(target=self._descargar_hilo, args=(url,), daemon=True).start()

    def _descargar_hilo(self, url):
        try:
            out_template = os.path.expanduser("~/Downloads/%(title)s_SD.%(ext)s")
            cookies_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "cookies.txt")

            ydl_opts = {
                'format': 'worstvideo[height<=360]+worstaudio/worst[height<=360]/worst',
                'outtmpl': out_template,
                'quiet': True,
            }
            if os.path.exists(cookies_file):
                ydl_opts['cookiefile'] = cookies_file

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])

            self.root.after(0, lambda: self.lbl_status.config(text="¡Descarga completada con éxito!", fg="#16a34a"))
        except Exception as err:
            self.root.after(0, lambda: self.lbl_status.config(text=f"Error: {err}", fg="#dc2626"))

if __name__ == "__main__":
    root = tk.Tk()
    app = FacebookDownloaderApp(root)
    root.mainloop()
`;

export default function App() {
  const [arch, setArch] = useState<'tauri' | 'python'>('tauri');
  const [activeTab, setActiveTab] = useState<'simulator' | 'code' | 'sidecar' | 'guide'>('simulator');
  const [selectedFile, setSelectedFile] = useState<'main.rs' | 'tauri.conf.json' | 'Cargo.toml' | 'app.py'>('main.rs');
  const [copiedCode, setCopiedCode] = useState(false);
  
  // Real / Simulation State
  const [simUrl, setSimUrl] = useState('');
  const [simBrowser, setSimBrowser] = useState('chrome');
  const [simStatus, setSimStatus] = useState<'idle' | 'downloading' | 'success' | 'error'>('idle');
  const [simMessage, setSimMessage] = useState('Esperando enlace desde la interfaz...');
  const [isRealDownloading, setIsRealDownloading] = useState(false);

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleDownloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Real backend download call for web preview
  const handleRealWebDownload = async () => {
    if (!simUrl.trim()) {
      setSimStatus('error');
      setSimMessage('Por favor ingresa una URL válida de Facebook.');
      return;
    }

    setIsRealDownloading(true);
    setSimStatus('downloading');
    setSimMessage('Procesando descarga real en servidor web preview (yt-dlp)...');

    try {
      const response = await fetch('/api/download-fb', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: simUrl })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Error al descargar el video.');
      }

      // Receive binary blob and trigger browser download
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `facebook_video_360p_${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      setSimStatus('success');
      setSimMessage('¡Video descargado exitosamente a las Descargas de tu navegador!');
    } catch (err: any) {
      setSimStatus('error');
      setSimMessage(err.message || 'Error en la descarga.');
    } finally {
      setIsRealDownloading(false);
    }
  };

  const getActiveCodeContent = () => {
    switch (selectedFile) {
      case 'main.rs': return RUST_MAIN_RS;
      case 'tauri.conf.json': return TAURI_CONF_JSON;
      case 'Cargo.toml': return CARGO_TOML;
      case 'app.py': return PYTHON_CODE;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      
      {/* 3-ZONE TOP BAR CONTRACT */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-50 shadow-sm">
        {/* Zone 1: Brand wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
            <Box className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
            FB Video Downloader (Tauri 2 + macOS)
          </span>
        </div>

        {/* Zone 2: Nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
          <button 
            onClick={() => setActiveTab('simulator')}
            className={`hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 ${activeTab === 'simulator' ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''}`}
          >
            Prueba de Descarga
          </button>
          <button 
            onClick={() => setActiveTab('code')}
            className={`hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 ${activeTab === 'code' ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''}`}
          >
            Código Rust & Config
          </button>
          <button 
            onClick={() => setActiveTab('sidecar')}
            className={`hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 ${activeTab === 'sidecar' ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''}`}
          >
            Configuración Sidecar
          </button>
          <button 
            onClick={() => setActiveTab('guide')}
            className={`hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 ${activeTab === 'guide' ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''}`}
          >
            Git & Compilación .dmg
          </button>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => handleDownloadFile('main.rs', RUST_MAIN_RS)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm"
          >
            <Download className="w-4 h-4" />
            Descargar main.rs
          </button>
        </div>
      </header>

      {/* IMPORTANT ARCHITECTURE EXPLANATION BANNER */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-3 text-xs text-amber-900 dark:text-amber-300 flex items-center justify-between">
        <div className="flex items-center gap-2 max-w-4xl">
          <Info className="w-4 h-4 text-amber-500 shrink-0" />
          <span>
            <b>Nota sobre la vista previa web:</b> Estás interactuando con la interfaz web. Para probar una <b>descarga real de archivo .mp4</b> ahora mismo en tu navegador, presiona <b>&quot;Descargar Video REAL desde Servidor Web&quot;</b> a continuación. Al compilar la app nativa en tu Mac (`npx tauri build`), la app ejecutará el motor Rust localmente con tus cookies de Chrome.
          </span>
        </div>
      </div>

      {/* MAIN CONTENT CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-8">

        {/* TAURI ARCHITECTURE VIEW */}
        {arch === 'tauri' && (
          <>
            {/* TAB 1: TAURI SIMULATOR AND REAL WEB DOWNLOAD */}
            {activeTab === 'simulator' && (
              <div className="space-y-8">
                
                {/* HERO CARD */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm">
                  <div className="max-w-3xl space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                      <Zap className="w-4 h-4" />
                      <span>DESCARGADOR DE FACEBOOK CON TAURI 2 + RUST + YT-DLP</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                      Probar Descarga de Video de Facebook
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                      Pega la URL de cualquier video público de Facebook. Presiona <b>&quot;Descargar Video REAL (Servidor Web)&quot;</b> para descargar el archivo <code className="text-blue-600 dark:text-blue-400 font-mono">.mp4</code> directamente a la carpeta de descargas de tu Mac.
                    </p>
                  </div>
                </div>

                {/* TAURI GUI INTERACTIVE WINDOW SIMULATOR */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* TAURI WINDOW FRAME */}
                  <div className="lg:col-span-8 bg-slate-900 p-4 md:p-6 rounded-2xl border border-slate-800 shadow-2xl">
                    <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-800 text-slate-100 font-sans shadow-2xl">
                      
                      {/* Window Header */}
                      <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        </div>
                        <div className="text-xs font-semibold text-slate-400">
                          Descargador de Facebook - macOS (Tauri v2)
                        </div>
                        <div className="w-12"></div>
                      </div>

                      {/* Tauri App UI */}
                      <div className="p-8 space-y-6 min-h-[360px] flex flex-col justify-between">
                        
                        <div className="space-y-2">
                          <h3 className="text-xl font-extrabold text-white">
                            Pega el enlace del video de Facebook:
                          </h3>
                        </div>

                        {/* Input & Browser Selection */}
                        <div className="space-y-3">
                          <div>
                            <input
                              type="text"
                              value={simUrl}
                              onChange={(e) => setSimUrl(e.target.value)}
                              placeholder="https://www.facebook.com/watch/?v=987654321..."
                              className="w-full px-3.5 py-3 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>Modo de extracción de cookies en App Nativa (.dmg):</span>
                            <span className="font-semibold text-emerald-400">Chrome Nativo Activo</span>
                          </div>
                        </div>

                        {/* REAL DOWNLOAD BUTTON */}
                        <div className="space-y-3">
                          <button
                            onClick={handleRealWebDownload}
                            disabled={isRealDownloading}
                            className={`w-full py-3.5 rounded-lg font-bold text-sm text-white transition-all shadow-lg flex items-center justify-center gap-2 ${
                              isRealDownloading
                                ? 'bg-slate-700 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 cursor-pointer active:scale-98'
                            }`}
                          >
                            <Download className="w-4 h-4" />
                            <span>{isRealDownloading ? 'Descargando archivo .mp4 desde servidor...' : 'Descargar Video REAL (Servidor Web)'}</span>
                          </button>
                        </div>

                        {/* Status Bar inside Tauri UI */}
                        <div className="text-center pt-2 border-t border-slate-800/80">
                          <p className={`text-xs italic font-medium ${
                            simStatus === 'idle' ? 'text-slate-400' :
                            simStatus === 'downloading' ? 'text-amber-400 animate-pulse' :
                            simStatus === 'success' ? 'text-emerald-400 font-bold' :
                            'text-red-400'
                          }`}>
                            {simMessage}
                          </p>
                        </div>

                      </div>
                    </div>
                  </div>

                  {/* SIDE INFO BOX */}
                  <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 text-xs">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span>¿Por qué la App compilada es mejor?</span>
                    </h3>

                    <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                      En la web actual, la descarga pasa por nuestro servidor. Sin embargo, en la <b>App compilada (.dmg)</b> en tu Mac:
                    </p>

                    <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                      <li className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span><b>Videos Privados:</b> Lee las cookies de tu navegador Chrome nativamente en tu Mac.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span><b>Velocidad Ultra-Rápida:</b> Ejecuta el binario local <code className="font-mono">yt-dlp</code> sin intermediarios de red.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span><b>Guardado directo:</b> Escribe los videos en la carpeta <code className="font-mono">~/Downloads</code> de tu Mac.</span>
                      </li>
                    </ul>
                  </div>

                </div>
              </div>
            )}

            {/* TAB 2: CÓDIGO RUST & CONFIGURACIÓN */}
            {activeTab === 'code' && (
              <div className="space-y-6">
                
                {/* File Selector Toolbar */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Archivos del Proyecto:</span>
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                      <button
                        onClick={() => setSelectedFile('main.rs')}
                        className={`px-3 py-1 text-xs font-mono rounded-md transition-colors ${
                          selectedFile === 'main.rs' ? 'bg-white dark:bg-slate-900 text-blue-600 font-bold shadow-sm' : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        src-tauri/src/main.rs
                      </button>
                      <button
                        onClick={() => setSelectedFile('tauri.conf.json')}
                        className={`px-3 py-1 text-xs font-mono rounded-md transition-colors ${
                          selectedFile === 'tauri.conf.json' ? 'bg-white dark:bg-slate-900 text-blue-600 font-bold shadow-sm' : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        src-tauri/tauri.conf.json
                      </button>
                      <button
                        onClick={() => setSelectedFile('Cargo.toml')}
                        className={`px-3 py-1 text-xs font-mono rounded-md transition-colors ${
                          selectedFile === 'Cargo.toml' ? 'bg-white dark:bg-slate-900 text-blue-600 font-bold shadow-sm' : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        src-tauri/Cargo.toml
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleCopyCode(getActiveCodeContent())}
                      className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? 'Copiado' : 'Copiar Archivo'}</span>
                    </button>
                    <button
                      onClick={() => handleDownloadFile(selectedFile, getActiveCodeContent())}
                      className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Descargar {selectedFile}</span>
                    </button>
                  </div>
                </div>

                {/* Code Viewer Display */}
                <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                  <pre className="p-6 text-slate-200 font-mono text-xs md:text-sm overflow-x-auto leading-relaxed max-h-[580px] overflow-y-auto">
                    {getActiveCodeContent()}
                  </pre>
                </div>

              </div>
            )}

            {/* TAB 3: CONFIGURACIÓN SIDECAR */}
            {activeTab === 'sidecar' && (
              <div className="space-y-8">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
                  <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">
                    Configuración del Binario Sidecar en macOS
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                    Tauri empaqueta el binario <code className="font-mono text-blue-600 font-bold">yt-dlp</code> directamente dentro de la aplicación distribuida (.dmg) para que no dependa de ninguna instalación externa en el sistema del usuario.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 4: GUÍA COMPILACIÓN GIT & TAURI */}
            {activeTab === 'guide' && (
              <div className="space-y-8">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
                  <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">
                    Comandos de Compilación para macOS
                  </h2>
                  <div className="bg-slate-950 text-emerald-400 p-4 rounded-xl font-mono text-xs border border-slate-800 space-y-1">
                    <div>npx tauri build</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 px-6 text-center text-xs text-slate-500 bg-white dark:bg-slate-900 mt-auto">
        <p>Aplicación nativa Tauri 2 + Rust + yt-dlp para macOS.</p>
      </footer>

    </div>
  );
}
