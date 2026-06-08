// api/avatar-token.js — mints a LiveAvatar SESSION token (server-side),
// keeping your LiveAvatar API key off the browser.
//
// SETUP:
//   1) Sign up at app.liveavatar.com (use the SAME email as your HeyGen account),
//      start the free trial, and create/choose a LiveAvatar.
//   2) Copy your LiveAvatar API key -> set it in Vercel as LIVEAVATAR_API_KEY.
//   3) Put your LiveAvatar avatar's ID in AVATAR_ID below (and a voice ID if you want one).

const AVATAR_ID = "dc2935cf-5863-4f08-943b-c7478aea59fb";
const VOICE_ID  = "";   // optional — leave "" to use the avatar's default voice

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.LIVEAVATAR_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'LIVEAVATAR_API_KEY not set' });

  const avatar_persona = { language: 'en' };
  if (VOICE_ID) avatar_persona.voice_id = VOICE_ID;

  try {
    const r = await fetch('https://api.liveavatar.com/v1/sessions/token', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
        'accept': 'application/json'
      },
      // We drive speech ourselves via session.repeat(text), so we don't attach a
      // conversational LLM agent here — the avatar just speaks what we send.
      body: JSON.stringify({ mode: 'FULL', avatar_id: AVATAR_ID, avatar_persona })
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status).json({ error: 'token request failed', detail: data });

    const token = data?.data?.session_token;
    if (!token) return res.status(502).json({ error: 'no session_token in response', detail: data });

    return res.status(200).json({ token });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
