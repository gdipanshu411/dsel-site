// DSEL Voice Assistant — Compact panel, real voice conversation
(function(){
  if (window.__dselVoiceLoaded) return;
  window.__dselVoiceLoaded = true;

  const CHAR_KEY = 'dsel-voice-character';
  const HISTORY_KEY = 'dsel-voice-history-v5';

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
      prompt:'Respond like a precise robot. Concise, factual.' }
  ];

  // Shortened KB for speed
  const LOCAL_KB = [
    { kw:['fee','price','cost','how much','kitna','charges'], a:'Course fee is 4,500 rupees. One-time payment. No hidden charges.' },
    { kw:['batch','timing','schedule','class time'], a:'Morning and evening batches. WhatsApp +91 8770462942 for current timings.' },
    { kw:['location','address','where','kahan','map'], a:'Stadium Road, next to New Arya Public School, Sidhi, MP 486661.' },
    { kw:['phone','call','contact','number'], a:'Call +91 8770462942 or +91 9685586327.' },
    { kw:['whatsapp'], a:'WhatsApp: +91 8770462942' },
    { kw:['duration','how long','months'], a:'4-6 months course + 1 year free practice support.' },
    { kw:['demo','trial','free class'], a:'Free demo class! Walk in any working day.' },
    { kw:['subjects','syllabus','teach'], a:'Spoken English, grammar, vocabulary, GD, debate, public speaking, interview prep.' },
    { kw:['interview','job','mock'], a:'Interview prep included — mock rounds, body language, answer structuring.' },
    { kw:['scholarship','discount'], a:'For scholarship, WhatsApp +91 8770462942.' },
    { kw:['youtube'], a:'YouTube: @DSELSIDHIFORENGLISH' },
    { kw:['hindi medium','beginner','nahi aata'], a:'We start from basics. Many Hindi-medium students now speak confidently.' },
    { kw:['fluency','improve speaking','confident'], a:'Daily practice is key! Real conversations and stage exercises.' },
    { kw:['since for'], a:'Since = specific point. For = duration. Example: since Monday, for 2 hours.' },
    { kw:['hello','hi','hey','namaste'], a:'Hello! How can I help you today?' },
    { kw:['bye','goodbye','tata'], a:'Goodbye! Keep practicing. Visit Stadium Road, Sidhi!' }
  ];

  function searchKB(t) {
    var lo = (t||'').toLowerCase().replace(/[?!.,;:'"]/g,'');
    var b=null, bs=0;
    for (var i=0;i<LOCAL_KB.length;i++) { var s=0; for (var j=0;j<LOCAL_KB[i].kw.length;j++) if (lo.indexOf(LOCAL_KB[i].kw[j])!==-1) s+=LOCAL_KB[i].kw[j].split(' ').length; if (s>bs) { bs=s; b=LOCAL_KB[i]; } }
    return bs>0?b.a:null;
  }

  // Active character
  var curChar = CHARACTERS[0];
  try { var sc=localStorage.getItem(CHAR_KEY); var fc=CHARACTERS.find(function(c){return c.id===sc}); if (fc) curChar=fc; } catch(_){}

  function setChar(c) {
    curChar=c; try{localStorage.setItem(CHAR_KEY,c.id)}catch(_){}
    ttsVoice=pickVoice(c); updateUI();
    try{window.dispatchEvent(new CustomEvent('dsel-char-change',{detail:c.id}))}catch(_){}
  }

  // ─── TTS ───
  var ttsVoice = null;
  var hasTTS = 'speechSynthesis' in window;

  function pickVoice(c) {
    if (!hasTTS) return null;
    var vv = speechSynthesis.getVoices(); if (!vv.length) return null;
    var v = null;
    for (var i=0;i<vv.length;i++) { if (new RegExp(c.voiceLang,'i').test(vv[i].lang) && c.voiceRe.test(vv[i].name)) { v=vv[i]; break; } }
    if (!v) for (var i=0;i<vv.length;i++) { if (new RegExp(c.voiceLang,'i').test(vv[i].lang)) { v=vv[i]; break; } }
    if (!v) for (var i=0;i<vv.length;i++) { if (/^en/i.test(vv[i].lang)) { v=vv[i]; break; } }
    return v || vv[0] || null;
  }

  function loadVoices() { if (hasTTS) ttsVoice = pickVoice(curChar); }
  if (hasTTS) { loadVoices(); speechSynthesis.onvoiceschanged=loadVoices; setTimeout(loadVoices,100); setTimeout(loadVoices,500); }

  function speak(text, onDone) {
    if (!hasTTS) { if (onDone) onDone(); return; }
    speechSynthesis.cancel();
    var clean = text.replace(/[*_#`~]/g,'').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/\n+/g,'. ').trim();
    if (clean.length > 300) clean = clean.slice(0,297)+'...';
    var u = new SpeechSynthesisUtterance(clean);
    if (ttsVoice) u.voice = ttsVoice;
    u.rate = curChar.rate; u.pitch = curChar.pitch; u.volume = 1; u.lang = curChar.voiceLang;
    var done=false;
    function finish(){ if(!done){ done=true; if(onDone) onDone(); } }
    u.onend=finish; u.onerror=finish;
    setTimeout(finish, Math.max(8000, clean.length*60));
    speechSynthesis.speak(u);
  }

  function stopSpeaking() { if (hasTTS) speechSynthesis.cancel(); }

  // ─── STT ───
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var recog = null;
  if (SR) { recog=new SR(); recog.lang='en-US'; recog.interimResults=false; recog.continuous=false; recog.maxAlternatives=1; }

  // ─── API ───
  var history = [];
  try { history=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]'); } catch(_){}

  async function callAI(text) {
    var ctx = [{ role:'user', content:'[Personality: '+curChar.prompt+']' }];
    for (var i=Math.max(0,history.length-4);i<history.length;i++) { ctx.push({role:history[i].role,content:history[i].content}); }
    ctx.push({ role:'user', content:text });

    try {
      var r = await fetch('/api/chat', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({messages:ctx}) });
      if (!r.ok) return null;
      var d = await r.json().catch(function(){return{};});
      return d.reply || null;
    } catch(e) { return null; }
  }

  // ─── CSS ───
  var css = '.dsel-vo-wrap{position:fixed;bottom:24px;right:90px;z-index:58;display:flex;flex-direction:column;align-items:flex-end;gap:8px}'+
  '.dsel-vo-fab{width:52px;height:52px;border-radius:50%;border:none;cursor:pointer;background:linear-gradient(135deg,#04415f,#0a6b96);color:#fff;font-size:1.3rem;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 24px rgba(4,65,95,.4);transition:transform .15s,box-shadow .3s;flex-shrink:0}'+
  '.dsel-vo-fab:hover{transform:scale(1.07)}.dsel-vo-fab:active{transform:scale(.95)}'+
  '.dsel-vo-fab.listening{background:#16a34a;box-shadow:0 0 0 0 rgba(22,163,74,.6);animation:voPulse 1.5s ease infinite}'+
  '.dsel-vo-fab.thinking{background:#b8860b;animation:voSpin .8s linear infinite}'+
  '.dsel-vo-fab.speaking{background:#0a6b96;box-shadow:0 0 0 0 rgba(10,107,150,.6);animation:voPulse .7s ease infinite}'+
  '@keyframes voPulse{to{box-shadow:0 0 0 14px transparent}}@keyframes voSpin{to{transform:rotate(360deg)}}'+
  '.dsel-vo-box{display:none;width:320px;max-width:calc(100vw - 20px);background:var(--card-bg,#fff);border:1px solid var(--line,#d8e2e7);border-radius:14px;box-shadow:0 12px 40px rgba(1,30,44,.25);overflow:hidden;flex-direction:column}'+
  '.dsel-vo-box.open{display:flex}.dsel-vo-box .vb-head{padding:10px 14px;background:linear-gradient(135deg,#04415f,#0a6b96);color:#fff;display:flex;align-items:center;justify-content:space-between}'+
  '.vb-head .vb-title{font-size:.82rem;font-weight:800;display:flex;align-items:center;gap:6px}'+
  '.vb-head .vb-dot{width:7px;height:7px;border-radius:50%;background:#94a3b8;transition:background .3s}'+
  '.vb-head .vb-dot.on{background:#22c55e}'+
  '.vb-head .vb-dot.thinking{background:#ffb547;animation:voSpin .8s linear infinite}'+
  '.vb-head .vb-dot.speaking{background:#3aa6d3;animation:voPulse .6s ease infinite}'+
  '.vb-head button{background:rgba(255,255,255,.15);border:none;color:#fff;cursor:pointer;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-size:.85rem}'+
  '.vb-head button:hover{background:rgba(255,255,255,.3)}'+
  '.dsel-vo-box .vb-chars{display:flex;gap:4px;padding:6px 8px;overflow-x:auto;border-bottom:1px solid var(--line,#d8e2e7);background:var(--bg,#f1f5f7);scrollbar-width:none}'+
  '.dsel-vo-box .vb-chars::-webkit-scrollbar{display:none}'+
  '.vb-ch{flex-shrink:0;display:flex;align-items:center;gap:3px;padding:3px 8px;border-radius:999px;border:1px solid var(--line,#d8e2e7);background:var(--card-bg,#fff);cursor:pointer;font-size:.7rem;font-weight:700;color:var(--ink,#011e2c);font-family:inherit}'+
  '.vb-ch:hover{border-color:var(--brand,#04415f)}.vb-ch.active{background:var(--brand,#04415f);color:#fff;border-color:var(--brand,#04415f)}.vb-ch .vb-e{font-size:.88rem}'+
  '.dsel-vo-box .vb-body{padding:10px 12px;max-height:180px;overflow-y:auto;font-size:.84rem;line-height:1.45;background:var(--card-bg,#fff);min-height:45px}'+
  '.vb-body .vb-line{margin-bottom:6px}.vb-body .vb-who{font-size:.65rem;font-weight:800;text-transform:uppercase;letter-spacing:.3px;opacity:.5;margin-bottom:1px}'+
  '.vb-body .vb-who.you{color:var(--brand,#04415f)}.vb-body .vb-msg{color:var(--ink,#011e2c);white-space:pre-wrap}'+
  '.vb-body .vb-status{color:var(--muted,#56707d);font-style:italic;font-size:.78rem}'+
  '.dsel-vo-box .vb-bar{padding:8px 10px;border-top:1px solid var(--line,#d8e2e7);display:flex;gap:6px;align-items:center;background:var(--bg,#f1f5f7)}'+
  '.vb-bar .vb-btn{padding:10px 14px;border-radius:10px;border:none;cursor:pointer;font-weight:700;font-size:.82rem;font-family:inherit;display:flex;align-items:center;gap:6px}'+
  '.vb-talk{flex:1;background:linear-gradient(135deg,#04415f,#0a6b96);color:#fff;justify-content:center}.vb-talk:hover{opacity:.9}'+
  '.vb-talk.active{background:#dc2626}'+
  '.vb-stop{background:#dc2626;color:#fff}.vb-stop:hover{opacity:.85}'+
  '.vb-end{color:var(--ink,#011e2c);background:var(--bg-alt,#e6edf0)}.vb-end:hover{background:#fee2e2;color:#dc2626}'+
  '@media(max-width:520px){.dsel-vo-wrap{right:10px;bottom:20px}.dsel-vo-box{width:calc(100vw - 20px)}.dsel-vo-fab{width:48px;height:48px;font-size:1.2rem}}';

  var st = document.createElement('style'); st.textContent=css; document.head.appendChild(st);

  // ─── BUILD DOM ───
  var wrap = document.createElement('div'); wrap.className='dsel-vo-wrap';

  var chHTML = '';
  for (var i=0;i<CHARACTERS.length;i++) {
    chHTML += '<button class="vb-ch'+(CHARACTERS[i].id===curChar.id?' active':'')+'" data-char="'+CHARACTERS[i].id+'"><span class="vb-e">'+CHARACTERS[i].emoji+'</span>'+CHARACTERS[i].name+'</button>';
  }

  var box = document.createElement('div'); box.className='dsel-vo-box';
  box.innerHTML = '<div class="vb-head"><span class="vb-title"><span class="vb-dot"></span> Voice Chat</span><button class="vb-x" title="Close">&times;</button></div>'+
    '<div class="vb-chars">'+chHTML+'</div>'+
    '<div class="vb-body"><span class="vb-status">Tap <b>Start Talk</b> to begin a voice conversation.</span></div>'+
    '<div class="vb-bar"><button class="vb-btn vb-talk"> Start Talk</button><button class="vb-btn vb-stop" style="display:none"> Stop</button><button class="vb-btn vb-end"> Close</button></div>';

  var fab = document.createElement('button'); fab.className='dsel-vo-fab'; fab.innerHTML=curChar.emoji; fab.setAttribute('aria-label','Voice Assistant');
  wrap.appendChild(box); wrap.appendChild(fab); document.body.appendChild(wrap);

  // Refs
  var bodyEl = box.querySelector('.vb-body');
  var talkBtn = box.querySelector('.vb-talk');
  var stopBtn = box.querySelector('.vb-stop');
  var endBtn = box.querySelector('.vb-end');
  var xBtn = box.querySelector('.vb-x');
  var dot = box.querySelector('.vb-dot');
  var charsRow = box.querySelector('.vb-chars');

  // State
  var isOpen = false;
  var isActive = false;    // conversation started
  var isListening = false;
  var isThinking = false;
  var isSpeaking = false;
  var currentSpeechText = ''; // track what text was spoken last

  function updateUI() {
    // FAB state
    fab.className = 'dsel-vo-fab';
    if (isActive && isListening) fab.classList.add('listening');
    else if (isActive && isThinking) fab.classList.add('thinking');
    else if (isActive && isSpeaking) fab.classList.add('speaking');
    fab.textContent = curChar.emoji;

    // Dot state
    dot.className = 'vb-dot';
    if (isListening) dot.classList.add('on');
    else if (isThinking) dot.classList.add('thinking');
    else if (isSpeaking) dot.classList.add('speaking');

    // Buttons
    if (isActive) {
      talkBtn.style.display = isListening ? 'none' : '';
      stopBtn.style.display = isSpeaking ? '' : 'none';
      talkBtn.textContent = isListening ? '' : (isThinking ? ' Thinking...' : ' Talk');
    } else {
      talkBtn.style.display = '';
      stopBtn.style.display = 'none';
      talkBtn.textContent = ' Start Talk';
    }

    // Character pills
    var pills = charsRow.querySelectorAll('.vb-ch');
    for (var i=0;i<pills.length;i++) { pills[i].classList.toggle('active', pills[i].dataset.char===curChar.id); }
  }

  function addLine(who, text) {
    // Remove placeholder if present
    var ph = bodyEl.querySelector('.vb-status');
    if (ph) ph.remove();

    var div = document.createElement('div'); div.className='vb-line';
    var whoSpan = document.createElement('div'); whoSpan.className='vb-who '+(who==='You'?'you':'');
    whoSpan.textContent = who;
    var msgSpan = document.createElement('div'); msgSpan.className='vb-msg';
    msgSpan.textContent = text;
    div.appendChild(whoSpan); div.appendChild(msgSpan);
    bodyEl.appendChild(div);
    bodyEl.scrollTop = bodyEl.scrollHeight;

    // Trim old messages (keep last 8)
    while (bodyEl.children.length > 8) bodyEl.firstChild.remove();
  }

  function setStatus(text) {
    var existing = bodyEl.querySelector('.vb-status');
    if (existing) existing.remove();
    if (text) {
      var s = document.createElement('span'); s.className='vb-status'; s.textContent=text;
      bodyEl.appendChild(s);
      bodyEl.scrollTop = bodyEl.scrollHeight;
    }
  }

  // Character switch
  charsRow.addEventListener('click', function(e){
    var b = e.target.closest('.vb-ch'); if (!b) return;
    var c = CHARACTERS.find(function(x){return x.id===b.dataset.char});
    if (c) setChar(c);
  });

  window.addEventListener('dsel-char-change', function(e){
    var c = CHARACTERS.find(function(x){return x.id===e.detail});
    if (c && c.id!==curChar.id) { curChar=c; ttsVoice=pickVoice(c); updateUI(); }
  });

  // ─── Open / Close ───
  function openBox() { isOpen=true; box.classList.add('open'); updateUI(); }
  function closeBox() { resetAll(); isOpen=false; box.classList.remove('open'); updateUI(); }

  function resetAll() {
    stopListening();
    stopSpeaking();
    isActive=false; isListening=false; isThinking=false; isSpeaking=false;
    bodyEl.innerHTML = '<span class="vb-status">Tap <b>Start Talk</b> to begin a voice conversation.</span>';
    updateUI();
  }

  fab.addEventListener('click', function(){ if(isOpen) closeBox(); else openBox(); });
  endBtn.addEventListener('click', closeBox);
  xBtn.addEventListener('click', closeBox);

  // ─── STT ───
  function startListening() {
    if (!recog || isListening || !isActive) return;
    isListening=true; updateUI();
    try { recog.start(); } catch(_) { isListening=false; updateUI(); }
  }

  function stopListening() {
    if (!recog || !isListening) return;
    isListening=false; updateUI();
    try { recog.stop(); } catch(_){}
  }

  if (recog) {
    recog.onstart = function(){ isListening=true; updateUI(); };
    recog.onresult = function(e){
      var final='';
      for (var i=e.resultIndex;i<e.results.length;i++) { if (e.results[i].isFinal) final+=e.results[i][0].transcript; }
      final = final.trim();
      if (final && isActive) {
        isListening=false; updateUI();
        handleTalk(final);
      }
    };
    recog.onerror = function(e){
      isListening=false; updateUI();
      if (e.error==='no-speech' && isActive) { setTimeout(function(){ if(isActive) startListening(); }, 300); return; }
      if (e.error==='aborted') return;
      setStatus('Voice error: '+e.error+'. Try again.');
    };
    recog.onend = function(){ isListening=false; updateUI(); };
  }

  // ─── Stop button (interrupt speaking) ───
  stopBtn.addEventListener('click', function(){
    if (isSpeaking) {
      stopSpeaking();
      isSpeaking=false;
      setStatus('Stopped. Tap Talk to continue.');
      updateUI();
      // Auto-restart listening
      setTimeout(function(){ if (isActive && !isSpeaking) startListening(); }, 200);
    }
  });

  // ─── Main conversation flow ───
  async function handleTalk(text) {
    if (!text || !isActive) return;

    addLine('You', text);
    setStatus('Thinking...');
    isThinking=true; updateUI();

    history.push({ role:'user', content:text });
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-10))); } catch(_){}

    var reply = await callAI(text);

    if (!reply) {
      reply = searchKB(text) || "I can't respond right now. Please try again or WhatsApp +91 8770462942.";
    }

    // Check if still active (user might have closed while waiting)
    if (!isActive) return;

    history.push({ role:'assistant', content:reply });
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-10))); } catch(_){}

    isThinking=false;
    setStatus(''); // remove status
    addLine('DSEL', reply);
    isSpeaking=true; updateUI();

    // Speak reply, then auto-listen
    speak(reply, function(){
      if (!isActive) return;
      isSpeaking=false; updateUI();
      setStatus('Listening... speak now!');
      startListening();
    });
  }

  // ─── Talk button ───
  talkBtn.addEventListener('click', function(){
    // Prime audio
    if (hasTTS && !ttsVoice) { speechSynthesis.cancel(); loadVoices(); }

    if (!isActive) {
      // Start new conversation
      isActive=true; isOpen=true;
      box.classList.add('open');
      bodyEl.innerHTML = '';
      setStatus('Listening... speak now!');
      loadVoices();
      updateUI();
      startListening();
    } else if (isListening) {
      // Stop listening (manual send)
      stopListening();
      setStatus('Tap Talk to speak.');
    } else {
      // Resume listening
      setStatus('Listening... speak now!');
      startListening();
    }
  });
})();