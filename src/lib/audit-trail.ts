import type { SupabaseClient } from '@supabase/supabase-js';
import { checkAccess } from './ethical-wall';
import type { AiSession, QueryType, ReviewDecision, SessionWithJoins } from './types';

interface PermissionRow {
  matter_id: string;
}

interface ReviewStatusRow {
  review_status: string;
}

export async function sha256Hex(rawOutput: string): Promise<string> {
  const bytes = new TextEncoder().encode(rawOutput);
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function recordSessionStart(
  client: SupabaseClient,
  currentUserId: string,
  matterId: string,
  queryType: QueryType
): Promise<{ sessionId: string | null; blocked: boolean; error?: string }> {
  const access = await checkAccess(client, currentUserId, matterId);
  if (access.status === 'BLOCKED') return { sessionId: null, blocked: true };

  const sessionId = `sess_${crypto.randomUUID()}`;
  const { error } = await client.from('ai_sessions').insert({
    id: sessionId,
    user_id: currentUserId,
    matter_id: matterId,
    session_start: new Date().toISOString(),
    query_type: queryType,
    review_status: 'pending',
  });

  if (error) return { sessionId: null, blocked: false, error: error.message };
  return { sessionId, blocked: false };
}

export async function recordSessionEnd(
  client: SupabaseClient,
  sessionId: string,
  rawOutput: string,
  outputTokenCount: number
): Promise<{ success: boolean; outputHash?: string; error?: string }> {
  const outputHash = await sha256Hex(rawOutput);
  const { error } = await client
    .from('ai_sessions')
    .update({
      session_end: new Date().toISOString(),
      output_hash: outputHash,
      output_token_count: outputTokenCount,
    })
    .eq('id', sessionId);

  if (error) return { success: false, error: error.message };
  return { success: true, outputHash };
}

export async function recordReview(
  client: SupabaseClient,
  sessionId: string,
  reviewerId: string,
  decision: ReviewDecision,
  notes: string | null
): Promise<{ success: boolean; error?: string }> {
  const { data: reviewer, error: reviewerError } = await client
    .from('users')
    .select('role')
    .eq('id', reviewerId)
    .single<{ role: string }>();

  if (reviewerError || reviewer?.role !== 'partner') {
    return { success: false, error: 'Only partners can review sessions.' };
  }

  const reviewStatus = decision === 'rejected' ? 'rejected' : 'reviewed';
  const { error } = await client
    .from('ai_sessions')
    .update({
      review_status: reviewStatus,
      reviewer_id: reviewerId,
      review_timestamp: new Date().toISOString(),
      review_decision: decision,
      review_notes: notes,
    })
    .eq('id', sessionId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getSessionsForCurrentUser(client: SupabaseClient): Promise<SessionWithJoins[]> {
  const { data, error } = await client
    .from('ai_sessions')
    .select(`
      id,
      user_id,
      matter_id,
      session_start,
      session_end,
      query_type,
      output_token_count,
      output_hash,
      review_status,
      reviewer_id,
      review_timestamp,
      review_decision,
      review_notes,
      created_at,
      users!ai_sessions_user_id_fkey(name, role),
      matters!ai_sessions_matter_id_fkey(matter_name, client_id, practice_area)
    `)
    .order('session_start', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as SessionWithJoins[];
}

export async function getPendingReviewSessions(client: SupabaseClient): Promise<AiSession[]> {
  const { data, error } = await client
    .from('ai_sessions')
    .select('*')
    .eq('review_status', 'pending')
    .order('session_start', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as AiSession[];
}

export async function getDashboardStats(client: SupabaseClient): Promise<{
  totalSessions: number;
  reviewedSessions: number;
  pendingSessions: number;
  blockedEvents: number;
  reviewedPercent: number;
}> {
  const { data: sessions, error: sessionError } = await client
    .from('ai_sessions')
    .select('review_status');

  if (sessionError) throw new Error(sessionError.message);

  const statusRows = (sessions ?? []) as ReviewStatusRow[];
  const reviewedSessions = statusRows.filter((session) => session.review_status === 'reviewed').length;
  const pendingSessions = statusRows.filter((session) => session.review_status === 'pending').length;

  const { count: blockedEvents, error: blockedError } = await client
    .from('blocked_access_log')
    .select('*', { count: 'exact', head: true });

  const totalSessions = statusRows.length;
  return {
    totalSessions,
    reviewedSessions,
    pendingSessions,
    blockedEvents: blockedError ? 0 : blockedEvents ?? 0,
    reviewedPercent: totalSessions > 0 ? Math.round((reviewedSessions / totalSessions) * 100) : 0,
  };
}

export async function getCurrentPermissionMatterIds(client: SupabaseClient): Promise<string[]> {
  const { data, error } = await client
    .from('matter_permissions')
    .select('matter_id');

  if (error) throw new Error(error.message);
  return ((data ?? []) as PermissionRow[]).map((row) => row.matter_id);
}
