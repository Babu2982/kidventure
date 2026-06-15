// lib/supabase.ts
// Browser Supabase client (anon key + RLS). Null-safe: if env vars are missing
// (e.g. local APK with no network config), `supabase` is null and the content
// loader transparently falls back to the IndexedDB cache / bundled seed deck.
//
// Requires:  npm install @supabase/supabase-js
// Env (.env.local + Vercel):
//   NEXT_PUBLIC_SUPABASE_URL
//   NEXT_PUBLIC_SUPABASE_ANON_KEY

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && anon ? createClient(url, anon) : null;
