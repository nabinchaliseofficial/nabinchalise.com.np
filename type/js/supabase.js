(() => {
  if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    console.error("Supabase config or SDK is missing."); return;
  }
  window.db = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
})();