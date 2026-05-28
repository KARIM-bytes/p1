'use client';

import { BlockedAccessEvent } from '@/lib/types';

interface BlockedAccessLogProps {
  events: BlockedAccessEvent[];
  loading: boolean;
}

export default function BlockedAccessLog({ events, loading }: BlockedAccessLogProps) {
  if (loading) {
    return (
      <div className="grok-card p-6" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="dot-live" /> Loading blocked events…
        </div>
      </div>
    );
  }

  return (
    <section className="grok-card" style={{ overflow: 'hidden', borderColor: 'rgba(239,68,68,0.25)' }}>
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(239,68,68,0.2)',
        background: 'rgba(239,68,68,0.05)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1rem' }}>⊘</span>
          <h2 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: '#F87171' }}>
            Blocked Access Log
          </h2>
        </div>
        <span className="badge badge-red">Append-only · Immutable</span>
      </div>

      {events.length === 0 ? (
        <div style={{ padding: '24px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          No blocked events in this period.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="grok-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Attempted Matter</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.event_id}>
                  <td style={{ color: 'var(--text-primary)' }}>
                    {new Date(event.timestamp).toLocaleString()}
                  </td>
                  <td className="font-mono" style={{ fontSize: '0.75rem' }}>
                    {event.user_id.slice(0, 8)}
                  </td>
                  <td className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-primary)' }}>
                    {event.attempted_matter_id}
                  </td>
                  <td>
                    <span className="badge badge-red">{event.reason}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
