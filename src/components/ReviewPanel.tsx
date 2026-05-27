'use client';

// ============================================================
// components/ReviewPanel.tsx
//
// Partner-only review queue. Shows pending sessions and allows
// approve / reject / request-changes decisions.
// Audit trail: every review is recorded with reviewer + timestamp.
// ============================================================

import { useState } from 'react';
import { AiSession, ReviewDecision } from '@/lib/types';

interface ReviewPanelProps {
  pendingSessions: AiSession[];
  reviewerId: string;
  onReviewSubmit: (sessionId: string, decision: ReviewDecision, notes: string) => Promise<void>;
  loading: boolean;
}

export default function ReviewPanel({
  pendingSessions,
  reviewerId,
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
    return <div className="review-panel review-panel--loading">Loading review queue…</div>;
  }

  if (pendingSessions.length === 0) {
    return (
      <div className="review-panel review-panel--empty">
        ✅ No sessions pending review.
      </div>
    );
  }

  return (
    <div className="review-panel">
      <h2 className="review-panel__title">📋 Review Queue ({pendingSessions.length} pending)</h2>

      <div className="review-panel__list">
        {pendingSessions.map((s) => (
          <div key={s.id} className="review-card">
            <div className="review-card__meta">
              <span className="review-card__id">{s.id}</span>
              <span className="review-card__user">{s.user_id}</span>
              <span className="review-card__matter">{s.matter_id}</span>
              <span className={`badge badge--${s.query_type}`}>{s.query_type}</span>
              <span className="review-card__date">
                {new Date(s.session_start).toLocaleDateString()}
              </span>
            </div>

            <div className="review-card__hash">
              Output hash: <code>{s.output_hash?.slice(0, 20)}…</code>
            </div>

            <textarea
              className="review-card__notes"
              placeholder="Review notes (optional)…"
              value={notes[s.id] ?? ''}
              onChange={(e) => setNotes((n) => ({ ...n, [s.id]: e.target.value }))}
              rows={2}
            />

            <div className="review-card__actions">
              <button
                id={`approve-${s.id}`}
                disabled={submitting === s.id}
                onClick={() => handleDecision(s.id, 'approved')}
                className="btn btn--approve"
              >
                ✅ Approve
              </button>
              <button
                id={`approve-edits-${s.id}`}
                disabled={submitting === s.id}
                onClick={() => handleDecision(s.id, 'approved_with_edits')}
                className="btn btn--approve-edits"
              >
                ✏️ Approve with Edits
              </button>
              <button
                id={`reject-${s.id}`}
                disabled={submitting === s.id}
                onClick={() => handleDecision(s.id, 'rejected')}
                className="btn btn--reject"
              >
                ❌ Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
