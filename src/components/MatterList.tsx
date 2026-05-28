'use client';

import { Matter } from '@/lib/types';

interface MatterListProps {
  matters: Matter[];
  loading: boolean;
  onStartSession?: (matterId: string) => void;
}

const areaColor: Record<string, string> = {
  criminal:  'badge badge-red',
  property:  'badge badge-amber',
  corporate: 'badge badge-purple',
};

export default function MatterList({ matters, loading, onStartSession }: MatterListProps) {
  if (loading) {
    return (
      <div className="grok-card p-6" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="dot-live" /> Loading matters…
        </div>
      </div>
    );
  }

  if (matters.length === 0) {
    return (
      <div className="grok-card p-6" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        No matters visible for this user — RLS returned zero rows.
      </div>
    );
  }

  return (
    <section className="grok-card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          Accessible Matters
        </h2>
        <span className="badge badge-green">{matters.length} visible</span>
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {matters.map((matter, idx) => (
          <li
            key={matter.id}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '14px 20px',
              borderBottom: idx < matters.length - 1 ? '1px solid var(--border)' : 'none',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-hi)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                {matter.matter_name}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
                <span className={areaColor[matter.practice_area ?? ''] ?? 'badge badge-zinc'}>
                  {matter.practice_area ?? 'general'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {matter.court ?? 'No court'} · {matter.status}
                </span>
              </div>
            </div>
            {onStartSession && (
              <button
                type="button"
                onClick={() => onStartSession(matter.id)}
                className="btn btn-secondary"
                style={{ height: '34px', fontSize: '0.8rem' }}
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
