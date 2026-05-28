'use client';

import { Matter } from '@/lib/types';

interface MatterListProps {
  matters: Matter[];
  loading: boolean;
  onStartSession?: (matterId: string) => void;
}

export default function MatterList({ matters, loading, onStartSession }: MatterListProps) {
  if (loading) {
    return <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading matters...</div>;
  }

  if (matters.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
        No matters are visible for this user. RLS returned zero rows.
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-950">Accessible Matters</h2>
      </div>
      <ul className="divide-y divide-slate-100">
        {matters.map((matter) => (
          <li key={matter.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-medium text-slate-950">{matter.matter_name}</div>
              <div className="mt-1 text-sm text-slate-500">
                {matter.practice_area ?? 'general'} / {matter.court ?? 'No court'} / {matter.status}
              </div>
            </div>
            {onStartSession && (
              <button
                type="button"
                onClick={() => onStartSession(matter.id)}
                className="h-9 rounded-md bg-slate-900 px-3 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700"
              >
                Start Session
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
