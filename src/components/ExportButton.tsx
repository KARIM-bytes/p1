'use client';

import { useState } from 'react';
import { authFetch } from '@/lib/api-client';

interface ExportButtonProps {
  defaultFrom?: string;
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
  defaultTo = todayISO(),
}: ExportButtonProps) {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch(`/api/export?from=${from}&to=${to}`);
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? 'Export failed');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `brahmo-compliance-${from}-to-${to}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grok-card" style={{ padding: '24px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          Compliance Export
        </h2>
        <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Exports masked audit data — clients, matters, users and reviewer identities are
          anonymised while preserving hashes and timestamps for regulator review.
        </p>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', color: 'var(--text-second)', fontWeight: 500 }}>
          From
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="grok-input"
          />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', color: 'var(--text-second)', fontWeight: 500 }}>
          To
          <input
            type="date"
            value={to}
            min={from}
            max={todayISO()}
            onChange={(e) => setTo(e.target.value)}
            className="grok-input"
          />
        </label>
        <button
          type="button"
          onClick={handleExport}
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? 'Generating…' : '↓ Export CSV'}
        </button>
      </div>

      {error && (
        <p style={{ marginTop: '12px', fontSize: '0.8rem', color: 'var(--danger)', fontWeight: 500 }}>
          ⚠ {error}
        </p>
      )}
    </div>
  );
}
