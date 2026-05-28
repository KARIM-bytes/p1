'use client';

import type { SessionWithJoins } from '@/lib/types';

interface SessionListProps {
  sessions: SessionWithJoins[];
  loading: boolean;
  showReviewDetails?: boolean;
  now?: number;
}

const statusBadge: Record<string, string> = {
  reviewed: 'badge badge-green',
  pending:  'badge badge-amber',
  rejected: 'badge badge-red',
};

export default function SessionList({
  sessions,
  loading,
  showReviewDetails = false,
  now = 0,
}: SessionListProps) {
  if (loading) {
    return (
      <div className="grok-card p-6" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="dot-live" /> Loading sessions…
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="grok-card p-6" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        No sessions found for the matters visible to this user.
      </div>
    );
  }

  return (
    <div className="grok-card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>AI Sessions</h2>
        <span className="badge badge-zinc">{sessions.length} records</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="grok-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>User</th>
              <th>Matter</th>
              <th>Type</th>
              <th>Output Hash</th>
              <th>Status</th>
              {showReviewDetails && <th>Review</th>}
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => {
              const currentTime = now || new Date(session.session_start).getTime();
              const hoursElapsed = (currentTime - new Date(session.session_start).getTime()) / 36e5;
              const slaBreached = session.review_status === 'pending' && hoursElapsed > 48;

              return (
                <tr key={session.id} style={slaBreached ? { background: 'rgba(250,204,21,0.05)' } : {}}>
                  <td style={{ color: 'var(--text-primary)' }}>
                    {new Date(session.session_start).toLocaleDateString()}
                  </td>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                    {(session as SessionWithJoins).users?.name ?? session.user_id.slice(0, 8)}
                  </td>
                  <td style={{ color: 'var(--text-primary)' }}>
                    {(session as SessionWithJoins).matters?.matter_name ?? session.matter_id}
                  </td>
                  <td>
                    <span className="badge badge-purple">{session.query_type ?? 'unknown'}</span>
                  </td>
                  <td className="font-mono" style={{ fontSize: '0.75rem' }}>
                    {session.output_hash ? `${session.output_hash.slice(0, 12)}…` : 'pending'}
                  </td>
                  <td>
                    <span className={statusBadge[session.review_status] ?? 'badge badge-zinc'}>
                      {session.review_status}
                    </span>
                    {slaBreached && (
                      <span className="badge badge-red" style={{ marginLeft: '6px' }}>SLA breach</span>
                    )}
                  </td>
                  {showReviewDetails && (
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {session.reviewer_id
                        ? `${session.reviewer_id.slice(0, 8)} / ${session.review_decision}`
                        : 'Not reviewed'}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
