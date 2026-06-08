// api/avatar-token.js — issues a short-lived HeyGen streaming token to the
// browser so your HEYGEN_API_KEY never leaves the server.
// Set HEYGEN_API_KEY in Vercel -> Settings -> Environment Variables, then redeploy.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.HEYGEN_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'HEYGEN_API_KEY not set' });

  try {
    const r = await fetch('https://api.heygen.com/v1/streaming.create_token', {
      method: 'POST',
      headers: { 'x-api-key': apiKey },
    });
    if (!r.ok) {
      const detail = await r.text();
      return res.status(r.status).json({ error: 'token request failed', detail });
    }
    const { data } = await r.json();
    return res.status(200).json({ token: data.token });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
