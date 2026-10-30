/* Admin login popup on the public pages (index.html). Shortcut: Ctrl + Shift + A */
(() => {
  const $ = id => document.getElementById(id);
  const open = () => { $('adminModal').hidden = false; $('adminEmail').focus(); };
  const close = () => { $('adminModal').hidden = true; $('adminLoginMsg').textContent = ''; };

  $('adminOpen').addEventListener('click', open);
  $('adminClose').addEventListener('click', close);
  $('adminModal').addEventListener('click', e => { if (e.target === $('adminModal')) close(); });
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') { e.preventDefault(); open(); }
    if (e.key === 'Escape' && !$('adminModal').hidden) close();
  });

  $('adminLoginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const msg = $('adminLoginMsg');
    if (!window.db) { msg.textContent = 'Cannot reach the server. Check your internet connection and refresh.'; return; }
    msg.textContent = 'Verifying administrator…';
    try {
      const { data, error } = await db.auth.signInWithPassword({ email: $('adminEmail').value.trim(), password: $('adminPassword').value });
      if (error) { msg.textContent = 'Login failed. Check your email and password.'; return; }
      const { data: role, error: roleError } = await db.from('typing_admin').select('role').eq('user_id', data.user.id).maybeSingle();
      if (roleError || role?.role !== 'admin') {
        await db.auth.signOut();
        msg.textContent = 'Access denied. This account is not an administrator.'; return;
      }
      location.href = 'typeadmin.html';
    } catch (err) { msg.textContent = 'Something went wrong. Please try again.'; }
  });
})();
