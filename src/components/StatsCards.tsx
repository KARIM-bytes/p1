'use client';

import { DashboardStats } from '@/lib/types';

interface StatsCardsProps {
  stats: DashboardStats | null;
  loading: boolean;
}

const cards = [
  { key: 'totalSessions',   label: 'Total Sessions',  accent: 'stat-accent-green',  icon: '⬡' },
  { key: 'reviewedSessions', label: 'Reviewed',        accent: 'stat-accent-purple', icon: '✓' },
  { key: 'pendingSessions', label: 'Pending Review',   accent: 'stat-accent-amber',  icon: '◷' },
  { key: 'blockedEvents',   label: 'Blocked Events',   accent: 'stat-accent-red',    icon: '⊘' },
] as const;

const valueColor: Record<string, string> = {
  'stat-accent-green':  'color: #00FF9F',
  'stat-accent-purple': 'color: #A855F7',
  'stat-accent-amber':  'color: #FACC15',
  'stat-accent-red':    'color: #EF4444',
};

export default function StatsCards({ stats, loading }: StatsCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const value =
          card.key === 'reviewedSessions'
            ? `${stats?.reviewedSessions ?? 0}`
            : stats?.[card.key] ?? 0;

        const sub =
          card.key === 'reviewedSessions'
            ? `${stats?.reviewedPercent ?? 0}% coverage`
            : undefined;

        return (
          <div key={card.key} className={`grok-card ${card.accent} p-5 flex flex-col gap-2`}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {card.label}
              </span>
              <span style={{ fontSize: '1rem', opacity: 0.4 }}>{card.icon}</span>
            </div>
            <div style={{ fontSize: '2.25rem', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1, marginTop: '4px', ...Object.fromEntries([valueColor[card.accent].split(': ')]) }}>
              {loading ? <span className="skeleton" style={{ display: 'inline-block', width: '64px', height: '36px', borderRadius: '8px' }} /> : value}
            </div>
            {sub && !loading && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{sub}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
