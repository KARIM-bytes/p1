import { NextRequest, NextResponse } from 'next/server';
import {
  getSessionsForCurrentUser,
  recordSessionEnd,
  recordSessionStart,
} from '@/lib/audit-trail';
import { getAuthenticatedContext } from '@/lib/supabase';
import type { QueryType } from '@/lib/types';

const QUERY_TYPES: QueryType[] = ['draft', 'research', 'review'];

interface StartSessionBody {
  matterId?: string;
  queryType?: QueryType;
}

interface EndSessionBody {
  sessionId?: string;
  rawOutput?: string;
  tokenCount?: number;
}

export async function GET(req: NextRequest) {
  const context = await getAuthenticatedContext(req);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const sessions = await getSessionsForCurrentUser(context.client);
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('[sessions GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const context = await getAuthenticatedContext(req);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = (await req.json()) as StartSessionBody;
    if (!body.matterId || !body.queryType || !QUERY_TYPES.includes(body.queryType)) {
      return NextResponse.json(
        { error: 'matterId and valid queryType are required' },
        { status: 400 }
      );
    }

    const result = await recordSessionStart(
      context.client,
      context.authUser.id,
      body.matterId,
      body.queryType
    );

    if (result.blocked) {
      return NextResponse.json({ sessions: [] }, { status: 200 });
    }

    if (!result.sessionId) {
      return NextResponse.json({ error: result.error ?? 'Session creation failed' }, { status: 500 });
    }

    return NextResponse.json({ session: { id: result.sessionId } }, { status: 201 });
  } catch (error) {
    console.error('[sessions POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const context = await getAuthenticatedContext(req);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = (await req.json()) as EndSessionBody;
    if (!body.sessionId || typeof body.rawOutput !== 'string' || typeof body.tokenCount !== 'number') {
      return NextResponse.json(
        { error: 'sessionId, rawOutput, and tokenCount are required' },
        { status: 400 }
      );
    }

    const result = await recordSessionEnd(
      context.client,
      body.sessionId,
      body.rawOutput,
      body.tokenCount
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? 'Session update failed' }, { status: 403 });
    }

    return NextResponse.json({ ok: true, outputHash: result.outputHash });
  } catch (error) {
    console.error('[sessions PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
