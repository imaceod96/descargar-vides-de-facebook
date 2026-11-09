import express from 'express';
import { createServer as createViteServer } from 'vite';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // API Route para descargas reales de videos públicos desde la web preview
  app.post('/api/download-fb', (req, res) => {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Por favor ingresa una URL válida.' });
    }

    const tmpDir = path.join('/tmp', 'fb_downloads');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }

    const outputFilename = `fb_video_${Date.now()}_SD.mp4`;
    const outputPath = path.join(tmpDir, outputFilename);

    // Ejecutar yt-dlp para formato SD (360p o más bajo)
    const cmd = `python3 -m yt_dlp -f "worstvideo[height<=360]+worstaudio/worst[height<=360]/worst" -o "${outputPath}" --no-warnings --no-check-certificate "${url.replace(/"/g, '\\"')}"`;

    exec(cmd, { timeout: 120000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('Error yt-dlp:', stderr || error.message);
        return res.status(500).json({ 
          error: 'No se pudo descargar el video en el servidor web preview. Si el video es privado, utiliza el ejecutable nativo (.app / .dmg) compilado en tu Mac con Chrome activado.',
          details: stderr || error.message
        });
      }

      if (!fs.existsSync(outputPath)) {
        return res.status(500).json({ error: 'El video no se encontró en el servidor.' });
      }

      // Enviar el archivo .mp4 como descarga directa al navegador
      res.download(outputPath, 'facebook_video_360p.mp4', (err) => {
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
      });
    });
  });

  // Integrar middleware de Vite para desarrollo
  const vite = await createViteServer({
    server: { middlewareMode: true, host: '0.0.0.0', port: Number(PORT) },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  app.listen(PORT, () => {
    console.log(`Servidor iniciado en http://0.0.0.0:${PORT}`);
  });
}

startServer();
