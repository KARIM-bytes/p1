import { NextRequest, NextResponse } from 'next/server';
import { getPendingReviewSessions, recordReview } from '@/lib/audit-trail';
import { getAuthenticatedContext, requirePartner } from '@/lib/supabase';
import type { ReviewDecision } from '@/lib/types';

const REVIEW_DECISIONS: ReviewDecision[] = ['approved', 'approved_with_edits', 'rejected'];

interface ReviewBody {
  sessionId?: string;
  decision?: ReviewDecision;
  notes?: string;
}

export async function GET(req: NextRequest) {
  const context = await getAuthenticatedContext(req);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!requirePartner(context.profile)) {
    return NextResponse.json({ error: 'Partner role required' }, { status: 403 });
  }

  try {
    const sessions = await getPendingReviewSessions(context.client);
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('[review GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const context = await getAuthenticatedContext(req);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!requirePartner(context.profile)) {
    return NextResponse.json({ error: 'Partner role required' }, { status: 403 });
  }

  try {
    const body = (await req.json()) as ReviewBody;
    if (!body.sessionId || !body.decision || !REVIEW_DECISIONS.includes(body.decision)) {
      return NextResponse.json(
        { error: 'sessionId and valid decision are required' },
        { status: 400 }
      );
    }

    const result = await recordReview(
      context.client,
      body.sessionId,
      context.authUser.id,
      body.decision,
      body.notes?.trim() || null
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? 'Review failed' }, { status: 403 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[review POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
