// DSEL Voice Assistant — Pure voice-to-voice. Tap orb, speak, hear response. No text.
(function(){
  if (window.__dselVoiceLoaded) return;
  window.__dselVoiceLoaded = true;

  const CHAR_KEY = 'dsel-voice-character';
  const MAX_HISTORY = 10;
  const HISTORY_KEY = 'dsel-voice-history-v3';

  const CHARACTERS = [
    { id:'professor', emoji:'🧑‍🏫', name:'Professor', pitch:0.75, rate:0.85, voiceLang:'en-US',
      voiceName: /male|david|daniel|james|mark|google us english/i,
      prompt:'Respond as a wise, patient English professor. Use formal language. Keep it short — 2 sentences max.' },
    { id:'priya', emoji:'👩‍🏫', name:'Ms. Priya', pitch:1.15, rate:0.95, voiceLang:'en-US',
      voiceName: /female|samantha|aria|zira|victoria|google us english female/i,
      prompt:'Respond as warm, friendly teacher Priya. Be supportive and encouraging. Keep it short — 2 sentences max.' },
    { id:'dj', emoji:'🎤', name:'DJ English', pitch:1.35, rate:1.15, voiceLang:'en-US',
      voiceName: /en/i,
      prompt:'Respond with fun, energetic Gen-Z style. Be upbeat. Keep it short — 2 sentences max.' },
    { id:'british', emoji:'🇬🇧', name:'British', pitch:0.9, rate:0.9, voiceLang:'en-GB',
      voiceName: /gb|british|daniel/i,
      prompt:'Respond in proper British English. Be refined and brief — 2 sentences max.' },
    { id:'indian', emoji:'🇮🇳', name:'Indian', pitch:1.0, rate:0.95, voiceLang:'en-IN',
      voiceName: /en-in|indian|hindi/i,
      prompt:'Respond in natural Hinglish. Mix Hindi-English. Relate to Indian life. Keep it short — 2 sentences max.' },
    { id:'robo', emoji:'🤖', name:'Robo', pitch:0.4, rate:0.8, voiceLang:'en-US',
      voiceName: /en/i,
      prompt:'Respond precisely like a robot. Very concise. 1-2 sentences.' }
  ];

  const LOCAL_KB = [
    { kw:['course fee','fee','fees','price','cost','how much','kitna','charges'], a:'The course fee is ₹4,500 for the full program. No hidden charges.' },
    { kw:['batch','timing','schedule','class time'], a:'Morning and evening batches available. WhatsApp +91 8770462942 for schedule.' },
    { kw:['location','address','where','kahan','direction','reach','map'], a:'Stadium Road, next to New Arya Public School, Sidhi, MP - 486661.' },
    { kw:['phone','call','contact','number','mobile'], a:'Call +91 8770462942 or +91 9685586327.' },
    { kw:['whatsapp','message'], a:'WhatsApp us at +91 8770462942.' },
    { kw:['duration','how long','months'], a:'4-6 months course + 1 year free practice support.' },
    { kw:['demo','free class','trial'], a:'Free demo class! Walk in any working day.' },
    { kw:['subjects','syllabus'], a:'Spoken English, grammar, vocabulary, GD, debate, public speaking, interview prep.' },
    { kw:['interview','job','mock'], a:'Interview prep included — mock rounds, body language, answer structuring.' },
    { kw:['gd','debate','public speaking'], a:'GD, debate, and public speaking are all part of the course with weekly practice.' },
    { kw:['grammar','tenses','preposition','article'], a:'Practical grammar with real-conversation focus, not just theory.' },
    { kw:['vocabulary','words'], a:'Daily vocabulary with real-life examples in every class.' },
    { kw:['students','results','success'], a:'4,500+ students trained since 2011. Most come through word-of-mouth!' },
    { kw:['youtube','video'], a:'YouTube: @DSELSIDHIFORENGLISH' },
    { kw:['scholarship','discount','concession'], a:'For scholarship, WhatsApp +91 8770462942.' },
    { kw:['adult','age','working'], a:'All ages welcome — students, professionals, anyone.' },
    { kw:['hindi medium','beginner','weak english'], a:'We start from basics. Many Hindi-medium students now speak confidently.' },
    { kw:['online','zoom','remote'], a:'We focus on classroom teaching at Sidhi center. WhatsApp for queries.' },
    { kw:['since and for','since for'], a:'Since = specific point (since Monday). For = duration (for 2 hours).' },
    { kw:['fluency','speak fluent','improve'], a:'Daily practice is key! We focus on real conversations and stage confidence.' },
    { kw:['hello','hi','hey','namaste'], a:'Hello! I am your DSEL voice assistant. Ask me anything!' },
    { kw:['thank','thanks'], a:'You are welcome! Happy to help.' },
    { kw:['bye','goodbye'], a:'Goodbye! Keep practicing. Visit us at Stadium Road, Sidhi!' }
  ];

  function searchKB(text) {
    const lower = (text || '').toLowerCase().replace(/[?!.,;:'"]/g, '');
    let best = null, bestScore = 0;
    for (const e of LOCAL_KB) {
      let s = 0;
      for (const k of e.kw) { if (lower.includes(k.toLowerCase())) s += k.split(' ').length; }
      if (s > bestScore) { bestScore = s; best = e; }
    }
    return bestScore > 0 ? best.a : null;
  }

  // Active character
  let activeChar = CHARACTERS[0];
  try { const s = localStorage.getItem(CHAR_KEY); const f = CHARACTERS.find(c => c.id === s); if (f) activeChar = f; } catch(_){}

  function setChar(c) {
    activeChar = c;
    try { localStorage.setItem(CHAR_KEY, c.id); } catch(_){}
    ttsVoice = pickVoice(c);
    updateOrb();
    try { window.dispatchEvent(new CustomEvent('dsel-char-change', { detail: c.id })); } catch(_){}
  }

  // TTS
  let ttsVoice = null;
  let audioUnlocked = false;
  const hasTTS = 'speechSynthesis' in window;

  function pickVoice(c) {
    if (!hasTTS) return null;
    const voices = speechSynthesis.getVoices();
    if (!voices.length) return null;
    let v = voices.find(v => new RegExp(c.voiceLang,'i').test(v.lang) && c.voiceName.test(v.name));
    if (!v) v = voices.find(v => new RegExp(c.voiceLang,'i').test(v.lang));
    if (!v) v = voices.find(v => /^en/i.test(v.lang));
    return v || voices[0] || null;
  }

  function loadVoices() {
    if (!hasTTS) return;
    ttsVoice = pickVoice(activeChar);
  }

  function unlockAudio() {
    if (audioUnlocked || !hasTTS) return;
    const u = new SpeechSynthesisUtterance('');
    u.volume = 0;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    audioUnlocked = true;
  }

  if (hasTTS) {
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
    setTimeout(loadVoices, 100);
    setTimeout(loadVoices, 500);
    setTimeout(loadVoices, 2000);
  }

  function speak(text) {
    return new Promise(resolve => {
      if (!hasTTS) { resolve(); return; }
      speechSynthesis.cancel();
      loadVoices();
      let clean = text.replace(/[*_#`~]/g,'').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/\n+/g,'. ').trim();
      if (clean.length > 400) clean = clean.slice(0, 397) + '...';
      const u = new SpeechSynthesisUtterance(clean);
      if (ttsVoice) u.voice = ttsVoice;
      u.rate = activeChar.rate;
      u.pitch = activeChar.pitch;
      u.volume = 1;
      u.lang = activeChar.voiceLang;
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      u.onend = finish;
      u.onerror = finish;
      setTimeout(finish, Math.max(12000, clean.length * 80));
      speechSynthesis.speak(u);
    });
  }

  function stopSpeaking() { if (hasTTS) speechSynthesis.cancel(); }

  // STT
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let listening = false;
  if (SR) {
    recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
  }

  function startListening() {
    if (!recognition || listening) return;
    stopSpeaking();
    listening = true;
    setState('listening');
    try { recognition.start(); } catch(_) { listening = false; }  }

  function stopListening() {
    if (!recognition || !listening) return;
    listening = false;
    try { recognition.stop(); } catch(_){}
  }

  // History + API
  let history = [];
  try { history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch(_){}

  async function callAI(text) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const ctx = history.slice(-4).map(m => ({ role: m.role, content: m.content }));
        ctx.unshift({ role: 'user', content: '[Instruction: ' + activeChar.prompt + ' No markdown. Plain text only.]' });
        ctx.push({ role: 'user', content: text });
        const r = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: ctx })
        });
        if (r.status === 429 && attempt === 0) { await sleep(1500); continue; }
        const data = await r.json().catch(() => ({}));
        return data.reply || null;
      } catch(e) { if (attempt === 0) await sleep(1000); }
    }
    return null;
  }
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // Conversation
  let active = false;

  async function handleSpeech(text) {
    text = (text || '').trim();
    if (!text || !active) { if (active) startListening(); return; }

    setState('thinking');
    history.push({ role: 'user', content: text });
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-MAX_HISTORY))); } catch(_){}

    let reply = await callAI(text);
    if (!reply) {
      reply = searchKB(text) || "I can't connect right now. Please try again.";
    }

    history.push({ role: 'assistant', content: reply });
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-MAX_HISTORY))); } catch(_){}

    setState('speaking');
    await speak(reply);

    if (active) {
      startListening();
    } else {
      setState('idle');
    }
  }

  // State
  function setState(state) {
    orb.className = 'dsel-vo-orb';
    if (state === 'listening') orb.classList.add('listening');
    if (state === 'thinking') orb.classList.add('thinking');
    if (state === 'speaking') orb.classList.add('speaking');
    orb.querySelector('.orb-emoji').textContent = activeChar.emoji;

    // Show/hide character row
    if (state === 'listening' || state === 'thinking' || state === 'speaking') {
      charRow.style.display = 'none';
    } else {
      charRow.style.display = 'flex';
    }
  }

  // ORB UI — single floating button, that's it
  const css = `
.dsel-vo-orb{position:fixed;bottom:24px;right:155px;width:58px;height:58px;border-radius:50%;background:linear-gradient(135deg,#04415f,#0a6b96);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.5rem;box-shadow:0 8px 28px rgba(4,65,95,.45);z-index:58;border:none;cursor:pointer;transition:transform .15s,box-shadow .15s}
.dsel-vo-orb:hover{transform:scale(1.08)}
.dsel-vo-orb .orb-emoji{pointer-events:none;line-height:1}
.dsel-vo-orb .orb-ring{display:none;position:absolute;inset:-6px;border-radius:50%;border:2px solid transparent;pointer-events:none}

/* Listening = green pulse */
.dsel-vo-orb.listening{background:linear-gradient(135deg,#16a34a,#22c55e);box-shadow:0 0 20px rgba(22,163,74,.5)}
.dsel-vo-orb.listening .orb-ring{display:block;border-color:rgba(22,163,74,.5);animation:ringOut 1.8s ease-out infinite}

/* Thinking = yellow spin */
.dsel-vo-orb.thinking{background:linear-gradient(135deg,#b8860b,#ffb547);box-shadow:0 0 20px rgba(255,181,71,.5);animation:thinkSpin 1s linear infinite}
@keyframes thinkSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}

/* Speaking = blue pulse */
.dsel-vo-orb.speaking{background:linear-gradient(135deg,#0a6b96,#3aa6d3);box-shadow:0 0 24px rgba(58,166,211,.6);animation:speakBounce .6s ease infinite}
@keyframes speakBounce{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}

@keyframes ringOut{0%{transform:scale(0.8);opacity:0.8}100%{transform:scale(1.5);opacity:0}}

/* Character selector row — only visible when idle */
.dsel-vo-chars{position:fixed;bottom:90px;right:90px;display:flex;gap:4px;z-index:58;background:var(--card-bg,#fff);border:1px solid var(--line,#d8e2e7);border-radius:12px;padding:6px 8px;box-shadow:0 8px 24px rgba(0,0,0,.12)}
.dsel-vo-ch{display:flex;align-items:center;gap:2px;padding:4px 8px;border-radius:999px;border:1px solid var(--line,#d8e2e7);background:var(--bg,#f1f5f7);cursor:pointer;font-size:.7rem;font-weight:700;white-space:nowrap;color:var(--ink,#011e2c);font-family:inherit;transition:.12s;user-select:none}
.dsel-vo-ch:hover{border-color:var(--brand,#04415f);background:var(--card-bg,#fff)}
.dsel-vo-ch.active{background:var(--brand,#04415f);color:#fff;border-color:var(--brand,#04415f)}
.dsel-vo-ch .ch-e{font-size:.85rem}

/* Toast — tiny text that fades, only shown briefly after speaking */
.dsel-vo-toast{position:fixed;bottom:90px;right:100px;max-width:220px;background:rgba(1,30,44,.88);color:#fff;padding:8px 14px;border-radius:10px;font-size:.82rem;line-height:1.4;z-index:57;opacity:0;transform:translateY(8px);transition:opacity .3s,transform .3s;pointer-events:none}
.dsel-vo-toast.show{opacity:1;transform:translateY(0)}

@media(max-width:520px){
  .dsel-vo-orb{right:130px;width:52px;height:52px;font-size:1.3rem;bottom:20px}
  .dsel-vo-chars{right:10px;bottom:82px}
}
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // Orb
  const orb = document.createElement('button');
  orb.className = 'dsel-vo-orb';
  orb.setAttribute('aria-label', 'Voice Assistant');
  orb.innerHTML = '<span class="orb-emoji">' + activeChar.emoji + '</span><span class="orb-ring"></span>';
  document.body.appendChild(orb);

  // Character row (only shown when idle)
  const charHTML = CHARACTERS.map(c =>
    `<button class="dsel-vo-ch${c.id===activeChar.id?' active':''}" data-char="${c.id}"><span class="ch-e">${c.emoji}</span>${c.name}</button>`
  ).join('');
  const charRow = document.createElement('div');
  charRow.className = 'dsel-vo-chars';
  charRow.innerHTML = charHTML;
  document.body.appendChild(charRow);

  // Toast for showing last reply briefly
  const toast = document.createElement('div');
  toast.className = 'dsel-vo-toast';
  document.body.appendChild(toast);

  function showToast(text) {
    if (!text) return;
    const short = text.length > 200 ? text.slice(0,197) + '...' : text;
    toast.textContent = short;
    toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove('show'), 4000);
  }

  function updateOrb() {
    orb.querySelector('.orb-emoji').textContent = activeChar.emoji;
    charRow.querySelectorAll('.dsel-vo-ch').forEach(el => el.classList.toggle('active', el.dataset.char === activeChar.id));
  }

  // Character selection
  charRow.addEventListener('click', e => {
    const btn = e.target.closest('.dsel-vo-ch');
    if (!btn) return;
    const c = CHARACTERS.find(c => c.id === btn.dataset.char);
    if (c) setChar(c);
  });

  window.addEventListener('dsel-char-change', e => {
    const c = CHARACTERS.find(c => c.id === e.detail);
    if (c && c.id !== activeChar.id) { activeChar = c; ttsVoice = pickVoice(c); updateOrb(); }
  });

  // STT handlers
  if (recognition) {
    recognition.onstart = () => { listening = true; setState('listening'); };
    recognition.onresult = (e) => {
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
      }
      if (final.trim()) {
        listening = false;
        handleSpeech(final.trim());
      }
    };
    recognition.onerror = (e) => {
      listening = false;
      if (e.error === 'no-speech' && active) {
        setTimeout(() => { if (active) startListening(); }, 400);
        return;
      }
      if (e.error === 'aborted') return;
      setState('idle');
    };
    recognition.onend = () => { listening = false; };
  }

  // Orb click = toggle conversation
  orb.addEventListener('click', () => {
    unlockAudio();
    if (active) {
      // Stop conversation
      active = false;
      stopListening();
      stopSpeaking();
      setState('idle');
      toast.classList.remove('show');
    } else {
      // Start conversation — jump straight to listening
      active = true;
      loadVoices();
      startListening();
    }
  });
})();