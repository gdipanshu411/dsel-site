// DSEL Voice Assistant — Minimal floating voice-orb, real conversation
// Tap to talk → AI responds in voice → auto-listens again
(function(){
  if (window.__dselVoiceLoaded) return;
  window.__dselVoiceLoaded = true;

  const CHAR_KEY = 'dsel-voice-character';
  const MAX_HISTORY = 20;
  const HISTORY_KEY = 'dsel-voice-history-v2';

  // ═══════════════════════════════════════
  //  CHARACTER DEFINITIONS
  // ═══════════════════════════════════════
  const CHARACTERS = [
    { id:'professor', emoji:'🧑‍🏫', name:'Professor', pitch:0.75, rate:0.85, voiceLang:'en-US',
      voiceName: /male|david|daniel|james|mark|google us english/i,
      prompt:'Respond as a wise, patient English professor. Use formal language and explain thoroughly.' },
    { id:'priya', emoji:'👩‍🏫', name:'Ms. Priya', pitch:1.15, rate:0.95, voiceLang:'en-US',
      voiceName: /female|samantha|aria|zira|victoria|google us english female/i,
      prompt:'Respond as a warm, friendly teacher named Priya. Be supportive, use simple language.' },
    { id:'dj', emoji:'🎤', name:'DJ English', pitch:1.35, rate:1.2, voiceLang:'en-US',
      voiceName: /en/i,
      prompt:'Respond with fun Gen-Z energy. Be upbeat, use modern slang occasionally.' },
    { id:'british', emoji:'🇬🇧', name:'British', pitch:0.9, rate:0.9, voiceLang:'en-GB',
      voiceName: /gb|british|daniel/i,
      prompt:'Respond in proper British English. Be polite and refined.' },
    { id:'indian', emoji:'🇮🇳', name:'Indian', pitch:1.0, rate:0.95, voiceLang:'en-IN',
      voiceName: /en-in|indian|hindi/i,
      prompt:'Respond mixing Hindi and English naturally (Hinglish). Relate to Indian culture.' },
    { id:'robo', emoji:'🤖', name:'Robo', pitch:0.4, rate:0.8, voiceLang:'en-US',
      voiceName: /en/i,
      prompt:'Respond precisely and concisely. Use numbered points.' }
  ];

  // ═══════════════════════════════════════
  //  LOCAL KNOWLEDGE BASE
  // ═══════════════════════════════════════
  const LOCAL_KB = [
    { kw:['course fee','fee','fees','price','cost','how much','kitna','charges'], a:'The course fee is ₹4,500 for the full program. No hidden charges!' },
    { kw:['batch','timing','schedule','class time','kaun se time'], a:'Morning and evening batches available. WhatsApp +91 8770462942 for current schedule.' },
    { kw:['location','address','where','kahan','direction','reach','map','stadium road'], a:'Stadium Road, next to New Arya Public School, Sidhi, MP - 486661.' },
    { kw:['phone','call','contact','number','mobile'], a:'Call +91 8770462942 or +91 9685586327.' },
    { kw:['whatsapp','message'], a:'WhatsApp us at +91 8770462942: https://wa.me/918770462942' },
    { kw:['duration','how long','months','kitne mahine'], a:'4-6 months course + 1 year free practice support.' },
    { kw:['demo','free class','trial'], a:'Free demo class! Walk in any working day.' },
    { kw:['what do you teach','subjects','syllabus','kya padhate'], a:'Spoken English, grammar, vocabulary, GD, debate, public speaking, interview prep.' },
    { kw:['interview','job','placement','mock'], a:'Interview prep included — mock rounds, body language, answer structuring.' },
    { kw:['gd','group discussion','debate','public speaking','stage fear'], a:'GD, debate, and public speaking are all part of our course with weekly practice.' },
    { kw:['grammar','tenses','preposition','article'], a:'Practical grammar with real-conversation focus, not just theory.' },
    { kw:['vocabulary','words','new words'], a:'Daily vocabulary with real-life examples in every class.' },
    { kw:['students trained','how many','results','success'], a:'4,500+ students trained since 2011. Most come through word-of-mouth!' },
    { kw:['since when','founded','established','kitne saal'], a:'Started in Satna, moved to Sidhi in 2011 — over 14 years.' },
    { kw:['youtube','video','channel'], a:'YouTube: @DSELSIDHIFORENGLISH' },
    { kw:['scholarship','discount','concession'], a:'For scholarship queries, WhatsApp +91 8770462942.' },
    { kw:['adult','age limit','working','old'], a:'All ages welcome! Students, professionals, anyone wanting to improve.' },
    { kw:['hindi medium','weak english','beginner','nahi aata'], a:'We start from the basics. Many Hindi-medium students now speak confidently.' },
    { kw:['online','zoom','remote','distance'], a:'We focus on classroom teaching at Sidhi center. WhatsApp for queries.' },
    { kw:['certificate','completion'], a:'Course completion certificate awarded after finishing the program.' },
    { kw:['book','study material','pdf','notes'], a:'Study materials provided. Also check Books section on our website.' },
    { kw:['since and for','since for'], a:'"Since" = specific point (since Monday). "For" = duration (for 2 hours).' },
    { kw:['fluency','speak fluent','confidently','improve speaking'], a:'Daily practice is key! We focus on speaking exercises, conversations, and stage confidence.' },
    { kw:['hello','hi','hey','namaste','good morning'], a:'Hello! Welcome to DSEL. Ask me about courses, fees, or practice English with me!' },
    { kw:['thank','thanks','dhanyavaad','shukriya'], a:'You\'re welcome! Happy to help.' },
    { kw:['bye','goodbye','see you','tata'], a:'Goodbye! Keep practicing. Visit us at Stadium Road, Sidhi!' }
  ];

  function searchLocalKB(text) {
    const lower = (text || '').toLowerCase().replace(/[?!.,;:'"]/g, '');
    let best = null, bestScore = 0;
    for (const entry of LOCAL_KB) {
      let score = 0;
      for (const kw of entry.kw) { if (lower.includes(kw.toLowerCase())) score += kw.split(' ').length; }
      if (score > bestScore) { bestScore = score; best = entry; }
    }
    return bestScore > 0 ? best.a : null;
  }

  // ═══════════════════════════════════════
  //  ACTIVE CHARACTER
  // ═══════════════════════════════════════
  let activeChar = CHARACTERS[0];
  try {
    const s = localStorage.getItem(CHAR_KEY);
    if (s) { const f = CHARACTERS.find(c => c.id === s); if (f) activeChar = f; }
  } catch(_){}

  function setActiveChar(char) {
    activeChar = char;
    try { localStorage.setItem(CHAR_KEY, char.id); } catch(_){}
    ttsVoice = pickVoice(char);
    updateUI();
    try { window.dispatchEvent(new CustomEvent('dsel-char-change', { detail: char.id })); } catch(_){}
  }

  // ═══════════════════════════════════════
  //  TTS — Preload voices, prime audio
  // ═══════════════════════════════════════
  let ttsVoice = null;
  let audioPrimed = false;
  const hasTTS = 'speechSynthesis' in window;

  function pickVoice(char) {
    if (!hasTTS) return null;
    const voices = speechSynthesis.getVoices();
    if (!voices.length) return null;
    let v = voices.find(v => new RegExp(char.voiceLang,'i').test(v.lang) && char.voiceName.test(v.name));
    if (!v) v = voices.find(v => new RegExp(char.voiceLang,'i').test(v.lang) && /natural|premium|enhanced|neural/i.test(v.name));
    if (!v) v = voices.find(v => new RegExp(char.voiceLang,'i').test(v.lang));
    if (!v) v = voices.find(v => /^en/i.test(v.lang));
    return v || voices[0] || null;
  }

  function primeAudio() {
    if (audioPrimed || !hasTTS) return;
    // iOS/Chrome require a user-gesture-initiated speak() to unlock audio
    const u = new SpeechSynthesisUtterance('');
    u.volume = 0; u.rate = 2;
    speechSynthesis.cancel();
    speechSynthesis.speak(u);
    audioPrimed = true;
  }

  function loadVoices() {
    if (!hasTTS) return;
    ttsVoice = pickVoice(activeChar);
    // Voices load async on some browsers — retry
    const voices = speechSynthesis.getVoices();
    if (voices.length && !ttsVoice) ttsVoice = pickVoice(activeChar);
  }

  if (hasTTS) {
    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;
    // Aggressive retry for Chrome which loads voices lazily
    setTimeout(loadVoices, 200);
    setTimeout(loadVoices, 800);
    setTimeout(loadVoices, 2000);
  }

  function speak(text) {
    return new Promise(resolve => {
      if (!hasTTS) { resolve(); return; }
      speechSynthesis.cancel();

      let clean = text.replace(/[*_#`~]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\n+/g, '. ').trim();
      if (clean.length > 500) clean = clean.slice(0, 497) + '...';

      // Refresh voices (in case they loaded after init)
      if (!ttsVoice) loadVoices();

      const u = new SpeechSynthesisUtterance(clean);
      if (ttsVoice) u.voice = ttsVoice;
      u.rate = activeChar.rate;
      u.pitch = activeChar.pitch;
      u.volume = 1;
      u.lang = activeChar.voiceLang;

      // Chrome bug: long utterances sometimes never fire onend
      // Workaround: split long text
      let resolved = false;
      const finish = () => { if (!resolved) { resolved = true; resolve(); } };
      u.onend = finish;
      u.onerror = finish;

      // Chrome safety timeout
      const timeout = Math.max(15000, clean.length * 80);
      setTimeout(finish, timeout);

      speechSynthesis.speak(u);
    });
  }

  function stopSpeaking() {
    if (hasTTS) speechSynthesis.cancel();
  }

  // ═══════════════════════════════════════
  //  STT — Speech Recognition
  // ═══════════════════════════════════════
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let listening = false;

  if (SR) {
    recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = false;  // Only final results = faster
    recognition.continuous = false;
    recognition.maxAlternatives = 1;
  }

  function startListening() {
    if (!recognition || listening) return;
    stopSpeaking();
    listening = true;
    updateUI();
    try { recognition.start(); } catch(_) { listening = false; updateUI(); }
  }

  function stopListening() {
    if (!recognition || !listening) return;
    listening = false;
    try { recognition.stop(); } catch(_){}
    updateUI();
  }

  // ═══════════════════════════════════════
  //  API CALL with retry
  // ═══════════════════════════════════════
  let history = [];
  try { history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch(_){}

  function saveHistory(h) { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(-MAX_HISTORY))); } catch(_){} }

  async function callAI(text) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        // Keep last 6 messages for context
        const ctx = history.slice(-6).map(m => ({ role: m.role, content: m.content }));
        ctx.unshift({ role: 'user', content: '[Instruction for this reply only: ' + activeChar.prompt + ' Keep response SHORT — 2-3 sentences max. No markdown.]' });
        ctx.push({ role: 'user', content: text });

        const r = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: ctx })
        });

        if (r.status === 429 && attempt === 0) {
          await sleep(1500);
          continue;
        }

        const data = await r.json().catch(() => ({}));
        return data.reply || null;
      } catch (e) {
        if (attempt === 0) await sleep(1000);
      }
    }
    return null;
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ═══════════════════════════════════════
  //  MAIN CONVERSATION LOOP
  // ═══════════════════════════════════════
  let conversationActive = false;

  async function handleUserSpeech(text) {
    if (!text || !text.trim()) {
      if (conversationActive) startListening();
      return;
    }

    text = text.trim();
    shownText = text;
    statusText = 'Thinking...';
    updateUI();

    history.push({ role: 'user', content: text });
    saveHistory(history);

    // Call AI
    let reply = await callAI(text);

    // Fallback to local KB
    if (!reply) {
      const local = searchLocalKB(text);
      reply = local || "I'm having trouble connecting. Please try again or WhatsApp +91 8770462942.";
    }

    history.push({ role: 'assistant', content: reply });
    saveHistory(history);

    // Show reply and speak IMMEDIATELY
    shownText = reply;
    statusText = 'Speaking...';
    updateUI();

    await speak(reply);

    // Auto-restart listening
    if (conversationActive) {
      shownText = reply; // Keep last reply visible
      statusText = 'Listening...';
      updateUI();
      startListening();
    } else {
      statusText = '';
      updateUI();
    }
  }

  // ═══════════════════════════════════════
  //  UI — Minimal floating orb + small panel
  // ═══════════════════════════════════════
  const css = `
.dsel-vo-fab{position:fixed;bottom:24px;right:155px;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#04415f,#0a6b96);color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.5rem;box-shadow:0 8px 28px rgba(4,65,95,.45);z-index:58;border:none;cursor:pointer;transition:transform .2s,box-shadow .2s}
.dsel-vo-fab:hover{transform:scale(1.08);box-shadow:0 10px 34px rgba(4,65,95,.55)}
.dsel-vo-fab.listening{animation:voPulse 1.5s ease infinite;background:linear-gradient(135deg,#16a34a,#22c55e);box-shadow:0 8px 32px rgba(22,163,74,.5)}
.dsel-vo-fab.thinking{background:linear-gradient(135deg,#8b6914,#ffb547);box-shadow:0 8px 32px rgba(255,181,71,.4)}
.dsel-vo-fab.speaking{animation:voPulse 0.8s ease infinite;background:linear-gradient(135deg,#0a6b96,#3aa6d3)}
@keyframes voPulse{0%,100%{box-shadow:0 8px 28px rgba(4,65,95,.45)}50%{box-shadow:0 8px 40px rgba(4,65,95,.65),0 0 0 10px rgba(4,65,95,.1)}}
.dsel-vo-fab.listening{animation-name:voPulseGreen}
.dsel-vo-fab.speaking{animation-name:voPulseBlue}
@keyframes voPulseGreen{0%,100%{box-shadow:0 8px 28px rgba(22,163,74,.45)}50%{box-shadow:0 8px 40px rgba(22,163,74,.65),0 0 0 10px rgba(22,163,74,.1)}}
@keyframes voPulseBlue{0%,100%{box-shadow:0 8px 28px rgba(10,107,150,.45)}50%{box-shadow:0 8px 40px rgba(58,166,211,.65),0 0 0 10px rgba(58,166,211,.1)}}
.dsel-vo-panel{position:fixed;bottom:92px;right:80px;width:340px;max-width:calc(100vw - 30px);background:var(--card-bg,#fff);border:1px solid var(--line,#d8e2e7);border-radius:16px;box-shadow:0 16px 48px rgba(1,30,44,.3);z-index:58;display:none;flex-direction:column;overflow:hidden}
.dsel-vo-panel.open{display:flex}
.dsel-vo-panel .vo-head{padding:10px 14px;background:linear-gradient(135deg,#04415f,#0a6b96);color:#fff;display:flex;align-items:center;justify-content:space-between;gap:10px}
.dsel-vo-panel .vo-head span{font-size:.85rem;font-weight:700}
.dsel-vo-panel .vo-head button{background:rgba(255,255,255,.15);border:none;color:#fff;cursor:pointer;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;font-size:.9rem}
.dsel-vo-panel .vo-head button:hover{background:rgba(255,255,255,.25)}
.dsel-vo-panel .vo-chars{display:flex;gap:4px;padding:8px 12px;overflow-x:auto;scrollbar-width:none;border-bottom:1px solid var(--line,#d8e2e7);background:var(--bg,#f1f5f7)}
.dsel-vo-panel .vo-chars::-webkit-scrollbar{display:none}
.dsel-vo-panel .vo-char{display:flex;align-items:center;gap:3px;padding:4px 10px;border-radius:999px;border:1px solid var(--line,#d8e2e7);background:var(--card-bg,#fff);cursor:pointer;font-size:.73rem;font-weight:600;white-space:nowrap;flex-shrink:0;color:var(--ink,#011e2c);font-family:inherit;transition:.15s}
.dsel-vo-panel .vo-char:hover{border-color:var(--brand,#04415f)}
.dsel-vo-panel .vo-char.active{background:var(--brand,#04415f);color:#fff;border-color:var(--brand,#04415f)}
.dsel-vo-panel .vo-char .vo-cemoji{font-size:.95rem}
.dsel-vo-panel .vo-body{padding:14px;min-height:70px;max-height:180px;overflow-y:auto;font-size:.9rem;line-height:1.5;color:var(--ink,#011e2c);background:var(--card-bg,#fff)}
.dsel-vo-panel .vo-body .vo-status{color:var(--muted,#56707d);font-size:.78rem;font-weight:600;letter-spacing:.5px}
.dsel-vo-panel .vo-body .vo-text{white-space:pre-wrap}
.dsel-vo-panel .vo-body .vo-user{color:var(--muted,#56707d);font-style:italic;margin-bottom:4px}
.dsel-vo-panel .vo-actions{display:flex;gap:8px;padding:10px 14px;border-top:1px solid var(--line,#d8e2e7);background:var(--bg,#f1f5f7)}
.dsel-vo-panel .vo-actions button{flex:1;padding:10px;border-radius:10px;border:none;cursor:pointer;font-weight:700;font-size:.85rem;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:6px;transition:.15s}
.dsel-vo-panel .vo-actions .vo-talk{background:linear-gradient(135deg,#04415f,#0a6b96);color:#fff}
.dsel-vo-panel .vo-actions .vo-talk:hover{opacity:.9}
.dsel-vo-panel .vo-actions .vo-talk.listening{background:#dc2626}
.dsel-vo-panel .vo-actions .vo-stop{background:var(--bg-alt,#e6edf0);color:var(--ink,#011e2c)}
.dsel-vo-panel .vo-actions .vo-stop:hover{background:#fee2e2;color:#dc2626}
@media(max-width:520px){
  .dsel-vo-fab{right:130px;width:50px;height:50px;font-size:1.3rem;bottom:20px}
  .dsel-vo-panel{right:10px;left:10px;width:auto;bottom:84px}
}`;

  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // Build character pills
  let charsHTML = CHARACTERS.map(c =>
    `<button class="vo-char${c.id===activeChar.id?' active':''}" data-char="${c.id}"><span class="vo-cemoji">${c.emoji}</span>${c.name}</button>`
  ).join('');

  // FAB
  const fab = document.createElement('button');
  fab.className = 'dsel-vo-fab';
  fab.innerHTML = activeChar.emoji;
  fab.title = 'Voice Assistant — Click to talk';
  fab.setAttribute('aria-label', 'Voice Assistant');
  document.body.appendChild(fab);

  // Panel
  const panel = document.createElement('div');
  panel.className = 'dsel-vo-panel';
  panel.innerHTML = `
    <div class="vo-head">
      <span>🎙️ Voice Chat</span>
      <button class="vo-close" title="Close">✕</button>
    </div>
    <div class="vo-chars">${charsHTML}</div>
    <div class="vo-body">
      <div class="vo-text">Tap <b>Start Talking</b> below to begin a conversation. Speak naturally — I will respond in voice.</div>
    </div>
    <div class="vo-actions">
      <button class="vo-talk">🎤 Start Talking</button>
      <button class="vo-stop">✕ Close</button>
    </div>
  `;
  document.body.appendChild(panel);

  // DOM refs
  const bodyEl = panel.querySelector('.vo-body');
  const talkBtn = panel.querySelector('.vo-talk');
  const stopBtn = panel.querySelector('.vo-stop');
  const closeBtn = panel.querySelector('.vo-close');
  const charsRow = panel.querySelector('.vo-chars');

  let shownText = '', statusText = '';

  function updateUI() {
    fab.className = 'dsel-vo-fab';
    if (conversationActive && listening) fab.classList.add('listening');
    else if (conversationActive && statusText === 'Thinking...') fab.classList.add('thinking');
    else if (conversationActive && statusText === 'Speaking...') fab.classList.add('speaking');

    fab.innerHTML = activeChar.emoji;

    // Update panel body
    let html = '';
    if (statusText) html += `<div class="vo-status">${statusText}</div>`;
    if (shownText) html += `<div class="vo-text">${escapeHtml(shownText)}</div>`;
    if (!html) html = '<div class="vo-text" style="color:var(--muted)">Tap <b>Start Talking</b> to begin</div>';
    bodyEl.innerHTML = html;
    bodyEl.scrollTop = bodyEl.scrollHeight;

    // Update talk button
    if (conversationActive && listening) {
      talkBtn.innerHTML = '⏹ Stop & Process';
      talkBtn.classList.add('listening');
    } else {
      talkBtn.innerHTML = '🎤 Start Talking';
      talkBtn.classList.remove('listening');
    }

    // Update character row
    charsRow.querySelectorAll('.vo-char').forEach(el => el.classList.toggle('active', el.dataset.char === activeChar.id));
  }

  // Character switch
  charsRow.addEventListener('click', e => {
    const btn = e.target.closest('.vo-char');
    if (!btn) return;
    const char = CHARACTERS.find(c => c.id === btn.dataset.char);
    if (char) setActiveChar(char);
  });

  // Listen for changes from chat widget
  window.addEventListener('dsel-char-change', e => {
    const char = CHARACTERS.find(c => c.id === e.detail);
    if (char && char.id !== activeChar.id) {
      activeChar = char;
      ttsVoice = pickVoice(char);
      updateUI();
    }
  });

  // Start conversation
  function startConversation() {
    primeAudio();
    conversationActive = true;
    panel.classList.add('open');
    shownText = '';
    statusText = 'Listening...';
    updateUI();
    startListening();
  }

  function stopConversation() {
    conversationActive = false;
    stopListening();
    stopSpeaking();
    shownText = '';
    statusText = '';
    panel.classList.remove('open');
    updateUI();
  }

  // STT event handlers
  if (recognition) {
    recognition.onstart = () => {
      listening = true;
      statusText = 'Listening...';
      updateUI();
    };
    recognition.onresult = (e) => {
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript;
      }
      if (final.trim()) {
        listening = false;
        shownText = final.trim();
        statusText = 'Thinking...';
        updateUI();
        handleUserSpeech(final.trim());
      }
    };
    recognition.onerror = (e) => {
      listening = false;
      if (e.error === 'no-speech' && conversationActive) {
        setTimeout(() => { if (conversationActive) startListening(); }, 500);
        return;
      }
      if (e.error === 'aborted') return;
      shownText = 'Voice error: ' + e.error + '. Try again.';
      statusText = '';
      updateUI();
    };
    recognition.onend = () => {
      listening = false;
      updateUI();
    };
  }

  // Button handlers
  fab.addEventListener('click', () => {
    if (conversationActive) {
      if (listening) {
        // User spoke — stop and process
        stopListening();
        statusText = 'Processing...';
        updateUI();
      }
    } else {
      startConversation();
    }
  });

  talkBtn.addEventListener('click', () => {
    if (conversationActive && listening) {
      stopListening();
      statusText = 'Processing...';
      updateUI();
    } else if (!conversationActive) {
      startConversation();
    } else {
      startListening();
    }
  });

  stopBtn.addEventListener('click', stopConversation);
  closeBtn.addEventListener('click', stopConversation);

  // Keyboard shortcut: Escape to close
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && conversationActive) stopConversation();
  });

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&','<':'<','>':'>','"':'"',"'":'&#39;'}[c]));
  }
})();