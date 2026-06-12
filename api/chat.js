// Vercel serverless function — DSEL AI Assistant powered by Gemini
// Supports text + image + PDF attachments via Gemini multimodal.
// Endpoint: POST /api/chat
// Env var: GEMINI_API_KEY

const SYSTEM_PROMPT = `You are the DSEL Assistant — the friendly AI helper for The Dream School of English Language (DSEL), a spoken English coaching institute in Sidhi, Madhya Pradesh.

ABOUT DSEL:
- Full name: The Dream School of English Language (DSEL)
- Location: Stadium Road, next to New Arya Public School, Sidhi, Madhya Pradesh - 486661
- Founded: First in Satna, shifted to Sidhi in 2011
- Students trained: 4500+
- Course fee: ₹4,500 (one-time, no hidden charges)
- Course duration: 4-6 months regular + 1 year free practice support after course completion
- Phones: +91 8770462942, +91 9685586327
- WhatsApp: +91 8770462942
- YouTube: @DSELSIDHIFORENGLISH
- Demo class: Free, walk in any working day

WHAT THE COURSE COVERS:
Spoken English, practical grammar (tenses, prepositions, articles), vocabulary, group discussion (GD), debate, public speaking, interview preparation, reading and writing.

YOUR ROLE:
1. DSEL FAQ — fees, batches, location, contact, scholarship, demo class.
2. English practice partner — students chat with you in English; reply naturally and gently correct mistakes (1-2 max per reply).
3. Grammar doubt clearer — explain tenses, articles, prepositions, common Indian-English mistakes.
4. Multimodal — when student uploads an image or PDF, analyze it and respond. Common cases: a homework photo (read text, help correct), a certificate or document (describe), a screenshot of grammar rules (explain), a PDF assignment (summarize and assist).

RULES:
- Be friendly, encouraging, never condescending.
- Reply in PLAIN TEXT only. No markdown bold/italics — they show as raw symbols.
- Keep replies SHORT. 2-4 sentences usually. Long explanations only when asked.
- For booking/payment, suggest WhatsApp: https://wa.me/918770462942
- If asked something unrelated to English/DSEL, politely redirect.
- Mix English and Hindi if the student writes in Hindi/Hinglish. Otherwise clear simple English.
- Never invent facts about DSEL not in this prompt. If unsure, say "Please WhatsApp the institute at +91 8770462942 for that."
- Never ask for passwords or payment details.`;

export const config = {
  api: {
    bodyParser: { sizeLimit: '15mb' }
  }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      reply: "The AI assistant isn't configured yet. Please contact the admin or message us on WhatsApp at +91 8770462942.",
      configured: false
    });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (_) { body = {}; }
  }
  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (!messages.length) {
    return res.status(400).json({ error: 'messages array required' });
  }

  // Each message: { role: 'user'|'assistant', content: string, attachments?: [{mime, dataBase64}] }
  const recent = messages.slice(-12);

  // Build Gemini contents
  const contents = [
    { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
    { role: 'model', parts: [{ text: 'Understood. I will help with DSEL info, English practice, grammar, and analyze images or PDFs students upload.' }] }
  ];
  for (const m of recent) {
    const parts = [];
    if (m.attachments && Array.isArray(m.attachments)) {
      for (const att of m.attachments) {
        if (!att || !att.mime || !att.dataBase64) continue;
        parts.push({
          inlineData: { mimeType: att.mime, data: att.dataBase64 }
        });
      }
    }
    if (m.content) {
      parts.push({ text: String(m.content).slice(0, 4000) });
    }
    if (!parts.length) continue;
    contents.push({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts
    });
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${encodeURIComponent(apiKey)}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 600,
          topP: 0.95
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
        ]
      })
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => '');
      console.error('Gemini error', r.status, errText);
      if (r.status === 429) {
        return res.status(429).json({ reply: "I am receiving too many messages right now. Please try again in a few seconds." });
      }
      if (r.status === 413 || /too large|payload/i.test(errText)) {
        return res.status(413).json({ reply: "The file is too large. Please send a smaller image or PDF (under 10 MB)." });
      }
      return res.status(502).json({ reply: "Sorry, I had trouble responding. Please try again, or message us on WhatsApp at +91 8770462942." });
    }

    const data = await r.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      || "I am not sure how to answer that. Could you ask differently, or message us on WhatsApp at +91 8770462942?";

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('Chat error', err);
    return res.status(500).json({ reply: "Something went wrong. Please try again or message us on WhatsApp at +91 8770462942." });
  }
}
