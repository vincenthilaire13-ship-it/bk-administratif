// ════════════════════════════════════════════════════════════════════════════
//  BK SUIVI CA — Fonction "gardien" sécurisée (Vercel Serverless Function)
//  Rôle : recevoir une demande de l'application, y ajouter la clé API secrète
//  (stockée dans Vercel, jamais dans le code), appeler l'IA Anthropic, et
//  renvoyer la réponse. La clé n'est JAMAIS visible côté navigateur.
// ════════════════════════════════════════════════════════════════════════════

// Augmente la taille maximale du corps reçu (textes/PDF volumineux)
export const config = {
  api: {
    bodyParser: { sizeLimit: '25mb' },
  },
  maxDuration: 60,
};

export default async function handler(req, res) {
  // — Autoriser l'application à appeler ce gardien (CORS) —
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'Clé API non configurée sur le serveur' });

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); }
      catch (e) { return res.status(400).json({ error: 'Requête illisible' }); }
    }

    const messages = body && body.messages;
    const system = (body && body.system) || '';
    const maxTokens = (body && body.max_tokens) || 2000;

    if (!messages) return res.status(400).json({ error: 'Aucun message fourni' });

    const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        system: system,
        messages: messages,
      }),
    });

    // On lit d'abord en texte pour ne JAMAIS planter sur une réponse non-JSON
    const raw = await apiResponse.text();
    let data;
    try { data = JSON.parse(raw); }
    catch (e) {
      return res.status(apiResponse.status || 500).json({
        error: 'Réponse inattendue de l\'IA : ' + raw.substring(0, 200),
      });
    }

    if (!apiResponse.ok) {
      return res.status(apiResponse.status).json({
        error: (data && data.error && data.error.message) || 'Erreur de l\'IA',
        details: data,
      });
    }

    return res.status(200).json(data);

  } catch (e) {
    return res.status(500).json({ error: 'Erreur serveur : ' + (e.message || String(e)) });
  }
}
