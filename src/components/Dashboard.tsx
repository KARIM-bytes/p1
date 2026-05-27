'use client';

// ============================================================
// components/Dashboard.tsx
// Main compliance dashboard — assembles all sub-components.
// ============================================================

import { useEffect, useState, useCallback } from 'react';
import UserSwitcher, { DEMO_USERS } from './UserSwitcher';
import SessionList from './SessionList';
import BlockedAccessLog from './BlockedAccessLog';
import ReviewPanel from './ReviewPanel';
import ExportButton from './ExportButton';
import { AiSession, BlockedAccessEvent, DashboardStats, Matter, ReviewDecision } from '@/lib/types';

export default function Dashboard() {
  const [userId, setUserId] = useState('user_partner');
  const currentUser = DEMO_USERS.find((u) => u.id === userId)!;
  const isPartner = currentUser.role === 'partner';

  // ── State ────────────────────────────────────────────────
  const [matters,  setMatters]  = useState<Matter[]>([]);
  const [sessions, setSessions] = useState<AiSession[]>([]);
  const [blocked,  setBlocked]  = useState<BlockedAccessEvent[]>([]);
  const [pending,  setPending]  = useState<AiSession[]>([]);
  const [stats,    setStats]    = useState<DashboardStats | null>(null);
  const [loading,  setLoading]  = useState(true);

  // ── Demo: start a new session for a matter ───────────────
  const [demoMatterId, setDemoMatterId] = useState('matter_1');
  const [demoMsg, setDemoMsg] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [mattersRes, sessionsRes, statsRes] = await Promise.all([
        fetch(`/api/matters?userId=${userId}`).then((r) => r.json()),
        fetch(`/api/sessions?userId=${userId}`).then((r) => r.json()),
        fetch(`/api/stats?userId=${userId}`).then((r) => r.json()),
      ]);

      setMatters(mattersRes.matters ?? []);
      setSessions(sessionsRes.sessions ?? []);
      setStats(statsRes.stats ?? null);

      if (isPartner) {
        const [blockedRes, pendingRes] = await Promise.all([
          fetch(`/api/blocked-log`).then((r) => r.json()),
          fetch(`/api/review?reviewerId=${userId}`).then((r) => r.json()),
        ]);
        setBlocked(blockedRes.events ?? []);
        setPending(pendingRes.sessions ?? []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [userId, isPartner]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Demo: try to access a matter (step 1 & 2) ───────────
  async function handleAccessCheck() {
    setDemoMsg('');
    const res = await fetch('/api/access-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, matterId: demoMatterId }),
    });
    const data = await res.json();

    if (data.status === 'CLEAR') {
      // Start session
      const sessRes = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, matterId: demoMatterId, queryType: 'research' }),
      });
      const sessData = await sessRes.json();
      if (sessData.session) {
        setDemoMsg(`✅ CLEAR — Session started: ${sessData.session.id}`);
        fetchAll();
      } else {
        setDemoMsg('✅ CLEAR — but session already exists or empty result returned.');
      }
    } else {
      setDemoMsg('🚫 BLOCKED — empty result returned. Denial logged to blocked_access_log.');
      fetchAll(); // refresh to show new blocked event
    }
  }

  // ── Partner: submit review ───────────────────────────────
  async function handleReviewSubmit(
    sessionId: string,
    decision: ReviewDecision,
    notes: string
  ) {
    await fetch('/api/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, reviewerId: userId, decision, notes }),
    });
    fetchAll();
  }

  return (
    <div className="dashboard">
      {/* ── Header ─────────────────────────────────────── */}
      <header className="dashboard__header">
        <div className="dashboard__brand">
          <span className="dashboard__logo">⚖️</span>
          <h1 className="dashboard__title">BRAHMO Compliance Dashboard</h1>
        </div>
        <UserSwitcher currentUserId={userId} onSwitch={(id) => { setUserId(id); }} />
      </header>

      {/* ── Stats Cards ────────────────────────────────── */}
      <section className="dashboard__stats" aria-label="Summary metrics">
        {loading ? (
          <div className="stats-grid">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="stat-card stat-card--skeleton" />
            ))}
          </div>
        ) : (
          <div className="stats-grid">
            {[
              { label: 'Total Sessions',  value: stats?.totalSessions   ?? 0, icon: '🗂️', variant: 'blue'   },
              { label: 'Reviewed',        value: `${stats?.reviewedSessions ?? 0} (${stats?.reviewedPercent ?? 0}%)`, icon: '✅', variant: 'green'  },
              { label: 'Pending Review',  value: stats?.pendingSessions  ?? 0, icon: '⏳', variant: 'amber'  },
              { label: 'Blocked Events',  value: stats?.blockedEvents    ?? 0, icon: '🚫', variant: 'red'    },
            ].map((c) => (
              <div key={c.label} className={`stat-card stat-card--${c.variant}`}>
                <div className="stat-card__icon">{c.icon}</div>
                <div className="stat-card__value">{c.value}</div>
                <div className="stat-card__label">{c.label}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="dashboard__body">
        {/* ── Left column ────────────────────────────── */}
        <div className="dashboard__col">

          {/* Accessible Matters */}
          <section className="card">
            <h2 className="card__title">✅ Accessible Matters ({currentUser.name})</h2>
            {loading ? (
              <p className="loading-text">Loading…</p>
            ) : matters.length === 0 ? (
              <p className="empty-text">No matters accessible. (RLS returned zero rows.)</p>
            ) : (
              <ul className="matter-list">
                {matters.map((m) => (
                  <li key={m.id} className="matter-item">
                    <span className="matter-item__icon">
                      {m.practice_area === 'criminal' ? '⚖️' : m.practice_area === 'property' ? '🏠' : '🏢'}
                    </span>
                    <span className="matter-item__name">{m.matter_name}</span>
                    <span className="matter-item__badge">{m.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Live Demo: Access Check (Steps 1 & 2) */}
          <section className="card card--demo">
            <h2 className="card__title">🧪 Live Demo — Access Check</h2>
            <p className="card__sub">Simulate Step 1 (CLEAR) and Step 2 (BLOCKED) from the assessment.</p>
            <div className="demo-controls">
              <select
                id="demo-matter-select"
                value={demoMatterId}
                onChange={(e) => setDemoMatterId(e.target.value)}
                className="demo-select"
              >
                <option value="matter_1">matter_1 — Rajesh Bail (Client A)</option>
                <option value="matter_2">matter_2 — Rajesh Property (Client A)</option>
                <option value="matter_3">matter_3 — TechCorp NDA (Client B)</option>
              </select>
              <button
                id="check-access-btn"
                onClick={handleAccessCheck}
                className="btn btn--primary"
              >
                Check Access + Start Session
              </button>
            </div>
            {demoMsg && (
              <div className={`demo-result ${demoMsg.startsWith('✅') ? 'demo-result--clear' : 'demo-result--blocked'}`}>
                {demoMsg}
              </div>
            )}
          </section>

          {/* Recent Sessions */}
          <section className="card">
            <h2 className="card__title">📋 Recent Sessions</h2>
            <SessionList
              sessions={sessions}
              loading={loading}
              showReviewDetails={isPartner}
            />
          </section>
        </div>

        {/* ── Right column ───────────────────────────── */}
        <div className="dashboard__col">

          {/* Blocked Access Log — partners only */}
          {isPartner && (
            <section className="card card--danger">
              <BlockedAccessLog events={blocked} loading={loading} />
            </section>
          )}

          {/* Review Queue — partners only */}
          {isPartner && (
            <section className="card">
              <ReviewPanel
                pendingSessions={pending}
                reviewerId={userId}
                onReviewSubmit={handleReviewSubmit}
                loading={loading}
              />
            </section>
          )}

          {/* Export */}
          <section className="card">
            <h2 className="card__title">📄 Compliance Export</h2>
            <p className="card__sub">
              Anonymized CSV for regulators. Includes blocked events. SHA-256 hashes only — no full text.
            </p>
            <ExportButton />
          </section>
        </div>
      </div>
    </div>
  );
}
