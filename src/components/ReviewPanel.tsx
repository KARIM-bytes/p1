'use client';

import { useState } from 'react';
import { AiSession, ReviewDecision } from '@/lib/types';

interface ReviewPanelProps {
  pendingSessions: AiSession[];
  onReviewSubmit: (sessionId: string, decision: ReviewDecision, notes: string) => Promise<void>;
  loading: boolean;
}

export default function ReviewPanel({
  pendingSessions,
  onReviewSubmit,
  loading,
}: ReviewPanelProps) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  async function handleDecision(sessionId: string, decision: ReviewDecision) {
    setSubmitting(sessionId);
    try {
      await onReviewSubmit(sessionId, decision, notes[sessionId] ?? '');
    } finally {
      setSubmitting(null);
    }
  }

  if (loading) {
    return <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading review queue...</div>;
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-semibold text-slate-950">Review Queue</h2>
        <p className="mt-1 text-sm text-slate-500">{pendingSessions.length} sessions awaiting partner review.</p>
      </div>

      {pendingSessions.length === 0 ? (
        <div className="p-6 text-sm text-slate-500">No sessions pending review.</div>
      ) : (
        <div className="space-y-4 p-5">
          {pendingSessions.map((session) => (
            <article key={session.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-mono text-xs text-slate-500">{session.id}</span>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                  {session.query_type}
                </span>
                <span className="text-slate-500">{session.matter_id}</span>
              </div>
              <div className="mt-2 font-mono text-xs text-slate-500">
                Hash: {session.output_hash ? `${session.output_hash.slice(0, 24)}...` : 'pending'}
              </div>
              <textarea
                className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                placeholder="Review notes"
                value={notes[session.id] ?? ''}
                onChange={(event) => setNotes((current) => ({ ...current, [session.id]: event.target.value }))}
                rows={2}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={submitting === session.id}
                  onClick={() => handleDecision(session.id, 'approved')}
                  className="h-9 rounded-md bg-emerald-700 px-3 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-60"
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={submitting === session.id}
                  onClick={() => handleDecision(session.id, 'approved_with_edits')}
                  className="h-9 rounded-md bg-blue-700 px-3 text-sm font-medium text-white shadow-sm transition hover:bg-blue-600 disabled:opacity-60"
                >
                  Approve with Edits
                </button>
                <button
                  type="button"
                  disabled={submitting === session.id}
                  onClick={() => handleDecision(session.id, 'rejected')}
                  className="h-9 rounded-md bg-rose-700 px-3 text-sm font-medium text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-60"
                >
                  Reject
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
