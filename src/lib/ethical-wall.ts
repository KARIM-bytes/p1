import type { SupabaseClient } from '@supabase/supabase-js';
import type { AccessResult, Matter } from './types';

interface PermissionRow {
  matter_id: string;
  permission_level: string;
}

interface ChainRow {
  chain_hash: string | null;
}

// ─── Hash chaining helpers ────────────────────────────────────────────────────

/**
 * Compute SHA-256 of a string using the Web Crypto API.
 * Works in both Node (18+) and browser environments.
 */
async function sha256(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const buffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Fetch the chain_hash of the most recent blocked_access_log entry.
 * Returns 'GENESIS' when the log is empty (first entry anchor).
 */
async function fetchPreviousChainHash(client: SupabaseClient): Promise<string> {
  const { data } = await client
    .from('blocked_access_log')
    .select('chain_hash')
    .order('timestamp', { ascending: false })
    .limit(1)
    .maybeSingle<ChainRow>();

  return data?.chain_hash ?? 'GENESIS';
}

/**
 * Compute the chain hash for a new log entry:
 *   SHA-256( prevHash || eventId || userId || matterId || isoTimestamp )
 *
 * This links every entry to its predecessor. Any modification to a past entry
 * invalidates all subsequent hashes — making tampering DETECTABLE.
 */
async function computeChainHash(
  prevHash: string,
  eventId: string,
  userId: string,
  matterId: string,
  timestamp: string
): Promise<string> {
  const payload = `${prevHash}|${eventId}|${userId}|${matterId}|${timestamp}`;
  return sha256(payload);
}

// ─── Core functions ───────────────────────────────────────────────────────────

export async function checkAccess(
  client: SupabaseClient,
  currentUserId: string,
  matterId: string
): Promise<AccessResult> {
  const { data, error } = await client
    .from('matter_permissions')
    .select('matter_id, permission_level')
    .eq('matter_id', matterId)
    .maybeSingle<PermissionRow>();

  if (error || data == null) {
    await logBlockedAccess(
      client,
      currentUserId,
      matterId,
      'no_permission',
      'Authenticated user attempted to access a matter without a matching permission grant.'
    );
    return { status: 'BLOCKED', reason: 'no_permission' };
  }

  return { status: 'CLEAR', matterId: data.matter_id };
}

export async function logBlockedAccess(
  client: SupabaseClient,
  currentUserId: string,
  matterId: string,
  reason: string,
  details: string
): Promise<void> {
  const eventId   = `block_${crypto.randomUUID()}`;
  const timestamp = new Date().toISOString();

  // Hash chaining — link this entry to the previous one
  const prevHash  = await fetchPreviousChainHash(client);
  const chainHash = await computeChainHash(prevHash, eventId, currentUserId, matterId, timestamp);

  const { error } = await client.from('blocked_access_log').insert({
    event_id:            eventId,
    user_id:             currentUserId,
    attempted_matter_id: matterId,
    reason,
    details,
    timestamp,
    chain_hash:          chainHash,
  });

  if (error) {
    console.error('[blocked_access_log insert]', error.message);
  }
}

export async function getAccessibleMatters(client: SupabaseClient): Promise<Matter[]> {
  const { data, error } = await client
    .from('matters')
    .select('id, client_id, matter_name, practice_area, court, status, created_at')
    .order('id', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as Matter[];
}
