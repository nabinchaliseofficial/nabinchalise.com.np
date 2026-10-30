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
    $('promptsPane').hidden = name !== 'prompts'; $('wordsPane').hidden = name !== 'words';
    $('tabPrompts').classList.toggle('active', name === 'prompts'); $('tabWords').classList.toggle('active', name === 'words');
    if (name === 'words') loadWords();
  }
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
      const { data, error } = await db.from('typing_word_bank').select('word').order('word').range(offset, offset + 999);
      if (error) { sayWords(error.message, true); return; }
      words.push(...data.map(x => x.word));
      if (data.length < 1000) break; offset += 1000;
    }
    renderWords();
  }
  function renderWords() {
    const q = $('wordFilter').value.trim().toLowerCase(), a = words.filter(w => w.toLowerCase().includes(q));
    $('wordCount').textContent = `${words.length} words in the bank` + (q ? ` · ${a.length} match` : '');
    $('wordItems').innerHTML = a.length ? a.slice(0, 300).map(w => `<span class="word-chip">${esc(w)} <button data-word="${esc(w)}" aria-label="Delete ${esc(w)}">×</button></span>`).join('') + (a.length > 300 ? `<p class="muted">Showing first 300 – use search to narrow.</p>` : '') : '<p class="muted">No words found.</p>';
  }
  $('addWords').onclick = async () => {
    const list = [...new Set($('wordsInput').value.split(/[\s,;]+/).map(w => w.trim()).filter(w => w && w.length <= 40))];
    if (!list.length) { sayWords('Enter one or more words (separated by spaces, commas or new lines).', true); return; }
    $('addWords').disabled = true; sayWords('Adding…');
    let failed = null;
    for (let i = 0; i < list.length; i += 500) {
      const { error } = await db.from('typing_word_bank').upsert(list.slice(i, i + 500).map(word => ({ word })), { onConflict: 'word', ignoreDuplicates: true });
      if (error) { failed = error; break; }
    }
    $('addWords').disabled = false;
    if (failed) { sayWords(failed.message, true); return; }
    $('wordsInput').value = ''; sayWords(`${list.length} word(s) processed (duplicates are skipped).`); loadWords();
  };
  $('wordItems').onclick = async e => {
    const b = e.target.closest('button[data-word]'); if (!b) return;
    const { error } = await db.from('typing_word_bank').delete().eq('word', b.dataset.word);
    if (error) { sayWords(error.message, true); return; }
    words = words.filter(w => w !== b.dataset.word); renderWords();
  };
  $('wordFilter').oninput = renderWords;

  $('logout').onclick = async () => { await db.auth.signOut(); location.reload(); };

  (async () => {
    if (!window.db) { $('msg').textContent = 'Cannot reach the server. Check your internet connection and refresh.'; return; }
    const { data: { session } } = await db.auth.getSession();
    if (session) { try { await enter(session.user); } catch (e) { $('msg').textContent = e.message; } }
  })();
})();
