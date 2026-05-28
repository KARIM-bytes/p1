import { NextRequest, NextResponse } from 'next/server';
import { getAccessibleMatters } from '@/lib/ethical-wall';
import { getAuthenticatedContext } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const context = await getAuthenticatedContext(req);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const matters = await getAccessibleMatters(context.client);
    return NextResponse.json({ matters });
  } catch (error) {
    console.error('[matters]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
