import { supabaseAdmin } from './supabase';
import type { AccessResult } from './types';

export async function checkAccess(userId: string, matterId: string): Promise<AccessResult> {
  const { data, error } = await supabaseAdmin
    .from('matter_permissions')
    .select('matter_id, permission_level')
    .eq('user_id', userId)
    .eq('matter_id', matterId)
    .single();

  if (error || data == null) {
    await logBlockedAccess(
      userId,
      matterId,
      'no_permission',
      `User ${userId} attempted to access matter ${matterId}. No permission found.`
    );
    return { status: 'BLOCKED', reason: 'no_permission' };
  }

  return { status: 'CLEAR', matterId };
}

export async function logBlockedAccess(
  userId: string,
  matterId: string,
  reason: string,
  details: string
): Promise<void> {
  const eventId = `block_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  try {
    await supabaseAdmin.from('blocked_access_log').insert({
      event_id: eventId,
      user_id: userId,
      attempted_matter_id: matterId,
      reason,
      details,
      timestamp: new Date().toISOString(),
    });
  } catch {
    // silently ignore
  }
}

export async function getAccessibleMatters(userId: string): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('matter_permissions')
    .select('matter_id')
    .eq('user_id', userId);

  return (data || []).map((row: { matter_id: string }) => row.matter_id);
}
