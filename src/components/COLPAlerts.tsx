'use client';

import type { BlockedAccessEvent } from '@/lib/types';

interface AlertTier {
  userId: string;
  count: number;
  level: 'info' | 'warning' | 'critical';
  lastSeen: string;
}

interface COLPAlertsProps {
  blockedEvents: BlockedAccessEvent[];
}

const TIER_LABELS = {
  info:     { label: 'INFO',     color: 'var(--accent)',  bg: 'rgba(0,255,159,.08)',  border: 'rgba(0,255,159,.2)',  icon: 'ⓘ'  },
  warning:  { label: 'WARNING',  color: '#FACC15',        bg: 'rgba(250,204,21,.08)', border: 'rgba(250,204,21,.2)', icon: '⚠'  },
  critical: { label: 'CRITICAL', color: '#EF4444',        bg: 'rgba(239,68,68,.08)',  border: 'rgba(239,68,68,.2)',  icon: '🔴' },
};

function getAlertLevel(count: number): AlertTier['level'] {
  if (count >= 5) return 'critical';
  if (count >= 3) return 'warning';
  return 'info';
}

function buildAlerts(events: BlockedAccessEvent[]): AlertTier[] {
  // Count events per user in the last 24 hours
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const recent = events.filter((e) => new Date(e.timestamp).getTime() > cutoff);

  const countMap = new Map<string, { count: number; last: string }>();
  for (const ev of recent) {
    const existing = countMap.get(ev.user_id);
    if (!existing) {
      countMap.set(ev.user_id, { count: 1, last: ev.timestamp });
    } else {
      const isNewer = new Date(ev.timestamp) > new Date(existing.last);
      countMap.set(ev.user_id, {
        count:  existing.count + 1,
        last:   isNewer ? ev.timestamp : existing.last,
      });
    }
  }

  return Array.from(countMap.entries())
    .map(([userId, { count, last }]) => ({
      userId,
      count,
      level: getAlertLevel(count),
      lastSeen: last,
    }))
    .sort((a, b) => b.count - a.count); // highest count first
}

export default function COLPAlerts({ blockedEvents }: COLPAlertsProps) {
  const alerts = buildAlerts(blockedEvents);

  const total   = blockedEvents.length;
  const critical = alerts.filter((a) => a.level === 'critical').length;
  const warning  = alerts.filter((a) => a.level === 'warning').length;

  return (
    <section
      style={{
        background: 'var(--surface)',
        border: critical > 0
          ? '1px solid rgba(239,68,68,.35)'
          : warning > 0
          ? '1px solid rgba(250,204,21,.3)'
          : '1px solid rgba(0,255,159,.2)',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 10px 15px -3px rgba(0,0,0,.4)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          background: critical > 0
            ? 'rgba(239,68,68,.04)'
            : warning > 0
            ? 'rgba(250,204,21,.04)'
            : 'rgba(0,255,159,.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1rem' }}>{critical > 0 ? '🔴' : warning > 0 ? '⚠' : 'ⓘ'}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '.9rem', color: 'var(--text-primary)' }}>
              COLP Alert Monitor
            </div>
            <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: '1px' }}>
              Compliance Officer for Legal Practice — last 24 hours
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: '9999px', background: 'rgba(113,113,122,.12)', color: 'var(--text-muted)' }}>
            {total} total events
          </span>
          {critical > 0 && (
            <span style={{ fontSize: '.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: '9999px', background: 'rgba(239,68,68,.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,.25)' }}>
              {critical} critical
            </span>
          )}
          {warning > 0 && (
            <span style={{ fontSize: '.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: '9999px', background: 'rgba(250,204,21,.12)', color: '#FACC15', border: '1px solid rgba(250,204,21,.25)' }}>
              {warning} warning
            </span>
          )}
        </div>
      </div>

      {/* Tier legend */}
      <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {(['info', 'warning', 'critical'] as const).map((tier) => {
          const t = TIER_LABELS[tier];
          return (
            <div key={tier} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px', background: t.bg, color: t.color, border: `1px solid ${t.border}` }}>
                {t.label}
              </span>
              <span style={{ fontSize: '.68rem', color: 'var(--text-muted)' }}>
                {tier === 'info' ? '1–2 events' : tier === 'warning' ? '3–4 events' : '5+ events'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Alert rows */}
      {alerts.length === 0 ? (
        <div style={{ padding: '20px', fontSize: '.83rem', color: 'var(--text-muted)' }}>
          No blocked access events in the last 24 hours.
        </div>
      ) : (
        <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {alerts.map((alert) => {
            const t = TIER_LABELS[alert.level];
            const time = new Date(alert.lastSeen).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            const date = new Date(alert.lastSeen).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

            return (
              <div
                key={alert.userId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background: t.bg,
                  border: `1px solid ${t.border}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '.75rem', fontWeight: 700, padding: '2px 10px', borderRadius: '9999px', background: t.bg, color: t.color, border: `1px solid ${t.border}` }}>
                    {t.icon} {t.label}
                  </span>
                  <span className="font-mono" style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>
                    {alert.userId.slice(0, 16)}…
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '.8rem', fontWeight: 700, color: t.color }}>
                    {alert.count} attempt{alert.count !== 1 ? 's' : ''}
                  </span>
                  <span style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>
                    Last: {date} {time}
                  </span>
                  {alert.level === 'critical' && (
                    <span style={{ fontSize: '.68rem', fontWeight: 600, color: '#EF4444', padding: '2px 8px', borderRadius: '9999px', background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.2)' }}>
                      ESCALATE TO COLP
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Hash chain note */}
      <div
        style={{
          padding: '10px 20px',
          borderTop: '1px solid var(--border)',
          fontSize: '.72rem',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span style={{ color: 'var(--accent)' }}>⬡</span>
        Each log entry is hash-chained — SHA-256(prev_hash ‖ event_data). Tampering is cryptographically detectable.
      </div>
    </section>
  );
}
