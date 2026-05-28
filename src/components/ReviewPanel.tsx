'use client';

import { useState } from 'react';
import type { SessionWithJoins, ReviewDecision } from '@/lib/types';
import { authFetch } from '@/lib/api-client';

interface ReviewPanelProps {
  pendingSessions: SessionWithJoins[];
  onReviewSubmit: (sessionId: string, decision: ReviewDecision, notes: string) => Promise<void>;
  loading: boolean;
}

export default function ReviewPanel({ pendingSessions, onReviewSubmit, loading }: ReviewPanelProps) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [hashes, setHashes] = useState<Record<string, string>>({}); 

  async function handleDecision(session: SessionWithJoins, decision: ReviewDecision) {
    setSubmitting(session.id);
    try {
      // Gap 2 fix — end session with SHA-256 hash if not already ended
      if (!session.session_end && !hashes[session.id]) {
        const res = await authFetch('/api/sessions', {
          method: 'PATCH',
          body: JSON.stringify({ sessionId: session.id }),
        });
        if (res.ok) {
          const data = (await res.json()) as { outputHash?: string };
          if (data.outputHash) {
            setHashes((h) => ({ ...h, [session.id]: data.outputHash! }));
          }
        }
      }
      // Submit the review decision
      await onReviewSubmit(session.id, decision, notes[session.id] ?? '');
    } finally {
      setSubmitting(null);
    }
  }

  if (loading) {
    return (
      <div className="grok-card p-6" style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="dot-live" /> Loading review queue…
        </div>
      </div>
    );
  }

  return (
    <section className="grok-card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Review Queue
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {pendingSessions.length} sessions awaiting partner review
          </p>
        </div>
        <span className="badge badge-amber">{pendingSessions.length} pending</span>
      </div>

      {pendingSessions.length === 0 ? (
        <div style={{ padding: '24px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          All sessions have been reviewed. ✓
        </div>
      ) : (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {pendingSessions.map((session) => {
            const newHash    = hashes[session.id];
            const displayHash = newHash ?? session.output_hash;
            const userName   = session.users?.name   ?? session.user_id.slice(0, 8);
            const matterName = session.matters?.matter_name ?? session.matter_id;
            const area       = session.matters?.practice_area ?? null;
            const sessionDate = session.session_start
              ? new Date(session.session_start).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
              : '—';

            const areaColors: Record<string, string> = {
              criminal:  'rgba(239,68,68,.12)',
              property:  'rgba(250,204,21,.1)',
              corporate: 'rgba(168,85,247,.12)',
            };
            const areaTextColors: Record<string, string> = {
              criminal:  '#EF4444',
              property:  '#FACC15',
              corporate: '#A855F7',
            };

            return (
              <article
                key={session.id}
                style={{
                  background: 'var(--surface-hi)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '16px',
                }}
              >
                {/* Primary: who + what */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '.92rem', color: 'var(--text-primary)', marginBottom: '3px' }}>
                      {userName}
                    </div>
                    <div style={{ fontSize: '.8rem', color: 'var(--text-second)' }}>
                      {matterName}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span className="badge badge-purple">{session.query_type}</span>
                    {area && (
                      <span style={{
                        fontSize: '.68rem', fontWeight: 600, padding: '2px 8px',
                        borderRadius: '9999px',
                        background: areaColors[area] ?? 'rgba(113,113,122,.12)',
                        color: areaTextColors[area] ?? 'var(--text-muted)',
                      }}>
                        {area}
                      </span>
                    )}
                    <span style={{ fontSize: '.72rem', color: 'var(--text-muted)' }}>{sessionDate}</span>
                  </div>
                </div>

                {/* Session ID — subtle caption */}
                <div style={{ fontSize: '.68rem', fontFamily: '"JetBrains Mono", monospace', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  {session.id.length > 12 ? `${session.id.slice(0, 20)}…` : session.id}
                </div>

                {/* Hash row — updates live after PATCH */}
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 12px', borderRadius: '8px',
                    background: newHash ? 'rgba(0,255,159,0.06)' : 'rgba(113,113,122,0.08)',
                    border: `1px solid ${newHash ? 'rgba(0,255,159,0.2)' : 'var(--border)'}`,
                    marginBottom: '12px',
                    transition: 'all .4s ease',
                  }}
                >
                  <span style={{ fontSize: '.68rem', fontWeight: 600, color: newHash ? 'var(--accent)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', flexShrink: 0 }}>
                    SHA-256
                  </span>
                  <span className="font-mono" style={{ fontSize: '.72rem', color: newHash ? 'var(--accent)' : 'var(--text-muted)', wordBreak: 'break-all' }}>
                    {displayHash
                      ? `${displayHash.slice(0, 32)}…`
                      : '— pending (hash written on approval)'}
                  </span>
                  {newHash && (
                    <span style={{ marginLeft: 'auto', fontSize: '.68rem', color: 'var(--accent)', fontWeight: 600, flexShrink: 0 }}>
                      ✓ stored
                    </span>
                  )}
                </div>

                {/* Notes textarea */}
                <textarea
                  className="grok-textarea"
                  placeholder="Review notes (optional)…"
                  value={notes[session.id] ?? ''}
                  onChange={(e) => setNotes((cur) => ({ ...cur, [session.id]: e.target.value }))}
                  rows={2}
                />

                {/* Action buttons */}
                <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  <button
                    type="button"
                    disabled={submitting === session.id}
                    onClick={() => handleDecision(session, 'approved')}
                    className="btn btn-success"
                    style={{ height: '36px', fontSize: '0.8rem' }}
                  >
                    {submitting === session.id ? '…' : '✓ Approve'}
                  </button>
                  <button
                    type="button"
                    disabled={submitting === session.id}
                    onClick={() => handleDecision(session, 'approved_with_edits')}
                    className="btn btn-purple"
                    style={{ height: '36px', fontSize: '0.8rem' }}
                  >
                    ✎ Approve with Edits
                  </button>
                  <button
                    type="button"
                    disabled={submitting === session.id}
                    onClick={() => handleDecision(session, 'rejected')}
                    className="btn btn-danger"
                    style={{ height: '36px', fontSize: '0.8rem' }}
                  >
                    ✕ Reject
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
