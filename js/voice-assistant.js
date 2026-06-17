// DSEL Voice Assistant — Compact panel, real voice conversation
(function(){
  if (window.__dselVoiceLoaded) return;
  window.__dselVoiceLoaded = true;

  const CHAR_KEY = 'dsel-voice-character';
  const HISTORY_KEY = 'dsel-voice-history-v4';

  const CHARACTERS = [
    { id:'professor', emoji:'🧑‍🏫', name:'Professor', pitch:0.75, rate:0.88, voiceLang:'en-US',
      voiceRe: /male|david|daniel|james|google us english/i,
      prompt:'Respond as a wise professor. Formal, patient, thorough.' },
    { id:'priya', emoji:'👩‍🏫', name:'Ms. Priya', pitch:1.15, rate:0.95, voiceLang:'en-US',
      voiceRe: /female|samantha|aria|zira|victoria/i,
      prompt:'Respond as warm, encouraging teacher Priya. Supportive and simple.' },
    { id:'dj', emoji:'🎤', name:'DJ English', pitch:1.3, rate:1.15, voiceLang:'en-US',
      voiceRe: /en/i,
      prompt:'Respond with Gen-Z energy. Upbeat, fun, modern.' },
    { id:'british', emoji:'🇬🇧', name:'British', pitch:0.9, rate:0.92, voiceLang:'en-GB',
      voiceRe: /gb|british|daniel/i,
      prompt:'Respond in proper British English. Polished and refined.' },
    { id:'indian', emoji:'🇮🇳', name:'Indian', pitch:1.0, rate:0.95, voiceLang:'en-IN',
      voiceRe: /en-in|indian|hindi/i,
      prompt:'Respond in natural Hinglish. Mix Hindi-English, relate to Indian life.' },
    { id:'robo', emoji:'🤖', name:'Robo', pitch:0.4, rate:0.82, voiceLang:'en-US',
      voiceRe: /en/i,
      prompt:'Respond like a precise robot. Concise, factual, numbered.' }
  ];

  const LOCAL_KB = [
    { kw:['fee','price','cost','how much','kitna','charges'], a:'Course fee is 4,500 rupees. One-time payment. No hidden charges.' },
    { kw:['batch','timing','schedule','class time'], a:'Morning and evening batches. WhatsApp +91 8770462942 for current timings.' },
    { kw:['location','address','where','kahan','map'], a:'Stadium Road, next to New Arya Public School, Sidhi, MP 486661.' },
    { kw:['phone','call','contact','number'], a:'Call +91 8770462942 or +91 9685586327.' },
    { kw:['whatsapp'], a:'WhatsApp: +91 8770462942. https://wa.me/918770462942' },
    { kw:['duration','how long','months'], a:'4 to 6 months course, plus 1 year free practice support.' },
    { kw:['demo','trial','free class'], a:'Free demo class! Just walk in any working day.' },
    { kw:['subjects','syllabus','teach'], a:'Spoken English, grammar, vocabulary, GD, debate, public speaking, interview prep.' },
    { kw:['interview','job','mock'], a:'Interview preparation is included — mock rounds, body language, answer structuring.' },
    { kw:['scholarship','discount'], a:'For scholarship details, WhatsApp +91 8770462942.' },
    { kw:['youtube'], a:'YouTube channel: @DSELSIDHIFORENGLISH' },
    { kw:['students','success'], a:'More than 4,500 students trained since 2011.' },
    { kw:['hindi medium','beginner','nahi aata'], a:'We start from absolute basics. Many Hindi-medium students now speak confidently.' },
    { kw:['fluency','improve speaking','confident'], a:'Daily practice is the key! We focus on real conversations and stage exercises.' },
    { kw:['since for'], a:'Since = specific point in time. For = duration. Example: since Monday, for 2 hours.' },
    { kw:['hello','hi','hey','namaste'], a:'Hello! I am DSEL voice assistant. How can I help you today?' },
    { kw:['bye','goodbye','tata'], a:'Goodbye! Keep practicing your English every day. Visit us at Stadium Road, Sidhi!' }
  ];

  function searchKB(t) {
    const lo = (t||'').toLowerCase().replace(/[?!.,;:'"]/g,'');
    let b=null, bs=0;
    for (const e of LOCAL_KB) { let s=0; for (const k of e.kw) if (lo.includes(k)) s+=k.split(' ').length; if (s>bs) { bs=s; b=e; } }
    return bs>0 ? b.a : null;
  }

  // Active character
  let char = CHARACTERS[0];
  try { const s=localStorage.getItem(CHAR_KEY); const f=CHARACTERS.find(c=>c.id===s); if (f) char=f; } catch(_){}
  function setChar(c) { char=c; try{localStorage.setItem(CHAR_KEY,c.id)}catch(_){} ttsVoice=pickVoice(c); updateUI(); try{window.dispatchEvent(new CustomEvent('dsel-char-change',{detail:c.id}))}catch(_){} }

  // TTS
  let ttsVoice = null;
  const hasTTS = 'speechSynthesis' in window;
  function pickVoice(c) {
    if (!hasTTS) return null;
    const vv = speechSynthesis.getVoices(); if (!vv.length) return null;
    let v = vv.find(v=>new RegExp(c.voiceLang,'i').test(v.lang) && c.voiceRe.test(v.name));
    if (!v) v = vv.find(v=>new RegExp(c.voiceLang,'i').test(v.lang));
    if (!v) v = vv.find(v=>/^en/i.test(v.lang));
    return v || vv[0] || null;
  }

  function speak(text, cb) {
    if (!hasTTS) { if (cb) cb(); return; }
    speechSynthesis.cancel();
    let clean = text.replace(/[*_#`~]/g,'').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/\n+/g,'. ').trim();
    if (clean.length > 350) clean = clean.slice(0,347)+'...';
    const u = new SpeechSynthesisUtterance(clean);
    if (ttsVoice) u.voice = ttsVoice;
    u.rate = char.rate; u.pitch = char.pitch; u.volume = 1; u.lang = char.voiceLang;
    let d=false; const f=()=>{if(!d){d=true;if(cb)cb();}};
    u.onend=f; u.onerror=f; setTimeout(f, Math.max(10000,clean.length*70));
    speechSynthesis.speak(u);
  }

  function loadVoices() { if (hasTTS) { ttsVoice = pickVoice(char); } }
  if (hasTTS) { loadVoices(); speechSynthesis.onvoiceschanged=loadVoices; setTimeout(loadVoices,200); setTimeout(loadVoices,800); }

  // STT
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recog = null;
  if (SR) { recog=new SR(); recog.lang='en-US'; recog.interimResults=false; recog.continuous=false; recog.maxAlternatives=1; }

  // API
  let history = [];
  try { history=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]'); } catch(_){}

  async function callAI(text) {
    for (let a=0;a<2;a++) {
      try {
        const ctx = [{ role:'user', content:'[Personality: '+char.prompt+']' },
                      ...history.slice(-4).map(m=>({role:m.role,content:m.content})),
                      { role:'user', content:text }];
        const r = await fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({messages:ctx}) });
        if (r.status===429 && a===0) { await new Promise(r=>setTimeout(r,1200)); continue; }
        const d = await r.json().catch(()=>({}));
        return d.reply || null;
      } catch(e) { if (a===0) await new Promise(r=>setTimeout(r,800)); }
    }
    return null;
  }

  // ─── UI ───
  const css = `
.dsel-vo-wrap{position:fixed;bottom:24px;right:90px;z-index:58;display:flex;flex-direction:column;align-items:flex-end;gap:10px}
.dsel-vo-fab{width:52px;height:52px;border-radius:50%;border:none;cursor:pointer;background:linear-gradient(135deg,#04415f,#0a6b96);color:#fff;font-size:1.3rem;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 24px rgba(4,65,95,.4);transition:transform .15s,box-shadow .3s;flex-shrink:0}
.dsel-vo-fab:hover{transform:scale(1.07)}
.dsel-vo-fab:active{transform:scale(.95)}
.dsel-vo-fab.listening{background:#16a34a;box-shadow:0 0 0 0 rgba(22,163,74,.6);animation:vPulse 1.6s ease infinite}
.dsel-vo-fab.thinking{background:#b8860b;animation:vSpin .9s linear infinite}
.dsel-vo-fab.speaking{background:#0a6b96;box-shadow:0 0 0 0 rgba(10,107,150,.6);animation:vPulse .7s ease infinite}
@keyframes vPulse{to{box-shadow:0 0 0 14px transparent}}
@keyframes vSpin{to{transform:rotate(360deg)}}

.dsel-vo-box{display:none;width:320px;max-width:calc(100vw - 20px);background:var(--card-bg,#fff);border:1px solid var(--line,#d8e2e7);border-radius:14px;box-shadow:0 12px 40px rgba(1,30,44,.25);overflow:hidden;flex-direction:column}
.dsel-vo-box.open{display:flex}
.dsel-vo-box .vb-head{padding:10px 14px;background:linear-gradient(135deg,#04415f,#0a6b96);color:#fff;display:flex;align-items:center;justify-content:space-between}
.dsel-vo-box .vb-head .vb-title{font-size:.82rem;font-weight:800;display:flex;align-items:center;gap:6px}
.dsel-vo-box .vb-head .vb-ping{width:7px;height:7px;border-radius:50%;background:#22c55e}
.dsel-vo-box .vb-head .vb-ping.off{background:#94a3b8}
.dsel-vo-box .vb-head button{background:rgba(255,255,255,.15);border:none;color:#fff;cursor:pointer;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-size:.85rem}
.dsel-vo-box .vb-head button:hover{background:rgba(255,255,255,.3)}

.dsel-vo-box .vb-chars{display:flex;gap:4px;padding:6px 10px;overflow-x:auto;border-bottom:1px solid var(--line,#d8e2e7);background:var(--bg,#f1f5f7);scrollbar-width:none}
.dsel-vo-box .vb-chars::-webkit-scrollbar{display:none}
.vb-ch{flex-shrink:0;display:flex;align-items:center;gap:3px;padding:3px 8px;border-radius:999px;border:1px solid var(--line,#d8e2e7);background:var(--card-bg,#fff);cursor:pointer;font-size:.7rem;font-weight:700;color:var(--ink,#011e2c);font-family:inherit;transition:.12s}
.vb-ch:hover{border-color:var(--brand,#04415f)}
.vb-ch.active{background:var(--brand,#04415f);color:#fff;border-color:var(--brand,#04415f)}
.vb-ch .vb-e{font-size:.88rem}

.dsel-vo-box .vb-msgs{flex:1;max-height:200px;overflow-y:auto;padding:10px 14px;font-size:.85rem;line-height:1.5;background:var(--card-bg,#fff);min-height:50px}
.dsel-vo-box .vb-msgs .vb-role{font-size:.68rem;font-weight:800;letter-spacing:.4px;text-transform:uppercase;margin-bottom:1px;opacity:.6}
.vb-msg-you{color:var(--brand,#04415f)}
.vb-msg-ai{color:var(--ink,#011e2c)}
.vb-msg-err{color:#dc2626;font-style:italic}

.dsel-vo-box .vb-bar{padding:8px 14px;border-top:1px solid var(--line,#d8e2e7);display:flex;gap:8px;align-items:center;background:var(--bg,#f1f5f7)}
.dsel-vo-box .vb-bar .vb-btn{padding:10px 16px;border-radius:10px;border:none;cursor:pointer;font-weight:700;font-size:.82rem;font-family:inherit;display:flex;align-items:center;gap:6px;transition:.12s}
.vb-talk{flex:1;background:linear-gradient(135deg,#04415f,#0a6b96);color:#fff;justify-content:center}
.vb-talk:hover{opacity:.9}
.vb-talk.active{background:#dc2626}
.vb-close{background:var(--bg-alt,#e6edf0);color:var(--ink,#011e2c)}
.vb-close:hover{background:#fee2e2;color:#dc2626}

@media(max-width:520px){
  .dsel-vo-wrap{right:10px;bottom:20px}
  .dsel-vo-box{width:calc(100vw - 20px)}
  .dsel-vo-fab{width:48px;height:48px;font-size:1.2rem}
}`;
  const st = document.createElement('style'); st.textContent=css; document.head.appendChild(st);

  // Build DOM
  const wrap = document.createElement('div'); wrap.className='dsel-vo-wrap';

  // Chars HTML
  const chHTML = CHARACTERS.map(c=>`<button class="vb-ch${c.id===char.id?' active':''}" data-char="${c.id}"><span class="vb-e">${c.emoji}</span>${c.name}</button>`).join('');

  const box = document.createElement('div'); box.className='dsel-vo-box';
  box.innerHTML = `<div class="vb-head">
    <span class="vb-title"><span class="vb-ping off"></span> Voice Chat</span>
    <button class="vb-x" title="Close">✕</button>
  </div>
  <div class="vb-chars">${chHTML}</div>
  <div class="vb-msgs"><span style="color:var(--muted)">Tap <b>Start Talk</b> and speak. I will reply in voice.</span></div>
  <div class="vb-bar">
    <button class="vb-btn vb-talk">🎤 Start Talk</button>
    <button class="vb-btn vb-close">✕</button>
  </div>`;

  const fab = document.createElement('button'); fab.className='dsel-vo-fab'; fab.innerHTML=char.emoji; fab.setAttribute('aria-label','Voice Assistant');
  wrap.appendChild(box); wrap.appendChild(fab); document.body.appendChild(wrap);

  // Refs
  const msgs = box.querySelector('.vb-msgs');
  const talkBtn = box.querySelector('.vb-talk');
  const closeBtn = box.querySelector('.vb-close');
  const xBtn = box.querySelector('.vb-x');
  const ping = box.querySelector('.vb-ping');
  const charsRow = box.querySelector('.vb-chars');
  const title = box.querySelector('.vb-title');

  let open = false, active = false, listening = false;

  function updateUI() {
    fab.className = 'dsel-vo-fab';
    if (active && listening) fab.classList.add('listening');
    else if (active && fab.dataset.thinking === '1') fab.classList.add('thinking');
    else if (active && fab.dataset.speaking === '1') fab.classList.add('speaking');

    fab.innerHTML = char.emoji;
    ping.className = active ? 'vb-ping' : 'vb-ping off';
    talkBtn.textContent = active ? (listening ? '⏹ Stop & Send' : '🎤 Talk') : '🎤 Start Talk';
    talkBtn.classList.toggle('active', active);

    charsRow.querySelectorAll('.vb-ch').forEach(el=>el.classList.toggle('active',el.dataset.char===char.id));
  }

  function addMsg(role, text) {
    const cls = role==='you'?'vb-msg-you':(role==='err'?'vb-msg-err':'vb-msg-ai');
    const label = role==='you'?'You':(role==='err'?'Error':'DSEL');
    const d = document.createElement('div'); d.className=cls;
    d.innerHTML = `<div class="vb-role">${label}</div>${escapeHtml(text)}`;
    msgs.appendChild(d); msgs.scrollTop=msgs.scrollHeight;
    // Keep last 6 messages
    while (msgs.children.length > 6) msgs.firstChild.remove();
    return d;
  }

  function escapeHtml(s) { return String(s).replace(/[&<>"']/g,c=>({'&':'&','<':'<','>':'>','"':'"',"'":'&#39;'}[c])); }

  function setThinking(v) { fab.dataset.thinking=v?'1':'0'; updateUI(); }
  function setSpeaking(v) { fab.dataset.speaking=v?'1':'0'; updateUI(); }

  // Character switch
  charsRow.addEventListener('click',e=>{const b=e.target.closest('.vb-ch');if(!b)return;const c=CHARACTERS.find(c=>c.id===b.dataset.char);if(c)setChar(c);});
  window.addEventListener('dsel-char-change',e=>{const c=CHARACTERS.find(c=>c.id===e.detail);if(c&&c.id!==char.id){char=c;ttsVoice=pickVoice(c);updateUI();}});

  // Open/close
  function openBox() {
    open=true; box.classList.add('open');
    if (!active) msgs.innerHTML='<span style="color:var(--muted)">Tap <b>Start Talk</b> and speak. I will reply in voice.</span>';
    updateUI();
  }
  function closeBox() { open=false; stopAll(); box.classList.remove('open'); updateUI(); }
  fab.addEventListener('click', ()=>{if(open) closeBox(); else openBox();});
  closeBtn.addEventListener('click', closeBox);
  xBtn.addEventListener('click', closeBox);

  function stopAll() { stopListening(); stopSpeaking(); active=false; setThinking(false); setSpeaking(false); updateUI(); }

  function stopSpeaking() { if (hasTTS) speechSynthesis.cancel(); setSpeaking(false); updateUI(); }

  // STT
  function startListening() {
    if (!recog || listening || !active) return;
    listening=true; updateUI();
    try { recog.start(); } catch(_) { listening=false; updateUI(); }
  }
  function stopListening() {
    if (!recog || !listening) return;
    listening=false; try { recog.stop(); } catch(_){} updateUI();
  }

  if (recog) {
    recog.onstart = () => { listening=true; updateUI(); };
    recog.onresult = (e) => {
      let final='';
      for (let i=e.resultIndex;i<e.results.length;i++) { if (e.results[i].isFinal) final+=e.results[i][0].transcript; }
      if (final.trim()) { listening=false; handleTalk(final.trim()); }
    };
    recog.onerror = (e) => {
      listening=false; updateUI();
      if (e.error==='no-speech' && active) { setTimeout(()=>{if(active)startListening();}, 500); return; }
      if (e.error==='aborted') return;
      addMsg('err','Voice error: '+e.error);
    };
    recog.onend = () => { listening=false; updateUI(); };
  }

  // Main flow
  async function handleTalk(text) {
    text = text.trim(); if (!text) { if (active) startListening(); return; }

    addMsg('you', text);
    msgs.innerHTML += '<div style="color:var(--muted);font-size:.78rem;font-style:italic">Thinking...</div>';
    msgs.scrollTop = msgs.scrollHeight;
    setThinking(true);

    history.push({ role:'user', content:text });
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-10))); } catch(_){}

    let reply = await callAI(text);

    // Fallback to local KB
    if (!reply) { reply = searchKB(text) || "I can't respond right now. Please try again or WhatsApp +91 8770462942."; }

    history.push({ role:'assistant', content:reply });
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-10))); } catch(_){}

    // Remove "Thinking..." placeholder
    const last = msgs.lastChild;
    if (last && last.textContent === 'Thinking...') last.remove();

    setThinking(false);
    addMsg('ai', reply);
    setSpeaking(true);

    // Speak and then auto-listen
    speak(reply, () => {
      setSpeaking(false);
      if (active) { startListening(); }
    });
  }

  // Talk button
  talkBtn.addEventListener('click', () => {
    // Unlock audio on first interaction
    if (hasTTS && !ttsVoice) { speechSynthesis.cancel(); loadVoices(); }

    if (!active) {
      active = true; open = true; box.classList.add('open');
      msgs.innerHTML = '';
      addMsg('ai', 'Listening... speak now!');
      loadVoices();
      // Small delay to let TTS init
      setTimeout(() => { if (active) startListening(); }, 300);
    } else if (listening) {
      stopListening();
      addMsg('ai', 'Processing what you said...');
    } else {
      startListening();
    }
  });
})();