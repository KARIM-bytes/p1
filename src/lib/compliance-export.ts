import { supabaseAdmin } from './supabase';
import type { BlockedAccessEvent, ExportSessionRow } from './types';

function csvEscape(value: string | number | null | undefined): string {
  const text = value == null ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function labelFor(map: Map<string, string>, key: string, prefix: string): string {
  const existing = map.get(key);
  if (existing) return existing;
  const label = `${prefix} ${map.size + 1}`;
  map.set(key, label);
  return label;
}

function clientLabelFor(map: Map<string, string>, clientId: string): string {
  const existing = map.get(clientId);
  if (existing) return existing;
  const letter = String.fromCharCode(65 + map.size);
  const label = `Client ${letter}`;
  map.set(clientId, label);
  return label;
}

export async function generateComplianceCSV(fromDate: string, toDate: string): Promise<string> {
  const { data: sessions, error: sessionError } = await supabaseAdmin
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
      users!ai_sessions_user_id_fkey(role),
      matters!ai_sessions_matter_id_fkey(client_id, practice_area,
        clients!matters_client_id_fkey(name)
      )
    `)
    .gte('session_start', fromDate)
    .lte('session_start', toDate)
    .order('session_start', { ascending: true });

  if (sessionError) throw new Error(sessionError.message);

  const { data: blocked, error: blockedError } = await supabaseAdmin
    .from('blocked_access_log')
    .select('*')
    .gte('timestamp', fromDate)
    .lte('timestamp', toDate)
    .order('timestamp', { ascending: true });

  if (blockedError) throw new Error(blockedError.message);

  const clientMap = new Map<string, string>();
  const matterMap = new Map<string, string>();
  const actorMap = new Map<string, string>();

  const lines: string[] = [
    'BRAHMO Compliance Engine - Compliance Export',
    `Generated,${csvEscape(new Date().toISOString())}`,
    `Range,${csvEscape(fromDate)},${csvEscape(toDate)}`,
    '',
    'AI SESSIONS',
    [
      'SESSION_ID',
      'ACTOR',
      'USER_ROLE',
      'MATTER',
      'CLIENT',
      'PRACTICE_AREA',
      'QUERY_TYPE',
      'SESSION_START',
      'SESSION_END',
      'OUTPUT_HASH',
      'TOKEN_COUNT',
      'REVIEW_STATUS',
      'REVIEWER',
      'REVIEW_TIMESTAMP',
      'REVIEW_DECISION',
      'REVIEW_NOTES_PRESENT',
    ].join(','),
  ];

  for (const session of (sessions ?? []) as unknown as ExportSessionRow[]) {
    const clientId = session.matters?.client_id ?? 'unknown_client';
    const row = [
      csvEscape(session.id),
      csvEscape(labelFor(actorMap, session.user_id, 'User')),
      csvEscape(session.users?.role ?? 'unknown'),
      csvEscape(labelFor(matterMap, session.matter_id, 'Matter')),
      csvEscape(clientLabelFor(clientMap, clientId)),
      csvEscape(session.matters?.practice_area ?? 'unknown'),
      csvEscape(session.query_type),
      csvEscape(session.session_start),
      csvEscape(session.session_end),
      csvEscape(session.output_hash),
      csvEscape(session.output_token_count),
      csvEscape(session.review_status),
      csvEscape(session.reviewer_id ? labelFor(actorMap, session.reviewer_id, 'User') : ''),
      csvEscape(session.review_timestamp),
      csvEscape(session.review_decision),
      csvEscape(session.review_notes ? 'yes' : 'no'),
    ];
    lines.push(row.join(','));
  }

  lines.push('', 'BLOCKED ACCESS LOG');
  lines.push('EVENT_ID,ACTOR,ATTEMPTED_MATTER,REASON,TIMESTAMP');

  for (const event of (blocked ?? []) as BlockedAccessEvent[]) {
    const row = [
      csvEscape(event.event_id),
      csvEscape(labelFor(actorMap, event.user_id, 'User')),
      csvEscape(labelFor(matterMap, event.attempted_matter_id, 'Matter')),
      csvEscape(event.reason),
      csvEscape(event.timestamp),
    ];
    lines.push(row.join(','));
  }

  return `${lines.join('\n')}\n`;
}
