import type { SupabaseClient } from '@supabase/supabase-js';
import type { AccessResult, Matter } from './types';

interface PermissionRow {
  matter_id: string;
  permission_level: string;
}

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
  const eventId = `block_${crypto.randomUUID()}`;
  const { error } = await client.from('blocked_access_log').insert({
    event_id: eventId,
    user_id: currentUserId,
    attempted_matter_id: matterId,
    reason,
    details,
    timestamp: new Date().toISOString(),
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
