/* Shared by every page: dark/light theme, fullscreen button, and the "enter your name" popup.
   The name is asked once, saved in this browser (localStorage) and can be edited from the name button. */
(() => {
  const root = document.documentElement;
  const NAME_KEY = 'galkot_user_name';

  /* ---------- theme (applied immediately to avoid a flash) ---------- */
  let theme = 'dark';
  try { theme = localStorage.getItem('galkot_theme') === 'light' ? 'light' : 'dark'; } catch (e) {}
  function applyTheme(t) {
    theme = t; root.dataset.theme = t;
    const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = t === 'light' ? '#f2f6fb' : '#0b1220';
    const b = document.getElementById('themeToggle');
    if (b) { b.textContent = t === 'light' ? '🌙' : '☀️'; b.title = t === 'light' ? 'Switch to dark mode' : 'Switch to light mode'; b.setAttribute('aria-label', b.title); }
  }
  applyTheme(theme);

  /* ---------- name: asked once, then remembered in this browser (kept after refresh) and editable ---------- */
  let name = '';
  try { name = localStorage.getItem(NAME_KEY) || ''; } catch (e) {}
  if (!name) { try { name = sessionStorage.getItem(NAME_KEY) || ''; } catch (e) {} }   // older version stored it per tab
  const waiting = [], listeners = [];
  window.Galkot = {
    get name() { return name; },
    onName(cb) { if (name) cb(name); else waiting.push(cb); },
    onNameChange(cb) { listeners.push(cb); },
    editName() { askName(true); }
  };

  function setName(n) {
    const changed = name && name !== n;
    name = n;
    try { localStorage.setItem(NAME_KEY, n); } catch (e) { try { sessionStorage.setItem(NAME_KEY, n); } catch (e2) {} }
    document.body.classList.remove('need-name');
    paintChip();
    waiting.splice(0).forEach(cb => cb(name));
    if (changed) listeners.forEach(cb => cb(name));
  }
  function paintChip() {
    const c = document.getElementById('userChip');
    if (c) { c.hidden = !name; c.textContent = '👤 ' + name + ' ✎'; c.title = 'Edit your name'; c.setAttribute('aria-label', 'Your name is ' + name + '. Edit name'); }
  }

  function askName(editing) {
    if (document.getElementById('nameModal')) return;
    if (!editing) document.body.classList.add('need-name');
    const wrap = document.createElement('div');
    wrap.className = 'modal-backdrop'; wrap.id = 'nameModal';
    wrap.innerHTML = '<section class="modal name-modal" role="dialog" aria-modal="true" aria-labelledby="nameTitle">' +
      '<div class="eyebrow">' + (editing ? 'EDIT NAME' : 'WELCOME') + '</div><h2 id="nameTitle">' + (editing ? 'Change your name' : 'What is your name?') + '</h2>' +
      '<p class="muted">We use it for your results and the typing race. It is saved in this browser, so you will not be asked again after a refresh — you can edit it any time from the name button at the top.</p>' +
      '<form id="nameForm"><input id="nameInput" maxlength="22" minlength="2" autocomplete="nickname" placeholder="Your name" required>' +
      '<button class="btn full" type="submit">' + (editing ? 'Save name' : 'Start typing') + '</button>' +
      (editing ? '<button class="secondary full" type="button" id="nameCancel">Cancel</button>' : '') + '</form><p id="nameMsg" class="notice"></p></section>';
    document.body.appendChild(wrap);
    const input = wrap.querySelector('#nameInput');
    if (editing) input.value = name;
    setTimeout(() => { input.focus(); input.select(); }, 30);
    const close = () => { document.removeEventListener('keydown', onKey, true); wrap.remove(); };
    const onKey = e => { if (editing && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } };
    wrap.querySelector('#nameForm').addEventListener('submit', e => {
      e.preventDefault();
      const v = input.value.replace(/\s+/g, ' ').trim();
      if (v.length < 2) { wrap.querySelector('#nameMsg').textContent = 'Please enter at least 2 characters.'; return; }
      close(); setName(v);
    });
    if (editing) {
      document.addEventListener('keydown', onKey, true);
      wrap.querySelector('#nameCancel').addEventListener('click', close);
      wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
    } else {
      // first visit: keep focus inside the popup until a name is entered
      wrap.addEventListener('focusout', () => setTimeout(() => { if (document.body.contains(wrap) && !wrap.contains(document.activeElement)) input.focus(); }, 0));
    }
  }

  /* ---------- nav tools ---------- */
  function buildTools() {
    const host = document.querySelector('.navlinks') || document.querySelector('.nav');
    if (!host) return;
    const box = document.createElement('div'); box.className = 'nav-tools';
    box.innerHTML = '<button id="userChip" class="user-chip" type="button" hidden></button>' +
      '<button id="themeToggle" class="tool-btn" type="button"></button>' +
      '<button id="fsToggle" class="tool-btn" type="button" title="Fullscreen" aria-label="Fullscreen">⛶</button>';
    host.appendChild(box);
    box.querySelector('#themeToggle').addEventListener('click', () => {
      const t = theme === 'light' ? 'dark' : 'light';
      try { localStorage.setItem('galkot_theme', t); } catch (e) {}
      applyTheme(t);
    });
    box.querySelector('#userChip').addEventListener('click', () => askName(true));
    const fs = box.querySelector('#fsToggle');
    const canFs = document.fullscreenEnabled || document.webkitFullscreenEnabled;
    if (!canFs) fs.hidden = true;
    fs.addEventListener('click', () => {
      const on = document.fullscreenElement || document.webkitFullscreenElement;
      if (on) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
    });
    const paintFs = () => { const on = document.fullscreenElement || document.webkitFullscreenElement; fs.textContent = on ? '🗗' : '⛶'; fs.title = on ? 'Exit fullscreen' : 'Fullscreen'; };
    document.addEventListener('fullscreenchange', paintFs); document.addEventListener('webkitfullscreenchange', paintFs);
    applyTheme(theme); paintChip();
  }

  document.addEventListener('DOMContentLoaded', () => {
    buildTools();
    if (document.body.hasAttribute('data-ask-name') && !name) askName();
    else if (name) paintChip();
  });
})();
