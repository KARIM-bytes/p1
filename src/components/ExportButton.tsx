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
  const date = new Date();
  date.setDate(date.getDate() - 30);
  return date.toISOString().slice(0, 10);
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
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="grid gap-3 sm:grid-cols-[auto_auto_1fr] sm:items-end">
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          From
          <input
            type="date"
            value={from}
            max={to}
            onChange={(event) => setFrom(event.target.value)}
            className="h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
          />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700">
          To
          <input
            type="date"
            value={to}
            min={from}
            max={todayISO()}
            onChange={(event) => setTo(event.target.value)}
            className="h-10 rounded-md border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
          />
        </label>
        <button
          type="button"
          onClick={handleExport}
          disabled={loading}
          className="h-10 rounded-md bg-slate-900 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700 disabled:opacity-60"
        >
          {loading ? 'Generating...' : 'Export Compliance CSV'}
        </button>
      </div>
      {error && <p className="mt-3 text-sm font-medium text-rose-700">{error}</p>}
      <p className="mt-3 text-sm text-slate-500">
        Export masks clients, matters, users, reviewers, and notes while retaining hashes and timestamps for audit proof.
      </p>
    </div>
  );
}
