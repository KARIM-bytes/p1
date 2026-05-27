import { supabaseAdmin } from './supabase';

export async function generateComplianceCSV(fromDate: string, toDate: string): Promise<string> {
  // STEP 1 — fetch sessions with joins
  const { data: sessions } = await supabaseAdmin
    .from('ai_sessions')
    .select(`
      *,
      users!ai_sessions_user_id_fkey(name, role),
      matters!ai_sessions_matter_id_fkey(matter_name, client_id,
        clients!matters_client_id_fkey(name)
      )
    `)
    .gte('session_start', fromDate)
    .lte('session_start', toDate)
    .order('session_start', { ascending: true });

  // STEP 2 — fetch blocked events
  const { data: blocked } = await supabaseAdmin
    .from('blocked_access_log')
    .select('*')
    .gte('timestamp', fromDate)
    .lte('timestamp', toDate)
    .order('timestamp', { ascending: true });

  // STEP 3 — build client anonymization map
  const clientMap = new Map<string, string>();
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  let clientIndex = 0;

  for (const session of sessions || []) {
    const clientId = (session.matters as any)?.client_id;
    if (clientId && !clientMap.has(clientId)) {
      clientMap.set(clientId, `Client ${letters[clientIndex]}`);
      clientIndex++;
    }
  }

  const getClientLabel = (clientId: string) =>
    clientMap.get(clientId) || 'Client Unknown';

  // STEP 4 — build CSV string
  let csv = '';

  csv += 'BRAHMO Compliance Engine — Compliance Export\n';
  csv += `Generated: ${new Date().toISOString()}\n\n`;

  csv += 'AI SESSIONS\n';
  csv += 'SESSION_ID,USER_NAME,USER_ROLE,MATTER_NAME,CLIENT,QUERY_TYPE,SESSION_START,SESSION_END,OUTPUT_HASH,TOKEN_COUNT,REVIEW_STATUS,REVIEWER_ID,REVIEW_DECISION,REVIEW_NOTES\n';

  for (const session of sessions || []) {
    const s = session as any;
    const clientLabel = getClientLabel(s.matters?.client_id);
    const row = [
      s.id,
      s.users?.name,
      s.users?.role,
      `"${s.matters?.matter_name || ''}"`,
      clientLabel,
      s.query_type,
      s.session_start,
      s.session_end || '',
      s.output_hash || '',
      s.output_token_count || '',
      s.review_status,
      s.reviewer_id || '',
      s.review_decision || '',
      `"${(s.review_notes || '').replace(/"/g, '""')}"`,
    ];
    csv += row.join(',') + '\n';
  }

  csv += '\n\n';

  csv += 'BLOCKED ACCESS LOG\n';
  csv += 'EVENT_ID,USER_ID,ATTEMPTED_MATTER,REASON,DETAILS,TIMESTAMP\n';

  for (const event of blocked || []) {
    const e = event as any;
    const row = [
      e.event_id,
      e.user_id,
      e.attempted_matter_id,
      e.reason,
      `"${(e.details || '').replace(/"/g, '""')}"`,
      e.timestamp,
    ];
    csv += row.join(',') + '\n';
  }

  // STEP 5 — return
  return csv;
}
