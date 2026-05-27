// ============================================================
// app/api/sessions/route.ts
//
// GET  /api/sessions?userId=<id>         → list sessions for user
// POST /api/sessions                     → start a new session
// PATCH /api/sessions                    → end a session (store hash)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { checkAccess } from '@/lib/ethical-wall';
import { recordSessionStart, recordSessionEnd, getSessionsForUser } from '@/lib/audit-trail';

// GET — list sessions for a user (scoped to their permitted matters)
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  }

  try {
    // TODO: call getSessionsForUser(userId)
    const sessions = await getSessionsForUser(userId);
    return NextResponse.json({ sessions });
  } catch (err) {
    console.error('[sessions GET]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST — start a new AI session (requires CLEAR access check)
export async function POST(req: NextRequest) {
  try {
    const { userId, matterId, queryType } = await req.json();

    // 1. Enforce ethical wall FIRST
    const access = await checkAccess(userId, matterId);
    if (access.status === 'BLOCKED') {
      // Return empty — do NOT reveal why or that the matter exists
      return NextResponse.json({ sessions: [] }, { status: 200 });
    }

    // 2. Record session start in audit trail
    const session = await recordSessionStart(userId, matterId, queryType);
    return NextResponse.json({ session }, { status: 201 });
  } catch (err) {
    console.error('[sessions POST]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH — end a session (store output hash, NOT raw output)
export async function PATCH(req: NextRequest) {
  try {
    const { sessionId, rawOutput, tokenCount } = await req.json();

    // TODO: call recordSessionEnd(sessionId, rawOutput, tokenCount)
    await recordSessionEnd(sessionId, rawOutput, tokenCount);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[sessions PATCH]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
