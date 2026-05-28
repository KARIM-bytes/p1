import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedContext, requirePartner } from '@/lib/supabase';
import type { BlockedAccessEvent } from '@/lib/types';

export async function GET(req: NextRequest) {
  const context = await getAuthenticatedContext(req);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!requirePartner(context.profile)) {
    return NextResponse.json({ error: 'Partner role required' }, { status: 403 });
  }

  const { data, error } = await context.client
    .from('blocked_access_log')
    .select('event_id, user_id, attempted_matter_id, reason, details, timestamp')
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('[blocked-log]', error.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  return NextResponse.json({ events: (data ?? []) as BlockedAccessEvent[] });
}
