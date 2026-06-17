// Vercel serverless function — DSEL AI Assistant powered by Gemini
// Endpoint: POST /api/chat — Env var: GEMINI_API_KEY

const SYSTEM_PROMPT = `You are DSEL Assistant for The Dream School of English Language, Sidhi MP. Course fee: ₹4500 one-time, 4-6 months + 1 year free practice. Address: Stadium Rd, Sidhi MP-486661. Ph/WhatsApp: +91 8770462942, +91 9685586327. YouTube: @DSELSIDHIFORENGLISH. 4500+ students since 2011. Free demo class. Teaches: spoken English, grammar, vocabulary, GD, debate, public speaking, interview prep.

RULES:
- Reply PLAIN TEXT only. No markdown.
- Keep replies VERY SHORT — 1 to 3 sentences max.
- For bookings, suggest WhatsApp: https://wa.me/918770462942
- Mix Hinglish if student uses Hindi. Otherwise use simple English.
- Never invent facts. If unsure, say to WhatsApp the institute.
- If a user message starts with [Personality: ...], adopt that tone while keeping DSEL facts.`;

export const config = { api: { bodyParser: { sizeLimit: '15mb' } } };

// In-memory cache (max 100 entries, 5-min TTL)
const cache = new Map();
const CACHE_MAX = 100;
const CACHE_TTL = 5 * 60 * 1000;

function getCache(key) {
  const e = cache.get(key);
  if (!e || Date.now() - e.ts > CACHE_TTL) { if (e) cache.delete(key); return null; }
  return e.value;
}
function setCache(key, value) {
  if (cache.size >= CACHE_MAX) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    if (oldest) cache.delete(oldest[0]);
  }
  cache.set(key, { value, ts: Date.now() });
}

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
  return h.toString(36);
}

async function callGemini(url, body) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    if (r.status === 429 && attempt < 2) { await new Promise(res => setTimeout(res, Math.pow(2, attempt) * 800)); continue; }
    return r;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(503).json({ reply: "AI not configured. WhatsApp +91 8770462942.", configured: false });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (_) { body = {}; } }
  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (!messages.length) return res.status(400).json({ error: 'messages array required' });

  const recent = messages.slice(-8);

  // Build contents
  const contents = [
    { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
    { role: 'model', parts: [{ text: 'Understood. I will follow all rules, keep replies short, and adopt any personality given.' }] }
  ];
  for (const m of recent) {
    const parts = [];
    if (m.attachments && Array.isArray(m.attachments)) {
      for (const att of m.attachments) {
        if (att && att.mime && att.dataBase64) parts.push({ inlineData: { mimeType: att.mime, data: att.dataBase64 } });
      }
    }
    if (m.content) parts.push({ text: String(m.content).slice(0, 2000) });
    if (!parts.length) continue;
    contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts });
  }

  // Cache key from last 2 text-only messages
  const ckParts = recent.slice(-2).filter(m => m.content && !m.attachments).map(m => m.role + ':' + m.content);
  const cacheKey = simpleHash(ckParts.join('|'));
  const cached = getCache(cacheKey);
  if (cached) return res.status(200).json({ reply: cached, cached: true });

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    const reqBody = JSON.stringify({
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 300, topP: 0.95 },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
      ]
    });

    const r = await callGemini(url, reqBody);

    if (!r.ok) {
      const errText = await r.text().catch(() => '');
      console.error('Gemini error', r.status, errText);
      if (r.status === 429) return res.status(429).json({ reply: "Too many requests. Please try again in a moment." });
      if (r.status === 413 || /too large|payload/i.test(errText)) return res.status(413).json({ reply: "File too large. Send smaller image or PDF (under 10 MB)." });
      return res.status(502).json({ reply: "Sorry, I had trouble responding. Please try again, or WhatsApp +91 8770462942." });
    }

    const data = await r.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      || "I couldn't process that. Please ask differently or WhatsApp +91 8770462942.";

    setCache(cacheKey, reply);
    return res.status(200).json({ reply });
  } catch (err) {
    console.error('Chat error', err);
    return res.status(500).json({ reply: "Something went wrong. Please try again or WhatsApp +91 8770462942." });
  }
}