// DSEL Gamification — XP points, Badges, Streaks, Levels
(function(){
  var STORAGE_KEY = 'dsel-gamification';

  var BADGES = [
    { id:'first-steps', name:'First Steps', icon:'👣', desc:'Earn your first 50 XP', check:function(s){return s.xp>=50;} },
    { id:'learner', name:'Quick Learner', icon:'📚', desc:'Earn 500 XP', check:function(s){return s.xp>=500;} },
    { id:'scholar', name:'Scholar', icon:'🎓', desc:'Earn 2000 XP', check:function(s){return s.xp>=2000;} },
    { id:'master', name:'English Master', icon:'🏆', desc:'Earn 5000 XP', check:function(s){return s.xp>=5000;} },
    { id:'streak7', name:'Weekly Warrior', icon:'🔥', desc:'7-day streak', check:function(s){return s.streak>=7;} },
    { id:'streak30', name:'Monthly Legend', icon:'💪', desc:'30-day streak', check:function(s){return s.streak>=30;} },
    { id:'reader', name:'Speed Reader', icon:'📖', desc:'Read 10 passages', check:function(s){return (s.activities&&s.activities.reading||0)>=10;} },
    { id:'speaker', name:'Confident Speaker', icon:'🎙️', desc:'20 speech practices', check:function(s){return (s.activities&&s.activities.speech||0)>=20;} },
    { id:'tested', name:'Test Taker', icon:'📝', desc:'Take the placement test', check:function(s){return (s.activities&&s.activities.placement||0)>=1;} },
    { id:'challenger', name:'Daily Challenger', icon:'⚡', desc:'5 daily challenges', check:function(s){return (s.activities&&s.activities.daily||0)>=5;} }
  ];

  var LEVELS = [
    { name:'Beginner', minXP:0, icon:'🌱' },
    { name:'Learner', minXP:100, icon:'📗' },
    { name:'Intermediate', minXP:400, icon:'📘' },
    { name:'Advanced', minXP:1000, icon:'📙' },
    { name:'Expert', minXP:2500, icon:'📕' },
    { name:'Master', minXP:5000, icon:'👑' },
    { name:'Legend', minXP:10000, icon:'🌟' }
  ];

  function defaultState() {
    return { xp:0, streak:0, lastLogin:null, badges:[], activities:{reading:0,speech:0,placement:0,daily:0}, totalActivities:0 };
  }

  function load() {
    try { var s=JSON.parse(localStorage.getItem(STORAGE_KEY)); return s||defaultState(); } catch(_){ return defaultState(); }
  }

  function save(st) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(st)); } catch(_){} }

  function getLevel(xp) {
    var lvl = LEVELS[0];
    for (var i=0;i<LEVELS.length;i++) { if (xp>=LEVELS[i].minXP) lvl=LEVELS[i]; }
    return lvl;
  }

  function nextLevel(xp) {
    for (var i=0;i<LEVELS.length;i++) { if (xp<LEVELS[i].minXP) return LEVELS[i]; }
    return null;
  }

  function checkLogin() {
    var st = load();
    var today = new Date().toDateString();
    var yesterday = new Date(Date.now()-86400000).toDateString();
    if (st.lastLogin === today) return st;
    if (st.lastLogin === yesterday) { st.streak++; }
    else if (!st.lastLogin) { st.streak = 1; }
    else { st.streak = 1; }
    st.lastLogin = today; st.xp += 5;
    checkBadges(st); save(st); updateDOM(st);
    return st;
  }

  function earnXP(amount, source) {
    var st = load();
    st.xp += (amount || 0); st.totalActivities++;
    if (source) {
      if (!st.activities) st.activities = {};
      if (source==='reading-speed') st.activities.reading=(st.activities.reading||0)+1;
      else if (source==='speech-practice') st.activities.speech=(st.activities.speech||0)+1;
      else if (source==='placement-test') st.activities.placement=(st.activities.placement||0)+1;
      else if (source==='daily-challenge') st.activities.daily=(st.activities.daily||0)+1;
    }
    checkBadges(st); save(st); updateDOM(st);
    return st;
  }

  function checkBadges(st) {
    if (!st.badges) st.badges = [];
    var earned = false;
    for (var i=0;i<BADGES.length;i++) {
      if (st.badges.indexOf(BADGES[i].id)===-1 && BADGES[i].check(st)) {
        st.badges.push(BADGES[i].id); earned = true;
        showBadgeToast(BADGES[i]);
      }
    }
    return earned;
  }

  function showBadgeToast(badge) {
    var el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:9999;background:linear-gradient(135deg,#04415f,#0a6b96);color:#fff;padding:14px 24px;border-radius:14px;font-weight:700;font-size:.95rem;box-shadow:0 10px 40px rgba(0,0,0,.3);display:flex;align-items:center;gap:10px;pointer-events:none;animation:badgeSlideIn .5s ease';
    el.innerHTML = '<span style="font-size:1.5rem">'+badge.icon+'</span><div><div style="font-size:.7rem;opacity:.8;text-transform:uppercase;letter-spacing:1px">Badge Unlocked!</div><div>'+badge.name+'</div></div>';
    document.body.appendChild(el);
    setTimeout(function(){ el.style.opacity='0'; el.style.transition='opacity .5s'; }, 3000);
    setTimeout(function(){ if(el.parentNode) el.remove(); }, 3500);
    if (!document.getElementById('dsel-badge-anim')) {
      var s = document.createElement('style'); s.id='dsel-badge-anim';
      s.textContent = '@keyframes badgeSlideIn{from{transform:translateX(-50%) translateY(-40px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}';
      document.head.appendChild(s);
    }
  }

  function updateDOM(st) {
    if (!st) st = load();
    var lvl = getLevel(st.xp);
    var nxt = nextLevel(st.xp);

    var xpEls = document.querySelectorAll('[data-dsel-xp]');
    for (var i=0;i<xpEls.length;i++) xpEls[i].textContent = st.xp;

    var lvlEls = document.querySelectorAll('[data-dsel-level]');
    for (var i=0;i<lvlEls.length;i++) lvlEls[i].textContent = lvl.icon + ' ' + lvl.name;

    var streakEls = document.querySelectorAll('[data-dsel-streak]');
    for (var i=0;i<streakEls.length;i++) streakEls[i].textContent = st.streak;

    var badgeEls = document.querySelectorAll('[data-dsel-badges]');
    for (var i=0;i<badgeEls.length;i++) {
      badgeEls[i].innerHTML = (st.badges||[]).map(function(bid){
        var b = BADGES.find(function(x){return x.id===bid;});
        return b ? '<span title="'+b.name+': '+b.desc+'" style="font-size:1.3rem;cursor:help">'+b.icon+'</span>' : '';
      }).join(' ') || '<span style="color:var(--muted);font-size:.8rem">No badges yet. Keep learning!</span>';
    }

    var barEls = document.querySelectorAll('[data-dsel-progress]');
    for (var i=0;i<barEls.length;i++) {
      var pct = nxt ? Math.round((st.xp - lvl.minXP) / (nxt.minXP - lvl.minXP) * 100) : 100;
      if (barEls[i].tagName==='DIV' || barEls[i].tagName==='SPAN') barEls[i].style.width = pct + '%';
      barEls[i].textContent = nxt ? st.xp + ' / ' + nxt.minXP + ' XP' : st.xp + ' XP (Max)';
    }
  }

  window.addEventListener('dsel-xp-earn', function(e){
    if (e.detail && e.detail.amount) earnXP(e.detail.amount, e.detail.source);
  });

  checkLogin();

  window.DSEL_Gamification = { load:load, earnXP:earnXP, getLevel:getLevel, BADGES:BADGES, LEVELS:LEVELS, updateDOM:updateDOM };
})();