// Theme toggle (with persistence + system pref)
(function(){
  const root = document.documentElement;
  const stored = localStorage.getItem('dsel-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial = stored || (prefersDark ? 'dark' : 'light');
  root.setAttribute('data-theme', initial);
})();

// Google Sheet webhook URL (paste your Apps Script Web App URL)
const SHEET_WEBHOOK_URL = '';
function postToSheet(payload) {
  if (!SHEET_WEBHOOK_URL) return Promise.resolve();
  return fetch(SHEET_WEBHOOK_URL, {
    method: 'POST', mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  }).catch(() => {});
}

// User store (browser localStorage as a simple "DB")
const Users = {
  all() { try { return JSON.parse(localStorage.getItem('dsel-users') || '[]'); } catch(_){ return []; } },
  save(arr) { localStorage.setItem('dsel-users', JSON.stringify(arr)); },
  findByEmailOrMobile(id) {
    const v = (id || '').trim().toLowerCase();
    return this.all().find(u => (u.email||'').toLowerCase() === v || (u.mobile||'').replace(/\s+/g,'') === v.replace(/\s+/g,''));
  },
  add(u) { const a = this.all(); a.push(u); this.save(a); }
};
const Session = {
  get current() { try { return JSON.parse(localStorage.getItem('dsel-current') || 'null'); } catch(_){ return null; } },
  login(user) { localStorage.setItem('dsel-current', JSON.stringify(user)); },
  logout() { localStorage.removeItem('dsel-current'); }
};

document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;

  // Header theme toggle button
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      localStorage.setItem('dsel-theme', next);
      updateDrawerThemeLabel();
    });
  });

  // Drawer (left)
  const drawer = document.getElementById('drawer');
  const overlay = document.getElementById('drawerOverlay');
  const openBtn = document.getElementById('drawerToggle');
  const closeBtn = document.getElementById('drawerClose');
  const drawerThemeBtn = document.getElementById('drawerThemeToggle');
  const drawerThemeLabel = document.getElementById('drawerThemeLabel');
  const drawerLogout = document.getElementById('drawerLogout');

  function openDrawer() {
    if (!drawer) return;
    drawer.classList.add('open'); overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    refreshDrawerUser();
  }
  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove('open'); overlay.classList.remove('open');
    document.body.style.overflow = '';
  }
  if (openBtn) openBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (overlay) overlay.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });
  if (drawerThemeBtn) drawerThemeBtn.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem('dsel-theme', next);
    updateDrawerThemeLabel();
  });
  function updateDrawerThemeLabel() {
    if (!drawerThemeLabel) return;
    drawerThemeLabel.textContent = root.getAttribute('data-theme') === 'dark' ? 'Light Mode' : 'Dark Mode';
  }
  updateDrawerThemeLabel();
  if (drawerLogout) drawerLogout.addEventListener('click', () => {
    Session.logout(); refreshDrawerUser();
    location.href = '/';
  });

  function refreshDrawerUser() {
    const cur = Session.current;
    const av = document.getElementById('drawerAvatar');
    const nm = document.getElementById('drawerUserName');
    const ml = document.getElementById('drawerUserMail');
    const auth = document.getElementById('drawerAuthBlock');
    const me = document.getElementById('drawerUserBlock');
    if (cur) {
      if (av) av.textContent = (cur.name || 'U')[0].toUpperCase();
      if (nm) nm.textContent = cur.name || 'Student';
      if (ml) ml.textContent = cur.email || cur.mobile || '';
      if (auth) auth.style.display = 'none';
      if (me) me.style.display = '';
      if (drawerLogout) drawerLogout.style.display = '';
    } else {
      if (av) av.textContent = 'G';
      if (nm) nm.textContent = 'Guest';
      if (ml) ml.textContent = 'Sign in to access your account';
      if (auth) auth.style.display = '';
      if (me) me.style.display = 'none';
      if (drawerLogout) drawerLogout.style.display = 'none';
    }
  }
  refreshDrawerUser();
  document.querySelectorAll('.year').forEach(el => el.textContent = new Date().getFullYear());

  // Mobile menu (top nav)
  const toggle = document.querySelector('.menu-toggle');
  const menu = document.querySelector('.menu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => menu.classList.toggle('open'));
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => menu.classList.remove('open')));
  }

  // Reveal on scroll
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity = '1';
        e.target.style.transform = 'translateY(0)';
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity .6s ease, transform .6s ease';
    io.observe(el);
  });

  // Animated counters
  const numIo = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || '';
      let cur = 0;
      const step = Math.max(1, Math.floor(target / 40));
      const t = setInterval(() => {
        cur += step;
        if (cur >= target) { cur = target; clearInterval(t); }
        el.textContent = cur.toLocaleString('en-IN') + suffix;
      }, 30);
      numIo.unobserve(el);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('[data-count]').forEach(n => numIo.observe(n));

  // Enquiry form -> WhatsApp
  const form = document.querySelector('#enquiry-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const text = `New Enquiry from website%0A%0A` +
        `Name: ${encodeURIComponent(data.get('name') || '')}%0A` +
        `Phone: ${encodeURIComponent(data.get('phone') || '')}%0A` +
        `Course: ${encodeURIComponent(data.get('course') || '')}%0A` +
        `Message: ${encodeURIComponent(data.get('message') || '')}`;
      window.open(`https://wa.me/918770462942?text=${text}`, '_blank');
    });
  }

  // Registration form -> WhatsApp + Sheet + duplicate check
  const reg = document.querySelector('#register-form');
  if (reg) {
    reg.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = new FormData(reg);
      const errBox = document.getElementById('reg-error');
      const okBox = document.getElementById('reg-success');
      if (errBox) errBox.style.display = 'none';
      if (okBox) okBox.style.display = 'none';

      if (d.get('password') !== d.get('confirm')) {
        if (errBox) { errBox.textContent = 'Passwords do not match.'; errBox.style.display = 'block'; }
        return;
      }

      // Duplicate check (by email or mobile)
      const dupEmail = Users.findByEmailOrMobile(d.get('email'));
      const dupMobile = Users.findByEmailOrMobile(d.get('mobile'));
      if (dupEmail || dupMobile) {
        if (errBox) { errBox.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> You are already registered with this email or mobile. <a href="/login.html">Login here</a>.'; errBox.style.display = 'block'; }
        return;
      }

      const newUser = {
        name: d.get('name'),
        email: d.get('email'),
        mobile: d.get('mobile'),
        gender: d.get('gender'),
        profession: d.get('profession'),
        institution: d.get('institution'),
        city: d.get('city'),
        course: d.get('course'),
        password: d.get('password'), // stored locally (demo only)
        registeredAt: new Date().toISOString()
      };
      Users.add(newUser);
      Session.login({ name: newUser.name, email: newUser.email, mobile: newUser.mobile });

      postToSheet({
        name: newUser.name, email: newUser.email, mobile: newUser.mobile,
        gender: newUser.gender, profession: newUser.profession,
        institution: newUser.institution, city: newUser.city,
        course: newUser.course, source: 'register'
      });

      const text = `New Registration%0A%0A` +
        `Name: ${encodeURIComponent(newUser.name||'')}%0A` +
        `Email: ${encodeURIComponent(newUser.email||'')}%0A` +
        `Mobile: ${encodeURIComponent(newUser.mobile||'')}%0A` +
        `Gender: ${encodeURIComponent(newUser.gender||'')}%0A` +
        `Profession: ${encodeURIComponent(newUser.profession||'')}%0A` +
        `Institution: ${encodeURIComponent(newUser.institution||'')}%0A` +
        `City: ${encodeURIComponent(newUser.city||'')}%0A` +
        `Course: ${encodeURIComponent(newUser.course||'')}`;
      window.open(`https://wa.me/918770462942?text=${text}`, '_blank');

      reg.reset();
      if (okBox) okBox.style.display = 'block';
      setTimeout(() => { location.href = '/profile.html'; }, 1500);
    });
  }

  // Login form
  const lg = document.querySelector('#login-form');
  if (lg) {
    lg.addEventListener('submit', (e) => {
      e.preventDefault();
      const d = new FormData(lg);
      const errBox = document.getElementById('login-error');
      if (errBox) errBox.style.display = 'none';

      const u = Users.findByEmailOrMobile(d.get('id'));
      if (!u) {
        if (errBox) { errBox.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> No account found. <a href="/register.html">Register here</a>.'; errBox.style.display = 'block'; }
        return;
      }
      if (u.password && u.password !== d.get('password')) {
        if (errBox) { errBox.innerHTML = '<i class="bi bi-x-circle-fill"></i> Incorrect password.'; errBox.style.display = 'block'; }
        return;
      }
      Session.login({ name: u.name, email: u.email, mobile: u.mobile });
      location.href = '/profile.html';
    });
  }
});
