// DSEL AI Chat Widget — floating bubble, multimodal (text + image + PDF)
(function(){
  if (window.__dselChatLoaded) return;
  window.__dselChatLoaded = true;

  const STORAGE_KEY = 'dsel-chat-history';
  const WELCOME = "Hi! I am the DSEL Assistant. I can help with course info, fees, batches, English practice, and grammar doubts. You can also send me a photo of your homework or a PDF and I will help. How can I help you today?";
  const MAX_FILE_MB = 8;

  const css = `
.dsel-fab{position:fixed;bottom:22px;right:90px;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,var(--brand,#04415f),#0a6b96);color:#fff;display:grid;place-items:center;font-size:1.6rem;box-shadow:0 10px 30px rgba(4,65,95,.45);z-index:60;border:none;cursor:pointer;transition:transform .2s ease}
.dsel-fab:hover{transform:scale(1.07)}
.dsel-fab .badge{position:absolute;top:-4px;right:-4px;background:#ef4444;color:#fff;border-radius:999px;padding:2px 7px;font-size:.65rem;font-weight:800;border:2px solid var(--bg,#fff)}
.dsel-chat{position:fixed;bottom:90px;right:22px;width:400px;max-width:calc(100vw - 30px);height:600px;max-height:calc(100vh - 110px);background:var(--card-bg,#fff);border:1px solid var(--line,#d8e2e7);border-radius:18px;box-shadow:0 20px 60px rgba(1,30,44,.35);z-index:70;display:none;flex-direction:column;overflow:hidden;animation:dselPop .25s ease}
.dsel-chat.open{display:flex}
@keyframes dselPop{from{transform:scale(.85);opacity:0}to{transform:scale(1);opacity:1}}
.dsel-head{padding:14px 18px;background:linear-gradient(135deg,var(--brand,#04415f),#0a6b96);color:#fff;display:flex;align-items:center;gap:12px}
.dsel-head .av{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.18);display:grid;place-items:center;font-size:1.2rem;flex-shrink:0}
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
.dsel-msg .pic{width:30px;height:30px;border-radius:50%;background:var(--brand,#04415f);color:#fff;display:grid;place-items:center;font-size:.8rem;font-weight:800;flex-shrink:0}
.dsel-msg.user .pic{background:var(--accent,#ffb547);color:#3a2400}
.dsel-msg .att{display:block;margin-bottom:6px;border-radius:10px;overflow:hidden;border:1px solid var(--line,#d8e2e7);background:#fff;max-width:240px}
.dsel-msg .att img{width:100%;display:block;max-height:200px;object-fit:cover}
.dsel-msg .att .pdfchip{padding:10px 12px;display:flex;align-items:center;gap:10px;font-size:.85rem;color:var(--ink,#011e2c);background:#fff}
.dsel-msg .att .pdfchip i{color:#dc2626;font-size:1.4rem}
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
.dsel-input{padding:10px 12px;border-top:1px solid var(--line,#d8e2e7);display:flex;gap:6px;align-items:center;background:var(--card-bg,#fff)}
.dsel-input button.attach{background:var(--bg-alt,#e6edf0);color:var(--ink,#011e2c);border:none;width:38px;height:38px;border-radius:50%;cursor:pointer;display:grid;place-items:center;font-size:1.05rem;flex-shrink:0;transition:.15s}
.dsel-input button.attach:hover{background:var(--brand,#04415f);color:#fff}
.dsel-input input{flex:1;padding:9px 14px;border:1px solid var(--line,#d8e2e7);border-radius:999px;font-size:.92rem;background:var(--bg,#f1f5f7);color:var(--ink,#011e2c);outline:none;font-family:inherit;min-width:0}
.dsel-input input:focus{border-color:var(--brand,#04415f)}
.dsel-input button.send{background:var(--brand,#04415f);color:#fff;border:none;width:42px;height:42px;border-radius:50%;cursor:pointer;display:grid;place-items:center;font-size:1rem;transition:transform .15s;flex-shrink:0}
.dsel-input button.send:hover:not(:disabled){transform:scale(1.06)}
.dsel-input button.send:disabled{opacity:.5;cursor:not-allowed}
.dsel-foot{padding:8px;text-align:center;font-size:.7rem;color:var(--muted,#56707d);background:var(--card-bg,#fff);border-top:1px solid var(--line,#d8e2e7)}
@media (max-width:520px){
  .dsel-chat{right:10px;left:10px;width:auto;bottom:80px;height:calc(100vh - 100px)}
  .dsel-fab{right:80px;bottom:18px;width:52px;height:52px}
}
`;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  const fab = document.createElement('button');
  fab.className = 'dsel-fab'; fab.title = 'Chat with DSEL Assistant';
  fab.innerHTML = '<i class="bi bi-chat-dots-fill"></i><span class="badge">AI</span>';
  document.body.appendChild(fab);

  const chat = document.createElement('div');
  chat.className = 'dsel-chat';
  chat.innerHTML = `
    <div class="dsel-head">
      <div class="av"><i class="bi bi-robot"></i></div>
      <div class="ti"><strong>DSEL Assistant</strong><small>Online · AI helper</small></div>
      <button class="clear" title="Clear chat"><i class="bi bi-arrow-counterclockwise"></i></button>
      <button class="close" title="Close"><i class="bi bi-x-lg"></i></button>
    </div>
    <div class="dsel-msgs"></div>
    <div class="dsel-suggest"></div>
    <div class="dsel-pendings"></div>
    <div class="dsel-input">
      <button class="attach" title="Attach image or PDF"><i class="bi bi-paperclip"></i></button>
      <input type="text" placeholder="Type your message…" maxlength="500" autocomplete="off">
      <button class="send" disabled><i class="bi bi-send-fill"></i></button>
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

  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  function renderAttachmentInBubble(att){
    if (att.mime.startsWith('image/')) {
      return '<span class="att"><img src="data:'+att.mime+';base64,'+att.dataBase64+'" alt=""></span>';
    }
    return '<span class="att"><span class="pdfchip"><i class="bi bi-file-earmark-pdf-fill"></i><span>'+escapeHtml(att.name||'PDF file')+'</span></span></span>';
  }

  function renderMessage(role, text, atts){
    const m = document.createElement('div');
    m.className = 'dsel-msg ' + (role === 'assistant' ? 'bot' : 'user');
    const pic = role === 'assistant' ? '<div class="pic"><i class="bi bi-robot"></i></div>' : '<div class="pic">You</div>';
    const attHtml = (atts||[]).map(renderAttachmentInBubble).join('');
    m.innerHTML = pic + '<div class="bubble">' + attHtml + escapeHtml(text||'') + '</div>';
    msgsEl.appendChild(m);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    return m;
  }

  function renderTyping(){
    const m = document.createElement('div');
    m.className = 'dsel-msg bot';
    m.innerHTML = '<div class="pic"><i class="bi bi-robot"></i></div><div class="bubble"><div class="dsel-typing"><span></span><span></span><span></span></div></div>';
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
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history })
      });
      const data = await r.json().catch(() => ({}));
      typing.remove();
      const reply = data.reply || "Sorry, I could not respond. Please try again or message us on WhatsApp at +91 8770462942.";
      history.push({ role: 'assistant', content: reply });
      // Don't store huge attachments forever — strip them after send
      const trimmed = history.map((m,i) => i < history.length - 2 ? {...m, attachments: undefined} : m);
      saveHistory(trimmed);
      history = trimmed;
      renderMessage('assistant', reply);
    } catch(err) {
      typing.remove();
      renderMessage('assistant', "I am having trouble connecting. Please check your internet, or message us on WhatsApp at +91 8770462942.");
    } finally {
      sendBtn.disabled = !inputEl.value.trim() && !pendingAttachments.length;
      inputEl.focus();
    }
  }

  fab.addEventListener('click', () => {
    chat.classList.toggle('open');
    if (chat.classList.contains('open')) {
      showHistory(); renderSuggestions();
      setTimeout(() => inputEl.focus(), 100);
    }
  });
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
