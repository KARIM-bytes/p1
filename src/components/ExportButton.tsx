'use client';

// ============================================================
// components/ExportButton.tsx
//
// Triggers GET /api/export?from=...&to=... and initiates a
// browser CSV download. Client name anonymization happens
// server-side — this component just controls the date range.
// ============================================================

import { useState } from 'react';

interface ExportButtonProps {
  /** Default: 30 days ago */
  defaultFrom?: string;
  /** Default: today */
  defaultTo?: string;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function thirtyDaysAgoISO() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

export default function ExportButton({
  defaultFrom = thirtyDaysAgoISO(),
  defaultTo   = todayISO(),
}: ExportButtonProps) {
  const [from, setFrom] = useState(defaultFrom);
  const [to,   setTo]   = useState(defaultTo);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/export?from=${from}&to=${to}`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? 'Export failed');
      }

      // Trigger browser download
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `brahmo-compliance-${from}-to-${to}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="export-widget">
      <div className="export-widget__controls">
        <label htmlFor="export-from">From</label>
        <input
          id="export-from"
          type="date"
          value={from}
          max={to}
          onChange={(e) => setFrom(e.target.value)}
          className="export-widget__date"
        />

        <label htmlFor="export-to">To</label>
        <input
          id="export-to"
          type="date"
          value={to}
          min={from}
          max={todayISO()}
          onChange={(e) => setTo(e.target.value)}
          className="export-widget__date"
        />

        <button
          id="export-csv-btn"
          onClick={handleExport}
          disabled={loading}
          className="btn btn--export"
        >
          {loading ? '⏳ Generating…' : '📄 Export Compliance CSV'}
        </button>
      </div>

      {error && <p className="export-widget__error">⚠️ {error}</p>}

      <p className="export-widget__note">
        Client names are anonymized (Client A, B, C). Output hashes only — no full text.
      </p>
    </div>
  );
}
