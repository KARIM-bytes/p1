// ============================================================
// app/api/blocked-log/route.ts
// GET /api/blocked-log — returns all blocked_access_log entries
// ============================================================
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('blocked_access_log')
    .select('*')
    .order('timestamp', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
  return NextResponse.json({ events: data ?? [] });
}
