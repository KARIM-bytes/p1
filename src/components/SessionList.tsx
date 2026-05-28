'use client';

import { AiSession } from '@/lib/types';

interface SessionListProps {
  sessions: AiSession[];
  loading: boolean;
  showReviewDetails?: boolean;
  now?: number;
}

const statusClass: Record<string, string> = {
  reviewed: 'bg-emerald-100 text-emerald-800',
  pending: 'bg-amber-100 text-amber-800',
  rejected: 'bg-rose-100 text-rose-800',
};

export default function SessionList({
  sessions,
  loading,
  showReviewDetails = false,
  now = 0,
}: SessionListProps) {
  if (loading) {
    return <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading sessions...</div>;
  }

  if (sessions.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">
        No sessions found for the matters visible to this user.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Matter</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Output Hash</th>
              <th className="px-4 py-3">Status</th>
              {showReviewDetails && <th className="px-4 py-3">Review</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sessions.map((session) => {
              const currentTime = now || new Date(session.session_start).getTime();
              const hoursElapsed = (currentTime - new Date(session.session_start).getTime()) / 36e5;
              const slaBreached = session.review_status === 'pending' && hoursElapsed > 48;

              return (
                <tr key={session.id} className={slaBreached ? 'bg-amber-50' : 'bg-white'}>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                    {new Date(session.session_start).toLocaleDateString()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">{session.user_id.slice(0, 8)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">{session.matter_id}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">{session.query_type ?? 'unknown'}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">
                    {session.output_hash ? `${session.output_hash.slice(0, 12)}...` : 'pending'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusClass[session.review_status] ?? 'bg-slate-100 text-slate-700'}`}>
                      {session.review_status}
                    </span>
                    {slaBreached && (
                      <span className="ml-2 rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-800">
                        SLA breach
                      </span>
                    )}
                  </td>
                  {showReviewDetails && (
                    <td className="px-4 py-3 text-slate-600">
                      {session.reviewer_id ? `${session.reviewer_id.slice(0, 8)} / ${session.review_decision}` : 'Not reviewed'}
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
