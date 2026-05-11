/* ============================================
   ALIWORLD — supabase client
   global supabase client used by auth + future game code
   ============================================ */

(function() {
  'use strict';

  // these are PUBLIC values, safe to commit/expose in client code.
  // the anon key is designed for client-side use; access control
  // is enforced by Row Level Security policies on the database.
  const SUPABASE_URL = 'https://gwmhddeyvlyhnjpcnjrf.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3bWhkZGV5dmx5aG5qcGNuanJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1Mzg4MzksImV4cCI6MjA5NDExNDgzOX0.Tva1JWYbatH5t7tobMmRKyRm7jlsmtcl00_dgVKZvok';

  // the supabase library is loaded globally via the CDN script tag
  // and exposes itself as `window.supabase`. we create a client instance
  // and expose it as `window.aliworldSupabase` so the rest of the app can use it.
  if (typeof window.supabase === 'undefined') {
    console.error('[aliworld] supabase library not loaded. check the CDN script tag.');
    return;
  }

  window.aliworldSupabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        // persist session in localStorage so users stay logged in across reloads
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false  // we don't use magic-link redirects in v1.1 yet
      }
    }
  );

  // quick sanity log
  console.log('[aliworld] supabase client initialized.');
})();
