
// api/dropbox-token.js
// Fonction serverless Vercel : échange le refresh token Dropbox (gardé côté serveur)
// contre un access_token temporaire. Aucun secret n'est envoyé au navigateur.
//
// Variables d'environnement à définir dans Vercel (Settings → Environment Variables).
// Cette version accepte les DEUX conventions de nommage (peu importe celle que tu utilises) :
//   DROPBOX_APP_KEY / DROPBOX_APP_SECRET / DROPBOX_REFRESH_TOKEN
//   OU  DBX_APP_KEY  / DBX_APP_SECRET  / DBX_REFRESH_TOKEN
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }
  const appKey    = process.env.DROPBOX_APP_KEY     || process.env.DBX_APP_KEY;
  const appSecret = process.env.DROPBOX_APP_SECRET   || process.env.DBX_APP_SECRET;
  const refresh   = process.env.DROPBOX_REFRESH_TOKEN || process.env.DBX_REFRESH_TOKEN;
  if (!appKey || !appSecret || !refresh) {
    res.status(500).json({ error: "Configuration Dropbox manquante (variables d'environnement)." });
    return;
  }
  try {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refresh,
      client_id: appKey,
      client_secret: appSecret,
    });
    const r = await fetch('https://api.dropbox.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const data = await r.json();
    if (!r.ok) {
      res.status(500).json({ error: 'Dropbox refuse le refresh token', detail: data });
      return;
    }
    res.status(200).json({ access_token: data.access_token, expires_in: data.expires_in });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
 
