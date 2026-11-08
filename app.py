#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
APLICACIÓN DE ESCRITORIO: DESCARGADOR DE VIDEOS DE FACEBOOK PARA macOS
=============================================================================
Desarrollado con Python 3, Tkinter (GUI) y yt-dlp.

Requisitos de instalación previa en macOS:
  1. Abrir la Terminal de macOS.
  2. Instalar la librería yt-dlp con pip:
     pip3 install yt-dlp
  3. Ejecutar este archivo con:
     python3 app.py

Características principales:
  - Soporta videos públicos y privados de Facebook.
  - Detecta automáticamente el archivo 'cookies.txt' en la misma carpeta.
  - Fuerza la descarga en baja resolución (≤ 360p SD) para ahorrar datos.
  - Utiliza hilos (threading) para evitar que la ventana se congele ("No responde").
  - Guarda automáticamente los archivos en la carpeta de Descargas del sistema (~/Downloads).
=============================================================================
"""

import os
import sys
import threading
import tkinter as tk
from tkinter import ttk, messagebox
import yt_dlp


class FacebookDownloaderApp:
    """
    Clase principal que define la interfaz gráfica Tkinter y la lógica
    de descarga concurrente con yt-dlp.
    """

    def __init__(self, root):
        """
        Inicializa la ventana principal de la aplicación y sus componentes visuales.
        """
        self.root = root
        self.root.title("Descargador de Facebook - macOS")
        
        # Dimensiones de la ventana y prevención de redimensionado excesivo
        self.root.geometry("580x360")
        self.root.minsize(520, 340)
        self.root.resizable(True, True)

        # Configuración de estilos visuales modernos
        self.style = ttk.Style()
        self.style.theme_use("clam")
        
        # Colores inspirados en la interfaz moderna de macOS
        self.bg_color = "#f5f5f7"
        self.card_bg = "#ffffff"
        self.accent_color = "#0066cc"
        self.text_color = "#1d1d1f"
        self.muted_color = "#86868b"

        self.root.configure(bg=self.bg_color)

        # Configurar filas y columnas adaptativas
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)

        # Contenedor principal (Card)
        self.main_frame = tk.Frame(
            self.root,
            bg=self.card_bg,
            bd=1,
            relief="solid",
            highlightbackground="#e5e5ea",
            highlightthickness=1
        )
        self.main_frame.grid(row=0, column=0, padx=25, pady=25, sticky="nsew")
        self.main_frame.columnconfigure(0, weight=1)

        # --- TÍTULO Y SUBTÍTULO ---
        self.lbl_title = tk.Label(
            self.main_frame,
            text="Descargador de Videos de Facebook",
            font=("Helvetica", 18, "bold"),
            bg=self.card_bg,
            fg=self.text_color
        )
        self.lbl_title.pack(pady=(20, 5))

        self.lbl_subtitle = tk.Label(
            self.main_frame,
            text="Descarga en baja resolución (360p) directamente a ~/Downloads",
            font=("Helvetica", 11),
            bg=self.card_bg,
            fg=self.muted_color
        )
        self.lbl_subtitle.pack(pady=(0, 15))

        # --- CAMPO DE TEXTO PARA LA URL ---
        self.lbl_url = tk.Label(
            self.main_frame,
            text="Pega el enlace del video de Facebook:",
            font=("Helvetica", 11, "bold"),
            bg=self.card_bg,
            fg=self.text_color,
            anchor="w"
        )
        self.lbl_url.pack(fill="x", padx=25, pady=(5, 5))

        self.entry_url = ttk.Entry(self.main_frame, font=("Helvetica", 12))
        self.entry_url.pack(fill="x", padx=25, pady=(0, 15), ipady=6)
        self.entry_url.focus_set()

        # --- BOTÓN DE DESCARGA ---
        self.btn_download = tk.Button(
            self.main_frame,
            text="Descargar Video",
            font=("Helvetica", 12, "bold"),
            bg=self.accent_color,
            fg="#ffffff",
            activebackground="#0052a3",
            activeforeground="#ffffff",
            relief="flat",
            bd=0,
            cursor="hand2",
            padx=20,
            pady=10,
            command=self.iniciar_descarga
        )
        self.btn_download.pack(pady=(5, 15))

        # --- ETIQUETA DE ESTADO DINÁMICA ---
        self.lbl_status = tk.Label(
            self.main_frame,
            text="Esperando enlace...",
            font=("Helvetica", 11, "italic"),
            bg=self.card_bg,
            fg=self.muted_color,
            wraplength=480
        )
        self.lbl_status.pack(pady=(0, 10))

        # --- ETIQUETA INFORMATIVA DE COOKIES ---
        self.verificar_cookies_inicial()

    def verificar_cookies_inicial(self):
        """
        Verifica la presencia de 'cookies.txt' e informa al usuario en la barra inferior.
        """
        directorio_actual = os.path.dirname(os.path.abspath(__file__))
        cookies_path = os.path.join(directorio_actual, "cookies.txt")
        
        if os.path.exists(cookies_path):
            info_text = "✓ Archivo 'cookies.txt' detectado. Listo para videos públicos y privados."
            fg_col = "#2e7d32" # Verde discreto
        else:
            info_text = "ⓘ 'cookies.txt' no encontrado. Solo se podrán descargar videos públicos."
            fg_col = "#757575" # Gris informativo

        self.lbl_cookie_info = tk.Label(
            self.main_frame,
            text=info_text,
            font=("Helvetica", 9),
            bg=self.card_bg,
            fg=fg_col
        )
        self.lbl_cookie_info.pack(pady=(0, 15))

    def actualizar_estado(self, mensaje, tipo="info"):
        """
        Actualiza el texto y color de la etiqueta de estado de forma segura.
        """
        colores = {
            "info": "#0066cc",     # Azul
            "working": "#d97706",  # Naranja/Ámbar
            "success": "#16a34a",  # Verde
            "error": "#dc2626"      # Rojo
        }
        self.lbl_status.config(
            text=mensaje,
            fg=colores.get(tipo, self.text_color)
        )

    def iniciar_descarga(self):
        """
        Valida la entrada del usuario e inicia el proceso de descarga en un hilo secundario.
        """
        url = self.entry_url.get().strip()

        # Validación básica de la URL
        if not url:
            self.actualizar_estado("Por favor, pega un enlace válido antes de continuar.", "error")
            messagebox.showwarning("Campo Vacío", "Debes ingresar una URL de Facebook.")
            return

        if "facebook.com" not in url and "fb.watch" not in url and "fb.gg" not in url:
            self.actualizar_estado("Advertencia: El enlace no parece ser de Facebook.", "error")
            if not messagebox.askyesno("Confirmación", "¿Deseas intentar procesar esta URL de todas formas?"):
                return

        # Deshabilitar botón durante el proceso para evitar múltiples clics
        self.btn_download.config(state="disabled", bg="#a0a0a0")
        self.actualizar_estado("Descargando video en baja resolución...", "working")

        # EJECUCIÓN EN HILO SECUNDARIO (Threading):
        # Permite que la interfaz de Tkinter se mantenga fluida sin congelarse.
        hilo = threading.Thread(target=self._descargar_hilo, args=(url,), daemon=True)
        hilo.start()

    def _descargar_hilo(self, url):
        """
        Lógica interna de descarga mediante yt-dlp ejecutada en el hilo secundario.
        """
        try:
            # Ruta de guardado: Carpeta Descargas del usuario (~/Downloads)
            downloads_folder = os.path.expanduser("~/Downloads")
            out_template = os.path.join(downloads_folder, "%(title)s_SD.%(ext)s")

            # Buscar archivo 'cookies.txt' en la carpeta actual
            directorio_script = os.path.dirname(os.path.abspath(__file__))
            cookies_file = os.path.join(directorio_script, "cookies.txt")

            # Configuración optimizada para baja resolución (≤ 360p / SD)
            # Regla flexible: busca formatos con altura <= 360p o el peor video/audio disponible
            ydl_opts = {
                # Fuerza formato SD 360p o el más bajo disponible
                'format': 'worstvideo[height<=360]+worstaudio/worst[height<=360]/worstvideo+worstaudio/worst',
                'outtmpl': out_template,
                'quiet': True,
                'no_warnings': True,
                'nocheckcertificate': True,
            }

            # Si existe el archivo cookies.txt, se asigna a las opciones de yt-dlp
            if os.path.exists(cookies_file):
                ydl_opts['cookiefile'] = cookies_file

            # Hook de progreso para actualizar el estado
            def progress_hook(d):
                if d['status'] == 'downloading':
                    percent = d.get('_percent_str', '').strip()
                    self.root.after(0, lambda: self.actualizar_estado(
                        f"Descargando video en baja resolución... {percent}", "working"
                    ))

            ydl_opts['progress_hooks'] = [progress_hook]

            # Ejecución de yt-dlp
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])

            # Actualización de éxito en el hilo principal
            self.root.after(0, lambda: self._finalizar_descarga_exito())

        except Exception as error:
            # Captura de errores y reporte al hilo principal
            mensaje_error = str(error)
            if "login" in mensaje_error.lower() or "private" in mensaje_error.lower():
                mensaje_error = "El video es privado. Requiere incluir un 'cookies.txt' válido de tu cuenta."
            
            self.root.after(0, lambda err=mensaje_error: self._finalizar_descarga_error(err))

    def _finalizar_descarga_exito(self):
        """
        Callback invocado cuando la descarga termina correctamente.
        """
        self.btn_download.config(state="normal", bg=self.accent_color)
        self.actualizar_estado("¡Descarga completada con éxito!", "success")
        self.entry_url.delete(0, tk.END)
        messagebox.showinfo("Éxito", "El video se guardó en tu carpeta de Descargas (~/Downloads).")

    def _finalizar_descarga_error(self, error_msg):
        """
        Callback invocado en caso de error durante la descarga.
        """
        self.btn_download.config(state="normal", bg=self.accent_color)
        self.actualizar_estado(f"Error: {error_msg}", "error")
        messagebox.showerror("Error en la Descarga", f"Ocurrió un problema:\n\n{error_msg}")


# --- PUNTO DE ENTRADA PRINCIPAL ---
if __name__ == "__main__":
    root = tk.Tk()
    app = FacebookDownloaderApp(root)
    root.mainloop()
