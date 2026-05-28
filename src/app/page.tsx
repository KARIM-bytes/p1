'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { authFetch } from '@/lib/api-client';
import type { User, AiSession, BlockedAccessEvent, DashboardStats, ReviewDecision, Matter } from '@/lib/types';
import UserSwitcher from '@/components/UserSwitcher';
import SessionList from '@/components/SessionList';
import BlockedAccessLog from '@/components/BlockedAccessLog';
import ReviewPanel from '@/components/ReviewPanel';
import ExportButton from '@/components/ExportButton';
import StatsCards from '@/components/StatsCards';
import MatterList from '@/components/MatterList';

type TabKey = 'sessions' | 'blocked' | 'review' | 'export';

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? 'Request failed');
  }
  return response.json() as Promise<T>;
}

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<AiSession[]>([]);
  const [pendingSessions, setPendingSessions] = useState<AiSession[]>([]);
  const [blockedEvents, setBlockedEvents] = useState<BlockedAccessEvent[]>([]);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('sessions');
  const [loading, setLoading] = useState(true);
  const [demoMatterId, setDemoMatterId] = useState('matter_1');
  const [demoMessage, setDemoMessage] = useState<string | null>(null);
  const [now, setNow] = useState(0);

  const isPartner = currentUser?.role === 'partner';

  async function fetchData() {
    setLoading(true);
    setDemoMessage(null);

    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        setCurrentUser(null);
        setSessions([]);
        setPendingSessions([]);
        setBlockedEvents([]);
        setMatters([]);
        setStats(null);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('id, name, email, role, sra_number, created_at')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        throw new Error(profileError?.message ?? 'Profile not found');
      }

      const typedProfile = profile as User;
      setCurrentUser(typedProfile);

      const [mattersData, sessionsData, statsData] = await Promise.all([
        authFetch('/api/matters').then((response) => readJson<{ matters: Matter[] }>(response)),
        authFetch('/api/sessions').then((response) => readJson<{ sessions: AiSession[] }>(response)),
        authFetch('/api/stats').then((response) => readJson<{ stats: DashboardStats }>(response)),
      ]);

      setMatters(mattersData.matters);
      setSessions(sessionsData.sessions);
      setStats(statsData.stats);
      setNow(new Date().getTime());

      if (typedProfile.role === 'partner') {
        const [blockedData, reviewData] = await Promise.all([
          authFetch('/api/blocked-log').then((response) => readJson<{ events: BlockedAccessEvent[] }>(response)),
          authFetch('/api/review').then((response) => readJson<{ sessions: AiSession[] }>(response)),
        ]);
        setBlockedEvents(blockedData.events);
        setPendingSessions(reviewData.sessions);
      } else {
        setBlockedEvents([]);
        setPendingSessions([]);
      }
    } catch (error) {
      console.error('[dashboard]', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSwitch() {
    await fetchData();
  }

  async function handleAccessDemo() {
    setDemoMessage(null);
    const access = await authFetch('/api/access-check', {
      method: 'POST',
      body: JSON.stringify({ matterId: demoMatterId }),
    }).then((response) => readJson<{ status: 'CLEAR' | 'BLOCKED' }>(response));

    if (access.status === 'BLOCKED') {
      setDemoMessage('BLOCKED: no matter details returned; event written to blocked_access_log.');
      await fetchData();
      return;
    }

    const created = await authFetch('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ matterId: demoMatterId, queryType: 'research' }),
    }).then((response) => readJson<{ session?: { id: string }; sessions?: [] }>(response));

    setDemoMessage(created.session
      ? `CLEAR: session ${created.session.id} created and audit trail started.`
      : 'BLOCKED: session was not created.');
    await fetchData();
  }

  async function handleReviewSubmit(
    sessionId: string,
    decision: ReviewDecision,
    notes: string
  ): Promise<void> {
    await authFetch('/api/review', {
      method: 'POST',
      body: JSON.stringify({ sessionId, decision, notes }),
    }).then((response) => readJson<{ ok: boolean }>(response));
    await fetchData();
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchData();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: 'sessions', label: 'Sessions' },
    ...(isPartner
      ? [
          { key: 'blocked' as const, label: 'Blocked Access' },
          { key: 'review' as const, label: 'Review Queue' },
          { key: 'export' as const, label: 'Export' },
        ]
      : []),
  ];

  if (!currentUser && !loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto flex min-h-[80vh] max-w-lg items-center">
          <section className="w-full rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-2xl font-semibold text-slate-950">BRAHMO Compliance Engine</h1>
            <p className="mt-2 text-sm text-slate-500">Select a demo user to begin the secure RLS walkthrough.</p>
            <div className="mt-6 flex justify-center">
              <UserSwitcher currentUserId="" onSwitch={handleSwitch} />
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-800 bg-slate-950 px-6 py-4 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-semibold">BRAHMO Compliance Engine</div>
            <div className="text-sm text-slate-300">Ethical walls, audit trails, and regulator-ready export</div>
          </div>
          {currentUser && (
            <div className="text-sm text-slate-200">
              {currentUser.name} / {currentUser.role}
            </div>
          )}
        </div>
      </header>

      <div className="border-b border-slate-200 bg-white px-6 py-3">
        <div className="mx-auto max-w-7xl">
          <UserSwitcher
            currentUserId={currentUser?.id ?? ''}
            currentUserEmail={currentUser?.email}
            onSwitch={handleSwitch}
          />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6">
        <StatsCards stats={stats} loading={loading} />

        <div className="mt-6 flex gap-2 border-b border-slate-300">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.key
                  ? 'border-slate-950 text-slate-950'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {activeTab === 'sessions' && (
            <div className="grid gap-6">
              <MatterList matters={matters} loading={loading} />
              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-slate-950">Live Access Check</h2>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <select
                    value={demoMatterId}
                    onChange={(event) => setDemoMatterId(event.target.value)}
                    className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="matter_1">matter_1 / Rajesh Bail</option>
                    <option value="matter_2">matter_2 / Rajesh Property</option>
                    <option value="matter_3">matter_3 / TechCorp NDA</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAccessDemo}
                    className="h-10 rounded-md bg-slate-900 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700"
                  >
                    Check Access and Start Session
                  </button>
                </div>
                {demoMessage && <p className="mt-3 text-sm font-medium text-slate-700">{demoMessage}</p>}
              </section>
              <SessionList
                sessions={sessions}
                loading={loading}
                showReviewDetails={isPartner}
                now={now}
              />
            </div>
          )}

          {activeTab === 'blocked' && (
            <BlockedAccessLog events={blockedEvents} loading={loading} />
          )}

          {activeTab === 'review' && (
            <ReviewPanel
              pendingSessions={pendingSessions}
              onReviewSubmit={handleReviewSubmit}
              loading={loading}
            />
          )}

          {activeTab === 'export' && <ExportButton />}
        </div>
      </div>
    </main>
  );
}
