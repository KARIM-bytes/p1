'use client';

// ============================================================
// components/BlockedAccessLog.tsx
//
// Displays the append-only blocked_access_log table.
// Visible only to partners (RLS enforces this at DB level).
// Shows: timestamp | user | attempted matter | reason
// Includes the "APPEND-ONLY" tamper-proof label prominently.
// ============================================================

import { BlockedAccessEvent } from '@/lib/types';

interface BlockedAccessLogProps {
  events: BlockedAccessEvent[];
  loading: boolean;
}

export default function BlockedAccessLog({ events, loading }: BlockedAccessLogProps) {
  if (loading) {
    return <div className="blocked-log blocked-log--loading">Loading blocked events…</div>;
  }

  return (
    <div className="blocked-log">
      <div className="blocked-log__header">
        <h2 className="blocked-log__title">
          🚫 Blocked Access Log
        </h2>
        <span className="blocked-log__tamper-badge">
          🔒 APPEND-ONLY — cannot modify or delete
        </span>
      </div>

      {events.length === 0 ? (
        <div className="blocked-log__empty">No blocked events in this period.</div>
      ) : (
        <table className="blocked-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Attempted Matter</th>
              <th>Reason</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.event_id} className="blocked-row">
                <td>{new Date(e.timestamp).toLocaleString()}</td>
                <td>
                  <span className="blocked-row__user">{e.user_id}</span>
                </td>
                <td>
                  {/* 
                    IMPORTANT: We show the attempted_matter_id here (for partners
                    reading the log). In the access-check API response to non-partners,
                    we NEVER reveal the matter ID or name.
                  */}
                  <code>{e.attempted_matter_id}</code>
                </td>
                <td>
                  <span className="badge badge--danger">{e.reason}</span>
                </td>
                <td className="blocked-row__details">{e.details ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
