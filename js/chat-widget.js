// DSEL AI Chat Widget — floating bubble, multimodal (text + image + PDF)
// Supports 6 voice characters, local KB fallback, rate-limit resistant retries
(function(){
  if (window.__dselChatLoaded) return;
  window.__dselChatLoaded = true;

  const STORAGE_KEY = 'dsel-chat-history';
  const CHAR_KEY = 'dsel-voice-character';
  const PREFS_KEY = 'dsel-voice-prefs';
  const WELCOME = "Hi! I am the DSEL Assistant. I can help with course info, fees, batches, English practice, and grammar doubts. You can also send me a photo of your homework or a PDF and I will help. How can I help you today?";
  const MAX_FILE_MB = 8;

  // ═══════════════════════════════════════
  //  CHARACTER DEFINITIONS (same as voice-assistant.js)
  // ═══════════════════════════════════════
  const CHARACTERS = [
    { id:'professor', emoji:'🧑‍🏫', name:'Professor',
      desc:'Deep & authoritative', pitch:0.7, rate:0.85,
      voiceName: /male|david|daniel|james|mark|google us english/i,
      voiceLang: 'en-US',
      prompt:'Respond as a wise, patient English professor. Use formal language, explain thoroughly with examples, and speak with authority.' },
    { id:'priya', emoji:'👩‍🏫', name:'Ms. Priya',
      desc:'Warm & encouraging', pitch:1.1, rate:0.95,
      voiceName: /female|samantha|aria|zira|victoria|google us english female/i,
      voiceLang: 'en-US',
      prompt:'Respond as a warm, friendly teacher named Priya. Be supportive, use simple language, celebrate small wins, and make the student feel confident.' },
    { id:'dj', emoji:'🎤', name:'DJ English',
      desc:'Energetic & Gen-Z', pitch:1.3, rate:1.2,
      voiceName: /en/i,
      voiceLang: 'en-US',
      prompt:'Respond with fun Gen-Z energy. Use some modern slang, be upbeat and motivational like a cool podcast host. Keep it vivid!' },
    { id:'british', emoji:'🇬🇧', name:'British',
      desc:'Proper British accent', pitch:0.9, rate:0.9,
      voiceName: /gb|british|daniel/i,
      voiceLang: 'en-GB',
      prompt:'Respond in proper British English. Use British phrasing like "quite", "rather", "brilliant", "spot on". Be polite and refined.' },
    { id:'indian', emoji:'🇮🇳', name:'Indian',
      desc:'Familiar Indian accent', pitch:1.0, rate:0.95,
      voiceName: /en-in|indian|hindi/i,
      voiceLang: 'en-IN',
      prompt:'Respond mixing Hindi and English naturally (Hinglish). Relate examples to Indian culture, daily life, and Bollywood. Use phrases like "yaar", "acha", "na" naturally.' },
    { id:'robo', emoji:'🤖', name:'Robo',
      desc:'Fun & robotic', pitch:0.4, rate:0.8,
      voiceName: /en/i,
      voiceLang: 'en-US',
      prompt:'Respond in a precise, slightly robotic manner. Be very concise and factual. Use numbered points. Refer to yourself as "this unit" occasionally.' }
  ];

  // ═══════════════════════════════════════
  //  LOCAL KNOWLEDGE BASE (offline fallback)
  // ═══════════════════════════════════════
  const LOCAL_KB = [
    { kw:['course fee','fee','fees','price','cost','how much','kitna','charges','payment'],
      a:'The course fee is ₹4,500 for the full program. No hidden charges! Everything is included — spoken English, grammar, vocabulary, GD, debate, public speaking, and interview preparation.' },
    { kw:['batch timing','batch time','timings','schedule','class time','class timing','kaun se time'],
      a:'We have morning and evening batches. Please WhatsApp us at +91 8770462942 for the current batch schedule and timings.' },
    { kw:['location','address','where','kahan','direction','reach','map','stadium road'],
      a:'We are on Stadium Road, next to New Arya Public School, Sidhi, Madhya Pradesh - 486661. You can find us on Google Maps by searching "DSEL Sidhi".' },
    { kw:['phone','call','contact number','number','mobile'],
      a:'You can call us at +91 8770462942 or +91 9685586327. For WhatsApp, use +91 8770462942.' },
    { kw:['whatsapp','whatsapp number','message'],
      a:'Our WhatsApp number is +91 8770462942. You can message us anytime! https://wa.me/918770462942' },
    { kw:['duration','how long','months','kitne mahine','course duration','time period'],
      a:'The course duration is 4 to 6 months, plus 1 year of free practice support after you complete the course.' },
    { kw:['demo','free class','trial','demo class','first class'],
      a:'We offer a free demo class! You can walk in any working day to attend one. No booking needed — just come and experience our teaching.' },
    { kw:['what do you teach','subjects','topics','course content','syllabus','kya padhate'],
      a:'We teach spoken English, practical grammar (tenses, prepositions, articles), vocabulary building, group discussion, debate, public speaking, interview preparation, reading, and writing.' },
    { kw:['interview','interview prep','job','placement','mock interview'],
      a:'Interview preparation is included in our foundation course! We cover mock HR rounds, body language, answer structuring, and confidence building.' },
    { kw:['gd','group discussion','debate','public speaking','stage fear'],
      a:'Yes! Group discussion, debate, and public speaking are all part of our course. We ensure every student gets weekly stage time to build confidence.' },
    { kw:['grammar','tenses','preposition','article','basic grammar'],
      a:'We teach practical grammar — tenses, prepositions, articles, and common mistakes. Our approach focuses on using grammar in real conversations, not just theory.' },
    { kw:['vocabulary','words','new words','daily words'],
      a:'We teach daily vocabulary that you can use in real life! Each class includes practical new words with examples.' },
    { kw:['practice','practice support','after course','post course'],
      a:'After completing the course, you get 1 year of free practice support. You can continue attending practice sessions to maintain your speaking skills.' },
    { kw:['students trained','how many students','results','success'],
      a:'We have trained over 4,500 students since 2011. Most of our students come through word-of-mouth recommendations!' },
    { kw:['year','since when','founded','started','established','kitne saal'],
      a:'DSEL was first started in Satna, and we shifted to Sidhi in 2011. We have been serving students for over 13 years.' },
    { kw:['youtube','video','channel'],
      a:'Our YouTube channel is @DSELSIDHIFORENGLISH. You can find English learning tips and class videos there!' },
    { kw:['scholarship','discount','concession','fee reduction'],
      a:'For scholarship or fee concession details, please WhatsApp us at +91 8770462942. We try to support deserving students.' },
    { kw:['adult','age limit','working professional','office goer'],
      a:'Absolutely! Our course is designed for students, working professionals, and anyone who wants to improve their English speaking. Age is no bar.' },
    { kw:['hindi medium','hindi se','weak english','beginner','nahi aata'],
      a:'No problem at all! Our course starts from the very basics. Many of our students come from Hindi-medium backgrounds and speak confidently by the end.' },
    { kw:['online','online class','zoom','remote','distance'],
      a:'Currently we focus on classroom teaching at our Sidhi center for the best interactive experience. For any online queries, please WhatsApp us at +91 8770462942.' },
    { kw:['certificate','completion certificate'],
      a:'Yes, you receive a course completion certificate from DSEL after successfully finishing the program.' },
    { kw:['book','study material','pdf','notes','reading material'],
      a:'We provide books and study materials as part of the course. You can also find study resources on our website under the Books section.' },
    { kw:['weekend','saturday','sunday','holiday','off day'],
      a:'For specific schedule details including weekend classes, please WhatsApp us at +91 8770462942 for the latest batch information.' },
    { kw:['difference between since and for','since for'],
      a:'"Since" is used for a specific point in time (since Monday, since 2020). "For" is used for a duration (for 2 hours, for 5 years). Example: I have lived here since 2010. I have lived here for 14 years.' },
    { kw:['present perfect','present perfect tense'],
      a:'Present Perfect tense uses has/have + past participle. It connects past to present. Example: "I have finished my homework" means the homework is done and the result matters now.' },
    { kw:['tenses','how many tenses','types of tenses'],
      a:'There are 12 tenses in English — 4 each for Present, Past, and Future. The key ones for speaking are Simple Present, Present Continuous, Simple Past, and Present Perfect. We teach all 12 with real-life examples.' },
    { kw:['fluency','how to speak fluent','speak confidently','improve speaking'],
      a:'The key to fluency is daily practice! At DSEL, we focus on daily speaking exercises, real-life conversations, and building confidence through stage activities. Speak every day, even if imperfectly — confidence comes from habit.' },
    { kw:['hello','hi','hey','namaste','good morning','good evening'],
      a:'Hello! Welcome to DSEL. I am your AI assistant. How can I help you today? You can ask about our courses, fees, or practice English with me!' },
    { kw:['thank','thanks','thank you','dhanyavaad','shukriya'],
      a:'You are welcome! Happy to help. If you need anything else, just ask. Or WhatsApp us at +91 8770462942.' },
    { kw:['bye','goodbye','good night','see you','tata'],
      a:'Goodbye! Keep practicing your English every day. Remember, DSEL is always here to help. Visit us at Stadium Road, Sidhi!' }
  ];

  function searchLocalKB(text) {
    const lower = (text || '').toLowerCase().replace(/[?!.,;:'"]/g, '');
    let bestMatch = null, bestScore = 0;
    for (const entry of LOCAL_KB) {
      let score = 0;
      for (const kw of entry.kw) {
        if (lower.includes(kw.toLowerCase())) score += kw.split(' ').length;
      }
      if (score > bestScore) { bestScore = score; bestMatch = entry; }
    }
    return bestScore > 0 ? bestMatch.a : null;
  }

  // ═══════════════════════════════════════
  //  ACTIVE CHARACTER (shared with voice-assistant via localStorage)
  // ═══════════════════════════════════════
  let activeChar = CHARACTERS[0];
  try {
    const saved = localStorage.getItem(CHAR_KEY);
    if (saved) { const found = CHARACTERS.find(c => c.id === saved); if (found) activeChar = found; }
  } catch(_){}

  function setActiveChar(char) {
    activeChar = char;
    try { localStorage.setItem(CHAR_KEY, char.id); } catch(_){}
    if ('speechSynthesis' in window) ttsVoice = pickVoiceForCharacter(char);
    updateCharUI();
    // Dispatch event so voice-assistant can sync
    try { window.dispatchEvent(new CustomEvent('dsel-char-change', { detail: char.id })); } catch(_){}
  }

  // ═══════════════════════════════════════
  //  CSS
  // ═══════════════════════════════════════
  const css = `
.dsel-fab{position:fixed;bottom:22px;right:90px;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,var(--brand,#04415f),#0a6b96);color:#fff;display:grid;place-items:center;font-size:1.6rem;box-shadow:0 10px 30px rgba(4,65,95,.45);z-index:60;border:none;cursor:pointer;transition:transform .2s ease}
.dsel-fab:hover{transform:scale(1.07)}
.dsel-fab .badge{position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;border-radius:999px;padding:2px 7px;font-size:.65rem;font-weight:800;border:2px solid var(--bg,#fff)}
.dsel-chat{position:fixed;bottom:90px;right:22px;width:520px;max-width:calc(100vw - 30px);height:680px;max-height:calc(100vh - 110px);background:var(--card-bg,#fff);border:1px solid var(--line,#d8e2e7);border-radius:18px;box-shadow:0 20px 60px rgba(1,30,44,.35);z-index:70;display:none;flex-direction:column;overflow:hidden;animation:dselPop .25s ease;resize:both;min-width:340px;min-height:420px}
.dsel-resize-handle{position:absolute;top:0;left:0;width:14px;height:14px;cursor:nwse-resize;z-index:71;background:linear-gradient(135deg,transparent 50%,var(--brand,#04415f) 50%);opacity:.3;border-top-left-radius:18px}
.dsel-resize-handle:hover{opacity:.7}
.dsel-chat.open{display:flex}
@keyframes dselPop{from{transform:scale(.85);opacity:0}to{transform:scale(1);opacity:1}}
.dsel-head{padding:14px 18px;background:linear-gradient(135deg,var(--brand,#04415f),#0a6b96);color:#fff;display:flex;align-items:center;gap:12px}
.dsel-head .av{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.18);display:grid;place-items:center;font-size:1.4rem;flex-shrink:0;position:relative}
.dsel-head .ti{flex:1;line-height:1.2}
.dsel-head .ti strong{font-size:.98rem;font-weight:800}
.dsel-head .ti small{font-size:.74rem;opacity:.85;display:block}
.dsel-head .ti small::before{content:"●";color:#22c55e;margin-right:5px;font-size:.6rem}
.dsel-head button{background:transparent;border:none;color:#fff;cursor:pointer;font-size:1.15rem;padding:6px;border-radius:8px;transition:background .2s}
.dsel-head button:hover{background:rgba(255,255,255,.15)}
.dsel-msgs{flex:1;overflow-y:auto;padding:18px;background:var(--bg,#f1f5f7);display:flex;flex-direction:column;gap:12px}
.dsel-msg{display:flex;gap:8px;max-width:88%;align-items:flex-end}
.dsel-msg.bot{align-self:flex-start}
.dsel-msg.user{align-self:flex-end;flex-direction:row-reverse}
.dsel-msg .bubble{padding:10px 14px;border-radius:14px;font-size:.93rem;line-height:1.5;color:var(--ink,#011e2c);white-space:pre-wrap;word-wrap:break-word}
.dsel-msg.bot .bubble{background:var(--card-bg,#fff);border:1px solid var(--line,#d8e2e7);border-bottom-left-radius:4px}
.dsel-msg.user .bubble{background:var(--brand,#04415f);color:#fff;border-bottom-right-radius:4px}
.dsel-msg .pic{width:30px;height:30px;border-radius:50%;background:var(--brand,#04415f);color:#fff;display:grid;place-items:center;font-size:.8rem;font-weight:800;flex-shrink:0;position:relative}
.dsel-msg.user .pic{background:var(--accent,#ffb547);color:#3a2400}
.dsel-msg .att{display:block;margin-bottom:6px;border-radius:10px;overflow:hidden;border:1px solid var(--line,#d8e2e7);background:#fff;max-width:240px}
.dsel-msg .att img{width:100%;display:block;max-height:200px;object-fit:cover}
.dsel-msg .att .pdfchip{padding:10px 12px;display:flex;align-items:center;gap:10px;font-size:.85rem;color:var(--ink,#011e2c);background:#fff}
.dsel-msg .att .pdfchip i{color:#dc2626;font-size:1.4rem}
.dsel-msg .offline-note{display:block;margin-top:6px;font-size:.75rem;color:var(--accent,#b58a00);font-style:italic}
.dsel-typing{display:inline-flex;gap:4px;padding:14px 16px}
.dsel-typing span{width:7px;height:7px;border-radius:50%;background:var(--muted,#56707d);animation:dotBounce 1.2s infinite}
.dsel-typing span:nth-child(2){animation-delay:.15s}
.dsel-typing span:nth-child(3){animation-delay:.3s}
@keyframes dotBounce{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-6px);opacity:1}}
.dsel-suggest{padding:10px 14px;border-top:1px solid var(--line,#d8e2e7);display:flex;gap:6px;flex-wrap:wrap;background:var(--card-bg,#fff)}
.dsel-suggest button{background:var(--bg-alt,#e6edf0);border:1px solid var(--line,#d8e2e7);padding:6px 12px;border-radius:999px;cursor:pointer;font-size:.78rem;color:var(--ink-soft,#1a3a4d);transition:.15s;font-family:inherit}
.dsel-suggest button:hover{background:var(--brand,#04415f);color:#fff;border-color:var(--brand,#04415f)}
.dsel-pendings{padding:8px 14px 0;display:flex;gap:8px;flex-wrap:wrap;background:var(--card-bg,#fff)}
.dsel-pendings .chip{background:var(--bg-alt,#e6edf0);border:1px solid var(--line,#d8e2e7);border-radius:10px;padding:6px 10px;font-size:.8rem;display:flex;align-items:center;gap:8px;color:var(--ink,#011e2c)}
.dsel-pendings .chip img{width:30px;height:30px;border-radius:6px;object-fit:cover}
.dsel-pendings .chip i{color:#dc2626;font-size:1.1rem}
.dsel-pendings .chip button{background:transparent;border:none;cursor:pointer;color:var(--muted,#56707d);font-size:.95rem;padding:0;line-height:1}
.dsel-input{padding:10px 12px;border-top:1px solid var(--line,#d8e2e7);display:flex;gap:6px;align-items:center;background:var(--card-bg,#fff);overflow:visible;position:relative}
.dsel-input button.attach{position:relative;background:var(--bg-alt,#e6edf0);color:var(--ink,#011e2c);border:none;width:38px;height:38px;border-radius:50%;cursor:pointer;display:grid;place-items:center;font-size:1.05rem;flex-shrink:0;transition:.15s}
.dsel-input button.attach:hover{background:var(--brand,#04415f);color:#fff}
.dsel-input button.mic{background:var(--bg-alt,#e6edf0);color:var(--ink,#011e2c);border:none;width:38px;height:38px;border-radius:50%;cursor:pointer;display:grid;place-items:center;font-size:1.05rem;flex-shrink:0;transition:.15s;position:relative}
.dsel-input button.mic:hover{background:var(--brand,#04415f);color:#fff}
.dsel-input button.mic.listening{background:#dc2626;color:#fff;animation:micPulse 1.2s ease infinite}
.dsel-input button.mic.handsfree{background:#16a34a;color:#fff;box-shadow:0 0 0 0 rgba(22,163,74,.5)}
.dsel-input button.mic.handsfree.listening{background:#dc2626;animation:micPulse 1.2s ease infinite}
/* Speaking animation on bot avatar */
.dsel-msg.bot.speaking .pic{animation:speakPulse .8s ease infinite;box-shadow:0 0 0 0 rgba(4,65,95,.5)}
.dsel-msg.bot.speaking .pic::after{content:"🔊";position:absolute;top:-6px;right:-6px;font-size:.55rem;animation:speakIcon .8s ease infinite}
@keyframes speakPulse{0%,100%{box-shadow:0 0 0 0 rgba(4,65,95,.4)}50%{box-shadow:0 0 0 8px rgba(4,65,95,0)}}
@keyframes speakIcon{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
/* Per-message speak/replay button */
.dsel-msg.bot .bubble-actions{display:flex;align-items:center;gap:4px;margin-top:6px;opacity:0;transition:opacity .2s}
.dsel-msg.bot:hover .bubble-actions{opacity:1}
.dsel-msg.bot.speaking .bubble-actions{opacity:1}
.dsel-msg.bot .bubble-actions .speak-btn{background:none;border:none;cursor:pointer;color:var(--muted,#56707d);font-size:.82rem;padding:2px 6px;border-radius:6px;transition:.15s;display:flex;align-items:center;gap:4px;font-family:inherit}
.dsel-msg.bot .bubble-actions .speak-btn:hover{color:var(--brand,#04415f);background:var(--bg-alt,#e6edf0)}
.dsel-msg.bot .bubble-actions .speak-btn.speaking{color:#dc2626;animation:speakBtnPulse 1s ease infinite}
@keyframes speakBtnPulse{0%,100%{opacity:1}50%{opacity:.5}}
/* Sound wave indicator in header when speaking */
.dsel-head.speaking .av{animation:speakPulse .8s ease infinite}
.dsel-head.speaking .av::after{content:"";position:absolute;inset:0;border-radius:50%;border:2px solid rgba(255,255,255,.6);animation:waveExpand 1.2s ease-out infinite}
@keyframes waveExpand{0%{transform:scale(1);opacity:1}100%{transform:scale(1.6);opacity:0}}
/* Stop speaking button in header */
.dsel-head .stop-speak{display:none;background:rgba(220,38,38,.9);color:#fff;border:none;cursor:pointer;font-size:.78rem;padding:4px 10px;border-radius:999px;font-weight:700;font-family:inherit;transition:.15s;align-items:center;gap:4px;white-space:nowrap}
.dsel-head .stop-speak:hover{background:#dc2626}
.dsel-head.speaking .stop-speak{display:inline-flex}
.dsel-tooltip{position:absolute;bottom:54px;left:8px;background:#0b1220;color:#fff;padding:8px 14px;border-radius:8px;font-size:.78rem;font-weight:600;white-space:nowrap;opacity:0;pointer-events:none;transition:opacity .18s ease;box-shadow:0 6px 20px rgba(0,0,0,.4);z-index:1000}
.dsel-tooltip::after{content:"";position:absolute;top:100%;left:14px;border:6px solid transparent;border-top-color:#0b1220}
.dsel-input button.attach:hover ~ .dsel-tooltip{opacity:1}

/* ── CHARACTER SELECTOR IN CHAT ── */
.dsel-chars-row{display:flex;gap:6px;padding:6px 14px;border-top:1px solid var(--line,#d8e2e7);background:var(--card-bg,#fff);overflow-x:auto;scrollbar-width:none;-ms-overflow-style:none}
.dsel-chars-row::-webkit-scrollbar{display:none}
.dsel-char-pill{display:flex;align-items:center;gap:4px;padding:4px 10px;border-radius:999px;border:1px solid var(--line,#d8e2e7);background:var(--bg-alt,#e6edf0);cursor:pointer;font-size:.75rem;font-weight:600;color:var(--ink-soft,#1a3a4d);transition:.15s;white-space:nowrap;flex-shrink:0;user-select:none;font-family:inherit}
.dsel-char-pill:hover{border-color:var(--brand,#04415f);color:var(--brand,#04415f)}
.dsel-char-pill.active{background:var(--brand,#04415f);color:#fff;border-color:var(--brand,#04415f)}
.dsel-char-pill .char-emoji{font-size:1rem;line-height:1}

.dsel-voicebar{padding:8px 14px;border-top:1px solid var(--line,#d8e2e7);background:var(--bg-alt,#e6edf0);display:flex;gap:10px;align-items:center;font-size:.78rem;color:var(--ink-soft,#1a3a4d);font-weight:600;flex-wrap:wrap}
.dsel-voicebar label{display:flex;align-items:center;gap:6px;cursor:pointer;user-select:none}
.dsel-voicebar input[type="checkbox"]{width:auto}
.dsel-voicebar .stat-dot{width:8px;height:8px;border-radius:50%;background:#94a3b8;display:inline-block}
.dsel-voicebar .stat-dot.on{background:#16a34a;animation:micPulse 1.2s ease infinite}
.dsel-voicebar select{border:1px solid var(--line,#d8e2e7);border-radius:6px;padding:2px 4px;font-size:.75rem;background:var(--card-bg,#fff);color:var(--ink,#011e2c);cursor:pointer;font-family:inherit}
.dsel-voicebar select:focus{border-color:var(--brand,#04415f);outline:none}
@keyframes micPulse{0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,.55)}50%{box-shadow:0 0 0 10px rgba(220,38,38,0)}}
.dsel-input input{flex:1;padding:9px 14px;border:1px solid var(--line,#d8e2e7);border-radius:999px;font-size:.92rem;background:var(--bg,#f1f5f7);color:var(--ink,#011e2c);outline:none;font-family:inherit;min-width:0}
.dsel-input input:focus{border-color:var(--brand,#04415f)}
.dsel-input button.send{background:var(--brand,#04415f);color:#fff;border:none;width:42px;height:42px;border-radius:50%;cursor:pointer;display:grid;place-items:center;font-size:1rem;transition:transform .15s;flex-shrink:0}
.dsel-input button.send:hover:not(:disabled){transform:scale(1.06)}
.dsel-input button.send:disabled{opacity:.5;cursor:not-allowed}
.dsel-foot{padding:8px;text-align:center;font-size:.7rem;color:var(--muted,#56707d);background:var(--card-bg,#fff);border-top:1px solid var(--line,#d8e2e7)}
@media (max-width:520px){
  .dsel-chat{right:10px;left:10px;width:auto;bottom:80px;height:calc(100vh - 100px)}
  .dsel-fab{right:80px;bottom:18px;width:52px;height:52px}
  .dsel-chars-row{padding:4px 10px;gap:4px}
  .dsel-char-pill{padding:3px 8px;font-size:.7rem}
}
  `;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  const fab = document.createElement('button');
  fab.className = 'dsel-fab'; fab.title = 'Chat with DSEL Assistant';
  fab.innerHTML = '<i class="bi bi-chat-dots-fill"></i><span class="badge">AI</span>';
  document.body.appendChild(fab);

  // Build character pills HTML
  const charPillsHTML = CHARACTERS.map(c =>
    `<button class="dsel-char-pill${c.id === activeChar.id ? ' active' : ''}" data-char="${c.id}"><span class="char-emoji">${c.emoji}</span> ${c.name}</button>`
  ).join('');

  const chat = document.createElement('div');
  chat.className = 'dsel-chat';
  chat.innerHTML = `
    <div class="dsel-resize-handle" title="Drag to resize"></div>
    <div class="dsel-head">
      <div class="av"><span class="av-emoji">${activeChar.emoji}</span></div>
      <div class="ti"><strong>DSEL Assistant</strong><small>Online · AI helper</small></div>
      <button class="clear" title="Clear chat"><i class="bi bi-arrow-counterclockwise"></i></button>
      <button class="stop-speak" title="Stop speaking"><i class="bi bi-stop-fill"></i> Stop</button>
      <button class="close" title="Close"><i class="bi bi-x-lg"></i></button>
    </div>
    <div class="dsel-msgs"></div>
    <div class="dsel-suggest"></div>
    <div class="dsel-pendings"></div>
    <div class="dsel-input">
      <button class="attach" aria-label="Upload file or picture"><i class="bi bi-paperclip"></i></button>
      <span class="dsel-tooltip">Upload file or pictures</span>
      <button class="mic" aria-label="Speak"><i class="bi bi-mic-fill"></i></button>
      <input type="text" placeholder="Type or speak…" maxlength="500" autocomplete="off">
      <button class="send" disabled><i class="bi bi-send-fill"></i></button>
    </div>
    <div class="dsel-chars-row">${charPillsHTML}</div>
    <div class="dsel-voicebar">
      <span><span class="stat-dot" id="dselStatDot"></span> <span id="dselVoiceStatus">Voice ready</span></span>
      <label><input type="checkbox" id="dselSpeak" checked> 🔊 Speak replies</label>
      <label><input type="checkbox" id="dselHandsfree"> 🎤 Hands-free</label>
      <label>⚡ Speed <select id="dselSpeed"><option value="0.7">Slow</option><option value="0.9">Normal</option><option value="1" selected>Fast</option><option value="1.3">Faster</option></select></label>
    </div>
    <div class="dsel-foot">Powered by AI · Always confirm details on WhatsApp</div>
  `;
  document.body.appendChild(chat);

  const fileInput = document.createElement('input');
  fileInput.type = 'file'; fileInput.accept = 'image/*,application/pdf'; fileInput.multiple = true; fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  const msgsEl = chat.querySelector('.dsel-msgs');
  const inputEl = chat.querySelector('input[type="text"]');
  const sendBtn = chat.querySelector('.send');
  const closeBtn = chat.querySelector('.close');
  const clearBtn = chat.querySelector('.clear');
  const suggestEl = chat.querySelector('.dsel-suggest');
  const attachBtn = chat.querySelector('.attach');
  const pendingsEl = chat.querySelector('.dsel-pendings');
  const micBtn = chat.querySelector('.mic');
  const speakChk = chat.querySelector('#dselSpeak');
  const handsfreeChk = chat.querySelector('#dselHandsfree');
  const voiceStatus = chat.querySelector('#dselVoiceStatus');
  const statDot = chat.querySelector('#dselStatDot');
  const voiceSpeed = chat.querySelector('#dselSpeed');
  const stopSpeakBtn = chat.querySelector('.stop-speak');
  const chatHead = chat.querySelector('.dsel-head');
  const charsRow = chat.querySelector('.dsel-chars-row');
  const avEmoji = chat.querySelector('.av-emoji');

  // ═══════════════════════════════════════
  //  CHARACTER SELECTOR
  // ═══════════════════════════════════════
  function updateCharUI() {
    avEmoji.textContent = activeChar.emoji;
    charsRow.querySelectorAll('.dsel-char-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.char === activeChar.id);
    });
  }

  charsRow.addEventListener('click', (e) => {
    const pill = e.target.closest('.dsel-char-pill');
    if (!pill) return;
    const char = CHARACTERS.find(c => c.id === pill.dataset.char);
    if (char) setActiveChar(char);
  });

  // Listen for character changes from voice-assistant
  window.addEventListener('dsel-char-change', (e) => {
    const char = CHARACTERS.find(c => c.id === e.detail);
    if (char && char.id !== activeChar.id) {
      activeChar = char;
      try { localStorage.setItem(CHAR_KEY, char.id); } catch(_){}
      if ('speechSynthesis' in window) ttsVoice = pickVoiceForCharacter(char);
      updateCharUI();
    }
  });

  // Persist voice prefs
  try {
    const vp = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    if (vp.speak === false) speakChk.checked = false;
    if (vp.hf === true) handsfreeChk.checked = true;
    if (vp.speed) voiceSpeed.value = vp.speed;
  } catch(_){}
  function saveVoicePrefs(){
    try { localStorage.setItem(PREFS_KEY, JSON.stringify({speak: speakChk.checked, hf: handsfreeChk.checked, speed: voiceSpeed.value})); } catch(_){}
  }
  voiceSpeed.addEventListener('change', saveVoicePrefs);

  // === Speech-to-Text (STT) ===
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let listening = false;
  let userStoppedRecognition = false;

  if (!SR) {
    micBtn.disabled = true;
    micBtn.style.opacity = '0.5';
    micBtn.title = 'Voice input not supported in this browser. Try Chrome or Safari.';
    voiceStatus.textContent = 'Voice unsupported';
  } else {
    recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    let interimTranscript = '';
    let finalTranscript = '';

    recognition.onstart = () => {
      listening = true;
      micBtn.classList.add('listening');
      statDot.classList.add('on');
      voiceStatus.textContent = 'Listening…';
      finalTranscript = '';
    };
    recognition.onresult = (e) => {
      interimTranscript = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalTranscript += t;
        else interimTranscript += t;
      }
      inputEl.value = (finalTranscript + interimTranscript).trim();
      sendBtn.disabled = !inputEl.value.trim() && !pendingAttachments.length;
    };
    recognition.onerror = (e) => {
      voiceStatus.textContent = 'Error: ' + (e.error || 'unknown');
      stopListening();
    };
    recognition.onend = () => {
      listening = false;
      micBtn.classList.remove('listening');
      statDot.classList.remove('on');
      const txt = inputEl.value.trim();
      if (txt && !userStoppedRecognition) {
        voiceStatus.textContent = 'Sending…';
        setTimeout(() => sendMessage(txt), 200);
      } else if (handsfreeChk.checked && !userStoppedRecognition) {
        setTimeout(() => { try { recognition.start(); } catch(_){} }, 400);
      } else {
        voiceStatus.textContent = 'Voice ready';
      }
      userStoppedRecognition = false;
    };
  }

  function startListening(){
    if (!recognition) return;
    if (listening) return;
    inputEl.value = '';
    try { recognition.start(); } catch(_){}
  }
  function stopListening(){
    if (!recognition) return;
    if (!listening) return;
    userStoppedRecognition = true;
    try { recognition.stop(); } catch(_){}
  }

  micBtn.addEventListener('click', () => {
    if (listening) stopListening();
    else startListening();
  });

  handsfreeChk.addEventListener('change', () => {
    saveVoicePrefs();
    micBtn.classList.toggle('handsfree', handsfreeChk.checked);
    if (handsfreeChk.checked) {
      speakChk.checked = true; saveVoicePrefs();
      startListening();
    } else {
      stopListening();
    }
  });
  if (handsfreeChk.checked) micBtn.classList.add('handsfree');

  // === Text-to-Speech (TTS) — Character-aware ===
  let ttsVoice = null;
  let currentlySpeakingMsg = null;
  let isSpeaking = false;

  function pickVoiceForCharacter(char) {
    if (!('speechSynthesis' in window)) return null;
    const voices = speechSynthesis.getVoices();
    if (!voices.length) return null;

    let v = voices.find(v => new RegExp(char.voiceLang, 'i').test(v.lang) && char.voiceName.test(v.name));
    if (!v) v = voices.find(v => new RegExp(char.voiceLang, 'i').test(v.lang) && /natural|premium|enhanced|neural/i.test(v.name));
    if (!v) v = voices.find(v => new RegExp(char.voiceLang, 'i').test(v.lang));
    if (!v) v = voices.find(v => /^en/i.test(v.lang));
    return v || voices[0] || null;
  }

  if ('speechSynthesis' in window) {
    ttsVoice = pickVoiceForCharacter(activeChar);
    speechSynthesis.onvoiceschanged = () => { ttsVoice = pickVoiceForCharacter(activeChar); };
    setTimeout(() => { ttsVoice = pickVoiceForCharacter(activeChar); }, 500);
    setTimeout(() => { ttsVoice = pickVoiceForCharacter(activeChar); }, 1500);
  }

  function setSpeakingState(msgEl, speaking) {
    if (speaking) {
      isSpeaking = true;
      if (msgEl) {
        msgEl.classList.add('speaking');
        currentlySpeakingMsg = msgEl;
      }
      chatHead.classList.add('speaking');
      voiceStatus.textContent = '🔊 Speaking…';
    } else {
      isSpeaking = false;
      if (currentlySpeakingMsg) {
        currentlySpeakingMsg.classList.remove('speaking');
        currentlySpeakingMsg = null;
      }
      chatHead.classList.remove('speaking');
      voiceStatus.textContent = handsfreeChk.checked ? 'Listening…' : 'Voice ready';
    }
    document.querySelectorAll('.dsel-msg.bot .speak-btn.speaking').forEach(b => {
      if (!speaking) { b.classList.remove('speaking'); b.innerHTML = '<i class="bi bi-volume-up"></i>'; }
    });
  }

  function speak(text, msgEl){
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    setSpeakingState(null, false);
    if (!speakChk.checked) return;

    let cleanText = text.replace(/[*_#`~]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\n{2,}/g, '. ').replace(/\n/g, ', ').trim();
    if (cleanText.length > 600) cleanText = cleanText.slice(0, 597) + '...';

    const u = new SpeechSynthesisUtterance(cleanText);
    if (ttsVoice) u.voice = ttsVoice;
    // Character-specific rate & pitch, modulated by user speed setting
    const userSpeed = parseFloat(voiceSpeed.value) || 1;
    u.rate = activeChar.rate * userSpeed;
    u.pitch = activeChar.pitch;
    u.volume = 1; u.lang = activeChar.voiceLang;

    u.onstart = () => { setSpeakingState(msgEl, true); };
    u.onend = () => {
      setSpeakingState(msgEl, false);
      if (handsfreeChk.checked && !listening) {
        setTimeout(() => { try { recognition && recognition.start(); } catch(_){} }, 300);
      }
    };
    u.onerror = () => { setSpeakingState(msgEl, false); };
    speechSynthesis.speak(u);
  }

  function stopSpeaking(){
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    setSpeakingState(null, false);
  }

  stopSpeakBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    stopSpeaking();
  });

  speakChk.addEventListener('change', () => {
    saveVoicePrefs();
    if (!speakChk.checked) stopSpeaking();
  });

  // Per-message speak button handler
  chat.addEventListener('click', (e) => {
    const btn = e.target.closest('.speak-btn');
    if (!btn) return;
    const msgEl = btn.closest('.dsel-msg.bot');
    if (!msgEl) return;
    const bubble = msgEl.querySelector('.bubble');
    if (!bubble) return;

    if (isSpeaking && currentlySpeakingMsg === msgEl) {
      stopSpeaking();
      btn.classList.remove('speaking');
      btn.innerHTML = '<i class="bi bi-volume-up"></i>';
    } else {
      const text = bubble.textContent.trim();
      document.querySelectorAll('.dsel-msg.bot .speak-btn.speaking').forEach(b => {
        b.classList.remove('speaking');
        b.innerHTML = '<i class="bi bi-volume-up"></i>';
      });
      btn.classList.add('speaking');
      btn.innerHTML = '<i class="bi bi-stop-fill"></i>';
      speak(text, msgEl);
      const checkEnd = setInterval(() => {
        if (!speechSynthesis.speaking) {
          clearInterval(checkEnd);
          btn.classList.remove('speaking');
          btn.innerHTML = '<i class="bi bi-volume-up"></i>';
        }
      }, 200);
    }
  });

  // Watch for new bot messages and speak them automatically
  const speakObserver = new MutationObserver((muts) => {
    muts.forEach(m => {
      m.addedNodes && m.addedNodes.forEach(n => {
        if (n.nodeType !== 1 || !n.classList) return;
        if (!n.classList.contains('dsel-msg') || !n.classList.contains('bot')) return;
        const bubble = n.querySelector('.bubble');
        if (!bubble) return;
        if (bubble.querySelector('.dsel-typing')) return;
        const text = bubble.textContent.trim();
        if (!text) return;
        const actions = document.createElement('div');
        actions.className = 'bubble-actions';
        actions.innerHTML = '<button class="speak-btn" title="Listen to this reply"><i class="bi bi-volume-up"></i></button>';
        bubble.appendChild(actions);
        speak(text, n);
      });
    });
  });
  speakObserver.observe(msgsEl, { childList: true });

  const SUGGESTIONS = [
    "What is the course fee?",
    "What are the batch timings?",
    "Help me practice English",
    "Difference between since and for?",
    "Explain present perfect tense"
  ];

  let pendingAttachments = [];

  function loadHistory(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(_){ return []; } }
  function saveHistory(h){ try { localStorage.setItem(STORAGE_KEY, JSON.stringify(h.slice(-30))); } catch(_){} }
  let history = loadHistory();

  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&','<':'<','>':'>','"':'"',"'":'&#39;'}[c])); }

  function renderAttachmentInBubble(att){
    if (att.mime.startsWith('image/')) {
      return '<span class="att"><img src="data:'+att.mime+';base64,'+att.dataBase64+'" alt=""></span>';
    }
    return '<span class="att"><span class="pdfchip"><i class="bi bi-file-earmark-pdf-fill"></i><span>'+escapeHtml(att.name||'PDF file')+'</span></span></span>';
  }

  function renderMessage(role, text, atts, isOffline){
    const m = document.createElement('div');
    m.className = 'dsel-msg ' + (role === 'assistant' ? 'bot' : 'user');
    const pic = role === 'assistant' ? '<div class="pic"><span>'+activeChar.emoji+'</span></div>' : '<div class="pic">You</div>';
    const attHtml = (atts||[]).map(renderAttachmentInBubble).join('');
    const offlineHTML = isOffline ? '<span class="offline-note">⚠ Offline answer — may not reflect latest info</span>' : '';
    m.innerHTML = pic + '<div class="bubble">' + attHtml + escapeHtml(text||'') + offlineHTML + '</div>';
    msgsEl.appendChild(m);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    return m;
  }

  function renderTyping(){
    const m = document.createElement('div');
    m.className = 'dsel-msg bot';
    m.innerHTML = '<div class="pic"><span>'+activeChar.emoji+'</span></div><div class="bubble"><div class="dsel-typing"><span></span><span></span><span></span></div></div>';
    msgsEl.appendChild(m);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    return m;
  }

  function renderSuggestions(){ suggestEl.innerHTML = SUGGESTIONS.map(s => '<button>' + escapeHtml(s) + '</button>').join(''); }

  function showHistory(){
    msgsEl.innerHTML = '';
    if (!history.length) { renderMessage('assistant', WELCOME); return; }
    history.forEach(m => renderMessage(m.role, m.content, m.attachments));
  }

  function renderPendings(){
    pendingsEl.innerHTML = pendingAttachments.map((a, i) => {
      var thumb = a.mime.startsWith('image/')
        ? '<img src="data:'+a.mime+';base64,'+a.dataBase64+'">'
        : '<i class="bi bi-file-earmark-pdf-fill"></i>';
      return '<div class="chip">'+thumb+'<span>'+escapeHtml(a.name||'file')+'</span><button data-i="'+i+'" title="Remove"><i class="bi bi-x-lg"></i></button></div>';
    }).join('');
    sendBtn.disabled = !inputEl.value.trim() && !pendingAttachments.length;
  }

  function fileToBase64(file){
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => {
        const result = String(r.result || '');
        const b64 = result.split(',')[1] || '';
        resolve(b64);
      };
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  attachBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files || []);
    fileInput.value = '';
    for (const f of files) {
      if (f.size > MAX_FILE_MB * 1024 * 1024) {
        alert(`"${f.name}" is too large. Max ${MAX_FILE_MB} MB.`);
        continue;
      }
      const isImg = /^image\//.test(f.type);
      const isPdf = f.type === 'application/pdf' || /\.pdf$/i.test(f.name);
      if (!isImg && !isPdf) {
        alert(`"${f.name}" is not supported. Send images or PDFs only.`);
        continue;
      }
      const dataBase64 = await fileToBase64(f);
      pendingAttachments.push({ name: f.name, mime: f.type || (isPdf ? 'application/pdf' : 'image/jpeg'), dataBase64 });
    }
    renderPendings();
  });

  pendingsEl.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-i]'); if (!b) return;
    pendingAttachments.splice(parseInt(b.dataset.i, 10), 1);
    renderPendings();
  });

  // ═══════════════════════════════════════
  //  SEND TO AI (with retry + local KB fallback)
  // ═══════════════════════════════════════
  let apiInFlight = false;
  const apiQueue = [];

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function sendMessage(text){
    text = (text || '').trim();
    if (!text && !pendingAttachments.length) return;
    const atts = pendingAttachments.slice();
    pendingAttachments = [];
    renderPendings();
    history.push({ role: 'user', content: text, attachments: atts });
    saveHistory(history);
    renderMessage('user', text, atts);
    inputEl.value = '';
    sendBtn.disabled = true;
    suggestEl.style.display = 'none';

    const typing = renderTyping();

    // If another request is in-flight, queue this one
    if (apiInFlight) {
      await new Promise(resolve => apiQueue.push({ text, atts, resolve }));
    }
    apiInFlight = true;

    let reply = null;
    let usedLocalKB = false;

    // Try up to 3 times with exponential backoff
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        // Add character personality to the messages
        const messagesWithChar = history.slice(-12).map(m => ({ role: m.role, content: m.content, attachments: m.attachments }));
        // Prepend character instruction
        messagesWithChar.unshift({ role: 'user', content: '[Instruction for this reply only: ' + activeChar.prompt + ']' });

        const r = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: messagesWithChar })
        });

        if (r.status === 429 || r.status === 503) {
          voiceStatus.textContent = '⏳ Reconnecting…';
          statDot.classList.add('on');
          await sleep(Math.pow(2, attempt) * 1000 + Math.random() * 500);
          continue;
        }

        const data = await r.json().catch(() => ({}));
        reply = data.reply || null;
        if (reply) break;
      } catch (err) {
        if (attempt < 2) {
          voiceStatus.textContent = '⏳ Reconnecting…';
          statDot.classList.add('on');
          await sleep(Math.pow(2, attempt) * 1000 + Math.random() * 500);
        }
      }
    }

    // Fallback to local KB if API failed
    if (!reply) {
      const localReply = searchLocalKB(text);
      if (localReply) {
        reply = localReply;
        usedLocalKB = true;
      } else {
        reply = "I'm having trouble connecting right now. Please try again shortly, or message us on WhatsApp at +91 8770462942.";
      }
    }

    apiInFlight = false;

    // Process queued requests
    if (apiQueue.length) {
      const next = apiQueue.shift();
      next.resolve();
    }

    typing.remove();
    voiceStatus.textContent = handsfreeChk.checked ? 'Voice ready' : 'Voice ready';
    statDot.classList.remove('on');

    history.push({ role: 'assistant', content: reply });
    const trimmed = history.map((m,i) => i < history.length - 2 ? {...m, attachments: undefined} : m);
    saveHistory(trimmed);
    history = trimmed;
    renderMessage('assistant', reply, null, usedLocalKB);

    sendBtn.disabled = !inputEl.value.trim() && !pendingAttachments.length;
    inputEl.focus();
  }

  fab.addEventListener('click', () => {
    chat.classList.toggle('open');
    if (chat.classList.contains('open')) {
      showHistory(); renderSuggestions();
      setTimeout(() => inputEl.focus(), 100);
    }
  });

  // Resize handle
  (function(){
    const handle = chat.querySelector('.dsel-resize-handle');
    let startX, startY, startW, startH;
    function onMove(e){
      const dx = startX - e.clientX;
      const dy = startY - e.clientY;
      const newW = Math.max(340, Math.min(window.innerWidth - 30, startW + dx));
      const newH = Math.max(420, Math.min(window.innerHeight - 110, startH + dy));
      chat.style.width = newW + 'px';
      chat.style.height = newH + 'px';
    }
    function onUp(){ document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); document.body.style.userSelect=''; }
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      startX = e.clientX; startY = e.clientY;
      const r = chat.getBoundingClientRect();
      startW = r.width; startH = r.height;
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  })();

  closeBtn.addEventListener('click', () => chat.classList.remove('open'));
  clearBtn.addEventListener('click', () => {
    if (!confirm('Clear this chat?')) return;
    history = []; saveHistory(history);
    pendingAttachments = []; renderPendings();
    showHistory(); renderSuggestions();
    suggestEl.style.display = 'flex';
  });
  inputEl.addEventListener('input', () => { sendBtn.disabled = !inputEl.value.trim() && !pendingAttachments.length; });
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (inputEl.value.trim() || pendingAttachments.length)) {
      e.preventDefault(); sendMessage(inputEl.value);
    }
  });
  sendBtn.addEventListener('click', () => sendMessage(inputEl.value));
  suggestEl.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    sendMessage(b.textContent);
  });
})();
