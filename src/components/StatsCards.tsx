'use client';

// ============================================================
// components/StatsCards.tsx
//
// Four metric cards shown at the top of the dashboard:
//   Sessions | Reviewed (%) | Pending | Blocked
// ============================================================

import { DashboardStats } from '@/lib/types';

interface StatsCardsProps {
  stats: DashboardStats | null;
  loading: boolean;
}

export default function StatsCards({ stats, loading }: StatsCardsProps) {
  if (loading) {
    return (
      <div className="stats-grid">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="stat-card stat-card--loading" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    { label: 'Total Sessions',   value: stats.totalSessions,   icon: '🗂️', variant: 'default' },
    { label: 'Reviewed',         value: `${stats.reviewedSessions} (${stats.reviewedPercent}%)`, icon: '✅', variant: 'success'  },
    { label: 'Pending Review',   value: stats.pendingSessions,  icon: '⏳', variant: 'warning' },
    { label: 'Blocked Events',   value: stats.blockedEvents,    icon: '🚫', variant: 'danger'  },
  ];

  return (
    <div className="stats-grid">
      {cards.map((card) => (
        <div key={card.label} className={`stat-card stat-card--${card.variant}`}>
          <div className="stat-card__icon">{card.icon}</div>
          <div className="stat-card__value">{card.value}</div>
          <div className="stat-card__label">{card.label}</div>
        </div>
      ))}
    </div>
  );
}
