import { NextRequest, NextResponse } from 'next/server';
import { generateComplianceCSV } from '@/lib/compliance-export';
import { getAuthenticatedContext, requirePartner } from '@/lib/supabase';

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET(req: NextRequest) {
  const context = await getAuthenticatedContext(req);
  if (!context) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!requirePartner(context.profile)) {
    return NextResponse.json({ error: 'Partner role required' }, { status: 403 });
  }

  const from = req.nextUrl.searchParams.get('from');
  const to = req.nextUrl.searchParams.get('to');

  if (!from || !to || !isIsoDate(from) || !isIsoDate(to)) {
    return NextResponse.json(
      { error: '"from" and "to" date params are required as YYYY-MM-DD' },
      { status: 400 }
    );
  }

  try {
    const csv = await generateComplianceCSV(from, to);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="brahmo-compliance-${from}-to-${to}.csv"`,
      },
    });
  } catch (error) {
    console.error('[export]', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
