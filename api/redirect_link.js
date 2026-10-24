import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const redirectsPath = path.join(__dirname, '../redirects.json');

function getReferer(req) {
  return req.headers.referer?.includes('anaflorkavadlo.ar') ? 'internal' : (req.headers.referer || 'direct');
}

export default async function handler(req, res) {
  const { slug } = req.query;

  if (!slug) {
    return res.status(400).html('<h1>400 — Missing slug</h1>');
  }

  let redirects;
  try {
    const content = fs.readFileSync(redirectsPath, 'utf-8');
    redirects = JSON.parse(content);
  } catch (err) {
    return res.status(500).html('<h1>500 — Server error</h1>');
  }

  const target = redirects[slug];
  if (!target) {
    return res.status(404).html(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>404 — Recurso no encontrado</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 2rem; max-width: 600px; margin: 0 auto; color: #333; }
          h1 { font-size: 2rem; margin-bottom: 0.5rem; }
          p { margin-bottom: 1rem; color: #666; }
          a { color: #196fc5; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <h1>404 — Recurso no encontrado</h1>
        <p>El enlace que intentás acceder no existe.</p>
        <p><a href="/">Volver al inicio</a></p>
      </body>
      </html>
    `);
  }

  const sheetsWebhookUrl = process.env.SHEETS_WEBHOOK_URL;
  if (sheetsWebhookUrl) {
    fetch(sheetsWebhookUrl, {
      method: 'POST',
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        slug,
        title: target.title,
        type: target.type,
        referrer: getReferer(req),
        userAgent: req.headers['user-agent'] || 'unknown'
      })
    }).catch(() => {});
  }

  res.setHeader('Location', target.url);
  res.status(302).end();
}
