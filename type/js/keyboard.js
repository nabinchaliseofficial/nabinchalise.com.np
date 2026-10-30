/* On-screen keyboard: highlights the next key to press and flashes the key you just typed
   (green = correct, red = wrong). Colour strip on each key = recommended finger. */
(() => {
  const rows = [
    { keys: '`~ 1! 2@ 3# 4$ 5% 6^ 7& 8* 9( 0) -_ =+', f: [0, 0, 1, 2, 3, 3, 4, 4, 5, 6, 7, 7, 7], tail: { label: 'Backspace', w: 2.1 } },
    { head: { label: 'Tab', w: 1.5 }, keys: 'q w e r t y u i o p [{ ]} \\|', f: [0, 1, 2, 3, 3, 4, 4, 5, 6, 7, 7, 7, 7] },
    { head: { label: 'Caps', w: 1.8 }, keys: "a s d f g h j k l ;: '\"", f: [0, 1, 2, 3, 3, 4, 4, 5, 6, 7, 7], tail: { label: 'Enter', w: 2.2 } },
    { head: { label: 'Shift', w: 2.3, shift: 'L' }, keys: 'z x c v b n m ,< .> /?', f: [0, 1, 2, 3, 3, 4, 4, 5, 6, 7], tail: { label: 'Shift', w: 2.7, shift: 'R' } }
  ];

  function mount(container) {
    const map = {}, shifts = {};
    let space = null, nextEls = [], timers = [];
    container.classList.add('kb'); container.setAttribute('aria-hidden', 'true');
    container.innerHTML = '';
    const mk = (label, w, cls) => { const d = document.createElement('div'); d.className = 'kb-key ' + (cls || ''); d.style.flex = String(w); d.textContent = label; return d; };

    rows.forEach(r => {
      const row = document.createElement('div'); row.className = 'kb-row';
      if (r.head) { const k = mk(r.head.label, r.head.w, 'kb-mod'); if (r.head.shift) shifts[r.head.shift] = k; row.appendChild(k); }
      r.keys.split(' ').forEach((tok, i) => {
        const lower = tok[0], upper = tok.length > 1 ? tok[1] : tok[0].toUpperCase();
        const k = mk(tok.length > 1 ? lower : upper, 1, 'kb-f' + r.f[i]);
        if (tok.length > 1) { k.innerHTML = `<small>${upper === '<' ? '&lt;' : upper === '>' ? '&gt;' : upper}</small>${lower === '<' ? '&lt;' : lower}`; k.classList.add('kb-two'); }
        const leftHand = r.f[i] <= 3;
        map[lower] = { el: k, shift: null };
        if (upper !== lower) map[upper] = { el: k, shift: leftHand ? 'R' : 'L' };
        row.appendChild(k);
      });
      if (r.tail) { const k = mk(r.tail.label, r.tail.w, 'kb-mod'); if (r.tail.shift) shifts[r.tail.shift] = k; row.appendChild(k); }
      container.appendChild(row);
    });
    const last = document.createElement('div'); last.className = 'kb-row kb-last';
    space = mk('Space', 6, 'kb-space kb-f9'); last.appendChild(space); container.appendChild(last);
    map[' '] = { el: space, shift: null };

    const hg = window.GalkotHands && document.getElementById('handGuide') ? window.GalkotHands.mount(document.getElementById('handGuide')) : null;
    const parts = ch => { const m = map[ch]; return m ? [m.el, m.shift ? shifts[m.shift] : null].filter(Boolean) : []; };
    return {
      setNext(ch) {
        nextEls.forEach(e => e.classList.remove('next')); nextEls = [];
        if (hg) hg.setNext(ch);
        if (ch === undefined) return;
        nextEls = parts(ch); nextEls.forEach(e => e.classList.add('next'));
      },
      flash(ch, ok) {
        if (hg) hg.flash(ch, ok);
        const cls = ok ? 'hit' : 'miss';
        parts(ch).forEach(e => { e.classList.add(cls); setTimeout(() => e.classList.remove(cls), 220); });
      }
    };
  }
  window.GalkotKeyboard = { mount };
})();
