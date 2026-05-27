import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

  try {
    const { data: perms } = await supabaseAdmin
      .from('matter_permissions')
      .select('matter_id')
      .eq('user_id', userId);

    const matterIds = (perms || []).map((p: any) => p.matter_id);

    let totalSessions = 0, reviewedSessions = 0, pendingSessions = 0;

    if (matterIds.length > 0) {
      const { data: sessions } = await supabaseAdmin
        .from('ai_sessions')
        .select('review_status')
        .in('matter_id', matterIds);

      totalSessions    = sessions?.length ?? 0;
      reviewedSessions = sessions?.filter((s: any) => s.review_status === 'reviewed').length ?? 0;
      pendingSessions  = sessions?.filter((s: any) => s.review_status === 'pending').length ?? 0;
    }

    const { count: blockedEvents } = await supabaseAdmin
      .from('blocked_access_log')
      .select('*', { count: 'exact', head: true });

    const stats = {
      totalSessions,
      reviewedSessions,
      pendingSessions,
      blockedEvents: blockedEvents ?? 0,
      reviewedPercent: totalSessions > 0
        ? Math.round((reviewedSessions / totalSessions) * 100)
        : 0,
    };

    return NextResponse.json({ stats });
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
