/* Live hand guide: both hands stay dim; only the finger that must press the next key lights up (with a
   guidance sentence). A key press plays a short "press" animation (green = correct, red = wrong).
   Finger ids: 0-3 left pinky..index, 4-7 right index..pinky, 8 = thumbs (Space). Used automatically by keyboard.js. */
(() => {
  const NP = ['कान्छी औँला', 'साइँली औँला', 'माझी औँला', 'चोर औँला', 'चोर औँला', 'माझी औँला', 'साइँली औँला', 'कान्छी औँला', 'बुढी औँला'];
  const EN = ['Pinky', 'Ring', 'Middle', 'Index', 'Index', 'Middle', 'Ring', 'Pinky', 'Thumb'];
  const rows = [
    ['`1234567890-=', '~!@#$%^&*()_+', [0, 0, 1, 2, 3, 3, 4, 4, 5, 6, 7, 7, 7]],
    ['qwertyuiop[]\\', 'QWERTYUIOP{}|', [0, 1, 2, 3, 3, 4, 4, 5, 6, 7, 7, 7, 7]],
    ["asdfghjkl;'", 'ASDFGHJKL:"', [0, 1, 2, 3, 3, 4, 4, 5, 6, 7, 7]],
    ['zxcvbnm,./', 'ZXCVBNM<>?', [0, 1, 2, 3, 3, 4, 4, 5, 6, 7]]
  ];
  const map = {};                                   // char -> { f: finger, shift: finger|null }
  rows.forEach(([lo, up, f]) => [...lo].forEach((c, i) => {
    map[c] = { f: f[i], shift: null };
    map[up[i]] = { f: f[i], shift: f[i] <= 3 ? 7 : 0 };   // Shift is held by the OTHER hand's pinky
  }));
  map[' '] = { f: 8, shift: null };
  const handOf = f => (f <= 3 ? 'left' : f <= 7 ? 'right' : 'both');
  const handNp = h => (h === 'left' ? 'देब्रे हात' : h === 'right' ? 'दाहिने हात' : 'दुवै हात');
  const handEn = h => (h === 'left' ? 'Left hand' : h === 'right' ? 'Right hand' : 'Both thumbs');

  // finger layout per hand: [id, height]
  const left = [[0, 62], [1, 82], [2, 92], [3, 82]], right = [[4, 82], [5, 92], [6, 82], [7, 62]];
  const handHtml = (side, fingers) => {
    const f = fingers.map(([id, h]) => `<div class="hg-f" data-f="${id}" style="--c:var(--f${id});--h:${h}px"><i></i><span></span></div>`).join('');
    const t = `<div class="hg-f hg-t" data-f="8" data-side="${side}" style="--c:var(--fth);--h:46px"><i></i><span></span></div>`;
    return `<div class="hg-hand hg-${side}"><div class="hg-fingers">${side === 'left' ? f + t : t + f}</div><div class="hg-palm"></div></div>`;
  };

  function mount(el) {
    el.innerHTML = `<div class="hg-info" aria-live="polite"><div class="hg-key" id="hgKey">–</div><div class="hg-text"><b id="hgTitle">Start typing</b><span id="hgSub">Highlighted finger shows which finger to use.</span></div></div>
      <div class="hg-hands" aria-hidden="true">${handHtml('left', left)}${handHtml('right', right)}</div>`;
    const $ = s => el.querySelector(s);
    const all = [...el.querySelectorAll('.hg-f')];
    const fingerEls = id => all.filter(x => +x.dataset.f === id);
    let active = [], timers = [];
    const clear = () => { active.forEach(x => { x.classList.remove('on', 'sh'); x.lastChild.textContent = ''; }); active = []; };

    function setNext(ch) {
      clear();
      const m = ch === undefined ? null : map[ch];
      if (!m) {
        $('#hgKey').textContent = '–'; $('#hgKey').style.removeProperty('--c');
        $('#hgTitle').textContent = ch === undefined ? 'Well done!' : 'Press ' + (ch === '\n' ? 'Enter' : ch);
        $('#hgSub').textContent = ch === undefined ? 'Both hands are resting.' : '';
        return;
      }
      const h = handOf(m.f);
      const label = ch === ' ' ? 'Space' : ch;
      fingerEls(m.f).forEach(x => { x.classList.add('on'); x.lastChild.textContent = ch === ' ' ? '␣' : ch; active.push(x); });   // the key to press appears on the fingertip
      $('#hgKey').textContent = label; $('#hgKey').style.setProperty('--c', `var(--f${m.f === 8 ? 'th' : m.f})`);
      if (m.shift !== null) {
        fingerEls(m.shift).forEach(x => { x.classList.add('sh'); x.lastChild.textContent = '⇧'; active.push(x); });
        $('#hgTitle').textContent = `${handEn(h)} ${EN[m.f]} → ${label}  (+ Shift with ${handEn(handOf(m.shift)).toLowerCase()} ${EN[m.shift].toLowerCase()})`;
        $('#hgSub').textContent = `${handNp(handOf(m.shift))}को ${NP[m.shift]}ले Shift थिचेर ${handNp(h)}को ${NP[m.f]}ले “${label}” थिच्नुहोस्।`;
      } else {
        $('#hgTitle').textContent = ch === ' ' ? 'Either thumb → Space' : `${handEn(h)} ${EN[m.f]} → ${label}`;
        $('#hgSub').textContent = ch === ' ' ? 'बुढी औँलाले Spacebar थिच्नुहोस् (दुवै थम्ब चल्छ)।' : `${handNp(h)}को ${NP[m.f]}ले “${label}” थिच्नुहोस्।`;
      }
    }
    function flash(ch, ok) {
      const m = map[ch]; if (!m) return;
      const ids = [m.f]; if (m.shift !== null) ids.push(m.shift);
      ids.forEach(id => fingerEls(id).forEach(x => {
        x.classList.remove('press-ok', 'press-bad'); void x.offsetWidth;
        x.classList.add(ok ? 'press-ok' : 'press-bad');
        setTimeout(() => x.classList.remove('press-ok', 'press-bad'), 260);
      }));
    }
    return { setNext, flash };
  }
  window.GalkotHands = { mount };
})();
