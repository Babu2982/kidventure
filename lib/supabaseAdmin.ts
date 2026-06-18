// lib/supabaseAdmin.ts
// SERVER-ONLY. Uses the service_role key, which bypasses RLS and can write
// to the content tables. Must NEVER be imported from a 'use client' file or
// from anything bundled into the Capacitor/Android app — it would ship the
// secret key inside the APK. This file is only ever called from Next.js
// Route Handlers (app/api/**/route.ts), which run on Vercel's server only.
//
// Env (Vercel dashboard ONLY — do not put in NEXT_PUBLIC_*, do not put in
// .env.local if that file is ever bundled client-side):
//   SUPABASE_SERVICE_ROLE_KEY
//   NEXT_PUBLIC_SUPABASE_URL   (the URL itself is not secret)

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin: SupabaseClient | null =
  url && serviceKey
    ? createClient(url, serviceKey, { auth: { persistSession: false } })
    : null;
