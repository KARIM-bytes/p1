import { supabaseAdmin } from './supabase';
import { checkAccess } from './ethical-wall';

export async function recordSessionStart(
  userId: string,
  matterId: string,
  queryType: 'draft' | 'research' | 'review'
): Promise<string | null> {
  const access = await checkAccess(userId, matterId);
  if (access.status === 'BLOCKED') return null;

  const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const { error } = await supabaseAdmin.from('ai_sessions').insert({
    id: sessionId,
    user_id: userId,
    matter_id: matterId,
    session_start: new Date().toISOString(),
    query_type: queryType,
    review_status: 'pending',
  });

  if (error) return null;
  return sessionId;
}

export async function recordSessionEnd(
  sessionId: string,
  outputHash: string,
  outputTokenCount: number
): Promise<void> {
  try {
    await supabaseAdmin.from('ai_sessions').update({
      session_end: new Date().toISOString(),
      output_hash: outputHash,
      output_token_count: outputTokenCount,
    }).eq('id', sessionId);
  } catch {
    // silently handle
  }
}

export async function recordReview(
  sessionId: string,
  reviewerId: string,
  decision: string,
  notes: string | null
): Promise<{ success: boolean; error?: string }> {
  const { data: reviewer } = await supabaseAdmin
    .from('users')
    .select('role')
    .eq('id', reviewerId)
    .single();

  if (!reviewer || reviewer.role !== 'partner') {
    return { success: false, error: 'Only partners can review sessions' };
  }

  const { error } = await supabaseAdmin.from('ai_sessions').update({
    review_status: 'reviewed',
    reviewer_id: reviewerId,
    review_timestamp: new Date().toISOString(),
    review_decision: decision,
    review_notes: notes,
  }).eq('id', sessionId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getSessionsForUser(userId: string): Promise<any[]> {
  const { data: perms } = await supabaseAdmin
    .from('matter_permissions')
    .select('matter_id')
    .eq('user_id', userId);

  const matterIds = (perms || []).map((p: any) => p.matter_id);
  if (matterIds.length === 0) return [];

  const { data } = await supabaseAdmin
    .from('ai_sessions')
    .select(`
      *,
      users!ai_sessions_user_id_fkey(name, role),
      matters!ai_sessions_matter_id_fkey(matter_name, client_id)
    `)
    .in('matter_id', matterIds)
    .order('session_start', { ascending: false });

  return data || [];
}
