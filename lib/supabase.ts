"use client";

/**
 * Optional cloud sync + content client.
 *
 * If NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are unset, every
 * function is a silent no-op and `supabase` is null — the app runs 100% on
 * localStorage with the built-in flashcard deck.
 *
 * Profile-sync table (run in the Supabase SQL editor):
 *
 *   create table profiles_kids (
 *     id text primary key,
 *     data jsonb not null,
 *     updated_at timestamptz default now()
 *   );
 *   alter table profiles_kids enable row level security;
 *   create policy "anon upsert" on profiles_kids
 *     for all using (true) with check (true);
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { ChildProfile } from "@/store/useAppStore";

let client: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && key ? createClient(url, key) : null;
  return client;
}

/**
 * Named client used by content modules (flashcards, dynamic content, etc.).
 * Null until the Supabase env vars are set — callers must handle null.
 */
export const supabase: SupabaseClient | null = getSupabase();

export async function syncProfileToCloud(profile: ChildProfile) {
  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb.from("profiles_kids").upsert({
      id: profile.id,
      data: profile,
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    // Offline or misconfigured — local data remains the source of truth.
    console.warn("Cloud sync skipped:", e);
  }
}
