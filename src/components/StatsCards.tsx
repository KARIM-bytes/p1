'use client';

import { DashboardStats } from '@/lib/types';

interface StatsCardsProps {
  stats: DashboardStats | null;
  loading: boolean;
}

const cards = [
  { key: 'totalSessions', label: 'Total Sessions', tone: 'border-slate-200 bg-white text-slate-900' },
  { key: 'reviewedSessions', label: 'Reviewed', tone: 'border-emerald-200 bg-emerald-50 text-emerald-900' },
  { key: 'pendingSessions', label: 'Pending Review', tone: 'border-amber-200 bg-amber-50 text-amber-900' },
  { key: 'blockedEvents', label: 'Blocked Events', tone: 'border-rose-200 bg-rose-50 text-rose-900' },
] as const;

export default function StatsCards({ stats, loading }: StatsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const value = card.key === 'reviewedSessions'
          ? `${stats?.reviewedSessions ?? 0} (${stats?.reviewedPercent ?? 0}%)`
          : stats?.[card.key] ?? 0;

        return (
          <div key={card.key} className={`min-h-28 rounded-lg border p-4 shadow-sm ${card.tone}`}>
            <div className="text-sm font-medium text-slate-500">{card.label}</div>
            <div className="mt-3 text-3xl font-semibold tracking-normal">
              {loading ? '...' : value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
