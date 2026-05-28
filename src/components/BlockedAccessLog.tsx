'use client';

import { BlockedAccessEvent } from '@/lib/types';

interface BlockedAccessLogProps {
  events: BlockedAccessEvent[];
  loading: boolean;
}

export default function BlockedAccessLog({ events, loading }: BlockedAccessLogProps) {
  if (loading) {
    return <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading blocked events...</div>;
  }

  return (
    <section className="overflow-hidden rounded-lg border border-rose-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-rose-100 bg-rose-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-base font-semibold text-rose-950">Blocked Access Log</h2>
        <span className="rounded-full border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-800">
          Append-only audit evidence
        </span>
      </div>

      {events.length === 0 ? (
        <div className="p-6 text-sm text-slate-500">No blocked events in this period.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Attempted Matter</th>
                <th className="px-4 py-3">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.map((event) => (
                <tr key={event.event_id}>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                    {new Date(event.timestamp).toLocaleString()}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">{event.user_id.slice(0, 8)}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-700">{event.attempted_matter_id}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-800">
                      {event.reason}
                    </span>
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
