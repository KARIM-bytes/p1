import { NextRequest, NextResponse } from 'next/server';
import { checkAccess } from '@/lib/ethical-wall';
import { getAuthenticatedContext } from '@/lib/supabase';

interface AccessCheckBody {
  matterId?: string;
}

export async function POST(req: NextRequest) {
  const context = await getAuthenticatedContext(req);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = (await req.json()) as AccessCheckBody;
    if (!body.matterId) {
      return NextResponse.json({ error: 'matterId is required' }, { status: 400 });
    }

    const result = await checkAccess(context.client, context.authUser.id, body.matterId);
    return NextResponse.json({ status: result.status });
  } catch (error) {
    console.error('[access-check]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
