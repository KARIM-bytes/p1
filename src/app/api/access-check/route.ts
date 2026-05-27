// ============================================================
// app/api/access-check/route.ts
//
// POST /api/access-check
// Body: { userId: string, matterId: string }
//
// Returns: { status: 'CLEAR' | 'BLOCKED' }
// NEVER returns the matter name/details on BLOCKED — info leak prevention.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { checkAccess } from '@/lib/ethical-wall';

export async function POST(req: NextRequest) {
  try {
    const { userId, matterId } = await req.json();

    if (!userId || !matterId) {
      return NextResponse.json(
        { error: 'userId and matterId are required' },
        { status: 400 }
      );
    }

    const result = await checkAccess(userId, matterId);

    // CRITICAL: On BLOCKED, return only status — never leak matter details
    return NextResponse.json({ status: result.status });
  } catch (err) {
    console.error('[access-check]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
