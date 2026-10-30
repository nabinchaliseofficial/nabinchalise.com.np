/* Typing admin dashboard: practice prompts + word bank manager */
(() => {
  const $ = id => document.getElementById(id);
  let records = [], editingId = null, words = [];

  const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  function say(s, e = false) { $('status').textContent = s; $('status').style.color = e ? '#ff8585' : ''; }
  function sayWords(s, e = false) { $('wordStatus').textContent = s; $('wordStatus').style.color = e ? '#ff8585' : ''; }

  async function check(u) {
    const { data, error } = await db.from('typing_admin').select('role').eq('user_id', u.id).maybeSingle();
    if (error) throw error;
    return data?.role === 'admin';
  }
  async function enter(u) {
    if (!await check(u)) { await db.auth.signOut(); $('msg').textContent = 'This account is not authorized. Contact the project administrator.'; return; }
    $('auth').hidden = true; $('dashboard').hidden = false;
    $('who').textContent = 'Signed in as ' + u.email + ' · Administrator';
    await load();
  }

  /* ----- tabs ----- */
  function tab(name) {
    $('promptsPane').hidden = name !== 'prompts'; $('wordsPane').hidden = name !== 'words'; $('linesPane').hidden = name !== 'lines';
    $('tabPrompts').classList.toggle('active', name === 'prompts'); $('tabWords').classList.toggle('active', name === 'words'); $('tabLines').classList.toggle('active', name === 'lines');
    if (name === 'words') loadWords();
    if (name === 'lines') loadLines();
  }
  $('tabLines').onclick = () => tab('lines');
  $('tabPrompts').onclick = () => tab('prompts');
  $('tabWords').onclick = () => tab('words');

  /* ----- practice prompts ----- */
  async function load() {
    const { data, error } = await db.from('typing_prompts').select('*').eq('category', $('category').value).order('created_at', { ascending: false });
    if (error) { say(error.message, true); return; }
    records = data || []; render();
  }
  function render() {
    const q = $('filter').value.toLowerCase(), a = records.filter(x => x.content.toLowerCase().includes(q));
    $('count').textContent = `${a.length} text${a.length === 1 ? '' : 's'}`;
    $('items').innerHTML = a.length ? a.map(x => `<article class="item"><div class="item-main"><div>${esc(x.content.slice(0, 250))}${x.content.length > 250 ? '…' : ''}</div><div class="item-meta">${esc(x.category)} · ${x.enabled ? 'Visible' : 'Hidden'} · ${x.content.split(/\s+/).length} words</div></div><div class="item-actions"><button class="muted-btn" data-a="toggle" data-id="${x.id}">${x.enabled ? 'Hide' : 'Show'}</button><button class="muted-btn" data-a="edit" data-id="${x.id}">Edit</button><button class="danger" data-a="delete" data-id="${x.id}">Delete</button></div></article>`).join('') : '<p class="muted">No saved text in this category.</p>';
  }
  function clear() { editingId = null; $('content').value = ''; $('save').textContent = 'Add practice text'; $('cancelEdit').hidden = true; }

  $('loginForm').addEventListener('submit', async e => {
    e.preventDefault(); $('msg').textContent = 'Signing in…';
    const { data, error } = await db.auth.signInWithPassword({ email: $('email').value.trim(), password: $('password').value });
    if (error) { $('msg').textContent = error.message; return; }
    try { await enter(data.user); } catch (x) { $('msg').textContent = x.message; }
  });

  $('save').onclick = async () => {
    const content = $('content').value.replace(/\s+/g, ' ').trim();   // passages are typed on one line
    if (!content) { say('Enter text first.', true); return; }
    const payload = { category: $('category').value, content };
    const q = editingId ? db.from('typing_prompts').update(payload).eq('id', editingId) : db.from('typing_prompts').insert(payload);
    const { error } = await q;
    if (error) { say(error.message, true); return; }
    say(editingId ? 'Text updated.' : 'Text added.'); clear(); load();
  };
  $('cancelEdit').onclick = () => { clear(); say('Edit cancelled.'); };

  $('items').onclick = async e => {
    const b = e.target.closest('button[data-a]'); if (!b) return;
    const x = records.find(r => r.id === b.dataset.id); if (!x) return;
    if (b.dataset.a === 'edit') { editingId = x.id; $('content').value = x.content; $('save').textContent = 'Save changes'; $('cancelEdit').hidden = false; $('content').focus(); return; }
    if (b.dataset.a === 'toggle') {
      const { error } = await db.from('typing_prompts').update({ enabled: !x.enabled }).eq('id', x.id);
      if (error) { say(error.message, true); return; } load(); return;
    }
    if (b.dataset.a === 'delete' && confirm('Delete this text?')) {
      const { error } = await db.from('typing_prompts').delete().eq('id', x.id);
      if (error) { say(error.message, true); return; } load();
    }
  };
  $('category').onchange = () => { clear(); load(); };
  $('filter').oninput = render;

  /* ----- word bank (used by the "Words" category) ----- */
  async function loadWords() {
    words = []; let offset = 0;
    while (offset < 20000) {
      const { data, error } = await db.from('typing_word_bank').select('word, level').order('word').range(offset, offset + 999);
      if (error) { sayWords(error.message + ' (run the latest supabase.sql first)', true); return; }
      words.push(...data.map(x => ({ word: x.word, level: x.level || 'easy' })));
      if (data.length < 1000) break; offset += 1000;
    }
    renderWords();
  }
  function renderWords() {
    const q = $('wordFilter').value.trim().toLowerCase(), lv = $('wordShow').value;
    const a = words.filter(w => w.word.toLowerCase().includes(q) && (lv === 'all' || w.level === lv));
    const nh = words.filter(w => w.level === 'hard').length;
    $('wordCount').textContent = `${words.length} words (${words.length - nh} easy · ${nh} hard)` + (q || lv !== 'all' ? ` · ${a.length} shown` : '');
    $('wordItems').innerHTML = a.length ? a.slice(0, 300).map(w => `<span class="word-chip">${esc(w.word)}<span class="lvl ${w.level}">${w.level}</span> <button data-word="${esc(w.word)}" aria-label="Delete ${esc(w.word)}">×</button></span>`).join('') + (a.length > 300 ? `<p class="muted">Showing first 300 – use search to narrow.</p>` : '') : '<p class="muted">No words found.</p>';
  }
  $('addWords').onclick = async () => {
    const list = [...new Set($('wordsInput').value.split(/[\s,;]+/).map(w => w.trim()).filter(w => w && w.length <= 40))];
    if (!list.length) { sayWords('Enter one or more words (separated by spaces, commas or new lines).', true); return; }
    $('addWords').disabled = true; sayWords('Adding…');
    let failed = null;
    for (let i = 0; i < list.length; i += 500) {
      const { error } = await db.from('typing_word_bank').upsert(list.slice(i, i + 500).map(word => ({ word, level: $('wordLevel').value })), { onConflict: 'word' });
      if (error) { failed = error; break; }
    }
    $('addWords').disabled = false;
    if (failed) { sayWords(failed.message, true); return; }
    $('wordsInput').value = ''; sayWords(`${list.length} word(s) saved as ${$('wordLevel').value} (an existing word just changes level).`); loadWords();
  };
  $('wordItems').onclick = async e => {
    const b = e.target.closest('button[data-word]'); if (!b) return;
    const { error } = await db.from('typing_word_bank').delete().eq('word', b.dataset.word);
    if (error) { sayWords(error.message, true); return; }
    words = words.filter(w => w.word !== b.dataset.word); renderWords();
  };
  $('wordFilter').oninput = renderWords; $('wordShow').onchange = renderWords;

  /* ----- typewriter lines (shown after "GALKOT TECH PRESENTS") ----- */
  let lines = [], editingLine = null;
  const sayLine = (s, e = false) => { $('lineStatus').textContent = s; $('lineStatus').style.color = e ? '#ff8585' : ''; };
  async function loadLines() {
    const { data, error } = await db.from('typing_headlines').select('*').order('sort_order').order('created_at');
    if (error) { sayLine(error.message + ' (run the latest supabase.sql first)', true); return; }
    lines = data || []; renderLines();
  }
  function renderLines() {
    $('lineItems').innerHTML = lines.length ? lines.map((x, i) => `<article class="item"><div class="item-main"><div>${esc(x.content)}</div><div class="item-meta">#${i + 1} · ${x.enabled ? 'Visible' : 'Hidden'}</div></div><div class="item-actions"><button class="muted-btn" data-l="up" data-id="${x.id}" ${i === 0 ? 'disabled' : ''} aria-label="Move up">↑</button><button class="muted-btn" data-l="down" data-id="${x.id}" ${i === lines.length - 1 ? 'disabled' : ''} aria-label="Move down">↓</button><button class="muted-btn" data-l="toggle" data-id="${x.id}">${x.enabled ? 'Hide' : 'Show'}</button><button class="muted-btn" data-l="edit" data-id="${x.id}">Edit</button><button class="danger" data-l="delete" data-id="${x.id}">Delete</button></div></article>`).join('') : '<p class="muted">No lines yet — the page will use its built-in lines.</p>';
  }
  function clearLine() { editingLine = null; $('lineInput').value = ''; $('saveLine').textContent = 'Add line'; $('cancelLine').hidden = true; }
  $('saveLine').onclick = async () => {
    const content = $('lineInput').value.replace(/\s+/g, ' ').trim();
    if (!content) { sayLine('Enter some text first.', true); return; }
    const q = editingLine ? db.from('typing_headlines').update({ content }).eq('id', editingLine)
                          : db.from('typing_headlines').insert({ content, sort_order: (lines.reduce((m, x) => Math.max(m, x.sort_order), 0) || 0) + 1 });
    const { error } = await q;
    if (error) { sayLine(error.message, true); return; }
    sayLine(editingLine ? 'Line updated.' : 'Line added.'); clearLine(); loadLines();
  };
  $('cancelLine').onclick = () => { clearLine(); sayLine('Edit cancelled.'); };
  $('lineItems').onclick = async e => {
    const b = e.target.closest('button[data-l]'); if (!b) return;
    const i = lines.findIndex(r => r.id === b.dataset.id); if (i < 0) return; const x = lines[i];
    let res;
    if (b.dataset.l === 'edit') { editingLine = x.id; $('lineInput').value = x.content; $('saveLine').textContent = 'Save changes'; $('cancelLine').hidden = false; $('lineInput').focus(); return; }
    if (b.dataset.l === 'toggle') res = await db.from('typing_headlines').update({ enabled: !x.enabled }).eq('id', x.id);
    else if (b.dataset.l === 'delete') { if (!confirm('Delete this line?')) return; res = await db.from('typing_headlines').delete().eq('id', x.id); }
    else {                                              // reorder: renumber so the two lines swap places
      const j = b.dataset.l === 'up' ? i - 1 : i + 1; if (j < 0 || j >= lines.length) return;
      const order = lines.map(r => r.id); [order[i], order[j]] = [order[j], order[i]];
      for (let k = 0; k < order.length; k++) { res = await db.from('typing_headlines').update({ sort_order: k + 1 }).eq('id', order[k]); if (res.error) break; }
    }
    if (res?.error) { sayLine(res.error.message, true); return; }
    loadLines();
  };

  $('logout').onclick = async () => { await db.auth.signOut(); location.reload(); };

  (async () => {
    if (!window.db) { $('msg').textContent = 'Cannot reach the server. Check your internet connection and refresh.'; return; }
    const { data: { session } } = await db.auth.getSession();
    if (session) { try { await enter(session.user); } catch (e) { $('msg').textContent = e.message; } }
  })();
})();
