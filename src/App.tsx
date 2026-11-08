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
  AlertTriangle
} from 'lucide-react';

const RUST_MAIN_RS = `// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::api::process::{Command, CommandEvent};

#[derive(Debug, Serialize, Deserialize)]
pub struct DownloadResponse {
    pub success: bool,
    pub message: String,
    pub path: Option<String>,
}

/// Comando de Tauri invocado desde la interfaz en React / JS
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

    // Argumentos obligatorios para yt-dlp:
    // 1. --cookies-from-browser: Extrae cookies de Chrome sin exportar cookies.txt manualmente
    // 2. -f / --format: Fuerza resolución SD más baja (≤ 360p)
    // 3. -o: Guarda en ~/Downloads
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

    // Invocar el sidecar de yt-dlp registrado en tauri.conf.json
    let (mut rx, _child) = Command::new_sidecar("yt-dlp")
        .map_err(|e| format!("Error al inicializar el binario sidecar yt-dlp: {}", e))?
        .args(args)
        .spawn()
        .map_err(|e| format!("Error al ejecutar el sidecar yt-dlp: {}", e))?;

    let mut log_output = String::new();

    // Monitorizar la salida estándar y de errores del proceso sidecar
    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line) => {
                log_output.push_str(&line);
                log_output.push('\\n');
            }
            CommandEvent::Stderr(line) => {
                log_output.push_str(&line);
                log_output.push('\\n');
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
                        "yt-dlp finalizó con código {:?}. Logs del proceso:\\n{}",
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
        .invoke_handler(tauri::generate_handler![download_facebook_video])
        .run(tauri::generate_context!())
        .expect("Error inesperado al arrancar la aplicación Tauri");
}
`;

const TAURI_CONF_JSON = `{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devPath": "http://localhost:3000",
    "distDir": "../dist"
  },
  "package": {
    "productName": "FBDownloaderMac",
    "version": "1.0.0"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "shell": {
        "all": false,
        "execute": true,
        "sidecar": true,
        "open": true,
        "scope": [
          {
            "name": "binaries/yt-dlp",
            "sidecar": true,
            "args": true
          }
        ]
      }
    },
    "bundle": {
      "active": true,
      "category": "Utility",
      "copyright": "Copyright © 2026",
      "externalBin": [
        "binaries/yt-dlp"
      ],
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/128x128@2x.png",
        "icons/icon.icns",
        "icons/icon.png"
      ],
      "identifier": "com.fbdownloader.mac",
      "targets": ["dmg", "app"]
    },
    "windows": [
      {
        "fullscreen": false,
        "height": 450,
        "resizable": true,
        "title": "Descargador de Facebook - macOS (Tauri + Rust)",
        "width": 640
      }
    ]
  }
}`;

const CARGO_TOML = `[package]
name = "fb-downloader-mac"
version = "1.0.0"
description = "Descargador nativo de videos de Facebook para macOS con Tauri y yt-dlp"
authors = ["Desarrollador macOS"]
edition = "2021"

[build-dependencies]
tauri-build = { version = "1.5", features = [] }

[dependencies]
tauri = { version = "1.5", features = ["shell-execute", "shell-open", "api-all"] }
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
  
  // Tauri Simulator State
  const [simUrl, setSimUrl] = useState('');
  const [simBrowser, setSimBrowser] = useState('chrome');
  const [simStatus, setSimStatus] = useState<'idle' | 'downloading' | 'success' | 'error'>('idle');
  const [simMessage, setSimMessage] = useState('Esperando enlace desde frontend...');
  const [simProgress, setSimProgress] = useState(0);
  const [invokeLogs, setInvokeLogs] = useState<string[]>([]);

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

  // Run Tauri Invoke Simulation
  const runTauriInvoke = () => {
    if (!simUrl.trim()) {
      setSimStatus('error');
      setSimMessage('Error: La URL no puede estar vacía.');
      return;
    }

    const isFb = simUrl.includes('facebook.com') || simUrl.includes('fb.watch') || simUrl.includes('fb.gg');
    if (!isFb) {
      setSimStatus('error');
      setSimMessage('Error: La URL debe ser un enlace de Facebook.');
      return;
    }

    setSimStatus('downloading');
    setSimProgress(10);
    setSimMessage('Invocando Rust backend (download_facebook_video)...');
    setInvokeLogs([
      `[JS Frontend] await invoke('download_facebook_video', { url: '${simUrl.slice(0, 40)}...', browser: '${simBrowser}' })`,
      `[Rust Backend] #[tauri::command] async fn download_facebook_video recivido.`,
      `[Rust Backend] Directorio ~/Downloads identificado: /Users/macuser/Downloads`,
      `[Rust Sidecar] Command::new_sidecar("yt-dlp") inicializado.`,
      `[yt-dlp Sidecar] Extrayendo cookies directamente del navegador '${simBrowser}'...`,
      `[yt-dlp Sidecar] Formato: worstvideo[height<=360]+worstaudio/worst`,
      `[yt-dlp Sidecar] Destino: /Users/macuser/Downloads/%(title)s_SD.mp4`
    ]);

    let current = 10;
    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 25) + 15;
      if (current >= 100) {
        current = 100;
        clearInterval(interval);
        setSimStatus('success');
        setSimProgress(100);
        setSimMessage('¡Descarga completada con éxito en ~/Downloads!');
        setInvokeLogs(prev => [
          ...prev,
          `[yt-dlp Sidecar] Proceso finalizado con código de salida 0.`,
          `[Rust Backend] Return Ok(DownloadResponse { success: true, path: "/Users/macuser/Downloads" })`,
          `[JS Frontend] Promesa resuelta exitosamente. Mostrando mensaje al usuario.`
        ]);
      } else {
        setSimProgress(current);
        setSimMessage(`Procesando Sidecar yt-dlp... ${current}%`);
      }
    }, 450);
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
            FB Video Downloader (Tauri + macOS)
          </span>
        </div>

        {/* Zone 2: Nav links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
          <button 
            onClick={() => setActiveTab('simulator')}
            className={`hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 ${activeTab === 'simulator' ? 'text-blue-600 dark:text-blue-400 font-semibold' : ''}`}
          >
            Simulador Tauri
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

      {/* ARCHITECTURE TOGGLE BAR */}
      <div className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-2.5 flex items-center justify-between text-xs font-medium">
        <div className="flex items-center gap-3">
          <span className="text-slate-500">Seleccionar Arquitectura:</span>
          <div className="flex items-center gap-1 bg-slate-200 dark:bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setArch('tauri')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all font-semibold ${
                arch === 'tauri'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Box className="w-3.5 h-3.5 text-cyan-500" />
              <span>Tauri 2.0 + Rust + Sidecar (Recomendado)</span>
            </button>
            <button
              onClick={() => setArch('python')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all font-semibold ${
                arch === 'python'
                  ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-amber-500" />
              <span>Python 3 + Tkinter (Stand-alone)</span>
            </button>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-2 text-slate-500 text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Soporta cookies nativas de Chrome sin archivos manuales</span>
        </div>
      </div>

      {/* MAIN CONTENT CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 space-y-8">

        {/* TAURI ARCHITECTURE VIEW */}
        {arch === 'tauri' && (
          <>
            {/* TAB 1: TAURI SIMULATOR */}
            {activeTab === 'simulator' && (
              <div className="space-y-8">
                
                {/* HERO CARD */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm">
                  <div className="max-w-3xl space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                      <Zap className="w-4 h-4" />
                      <span>ARQUITECTURA NATIVA TAURI + RUST SIDECAR PARA MACOS</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                      Descargador de Facebook con Tauri y yt-dlp Sidecar
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base leading-relaxed">
                      Esta aplicación combina el rendimiento ultra-ligero de <b>Tauri (Rust)</b> con un binario ejecutable <b>yt-dlp sidecar</b>. Extrae cookies directamente de Chrome (<code className="text-blue-600 dark:text-blue-400 font-mono">--cookies-from-browser chrome</code>), descarga en resolución SD (360p) y guarda automáticamente en <code className="text-blue-600 dark:text-blue-400 font-mono">~/Downloads</code>.
                    </p>
                  </div>

                  {/* Highlights Grid */}
                  <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                      <div className="text-slate-500 font-medium">IPC Communication</div>
                      <div className="font-mono text-blue-600 dark:text-blue-400 font-bold">invoke(&apos;download_video&apos;)</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                      <div className="text-slate-500 font-medium">Autenticación Cookies</div>
                      <div className="font-bold text-emerald-600 dark:text-emerald-400">Chrome Nivel Sistema</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                      <div className="text-slate-500 font-medium">Resolución Objetivo</div>
                      <div className="font-bold text-amber-600 dark:text-amber-400">≤ 360p SD (Worst Quality)</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-1">
                      <div className="text-slate-500 font-medium">Binario empaquetado</div>
                      <div className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">externalBin yt-dlp</div>
                    </div>
                  </div>
                </div>

                {/* TAURI GUI INTERACTIVE WINDOW SIMULATOR */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  
                  {/* TAURI WINDOW FRAME */}
                  <div className="lg:col-span-7 bg-slate-900 p-4 md:p-6 rounded-2xl border border-slate-800 shadow-2xl">
                    <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-800 text-slate-100 font-sans shadow-2xl">
                      
                      {/* Window Header */}
                      <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        </div>
                        <div className="text-xs font-semibold text-slate-400">
                          Descargador de Facebook - macOS (Tauri + Rust)
                        </div>
                        <div className="w-12"></div>
                      </div>

                      {/* Tauri App UI */}
                      <div className="p-8 space-y-6 min-h-[360px] flex flex-col justify-between">
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs text-blue-400 font-bold uppercase tracking-wider">
                            <Box className="w-4 h-4" />
                            <span>Tauri React Frontend</span>
                          </div>
                          <h3 className="text-xl font-extrabold text-white">
                            Descargar Video de Facebook
                          </h3>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Pega el enlace de un video público o privado. El backend en Rust extraerá la sesión de tu navegador Chrome automáticamente.
                          </p>
                        </div>

                        {/* Input & Browser Selection */}
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1.5">
                              URL del video de Facebook:
                            </label>
                            <input
                              type="text"
                              value={simUrl}
                              onChange={(e) => setSimUrl(e.target.value)}
                              placeholder="https://www.facebook.com/watch/?v=987654321..."
                              className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>

                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-400">Extraer cookies de:</span>
                            <select
                              value={simBrowser}
                              onChange={(e) => setSimBrowser(e.target.value)}
                              className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="chrome">Google Chrome (Recomendado)</option>
                              <option value="firefox">Mozilla Firefox</option>
                              <option value="safari">Safari</option>
                              <option value="brave">Brave Browser</option>
                              <option value="edge">Microsoft Edge</option>
                            </select>
                          </div>
                        </div>

                        {/* Invoke Button */}
                        <div className="space-y-3">
                          <button
                            onClick={runTauriInvoke}
                            disabled={simStatus === 'downloading'}
                            className={`w-full py-3 rounded-lg font-bold text-sm text-white transition-all shadow-lg ${
                              simStatus === 'downloading'
                                ? 'bg-slate-700 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 cursor-pointer active:scale-98'
                            }`}
                          >
                            {simStatus === 'downloading' ? 'Procesando en Rust Sidecar...' : 'Descargar Video con Tauri'}
                          </button>

                          {simStatus === 'downloading' && (
                            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                              <div 
                                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300"
                                style={{ width: `${simProgress}%` }}
                              ></div>
                            </div>
                          )}
                        </div>

                        {/* Status Bar inside Tauri UI */}
                        <div className="text-center pt-2 border-t border-slate-800/80">
                          <p className={`text-xs italic font-medium ${
                            simStatus === 'idle' ? 'text-slate-400' :
                            simStatus === 'downloading' ? 'text-amber-400' :
                            simStatus === 'success' ? 'text-emerald-400 font-bold' :
                            'text-red-400'
                          }`}>
                            {simMessage}
                          </p>
                        </div>

                      </div>
                    </div>
                  </div>

                  {/* RUST TAURI INVOKE LOGS */}
                  <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-cyan-500" />
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          Traza de IPC & Sidecar Log
                        </h3>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 rounded">
                        Command::new_sidecar
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Observa el flujo asíncrono entre el frontend de React y el backend de Rust con la invocación del comando sidecar:
                    </p>

                    <div className="bg-slate-950 text-emerald-400 p-3.5 rounded-xl font-mono text-[11px] min-h-[220px] max-h-[280px] overflow-y-auto space-y-1.5 border border-slate-800">
                      {invokeLogs.length === 0 ? (
                        <div className="text-slate-600 italic">
                          // Presiona &quot;Descargar Video con Tauri&quot; para iniciar la simulación de invoke...
                        </div>
                      ) : (
                        invokeLogs.map((log, idx) => (
                          <div key={idx} className="leading-snug">
                            {log.startsWith('[JS Frontend]') ? (
                              <span className="text-cyan-300">{log}</span>
                            ) : log.startsWith('[Rust Backend]') ? (
                              <span className="text-amber-300">{log}</span>
                            ) : (
                              <span className="text-emerald-400">{log}</span>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    <div className="pt-2 text-xs space-y-2 text-slate-700 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>Sin necesidad de exportar cookies manuales.</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>El binario nativo yt-dlp se ejecuta de forma asíncrona.</span>
                      </div>
                    </div>
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
                  <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2 font-mono text-xs text-slate-300">
                      <FileCode className="w-4 h-4 text-cyan-400" />
                      <span>{selectedFile}</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">
                      {selectedFile.endsWith('.rs') ? 'Rust Source Code' : selectedFile.endsWith('.json') ? 'JSON Configuration' : 'TOML Config'}
                    </span>
                  </div>

                  <pre className="p-6 text-slate-200 font-mono text-xs md:text-sm overflow-x-auto leading-relaxed max-h-[580px] overflow-y-auto">
                    {getActiveCodeContent()}
                  </pre>
                </div>

              </div>
            )}

            {/* TAB 3: CONFIGURACIÓN SIDECAR Y EXPLICACIÓN DETALLADA */}
            {activeTab === 'sidecar' && (
              <div className="space-y-8">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
                  <div className="flex items-center gap-2 text-xs font-semibold text-cyan-600 dark:text-cyan-400">
                    <Settings className="w-4 h-4" />
                    <span>CONFIGURACIÓN DEL BINARIO SIDECAR YT-DLP EN TAURI</span>
                  </div>

                  <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">
                    ¿Cómo funciona la integración Sidecar de yt-dlp en macOS?
                  </h2>

                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                    Tauri permite empaquetar binarios nativos adicionales (llamados <b>Sidecars</b>) dentro de la aplicación distribuida (.dmg / .app), evitando exigir que el usuario final instale Python o yt-dlp de forma manual.
                  </p>

                  {/* Crucial Naming Rule for macOS Sidecars */}
                  <div className="p-5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/30 space-y-3">
                    <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-300 text-sm">
                      <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>REGLA CRUCIAL DE NOMBRES DE ARCHIVO SIDECAR EN MACOS</span>
                    </div>
                    <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                      Tauri exige que los binarios sidecar ubicados en la carpeta <code className="font-mono font-bold bg-amber-100 dark:bg-amber-900/80 px-1.5 py-0.5 rounded">src-tauri/binaries/</code> incluyan el prefijo exacto de la arquitectura del procesador (Target Triple):
                    </p>
                    
                    <div className="bg-slate-950 text-emerald-400 p-3 rounded-lg font-mono text-xs space-y-1.5 border border-slate-800">
                      <div><span className="text-slate-500"># Para Macs con Apple Silicon (M1, M2, M3, M4):</span></div>
                      <div>src-tauri/binaries/yt-dlp-aarch64-apple-darwin</div>
                      <div className="pt-2"><span className="text-slate-500"># Para Macs con procesadores Intel:</span></div>
                      <div>src-tauri/binaries/yt-dlp-x86_64-apple-darwin</div>
                    </div>
                  </div>

                  {/* tauri.conf.json bundle configuration snippet */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      1. Declaración en <code className="text-blue-600 dark:text-blue-400">tauri.conf.json</code>:
                    </h3>
                    <div className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-xs border border-slate-800">
                      <div className="text-slate-500">&quot;bundle&quot;: &#123;</div>
                      <div className="pl-4 text-cyan-400">&quot;externalBin&quot;: [</div>
                      <div className="pl-8 text-emerald-400">&quot;binaries/yt-dlp&quot;</div>
                      <div className="pl-4 text-cyan-400">]</div>
                      <div className="text-slate-500">&#125;</div>
                    </div>
                  </div>

                  {/* Format Flags Explanation */}
                  <div className="space-y-3">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      2. Parámetros de baja resolución (360p) y cookies de Chrome:
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1.5">
                        <div className="font-bold text-blue-600 dark:text-blue-400">--cookies-from-browser chrome</div>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                          Accede al llavero seguro de macOS y extrae las cookies de sesión del navegador Chrome activo, permitiendo descargar videos privados sin intervención manual.
                        </p>
                      </div>

                      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1.5">
                        <div className="font-bold text-amber-600 dark:text-amber-400">-f &quot;worstvideo[height&lt;=360]+worstaudio/worst&quot;</div>
                        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                          Regla estricta para descargar la pista de video más ligera disponible (máximo 360 píxeles de altura SD), optimizando el ancho de banda y almacenamiento.
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* TAB 4: GUÍA COMPILACIÓN GIT & TAURI */}
            {activeTab === 'guide' && (
              <div className="space-y-8">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
                  <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                    <FolderGit2 className="w-4 h-4" />
                    <span>INICIALIZACIÓN GIT Y COMPILACIÓN NATIVA MAC OS</span>
                  </div>

                  <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-slate-100">
                    Comandos de Git y Compilación de la App (.dmg / .app)
                  </h2>

                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                    Sigue esta secuencia exacta de comandos en tu Mac para crear el repositorio de Git, descargar los binarios sidecar necesarios y compilar el instalador `.dmg` final.
                  </p>

                  <div className="space-y-6 pt-2">
                    
                    {/* STEP 1: GIT INIT */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">1</span>
                        <span>Inicializar repositorio de Git</span>
                      </div>
                      <div className="bg-slate-950 text-emerald-400 p-4 rounded-xl font-mono text-xs border border-slate-800 space-y-1">
                        <div>git init</div>
                        <div>git add .</div>
                        <div>git commit -m &quot;Initial commit: Tauri Facebook Downloader app&quot;</div>
                      </div>
                    </div>

                    {/* STEP 2: SIDECAR BINARY PREPARATION */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">2</span>
                        <span>Descargar y preparar el ejecutable Sidecar yt-dlp para macOS</span>
                      </div>
                      <div className="bg-slate-950 text-emerald-400 p-4 rounded-xl font-mono text-xs border border-slate-800 space-y-1 overflow-x-auto">
                        <div className="text-slate-500"># Crear carpeta de binarios en el backend de Tauri:</div>
                        <div>mkdir -p src-tauri/binaries</div>
                        <div className="pt-2 text-slate-500"># Descargar el binario yt-dlp oficial para macOS:</div>
                        <div>curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos -o src-tauri/binaries/yt-dlp-aarch64-apple-darwin</div>
                        <div>cp src-tauri/binaries/yt-dlp-aarch64-apple-darwin src-tauri/binaries/yt-dlp-x86_64-apple-darwin</div>
                        <div className="pt-2 text-slate-500"># Otorgar permisos de ejecución obligatorios:</div>
                        <div>chmod +x src-tauri/binaries/yt-dlp*</div>
                      </div>
                    </div>

                    {/* STEP 3: TAURI BUILD */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">3</span>
                        <span>Instalar dependencias y compilar instalador .dmg final</span>
                      </div>
                      <div className="bg-slate-950 text-emerald-400 p-4 rounded-xl font-mono text-xs border border-slate-800 space-y-1">
                        <div className="text-slate-500"># Instalar dependencias de paquetes npm:</div>
                        <div>npm install</div>
                        <div className="pt-2 text-slate-500"># Compilar la aplicación nativa para macOS:</div>
                        <div>npm run tauri build</div>
                      </div>
                    </div>

                    {/* RESULT DIRECTORY */}
                    <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-300 space-y-1">
                      <div className="font-bold flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>¡Ubicación del ejecutable nativo final!</span>
                      </div>
                      <p className="font-mono text-[11px] pt-1">
                        src-tauri/target/release/bundle/dmg/FBDownloaderMac_1.0.0_aarch64.dmg
                      </p>
                    </div>

                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* PYTHON ARCHITECTURE VIEW */}
        {arch === 'python' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">
                  <Code2 className="w-4 h-4" />
                  <span>CÓDIGO PYTHON STAND-ALONE (app.py)</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  Script de Python 3 con Tkinter GUI
                </h2>
                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Si prefieres una aplicación ejecutable en Python sin compilar Tauri, utiliza este archivo independiente.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => handleDownloadFile('app.py', PYTHON_CODE)}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar app.py</span>
                </button>
              </div>
            </div>

            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <pre className="p-6 text-slate-200 font-mono text-xs md:text-sm overflow-x-auto leading-relaxed max-h-[500px] overflow-y-auto">
                {PYTHON_CODE}
              </pre>
            </div>
          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 px-6 text-center text-xs text-slate-500 bg-white dark:bg-slate-900 mt-auto">
        <p>Proyecto nativo Tauri + Rust + yt-dlp para macOS. Diseñado para compilar aplicaciones de escritorio ligeras y de alto rendimiento.</p>
      </footer>

    </div>
  );
}
