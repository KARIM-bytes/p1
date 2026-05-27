// ============================================================
// app/api/review/route.ts
//
// POST /api/review
// Body: { sessionId, reviewerId, decision, notes? }
//
// Only partners can review. Records: reviewer, decision, timestamp.
// Nobody is exempt — partner sessions are also reviewed.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { recordReview } from '@/lib/audit-trail';
import { supabaseAdmin } from '@/lib/supabase';

// GET — pending review queue for a partner (scoped to their permitted matters)
export async function GET(req: NextRequest) {
  const reviewerId = req.nextUrl.searchParams.get('reviewerId');
  if (!reviewerId) {
    return NextResponse.json({ error: 'reviewerId is required' }, { status: 400 });
  }

  try {
    const { data: perms } = await supabaseAdmin
      .from('matter_permissions')
      .select('matter_id')
      .eq('user_id', reviewerId);

    const matterIds = (perms || []).map((p: any) => p.matter_id);
    if (matterIds.length === 0) return NextResponse.json({ sessions: [] });

    const { data: sessions, error } = await supabaseAdmin
      .from('ai_sessions')
      .select('*')
      .eq('review_status', 'pending')
      .in('matter_id', matterIds)
      .order('session_start', { ascending: false });

    if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    return NextResponse.json({ sessions: sessions ?? [] });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST — submit a review decision
export async function POST(req: NextRequest) {
  try {
    const { sessionId, reviewerId, decision, notes } = await req.json();

    if (!sessionId || !reviewerId || !decision) {
      return NextResponse.json(
        { error: 'sessionId, reviewerId, and decision are required' },
        { status: 400 }
      );
    }

    // TODO: verify reviewer role is 'partner' via users table
    await recordReview(sessionId, reviewerId, decision, notes);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[review POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
