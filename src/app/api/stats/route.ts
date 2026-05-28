import { NextRequest, NextResponse } from 'next/server';
import { getDashboardStats } from '@/lib/audit-trail';
import { getAuthenticatedContext } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const context = await getAuthenticatedContext(req);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const stats = await getDashboardStats(context.client);
    return NextResponse.json({ stats });
  } catch (error) {
    console.error('[stats]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
