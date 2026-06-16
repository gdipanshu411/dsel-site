// DSEL Voice Assistant — Google Assistant-style full-screen voice interface
// Supports 6 voice characters, local KB fallback, rate-limit resistant retries
(function(){
  if (window.__dselVoiceLoaded) return;
  window.__dselVoiceLoaded = true;

  const STORAGE_KEY = 'dsel-voice-history';
  const CHAR_KEY = 'dsel-voice-character';
  const PREFS_KEY = 'dsel-voice-prefs';
  const MAX_HISTORY = 20;

  // ═══════════════════════════════════════
  //  CHARACTER DEFINITIONS
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
      a:'Hello! Welcome to DSEL. I am your AI voice assistant. How can I help you today? You can ask about our courses, fees, or practice English with me!' },
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
        if (lower.includes(kw.toLowerCase())) score += kw.split(' ').length; // multi-word keywords score higher
      }
      if (score > bestScore) { bestScore = score; bestMatch = entry; }
    }
    return bestScore > 0 ? bestMatch.a : null;
  }

  // ═══════════════════════════════════════
  //  ACTIVE CHARACTER (persisted)
  // ═══════════════════════════════════════
  let activeChar = CHARACTERS[0];
  try {
    const saved = localStorage.getItem(CHAR_KEY);
    if (saved) { const found = CHARACTERS.find(c => c.id === saved); if (found) activeChar = found; }
  } catch(_){}

  function setActiveChar(char) {
    activeChar = char;
    try { localStorage.setItem(CHAR_KEY, char.id); } catch(_){}
    // Re-pick voice for this character
    if ('speechSynthesis' in window) {
      ttsVoice = pickVoiceForCharacter(char);
    }
    updateCharUI();
  }

  // ═══════════════════════════════════════
  //  CSS (all injected inline, self-contained)
  // ═══════════════════════════════════════
  const css = `
/* ── Voice FAB ── */
.dsel-voice-fab{position:fixed;bottom:22px;right:155px;width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#04415f,#0a6b96);color:#fff;display:grid;place-items:center;font-size:1.5rem;box-shadow:0 8px 32px rgba(4,65,95,.5);z-index:59;border:none;cursor:pointer;transition:transform .2s ease,box-shadow .2s ease;animation:voiceBreathe 3s ease-in-out infinite}
.dsel-voice-fab:hover{transform:scale(1.1);box-shadow:0 12px 40px rgba(4,65,95,.6)}
.dsel-voice-fab:active{transform:scale(.95)}
.dsel-voice-fab .fab-emoji{font-size:1.6rem;pointer-events:none}
@keyframes voiceBreathe{0%,100%{box-shadow:0 8px 32px rgba(4,65,95,.5)}50%{box-shadow:0 8px 40px rgba(4,65,95,.7),0 0 0 8px rgba(4,65,95,.15)}}
.dsel-voice-fab .fab-label{position:absolute;bottom:-22px;left:50%;transform:translateX(-50%);font-size:.6rem;white-space:nowrap;color:var(--muted,#56707d);font-weight:700;letter-spacing:.3px;pointer-events:none;opacity:0;transition:opacity .2s}
.dsel-voice-fab:hover .fab-label{opacity:1}

/* ── Full-Screen Overlay ── */
.dsel-voice-overlay{position:fixed;inset:0;z-index:80;display:none;flex-direction:column;align-items:center;justify-content:center;overflow:hidden}
.dsel-voice-overlay.open{display:flex;animation:overlayIn .4s ease}
@keyframes overlayIn{from{opacity:0}to{opacity:1}}

/* Background layers */
.dsel-voice-bg{position:absolute;inset:0;background:linear-gradient(160deg,#041a28 0%,#062c3f 40%,#0a4060 100%);z-index:0}
.dsel-voice-bg::after{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 50% 40%,rgba(10,107,150,.3) 0%,transparent 70%);pointer-events:none}

/* Header bar */
.dsel-voice-header{position:absolute;top:0;left:0;right:0;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;z-index:5}
.dsel-voice-header .brand{display:flex;align-items:center;gap:10px;color:rgba(255,255,255,.85);font-size:.88rem;font-weight:700}
.dsel-voice-header .brand i{font-size:1.1rem;color:#3aa6d3}
.dsel-voice-header button{background:rgba(255,255,255,.1);border:none;color:rgba(255,255,255,.75);cursor:pointer;font-size:1.2rem;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;transition:.2s}
.dsel-voice-header button:hover{background:rgba(255,255,255,.2);color:#fff}
.dsel-voice-stop{display:none !important;background:rgba(220,38,38,.85) !important;color:#fff !important}
.dsel-voice-overlay.speaking .dsel-voice-stop{display:grid !important}

/* ── Animated Ring Centerpiece ── */
.dsel-voice-center{position:relative;width:220px;height:220px;z-index:2;margin-bottom:32px;flex-shrink:0;cursor:pointer}
.dsel-voice-core{position:absolute;top:50%;left:50%;width:80px;height:80px;margin:-40px 0 0 -40px;border-radius:50%;background:linear-gradient(135deg,#04415f,#0a6b96);display:grid;place-items:center;font-size:2rem;color:#fff;z-index:3;transition:transform .3s ease,background .4s ease,box-shadow .4s ease;box-shadow:0 0 30px rgba(4,65,95,.5)}
.dsel-voice-overlay.listening .dsel-voice-core{background:linear-gradient(135deg,#04415f,#16a34a);box-shadow:0 0 40px rgba(22,163,74,.5);transform:scale(1.05)}
.dsel-voice-overlay.thinking .dsel-voice-core{background:linear-gradient(135deg,#8b6914,#ffb547);box-shadow:0 0 40px rgba(255,181,71,.5);animation:coreSpin 1.5s linear infinite}
.dsel-voice-overlay.speaking .dsel-voice-core{background:linear-gradient(135deg,#0a6b96,#3aa6d3);box-shadow:0 0 40px rgba(58,166,211,.5);animation:corePulse 1s ease infinite}
@keyframes coreSpin{from{transform:scale(1.05) rotate(0deg)}to{transform:scale(1.05) rotate(360deg)}}
@keyframes corePulse{0%,100%{transform:scale(1.05)}50%{transform:scale(1.12)}}

/* Concentric rings */
.dsel-voice-ring{position:absolute;top:50%;left:50%;border-radius:50%;border:2px solid rgba(4,65,95,.4);transform:translate(-50%,-50%) scale(1);opacity:0;transition:border-color .4s ease;pointer-events:none}
.dsel-voice-ring:nth-child(2){width:110px;height:110px;animation:ringPulse 2.4s ease-out infinite}
.dsel-voice-ring:nth-child(3){width:144px;height:144px;animation:ringPulse 2.4s ease-out infinite .3s}
.dsel-voice-ring:nth-child(4){width:178px;height:178px;animation:ringPulse 2.4s ease-out infinite .6s}
.dsel-voice-ring:nth-child(5){width:212px;height:212px;animation:ringPulse 2.4s ease-out infinite .9s}
@keyframes ringPulse{0%{transform:translate(-50%,-50%) scale(.85);opacity:.7}100%{transform:translate(-50%,-50%) scale(1.1);opacity:0}}

/* Ring color changes per state */
.dsel-voice-overlay.idle .dsel-voice-ring{border-color:rgba(4,65,95,.4)}
.dsel-voice-overlay.listening .dsel-voice-ring{border-color:rgba(22,163,74,.5)}
.dsel-voice-overlay.thinking .dsel-voice-ring{border-color:rgba(255,181,71,.4)}
.dsel-voice-overlay.speaking .dsel-voice-ring{border-color:rgba(58,166,211,.4)}

/* ── Reconnecting state ── */
.dsel-voice-overlay.reconnecting .dsel-voice-core{background:linear-gradient(135deg,#8b6914,#ffb547);box-shadow:0 0 40px rgba(255,181,71,.4);animation:corePulse 1.5s ease infinite}
.dsel-voice-overlay.reconnecting .dsel-voice-ring{border-color:rgba(255,181,71,.3)}

/* ── State Label ── */
.dsel-voice-state{color:rgba(255,255,255,.65);font-size:.82rem;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:16px;z-index:2;text-align:center;transition:color .3s}
.dsel-voice-overlay.listening .dsel-voice-state{color:#22c55e}
.dsel-voice-overlay.thinking .dsel-voice-state{color:#ffb547}
.dsel-voice-overlay.speaking .dsel-voice-state{color:#3aa6d3}
.dsel-voice-overlay.reconnecting .dsel-voice-state{color:#ffb547}

/* ── Transcript / Response Area ── */
.dsel-voice-text{z-index:2;text-align:center;max-width:520px;padding:0 24px;min-height:60px;max-height:180px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.15) transparent}
.dsel-voice-text .user-text{color:rgba(255,255,255,.7);font-size:1.05rem;margin-bottom:10px;font-style:italic}
.dsel-voice-text .bot-text{color:#fff;font-size:1.12rem;line-height:1.6;font-weight:500}
.dsel-voice-text .offline-note{color:rgba(255,181,71,.7);font-size:.75rem;margin-top:8px;font-style:italic}
.dsel-voice-text .placeholder{color:rgba(255,255,255,.35);font-size:.95rem;font-style:italic}
.dsel-voice-text::-webkit-scrollbar{width:4px}
.dsel-voice-text::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:4px}

/* Typing dots for thinking state */
.dsel-voice-dots{display:inline-flex;gap:5px;margin-left:4px}
.dsel-voice-dots span{width:8px;height:8px;border-radius:50%;background:#ffb547;animation:dotBounce 1.2s infinite}
.dsel-voice-dots span:nth-child(2){animation-delay:.15s}
.dsel-voice-dots span:nth-child(3){animation-delay:.3s}
@keyframes dotBounce{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-8px);opacity:1}}

/* ── Text Input Fallback ── */
.dsel-voice-input-row{z-index:2;display:flex;gap:8px;padding:12px 24px;width:100%;max-width:500px;margin-top:20px}
.dsel-voice-input-row input{flex:1;padding:12px 18px;border:1px solid rgba(255,255,255,.2);border-radius:999px;font-size:.92rem;background:rgba(255,255,255,.08);color:#fff;outline:none;font-family:inherit}
.dsel-voice-input-row input::placeholder{color:rgba(255,255,255,.35)}
.dsel-voice-input-row input:focus{border-color:rgba(58,166,211,.6);background:rgba(255,255,255,.12)}
.dsel-voice-input-row button.send{background:linear-gradient(135deg,#04415f,#0a6b96);color:#fff;border:none;width:44px;height:44px;border-radius:50%;cursor:pointer;display:grid;place-items:center;font-size:1rem;transition:transform .15s;flex-shrink:0}
.dsel-voice-input-row button.send:hover:not(:disabled){transform:scale(1.08)}
.dsel-voice-input-row button.send:disabled{opacity:.4;cursor:not-allowed}

/* ── CHARACTER SELECTOR ── */
.dsel-voice-chars{z-index:2;display:flex;gap:8px;padding:10px 20px;margin-top:12px;overflow-x:auto;width:100%;max-width:540px;scrollbar-width:none;-ms-overflow-style:none}
.dsel-voice-chars::-webkit-scrollbar{display:none}
.dsel-voice-char{display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 10px;border-radius:14px;border:2px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);cursor:pointer;transition:.2s;min-width:72px;flex-shrink:0;user-select:none}
.dsel-voice-char:hover{border-color:rgba(255,255,255,.3);background:rgba(255,255,255,.1)}
.dsel-voice-char.active{border-color:#3aa6d3;background:rgba(58,166,211,.18);box-shadow:0 0 16px rgba(58,166,211,.3)}
.dsel-voice-char .char-emoji{font-size:1.5rem;line-height:1}
.dsel-voice-char .char-name{color:rgba(255,255,255,.85);font-size:.68rem;font-weight:700;letter-spacing:.3px;white-space:nowrap}
.dsel-voice-char .char-desc{color:rgba(255,255,255,.4);font-size:.55rem;white-space:nowrap;font-weight:500}

/* ── Voice Control Bar ── */
.dsel-voice-controls{z-index:2;display:flex;gap:16px;align-items:center;padding:10px 24px;margin-top:10px;color:rgba(255,255,255,.55);font-size:.78rem;font-weight:600;flex-wrap:wrap;justify-content:center}
.dsel-voice-controls label{display:flex;align-items:center;gap:6px;cursor:pointer;user-select:none}
.dsel-voice-controls select{border:1px solid rgba(255,255,255,.2);border-radius:6px;padding:2px 6px;font-size:.75rem;background:rgba(255,255,255,.08);color:#fff;cursor:pointer;font-family:inherit}
.dsel-voice-controls select option{background:#062c3f;color:#fff}
.dsel-voice-controls select:focus{border-color:rgba(58,166,211,.6);outline:none}

/* Footer */
.dsel-voice-footer{z-index:2;padding:8px;color:rgba(255,255,255,.25);font-size:.65rem;margin-top:auto;margin-bottom:10px;text-align:center}

/* ── Mobile Responsive ── */
@media(max-width:560px){
  .dsel-voice-fab{right:140px;width:54px;height:54px;font-size:1.3rem;bottom:18px}
  .dsel-voice-center{width:180px;height:180px;margin-bottom:24px}
  .dsel-voice-core{width:66px;height:66px;margin:-33px 0 0 -33px;font-size:1.5rem}
  .dsel-voice-ring:nth-child(2){width:92px;height:92px}
  .dsel-voice-ring:nth-child(3){width:120px;height:120px}
  .dsel-voice-ring:nth-child(4){width:148px;height:148px}
  .dsel-voice-ring:nth-child(5){width:176px;height:176px}
  .dsel-voice-input-row{padding:10px 16px}
  .dsel-voice-text{padding:0 16px}
  .dsel-voice-text .bot-text{font-size:1rem}
  .dsel-voice-chars{padding:8px 12px;gap:6px}
  .dsel-voice-char{min-width:60px;padding:6px 8px}
  .dsel-voice-char .char-emoji{font-size:1.3rem}
.dsel-voice-char .char-name{font-size:.62rem}
}

/* ── No-voice fallback ── */
.dsel-voice-overlay.no-voice .dsel-voice-center{opacity:.4}
.dsel-voice-overlay.no-voice .dsel-voice-state{color:rgba(255,255,255,.35)}
.dsel-voice-no-voice-msg{z-index:2;text-align:center;max-width:400px;padding:0 24px;color:rgba(255,255,255,.6);font-size:.88rem;line-height:1.6;margin-bottom:12px}
.dsel-voice-no-voice-msg i{font-size:1.4rem;display:block;margin-bottom:6px;color:rgba(255,255,255,.4)}
  `;

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  // ─── Build FAB ───
  const fab = document.createElement('button');
  fab.className = 'dsel-voice-fab';
  fab.title = 'Voice Assistant';
  fab.setAttribute('aria-label', 'Open DSEL Voice Assistant');
  fab.innerHTML = '<span class="fab-emoji">' + activeChar.emoji + '</span><span class="fab-label">VOICE</span>';
  document.body.appendChild(fab);

  // ─── Build Overlay ───
  const overlay = document.createElement('div');
  overlay.className = 'dsel-voice-overlay idle';

  // Build character selector HTML
  const charsHTML = CHARACTERS.map(c =>
    `<div class="dsel-voice-char${c.id === activeChar.id ? ' active' : ''}" data-char="${c.id}">
      <span class="char-emoji">${c.emoji}</span>
      <span class="char-name">${c.name}</span>
      <span class="char-desc">${c.desc}</span>
    </div>`
  ).join('');

  overlay.innerHTML = `
    <div class="dsel-voice-bg"></div>
    <div class="dsel-voice-header">
      <div class="brand"><i class="bi bi-robot"></i> DSEL Voice Assistant</div>
      <div style="display:flex;gap:8px">
        <button class="dsel-voice-stop" title="Stop speaking"><i class="bi bi-stop-fill"></i></button>
        <button class="dsel-voice-close" title="Close"><i class="bi bi-x-lg"></i></button>
      </div>
    </div>
    <div class="dsel-voice-center">
      <div class="dsel-voice-core"><span class="core-emoji">${activeChar.emoji}</span></div>
      <div class="dsel-voice-ring"></div>
      <div class="dsel-voice-ring"></div>
      <div class="dsel-voice-ring"></div>
      <div class="dsel-voice-ring"></div>
    </div>
    <div class="dsel-voice-state">Tap the mic or start speaking</div>
    <div class="dsel-voice-text">
      <div class="placeholder">Ask me anything about DSEL, courses, or English practice</div>
    </div>
    <div class="dsel-voice-no-voice-msg" style="display:none"><i class="bi bi-exclamation-triangle"></i>Voice is not supported in this browser. Use the text input below, or try Chrome for full voice features.</div>
    <div class="dsel-voice-input-row">
      <input type="text" placeholder="Type a message…" maxlength="500" autocomplete="off">
      <button class="send" disabled><i class="bi bi-send-fill"></i></button>
    </div>
    <div class="dsel-voice-chars">${charsHTML}</div>
    <div class="dsel-voice-controls">
      <label><input type="checkbox" id="dselVoiceSpeak" checked> 🔊 Speak replies</label>
      <label>⚡ Speed <select id="dselVoiceSpeed"><option value="0.7">Slow</option><option value="0.9">Normal</option><option value="1" selected>Fast</option><option value="1.3">Faster</option></select></label>
    </div>
    <div class="dsel-voice-footer">Powered by DSEL AI · Always confirm details on WhatsApp</div>
  `;
  document.body.appendChild(overlay);

  // ─── DOM Refs ───
  const coreEmoji   = overlay.querySelector('.core-emoji');
  const stateLabel  = overlay.querySelector('.dsel-voice-state');
  const textArea    = overlay.querySelector('.dsel-voice-text');
  const inputEl     = overlay.querySelector('.dsel-voice-input-row input');
  const sendBtn     = overlay.querySelector('.dsel-voice-input-row .send');
  const closeBtn    = overlay.querySelector('.dsel-voice-close');
  const stopBtn     = overlay.querySelector('.dsel-voice-stop');
  const speakChk    = overlay.querySelector('#dselVoiceSpeak');
  const speedSelect = overlay.querySelector('#dselVoiceSpeed');
  const noVoiceMsg  = overlay.querySelector('.dsel-voice-no-voice-msg');
  const charsRow    = overlay.querySelector('.dsel-voice-chars');

  // ─── State Machine ───
  let currentState = 'idle'; // idle | listening | thinking | speaking | reconnecting
  let isSpeaking = false;

  function setState(state) {
    currentState = state;
    overlay.className = 'dsel-voice-overlay open ' + state;
    switch (state) {
      case 'idle':
        stateLabel.textContent = 'Tap the mic or start speaking';
        break;
      case 'listening':
        stateLabel.textContent = 'Listening…';
        break;
      case 'thinking':
        stateLabel.innerHTML = 'Thinking<span class="dsel-voice-dots"><span></span><span></span><span></span></span>';
        break;
      case 'speaking':
        stateLabel.textContent = 'Speaking…';
        break;
      case 'reconnecting':
        stateLabel.innerHTML = 'Reconnecting<span class="dsel-voice-dots"><span></span><span></span><span></span></span>';
        break;
    }
  }

  // ─── Character Selector ───
  function updateCharUI() {
    // Update core emoji
    coreEmoji.textContent = activeChar.emoji;
    // Update FAB emoji
    fab.querySelector('.fab-emoji').textContent = activeChar.emoji;
    // Update active state in char row
    charsRow.querySelectorAll('.dsel-voice-char').forEach(el => {
      el.classList.toggle('active', el.dataset.char === activeChar.id);
    });
    // Dispatch event so chat-widget can sync
    try { window.dispatchEvent(new CustomEvent('dsel-char-change', { detail: activeChar.id })); } catch(_){}
  }

  charsRow.addEventListener('click', (e) => {
    const el = e.target.closest('.dsel-voice-char');
    if (!el) return;
    const char = CHARACTERS.find(c => c.id === el.dataset.char);
    if (char) setActiveChar(char);
  });

  // Listen for character changes from chat-widget
  window.addEventListener('dsel-char-change', (e) => {
    const char = CHARACTERS.find(c => c.id === e.detail);
    if (char && char.id !== activeChar.id) {
      activeChar = char;
      try { localStorage.setItem(CHAR_KEY, char.id); } catch(_){}
      if ('speechSynthesis' in window) ttsVoice = pickVoiceForCharacter(char);
      updateCharUI();
    }
  });

  // ─── Conversation History ───
  function loadHistory() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch(_) { return []; } }
  function saveHistory(h) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(h.slice(-MAX_HISTORY))); } catch(_) {} }
  let history = loadHistory();

  // ─── TTS Setup (character-aware) ───
  let ttsVoice = null;

  function pickVoiceForCharacter(char) {
    if (!('speechSynthesis' in window)) return null;
    const voices = speechSynthesis.getVoices();
    if (!voices.length) return null;

    // 1. Try lang match + name match
    let v = voices.find(v => new RegExp(char.voiceLang, 'i').test(v.lang) && char.voiceName.test(v.name));
    // 2. Try natural/premium for this lang
    if (!v) v = voices.find(v => new RegExp(char.voiceLang, 'i').test(v.lang) && /natural|premium|enhanced|neural/i.test(v.name));
    // 3. Try lang-only match
    if (!v) v = voices.find(v => new RegExp(char.voiceLang, 'i').test(v.lang));
    // 4. Fallback to any English
    if (!v) v = voices.find(v => /^en/i.test(v.lang));
    return v || voices[0] || null;
  }

  if ('speechSynthesis' in window) {
    ttsVoice = pickVoiceForCharacter(activeChar);
    speechSynthesis.onvoiceschanged = () => { ttsVoice = pickVoiceForCharacter(activeChar); };
    setTimeout(() => { ttsVoice = pickVoiceForCharacter(activeChar); }, 500);
    setTimeout(() => { ttsVoice = pickVoiceForCharacter(activeChar); }, 1500);
  }

  function speak(text) {
    if (!('speechSynthesis' in window) || !speakChk.checked) {
      afterSpeaking();
      return;
    }
    speechSynthesis.cancel();
    let clean = text.replace(/[*_#`~]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\n{2,}/g, '. ').replace(/\n/g, ', ').trim();
    if (clean.length > 600) clean = clean.slice(0, 597) + '...';

    const u = new SpeechSynthesisUtterance(clean);
    if (ttsVoice) u.voice = ttsVoice;
    // Character-specific rate & pitch, modulated by user speed setting
    const userSpeed = parseFloat(speedSelect.value) || 1;
    u.rate = activeChar.rate * userSpeed;
    u.pitch = activeChar.pitch;
    u.volume = 1;
    u.lang = activeChar.voiceLang;
    isSpeaking = true;

    u.onstart = () => { setState('speaking'); };
    u.onend = () => { isSpeaking = false; afterSpeaking(); };
    u.onerror = () => { isSpeaking = false; afterSpeaking(); };
    speechSynthesis.speak(u);
  }

  function stopSpeaking() {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    isSpeaking = false;
  }

  function afterSpeaking() {
    // Auto-restart listening after AI finishes speaking (hands-free)
    if (overlay.classList.contains('open') && currentState === 'speaking') {
      startListening();
    }
  }

  // ─── STT (Speech Recognition) ───
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let listening = false;
  let userStoppedRecognition = false;
  let lastUserText = '';

  if (SR) {
    recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      listening = true;
      setState('listening');
    };
    recognition.onresult = (e) => {
      let interim = '', final_ = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final_ += t;
        else interim += t;
      }
      lastUserText = (final_ + interim).trim();
      textArea.innerHTML = '<div class="user-text">"' + escapeHtml(lastUserText) + '"</div>';
    };
    recognition.onerror = (e) => {
      if (e.error === 'no-speech') {
        if (overlay.classList.contains('open') && !userStoppedRecognition) {
          setTimeout(() => startListening(), 200);
        }
        return;
      }
      if (e.error === 'aborted') return;
      setState('idle');
      textArea.innerHTML = '<div class="placeholder">Voice error: ' + escapeHtml(e.error) + '. Try again or type below.</div>';
    };
    recognition.onend = () => {
      listening = false;
      if (userStoppedRecognition) { userStoppedRecognition = false; return; }
      const txt = lastUserText.trim();
      if (txt && overlay.classList.contains('open')) {
        sendToAI(txt);
      } else if (overlay.classList.contains('open')) {
        setTimeout(() => startListening(), 300);
      }
    };
  } else {
    overlay.classList.add('no-voice');
    noVoiceMsg.style.display = '';
    setState('idle');
  }

  function startListening() {
    if (!recognition || listening || isSpeaking) return;
    lastUserText = '';
    try { recognition.start(); } catch(_) {}
  }

  function stopListening() {
    if (!recognition || !listening) return;
    userStoppedRecognition = true;
    try { recognition.stop(); } catch(_) {}
  }

  // ─── Send to AI (with retry + local KB fallback) ───
  let apiInFlight = false;
  const apiQueue = [];

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  async function sendToAI(text) {
    text = (text || '').trim();
    if (!text) return;

    // Show user text
    textArea.innerHTML = '<div class="user-text">"' + escapeHtml(text) + '"</div>';
    setState('thinking');

    history.push({ role: 'user', content: text });
    saveHistory(history);

    // If another request is in-flight, queue this one
    if (apiInFlight) {
      return new Promise(resolve => apiQueue.push({ text, resolve }));
    }
    apiInFlight = true;

    let reply = null;
    let usedLocalKB = false;

    // Try up to 3 times with exponential backoff
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        // Add character personality to the messages
        const messagesWithChar = history.slice(-12).map(m => ({ role: m.role, content: m.content }));
        // Prepend character instruction
        messagesWithChar.unshift({ role: 'user', content: '[Instruction for this reply only: ' + activeChar.prompt + ']' });

        const r = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: messagesWithChar })
        });

        if (r.status === 429 || r.status === 503) {
          // Rate limited — show reconnecting, wait and retry
          setState('reconnecting');
          await sleep(Math.pow(2, attempt) * 1000 + Math.random() * 500);
          continue;
        }

        const data = await r.json().catch(() => ({}));
        reply = data.reply || null;
        if (reply) break;
      } catch (err) {
        if (attempt < 2) {
          setState('reconnecting');
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
      sendToAI(next.text).then(next.resolve);
    }

    // Store assistant reply in history
    history.push({ role: 'assistant', content: reply });
    const trimmed = history.map((m, i) => i < history.length - 2 ? { role: m.role, content: m.content } : m);
    saveHistory(trimmed);
    history = trimmed;

    // Show reply
    const offlineNote = usedLocalKB ? '<div class="offline-note">⚠ Offline answer — may not reflect latest info</div>' : '';
    textArea.innerHTML = '<div class="user-text" style="opacity:.5">"' + escapeHtml(text) + '"</div><div class="bot-text">' + escapeHtml(reply) + '</div>' + offlineNote;

    // Speak it
    speak(reply);
  }

  // ─── Open / Close Overlay ───
  function openOverlay() {
    overlay.classList.add('open');
    setState('idle');
    if (!history.length) {
      const welcome = "Hi! I am the DSEL Voice Assistant. Ask me about courses, fees, batches, or practice English with me. Just speak naturally!";
      textArea.innerHTML = '<div class="bot-text">' + escapeHtml(welcome) + '</div>';
      speak(welcome);
    } else {
      textArea.innerHTML = '<div class="placeholder">Ask me anything about DSEL, courses, or English practice</div>';
      startListening();
    }
  }

  function closeOverlay() {
    stopListening();
    stopSpeaking();
    overlay.classList.remove('open');
    overlay.className = 'dsel-voice-overlay idle';
    currentState = 'idle';
  }

  // ─── Event Listeners ───
  fab.addEventListener('click', openOverlay);
  closeBtn.addEventListener('click', closeOverlay);

  // Click core to restart listening
  overlay.querySelector('.dsel-voice-core').addEventListener('click', () => {
    if (isSpeaking) { stopSpeaking(); }
    else if (!listening) { startListening(); }
  });

  stopBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    stopSpeaking();
    startListening();
  });

  // Text input fallback
  inputEl.addEventListener('input', () => { sendBtn.disabled = !inputEl.value.trim(); });
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && inputEl.value.trim()) {
      e.preventDefault();
      const txt = inputEl.value.trim();
      inputEl.value = '';
      sendBtn.disabled = true;
      stopListening();
      sendToAI(txt);
    }
  });
  sendBtn.addEventListener('click', () => {
    const txt = inputEl.value.trim();
    if (!txt) return;
    inputEl.value = '';
    sendBtn.disabled = true;
    stopListening();
    sendToAI(txt);
  });

  // Voice prefs
  try {
    const vp = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
    if (vp.speak === false) speakChk.checked = false;
    if (vp.speed) speedSelect.value = vp.speed;
  } catch(_) {}

  speakChk.addEventListener('change', () => {
    if (!speakChk.checked) stopSpeaking();
    saveVoicePrefs();
  });
  speedSelect.addEventListener('change', saveVoicePrefs);

  function saveVoicePrefs() {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify({ speak: speakChk.checked, speed: speedSelect.value })); } catch(_) {}
  }

  // Escape key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('open')) closeOverlay();
  });

  // ─── Sync initial character from localStorage (in case chat-widget changed it) ───
  try {
    const saved = localStorage.getItem(CHAR_KEY);
    if (saved) {
      const found = CHARACTERS.find(c => c.id === saved);
      if (found && found.id !== activeChar.id) {
        activeChar = found;
        ttsVoice = pickVoiceForCharacter(found);
        updateCharUI();
      }
    }
  } catch(_){}

  // ─── Utilities ───
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&':'&','<':'<','>':'>','"':'"',"'":'&#39;'
    }[c]));
  }
})();
