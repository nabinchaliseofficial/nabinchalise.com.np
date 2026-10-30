/* Galkot Tech – Typing Practice (index.html)
   Readable rewrite: same behaviour as before, minus the blinking/entrance animation,
   plus bug fixes and a few new features (see README.txt). */
(() => {
  const $ = id => document.getElementById(id);

  /* ---------- state ---------- */
  let prompts = [], pi = 0, text = '';
  let start = null, deadline = null, timer = null, done = false;
  let correct = 0, errors = 0, result = null;
  let wrongCounts = {}, recentCorrect = [];
  let audioCtx = null, capsTimer = null;
  let aiRound = 0, aiPhase = 'assessment', remedialMistakes = {};
  let rendered = null, spans = [];
  let soundOn = true;
  try { soundOn = localStorage.getItem('galkot_sound') !== 'off'; } catch (e) {}

  const headings = ['Type. Learn. Improve.', 'Accuracy builds speed.', 'Explore computer science.', 'Every keystroke counts.'];
  const fallback = {
    numbers: ['9284017563 6041829375 1234567890 20261030 9876543210', '4091827365 7283049165 5647382910'],
    alphabets: ['ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz', 'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ'],
    symbols: ['! @ # $ % ^ & * ( ) _ + - = { } [ ] : ; , . ? /', '<> {} [] () && || == != => ++ -- ** // \\ ~ ` ; : " \''],
    words: ['computer algorithm database keyboard network software hardware programming', 'processor memory compiler interpreter cybersecurity encryption cloud server'],
    sentences: ['Computer science explores algorithms, data structures, software engineering, networks, databases, cybersecurity, and artificial intelligence.']
  };

  /* ---------- helpers ---------- */
  const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  const fmt = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const shuffle = a => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const oneLine = s => String(s).replace(/\s+/g, ' ').trim();   // the typing box is single-line: no line breaks allowed
  const cat = () => $('category').value;
  const catLabel = () => $('category').selectedOptions[0].textContent;

  function beep(f, d, t = 'triangle', v = .025) {
    if (!soundOn) return;
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
    if (!audioCtx) audioCtx = new A();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = t; o.frequency.value = f;
    g.gain.setValueAtTime(v, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(.001, audioCtx.currentTime + d);
    o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + d);
  }

  /* typewriter effect for the page heading only (the practice passage is never animated) */
  function headline() {
    let n = 0, p = 0, back = false;
    (function tick() {
      const s = headings[n];
      $('typeHeadline').textContent = s.slice(0, p);
      if (!back) { p++; if (p > s.length) { back = true; return setTimeout(tick, 1100); } }
      else { p--; if (p < 0) { back = false; n = (n + 1) % headings.length; } }
      setTimeout(tick, back ? 35 : 72);
    })();
  }

  /* ---------- passage rendering (static – no animation, no re-render per key) ---------- */
  function renderPrompt() {
    const node = $('prompt'), frag = document.createDocumentFragment();
    spans = text.split('').map(c => {
      const s = document.createElement('span');
      s.className = 'pending';
      s.textContent = c === ' ' ? ' ' : c;
      frag.appendChild(s); return s;
    });
    node.replaceChildren(frag);
    node.scrollLeft = 0; rendered = text;
  }
  function draw() {
    const node = $('prompt');
    if (rendered !== text) renderPrompt();
    const n = $('typingInput').value.length;
    let cur = null;
    for (let i = 0; i < spans.length; i++) {
      const c = i < n ? 'typed' : i === n ? 'current' : 'pending';
      if (spans[i].className !== c) spans[i].className = c;
      if (i === n) cur = spans[i];
    }
    if (cur) node.scrollLeft = Math.max(0, cur.offsetLeft - node.clientWidth * .58);
  }
  function showMessage(msg) { $('prompt').textContent = msg; rendered = null; spans = []; }
  function setText(t, label) {
    text = t; $('typingInput').value = ''; $('typingInput').dataset.last = '0';
    $('passageCount').textContent = label; draw();
  }

  /* ---------- stats ---------- */
  function errorDetails() {
    const entries = Object.entries(wrongCounts).sort((a, b) => b[1] - a[1]);
    return entries.length
      ? '<div class="mistake-list"><strong>Mistakes by character</strong>' + entries.map(([c, n]) => `<span>${esc(c === ' ' ? 'Space' : c)} — ${n} ${n === 1 ? 'time' : 'times'}</span>`).join('') + '</div>'
      : '<p class="muted">No typing errors. Excellent!</p>';
  }
  function stat() {
    if (!start) return;
    const now = Date.now();
    recentCorrect = recentCorrect.filter(t => now - t <= 10000);
    const win = Math.min(10, Math.max(1, (now - start) / 1000));          // rolling window (max 10 s)
    $('wpm').textContent = Math.round(recentCorrect.length / 5 / (win / 60));
    $('accuracy').textContent = Math.round(correct / Math.max(1, correct + errors) * 100) + '%';
    $('chars').textContent = correct;
  }

  /* ---------- personal best (stored only in this browser) ---------- */
  const bestKey = () => `galkot_best_${cat()}_${$('duration').value}`;
  function getBest() { try { return Number(localStorage.getItem(bestKey()) || 0); } catch (e) { return 0; } }
  function setBest(v) { try { localStorage.setItem(bestKey(), String(v)); } catch (e) {} }
  function updateBestLine() {
    const b = cat() === 'ai' ? 0 : getBest();
    $('bestLine').innerHTML = b ? `Personal best · ${esc(catLabel())} · ${$('duration').value} min: <b>${b} WPM</b>` : '';
  }

  /* ---------- timer ---------- */
  function begin() {
    if (start || done) return;
    start = Date.now();
    const dur = +$('duration').value * 60;
    deadline = start + dur * 1000;
    $('stats').hidden = false; $('time').textContent = fmt(dur);
    $('status').textContent = 'Timer started. Live WPM updates as you type and falls when you pause.';
    timer = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      $('time').textContent = fmt(left); stat();
      if (!left) finish();
    }, 200);
  }

  /* ---------- AI Type ---------- */
  function makeAI() {
    const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+[]{};:\'",.<>/?\\|`~';
    const chars = [...alpha];
    return Array.from({ length: Math.ceil(chars.length / 6) }, (_, i) => chars.slice(i * 6, (i + 1) * 6).join('')).join('');
  }
  function aiCongratulations() {
    clearInterval(timer); done = true; aiPhase = 'done';
    $('typingInput').disabled = true;
    $('passageCount').textContent = 'AI training complete';
    showMessage('🎉 Congratulations! You corrected every character. Your typing accuracy is improving!');
    $('status').textContent = 'AI Type complete — all missed keys have been practised successfully.';
    beep(784, .16, 'sine', .04); setTimeout(() => beep(1046, .24, 'sine', .045), 180);
  }
  function buildRemedial() {
    const missed = Object.keys(wrongCounts);
    if (!missed.length) { aiCongratulations(); return; }
    aiPhase = 'remedial'; aiRound++; remedialMistakes = {};
    setText(missed.flatMap(c => Array(3).fill(c)).join(' '), `AI correction round ${aiRound} / 3`);
    $('status').textContent = 'Only the characters you missed are shown, three times each.';
  }

  /* ---------- moving to the next passage ---------- */
  function next() {
    if (cat() === 'ai') {
      if (aiPhase === 'assessment') { Object.keys(wrongCounts).length ? buildRemedial() : aiCongratulations(); return; }
      if (aiPhase === 'remedial') {
        if (!Object.keys(remedialMistakes).length) { aiCongratulations(); return; }
        if (aiRound < 3) { wrongCounts = { ...remedialMistakes }; buildRemedial(); return; }
        finish(); return;
      }
      return;
    }
    pi = (pi + 1) % prompts.length;
    setText(prompts[pi].content, `Text ${pi + 1} / ${prompts.length}`);
    $('status').textContent = 'Completed! Next shuffled text loaded.';
  }

  /* ---------- typing ---------- */
  function input() {
    if (done || aiPhase === 'done') return;
    const el = $('typingInput'), v = el.value;
    let bad = -1;
    for (let i = 0; i < v.length; i++) { if (v[i] !== text[i]) { bad = i; break; } }
    const validLen = bad < 0 ? v.length : bad;

    if (bad !== -1) {                                   // wrong character: reject + count
      const wrong = v[bad];
      errors++; wrongCounts[wrong] = (wrongCounts[wrong] || 0) + 1;
      if (cat() === 'ai' && aiPhase === 'remedial') remedialMistakes[wrong] = (remedialMistakes[wrong] || 0) + 1;
      beep(145, .14, 'square', .05);
      el.value = v.slice(0, bad);
      $('status').textContent = 'A typing error was recorded. Keep practising.';
    }

    const last = Number(el.dataset.last || 0), newly = Math.max(0, validLen - last);
    if (newly > 0) {                                    // only brand-new correct characters score
      if (!start) begin();
      const now = Date.now();
      for (let i = 0; i < newly; i++) recentCorrect.push(now);
      correct += newly;
      el.dataset.last = String(validLen);
      beep(690, .04, 'triangle', .018);
    }
    stat(); draw();

    if (validLen === text.length && text.length > 0) { el.dataset.last = '0'; next(); }
    else if (bad === -1) { $('status').textContent = 'Correct. Keep going!'; }
  }

  /* ---------- loading passages ---------- */
  async function loadWordBank() {
    const bank = []; let offset = 0;
    while (offset < 5000) {
      const page = await db.from('typing_word_bank').select('word').order('word').range(offset, offset + 999);
      if (page.error) return null;
      bank.push(...(page.data || []));
      if (!page.data || page.data.length < 1000) break;
      offset += 1000;
    }
    if (!bank.length) return null;
    const words = shuffle(bank.map(x => x.word));
    return Array.from({ length: Math.ceil(words.length / 35) }, (_, i) => ({ content: words.slice(i * 35, (i + 1) * 35).join(' ') }));
  }
  async function load() {
    const c = cat();
    $('ownTextPanel').hidden = c !== 'own';
    if (c === 'ai') {
      aiRound = 0; aiPhase = 'assessment'; remedialMistakes = {};
      prompts = [{ content: makeAI() }]; pi = 0;
      setText(prompts[0].content, 'Full character assessment');
      return;
    }
    if (c === 'own') {
      let own = ''; try { own = sessionStorage.getItem('galkot_own_text') || ''; } catch (e) {}
      own = oneLine(own);
      prompts = [{ content: own || 'Enter your own text above, then select Use my text.' }];
    } else {
      let data = null;
      if (window.db) {
        try {
          const { data: d, error } = await db.from('typing_prompts').select('content').eq('category', c).eq('enabled', true);
          if (!error && d?.length) data = d;
          if (c === 'words') { const w = await loadWordBank(); if (w?.length) data = w; }
        } catch (e) { console.warn('Could not load texts from the database, using built-in texts.', e); }
      }
      if (!data?.length) data = (fallback[c] || fallback.sentences).map(content => ({ content }));
      data = data.map(x => ({ content: oneLine(x.content) })).filter(x => x.content);
      prompts = shuffle(data);
    }
    pi = 0;
    setText(prompts[0].content, `Text 1 / ${prompts.length}`);
  }

  /* ---------- finish / reset ---------- */
  function finish() {
    if (done) return;
    done = true; clearInterval(timer);
    $('typingInput').disabled = true;
    const elapsed = Math.max(1, (Date.now() - (start || Date.now())) / 1000);
    const accuracy = Math.round(correct / Math.max(1, correct + errors) * 100);
    const wpm = Math.round(correct / 5 / (elapsed / 60));
    result = { wpm, accuracy, correct, errors };

    let bestNote = '';
    if (cat() !== 'ai' && correct >= 10) {
      const best = getBest();
      if (wpm > best) { setBest(wpm); bestNote = best ? `<p class="new-best">🏆 New personal best! (previous: ${best} WPM)</p>` : '<p class="new-best">🏆 First personal best saved!</p>'; }
      updateBestLine();
    }
    $('finalWpm').textContent = wpm + ' WPM';
    $('finalAccuracy').textContent = accuracy + '%';
    $('finalChars').textContent = correct;
    $('finalMessage').innerHTML = (cat() === 'ai'
      ? `AI ${aiPhase === 'assessment' ? 'assessment' : 'correction'} finished.<p>Practice again to work only on the missed characters.</p>`
      : `${correct} correct characters. Your result is ready to share.`) + bestNote;
    $('finalMistakes').innerHTML = errorDetails();
    $('tryAgain').textContent = 'Practice again';
    $('resultModal').hidden = false;
    $('status').textContent = 'Time is up! Your result is ready.';
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, .24, 'sine', .045), i * 115));
  }
  function reset() {
    clearInterval(timer); timer = null; start = null; deadline = null; done = false;
    correct = 0; errors = 0; wrongCounts = {}; recentCorrect = [];
    aiPhase = 'assessment'; aiRound = 0; remedialMistakes = {};
    const el = $('typingInput');
    el.dataset.last = '0'; el.disabled = false; el.value = '';
    $('stats').hidden = true;
    $('time').textContent = fmt(+$('duration').value * 60);
    $('wpm').textContent = '0'; $('accuracy').textContent = '100%'; $('chars').textContent = '0';
    $('resultModal').hidden = true;
    $('status').textContent = 'Timer starts after your first correct character.';
    updateBestLine(); draw(); el.focus();
  }
  function resetForNextAiRound() {        // keep the AI round counters, just clear the clock/score
    correct = 0; errors = 0; start = null; clearInterval(timer); timer = null; done = false;
    $('stats').hidden = true; $('time').textContent = fmt(+$('duration').value * 60);
    $('resultModal').hidden = true; $('typingInput').disabled = false; $('typingInput').value = ''; $('typingInput').focus();
  }

  /* ---------- result image ---------- */
  function jpg() {
    if (!result) return;
    const c = document.createElement('canvas'); c.width = 1200; c.height = 675;
    const x = c.getContext('2d'), g = x.createLinearGradient(0, 0, 1200, 675);
    g.addColorStop(0, '#101e34'); g.addColorStop(1, '#07111f');
    x.fillStyle = g; x.fillRect(0, 0, 1200, 675);
    x.fillStyle = '#53d7e8'; x.font = 'bold 30px Arial'; x.fillText('GALKOT TECH  •  TYPING PRACTICE', 80, 95);
    x.fillStyle = '#edf5ff'; x.font = 'bold 66px Arial'; x.fillText('My typing result', 80, 205);
    [['SPEED', result.wpm + ' WPM'], ['ACCURACY', result.accuracy + '%'], ['CORRECT CHARACTERS', String(result.correct)]].forEach((m, i) => {
      const a = 80 + i * 365;
      x.fillStyle = '#172a43'; x.beginPath();
      if (x.roundRect) x.roundRect(a, 330, 320, 165, 20); else x.rect(a, 330, 320, 165);   // older Safari has no roundRect
      x.fill();
      x.fillStyle = '#9aabc1'; x.font = 'bold 20px Arial'; x.fillText(m[0], a + 25, 380);
      x.fillStyle = '#73e0b0'; x.font = 'bold 43px Arial'; x.fillText(m[1], a + 25, 445);
    });
    const a = document.createElement('a');
    a.download = 'galkot-tech-typing-result.jpg'; a.href = c.toDataURL('image/jpeg', .94); a.click();
  }

  /* ---------- events ---------- */
  $('typingInput').addEventListener('input', input);
  $('typingInput').addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); });
  $('promptShell').addEventListener('click', () => { if (!$('typingInput').disabled) $('typingInput').focus(); });
  $('category').addEventListener('change', async () => { await load(); reset(); });
  $('duration').addEventListener('change', () => { if (!start) reset(); updateBestLine(); });
  $('restart').addEventListener('click', async () => { if (cat() === 'ai') await load(); reset(); });
  $('closeModal').addEventListener('click', () => { $('resultModal').hidden = true; });
  $('downloadJpg').addEventListener('click', jpg);

  $('tryAgain').addEventListener('click', () => {
    if (cat() === 'ai') {
      if (aiPhase === 'assessment') { buildRemedial(); resetForNextAiRound(); return; }
      if (aiPhase === 'remedial') {
        if (!Object.keys(remedialMistakes).length) { $('resultModal').hidden = true; aiCongratulations(); return; }
        if (aiRound < 3) { wrongCounts = { ...remedialMistakes }; buildRemedial(); resetForNextAiRound(); return; }
        $('finalMessage').innerHTML = 'Three correction rounds completed. Restart AI Type to begin again.';
        $('resultModal').hidden = false; return;
      }
    }
    reset();
  });

  $('useOwnText').addEventListener('click', async () => {
    const v = oneLine($('ownText').value);
    if (!v) { $('status').textContent = 'Please enter some text first.'; return; }
    try { sessionStorage.setItem('galkot_own_text', v); } catch (e) {}
    await load(); reset();
  });

  /* sound on/off */
  function paintSound() { const b = $('soundToggle'); b.textContent = soundOn ? '🔊' : '🔇'; b.setAttribute('aria-pressed', String(soundOn)); b.title = soundOn ? 'Sound on' : 'Sound off'; }
  $('soundToggle').addEventListener('click', () => {
    soundOn = !soundOn; try { localStorage.setItem('galkot_sound', soundOn ? 'on' : 'off'); } catch (e) {}
    paintSound(); $('typingInput').focus();
  });
  paintSound();

  document.addEventListener('keydown', e => {
    if (e.code === 'CapsLock') {                        // Caps Lock notice
      const on = e.getModifierState('CapsLock');
      $('capsToast').hidden = !on; clearTimeout(capsTimer);
      if (on) capsTimer = setTimeout(() => { $('capsToast').hidden = true; }, 1800);
    }
    if (e.key === 'Escape' && $('adminModal').hidden && $('resultModal').hidden) {   // Esc = restart
      $('restart').click();
    }
  });

  headline();
  load().then(reset);
})();
