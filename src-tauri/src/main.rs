// src-tauri/src/main.rs
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

    // Plantilla de salida para la descarga en ~/Downloads
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

    // En Tauri v2 se utiliza app_handle.shell().sidecar("yt-dlp")
    let sidecar_command = app_handle
        .shell()
        .sidecar("yt-dlp")
        .map_err(|e| format!("Error al inicializar el binario sidecar yt-dlp: {}", e))?
        .args(args);

    let (mut rx, _child) = sidecar_command
        .spawn()
        .map_err(|e| format!("Error al ejecutar el sidecar yt-dlp: {}", e))?;

    let mut log_output = String::new();

    // Leer eventos asíncronos del proceso sidecar
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
