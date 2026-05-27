// ============================================================
// lib/supabase.ts — Supabase client factory
//
// We maintain TWO clients:
//   - anonClient  → respects RLS (used for all user-facing queries)
//   - adminClient → service_role key (used ONLY for BLOCKED_ACCESS
//                   INSERT and compliance export that needs full view)
//
// ⚠️  adminClient bypasses RLS — never expose it to the browser.
//     Keep it server-side (Next.js API routes) only.
// ============================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// SERVER-SIDE ONLY — falls back to anon key in browser so bundle doesn't crash.
// The admin client is only called from API routes where the real key is set.
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? SUPABASE_ANON_KEY;

// ── Public (anon) client — browser-safe, RLS enforced ───────
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ── Admin client — SERVER-SIDE ONLY, bypasses RLS ────────────
export const supabaseAdmin: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

/**
 * Returns an anon client that impersonates a specific user for demo purposes.
 *
 * In a real app this would be Supabase Auth JWT. For the demo we use the
 * Supabase "set_config" approach via RPC to inject the user_id into
 * auth.uid() — or we pass it through API query params and apply via
 * supabaseAdmin with a scoped query.
 *
 * TODO: Replace with real Supabase Auth for production.
 */
export function getClientForUser(_userId: string): SupabaseClient {
  // Option A (simplest): return admin client and manually filter by userId
  // in every query (see ethical-wall.ts). Not true RLS but functional for demo.
  //
  // Option B (realistic): use Supabase Auth impersonation via service_role.
  // See: https://supabase.com/docs/guides/auth/row-level-security#testing-rls
  //
  // For now return the anon client — callers must pass userId explicitly.
  return supabase;
}
