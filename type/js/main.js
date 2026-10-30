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
  let rendered = null, spans = [], wrongKey = null;
  let soundOn = true, kb = null, kbOn = true, resultShownAt = 0;
  try { soundOn = localStorage.getItem('galkot_sound') !== 'off'; } catch (e) {}

  let headings = ['Type. Learn. Improve.', 'Accuracy builds speed.', 'Explore computer science.', 'Every keystroke counts.', 'Concept by Nabin Chalise'];   // replaced by the admin-edited lines when available
  const fallback = {
    numbers: ['9284017563 6041829375 1234567890 20261030 9876543210', '4091827365 7283049165 5647382910'],
    alphabets: ['ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz', 'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ'],
    symbols: ['! @ # $ % ^ & * ( ) _ + - = { } [ ] : ; , . ? /', '<> {} [] () && || == != => ++ -- ** // \\ ~ ` ; : " \''],
    easy_words: ['computer algorithm database keyboard network software hardware programming', 'processor memory compiler interpreter cybersecurity encryption cloud server'],
    hard_words: ['asynchronous polymorphism authentication virtualization infrastructure synchronization encapsulation microservices', 'cryptography authorization optimization containerization decentralization interoperability vulnerability'],
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

  /* typewriter lines come from the database (admin page -> Typewriter tab) */
  async function loadHeadlines() {
    if (!window.db) return;
    try {
      const { data, error } = await db.from('typing_headlines').select('content').eq('enabled', true).order('sort_order').order('created_at');
      if (!error && data?.length) headings = data.map(x => x.content);
    } catch (e) {}
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

  /* ---------- helpers: Gross / Net WPM ---------- */
  // Gross = every typed character / 5 per minute.  Net = Gross minus mistakes per minute.
  const grossWpm = (c, e, sec) => (c + e) / 5 / (sec / 60);
  const netWpm = (c, e, sec) => Math.max(0, grossWpm(c, e, sec) - e / (sec / 60));

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
  const isSingle = () => cat() === 'single';
  function makeSingle() {
    const pool = [...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{};:\'",.<>/?\\|`~'];
    let out = '', prev = '';
    for (let i = 0; i < 120; i++) { let c; do { c = pool[Math.floor(Math.random() * pool.length)]; } while (c === prev); out += c; prev = c; }
    return out;
  }
  function draw() {
    const node = $('prompt');
    const n = $('typingInput').value.length;
    if (isSingle()) {                                  // one big character at a time
      node.classList.add('prompt-single'); $('promptShell').classList.add('single'); rendered = null; spans = [];
      node.textContent = text[n] || '';
      node.scrollLeft = 0;
      if (kb) kb.setNext(done ? undefined : text[n]);
      return;
    }
    node.classList.remove('prompt-single'); $('promptShell').classList.remove('single');
    if (rendered !== text) renderPrompt();
    let cur = null;
    for (let i = 0; i < spans.length; i++) {
      const c = i < n ? 'typed' : i === n ? 'current' : 'pending';
      if (spans[i].className !== c) spans[i].className = c;
      if (i === n) cur = spans[i];
    }
    if (cur) node.scrollLeft = Math.max(0, cur.offsetLeft - node.clientWidth * .58);
    if (kb) kb.setNext(done || aiPhase === 'done' ? undefined : text[n]);
  }
  function showMessage(msg) { $('prompt').textContent = msg; rendered = null; spans = []; }
  function setText(t, label) {
    text = t; $('typingInput').value = ''; $('typingInput').dataset.last = '0';
    $('passageCount').textContent = label; draw();
  }

  /* ---------- stats ---------- */
  function errorDetails() {
    const entries = Object.entries(wrongCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);   // top 3 only
    return entries.length
      ? '<div class="mistake-list"><strong>Top 3 mistakes by character</strong>' + entries.map(([c, n]) => `<span>${esc(c === ' ' ? 'Space' : c)} — ${n} ${n === 1 ? 'time' : 'times'}</span>`).join('') + '</div>'
      : '<p class="muted">No typing errors. Excellent!</p>';
  }
  function stat() {
    if (!start) return;
    const now = Date.now();
    recentCorrect = recentCorrect.filter(t => now - t <= 10000);
    const win = Math.min(10, Math.max(1, (now - start) / 1000));          // rolling window (max 10 s)
    const sec = Math.max(3, (now - start) / 1000);                        // avoid wild numbers in the first seconds
    $('wpm').textContent = Math.round(recentCorrect.length / 5 / (win / 60));
    $('grossWpm').textContent = Math.round(grossWpm(correct, errors, sec));
    $('netWpm').textContent = Math.round(netWpm(correct, errors, sec));
    $('accuracy').textContent = Math.round(correct / Math.max(1, correct + errors) * 100) + '%';
    $('chars').textContent = correct;
    $('wrongChars').textContent = errors;
  }

  /* ---------- personal best (stored only in this browser) ---------- */
  const bestKey = () => `galkot_best_${cat()}_${$('duration').value}`;
  function getBest() { try { return Number(localStorage.getItem(bestKey()) || 0); } catch (e) { return 0; } }
  function setBest(v) { try { localStorage.setItem(bestKey(), String(v)); } catch (e) {} }
  function updateBestLine() {
    const b = cat() === 'ai' ? 0 : getBest();
    $('bestLine').innerHTML = b ? `Personal best · ${esc(catLabel())} · ${$('duration').value === '0' ? 'Unlimited' : $('duration').value + ' min'}: <b>${b} WPM</b>` : '';
  }

  /* ---------- timer ---------- */
  function begin() {
    if (start || done) return;
    start = Date.now();
    const dur = +$('duration').value * 60;
    deadline = dur ? start + dur * 1000 : null;
    $('stats').hidden = false; $('time').textContent = fmt(dur);
    $('status').textContent = dur ? 'Timer started. Live WPM updates as you type and falls when you pause.' : 'Unlimited mode: type as long as you like, then press Finish to see your result.';
    timer = setInterval(() => {
      if (!deadline) { $('time').textContent = fmt(Math.floor((Date.now() - start) / 1000)); stat(); return; }   // unlimited: count up
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
    if (isSingle()) { prompts = [{ content: makeSingle() }]; pi = 0; setText(prompts[0].content, 'Single character practice'); return; }
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
      wrongKey = { got: wrong, expected: text[bad] };
      if (kb) kb.flash(wrong, false);
      $('status').textContent = `Wrong key: you typed “${wrong === ' ' ? 'Space' : wrong}” — expected “${text[bad] === ' ' ? 'Space' : text[bad]}”.`;
    }

    const last = Number(el.dataset.last || 0), newly = Math.max(0, validLen - last);
    if (newly > 0) {                                    // only brand-new correct characters score
      if (!start) begin();
      const now = Date.now();
      for (let i = 0; i < newly; i++) recentCorrect.push(now);
      correct += newly;
      el.dataset.last = String(validLen);
      beep(690, .04, 'triangle', .018);
      if (kb) kb.flash(v[validLen - 1], true);
    }
    stat(); draw();
    if (wrongKey) {                                     // briefly mark the character you should have typed in red
      const sp = isSingle() ? $('prompt') : spans[validLen];
      if (sp) { sp.classList.add('wrong'); setTimeout(() => sp.classList.remove('wrong'), 260); }
      wrongKey = null;
    }

    if (validLen === text.length && text.length > 0) { el.dataset.last = '0'; next(); }
    else if (bad === -1) { $('status').textContent = 'Correct. Keep going!'; }
  }

  /* ---------- loading passages ---------- */
  async function loadWordBank(level) {
    const bank = []; let offset = 0;
    while (offset < 5000) {
      const page = await db.from('typing_word_bank').select('word').eq('level', level).order('word').range(offset, offset + 999);
      if (page.error) return null;
      bank.push(...(page.data || []));
      if (!page.data || page.data.length < 1000) break;
      offset += 1000;
    }
    if (!bank.length) return null;
    const words = shuffle(bank.map(x => x.word));
    const per = level === 'hard' ? 20 : 35;
    return Array.from({ length: Math.ceil(words.length / per) }, (_, i) => ({ content: words.slice(i * per, (i + 1) * per).join(' ') }));
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
    if (c === 'single') {
      prompts = [{ content: makeSingle() }]; pi = 0;
      setText(prompts[0].content, 'Single character practice');
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
          if (c === 'easy_words' || c === 'hard_words') { const w = await loadWordBank(c === 'hard_words' ? 'hard' : 'easy'); if (w?.length) data = w; }
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
    const wpm = Math.round(netWpm(correct, errors, elapsed)), gross = Math.round(grossWpm(correct, errors, elapsed));
    result = { wpm, gross, accuracy, correct, errors, name: window.Galkot?.name || '' };

    let bestNote = '';
    if (cat() !== 'ai' && correct >= 10) {
      const best = getBest();
      if (wpm > best) { setBest(wpm); bestNote = best ? `<p class="new-best">🏆 New personal best! (previous: ${best} WPM)</p>` : '<p class="new-best">🏆 First personal best saved!</p>'; }
      updateBestLine();
    }
    $('resultTitle').textContent = window.Galkot?.name ? `Well typed, ${window.Galkot.name}!` : 'Well typed!';
    $('finalWpm').textContent = wpm + ' WPM';
    $('finalGross').textContent = gross + ' WPM';
    $('finalWrong').textContent = errors;
    $('finalAccuracy').textContent = accuracy + '%';
    $('finalChars').textContent = correct;
    $('finalMessage').innerHTML = (cat() === 'ai'
      ? `AI ${aiPhase === 'assessment' ? 'assessment' : 'correction'} finished.<p>Practice again to work only on the missed characters.</p>`
      : `${correct} correct characters. Your result is ready to share.`) + bestNote;
    $('finalMistakes').innerHTML = errorDetails();
    $('tryAgain').textContent = 'Practice again · Enter to Resume';
    $('resultModal').hidden = false; resultShownAt = Date.now();
    $('status').textContent = $('duration').value === '0' ? 'Session finished! Your result is ready.' : 'Time is up! Your result is ready.';
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
    $('timeLabel').textContent = $('duration').value === '0' ? 'TIME ELAPSED' : 'TIME LEFT';
    $('finishBtn').hidden = $('duration').value !== '0';
    $('wpm').textContent = '0'; $('netWpm').textContent = '0'; $('grossWpm').textContent = '0';
    $('accuracy').textContent = '100%'; $('chars').textContent = '0'; $('wrongChars').textContent = '0';
    $('resultModal').hidden = true;
    $('status').textContent = 'Timer starts after your first correct character.';
    updateBestLine(); draw();
    if (!document.body.classList.contains('need-name')) el.focus();
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
    x.fillStyle = '#edf5ff'; x.font = 'bold 66px Arial'; x.fillText(result.name ? result.name + '’s typing result' : 'My typing result', 80, 205);
    [['NET WPM', result.wpm + ''], ['GROSS WPM', result.gross + ''], ['ACCURACY', result.accuracy + '%'], ['CORRECT / WRONG', result.correct + ' / ' + result.errors]].forEach((m, i) => {
      const a = 80 + (i % 2) * 520, yy = 280 + Math.floor(i / 2) * 190;
      x.fillStyle = '#172a43'; x.beginPath();
      if (x.roundRect) x.roundRect(a, yy, 480, 165, 20); else x.rect(a, yy, 480, 165);   // older Safari has no roundRect
      x.fill();
      x.fillStyle = '#9aabc1'; x.font = 'bold 20px Arial'; x.fillText(m[0], a + 25, yy + 50);
      x.fillStyle = '#73e0b0'; x.font = 'bold 43px Arial'; x.fillText(m[1], a + 25, yy + 115);
    });
    const a = document.createElement('a');
    a.download = 'galkot-tech-typing-result.jpg'; a.href = c.toDataURL('image/jpeg', .94); a.click();
  }

  /* ---------- events ---------- */
  $('typingInput').addEventListener('input', input);
  $('typingInput').addEventListener('keydown', e => { if (e.key === 'Enter') e.preventDefault(); });
  $('promptShell').addEventListener('click', () => { if (!$('typingInput').disabled) $('typingInput').focus(); });
  $('category').addEventListener('change', async () => { await load(); reset(); });
  $('duration').addEventListener('change', () => { if (!start) reset(); else { $('finishBtn').hidden = $('duration').value !== '0'; } updateBestLine(); });
  $('restart').addEventListener('click', async () => { if (cat() === 'ai') await load(); reset(); });
  $('finishBtn').addEventListener('click', () => { if (!start) { $('status').textContent = 'Type something first, then press Finish.'; $('typingInput').focus(); return; } finish(); });
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

  /* typing is accepted without clicking the box; Enter resumes after the result popup */
  document.addEventListener('keydown', e => {
    const modalOpen = !$('adminModal').hidden || document.getElementById('nameModal');
    if (modalOpen) return;
    if (!$('resultModal').hidden) {
      if (e.key === 'Enter' && Date.now() - resultShownAt > 700) { e.preventDefault(); $('tryAgain').click(); }
      return;
    }
    const inp = $('typingInput'), a = document.activeElement, tag = a ? a.tagName : '';
    if (inp.disabled || a === inp || tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT') return;
    if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
    inp.focus();                                       // the key press lands in the box
  }, true);
  document.addEventListener('keydown', e => {
    if (e.code === 'CapsLock') {                        // Caps Lock notice
      const on = e.getModifierState('CapsLock');
      $('capsToast').hidden = !on; clearTimeout(capsTimer);
      if (on) capsTimer = setTimeout(() => { $('capsToast').hidden = true; }, 1800);
    }
    if (e.key === 'Escape' && $('adminModal').hidden && $('resultModal').hidden && !document.getElementById('nameModal')) {   // Esc = restart
      $('restart').click();
    }
  });

  /* on-screen keyboard (hidden by default on touch screens) */
  kb = window.GalkotKeyboard.mount($('keyboard'));
  try { const v = localStorage.getItem('galkot_kb'); kbOn = v ? v === 'on' : !matchMedia('(pointer:coarse)').matches; } catch (e) {}
  function paintKb() { $('kbWrap').hidden = !kbOn; $('kbToggle').setAttribute('aria-pressed', String(kbOn)); }
  $('kbToggle').addEventListener('click', () => {
    kbOn = !kbOn; try { localStorage.setItem('galkot_kb', kbOn ? 'on' : 'off'); } catch (e) {}
    paintKb(); $('typingInput').focus();
  });
  paintKb();
  window.Galkot?.onName(() => { if (!$('typingInput').disabled) $('typingInput').focus(); });

  headline(); loadHeadlines();
  load().then(reset);
})();
