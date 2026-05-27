// ============================================================
// app/api/export/route.ts
//
// GET /api/export?from=2026-05-01&to=2026-05-31
//
// Returns: CSV file download
// - Client names ANONYMIZED (never real names)
// - Output column = SHA-256 hash, not full text
// - Blocked access events included
// - Triggers browser CSV download via Content-Disposition header
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { generateComplianceCSV } from '@/lib/compliance-export';

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get('from');
  const to   = req.nextUrl.searchParams.get('to');

  if (!from || !to) {
    return NextResponse.json(
      { error: '"from" and "to" date params are required (YYYY-MM-DD)' },
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
  } catch (err) {
    console.error('[export]', err);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
