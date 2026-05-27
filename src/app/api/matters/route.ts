// ============================================================
// app/api/matters/route.ts
// GET /api/matters?userId=<id>
// Returns only matters this user has permission for (mirrors RLS).
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { getAccessibleMatters } from '@/lib/ethical-wall';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
  try {
    const matterIds = await getAccessibleMatters(userId);
    if (matterIds.length === 0) {
      return NextResponse.json({ matters: [] });
    }
    const { data: matters, error } = await supabaseAdmin
      .from('matters')
      .select('*')
      .in('id', matterIds);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ matters: matters ?? [] });
  } catch (e) {
    console.error('[matters]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
