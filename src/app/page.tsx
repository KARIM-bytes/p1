'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, AiSession, BlockedAccessEvent, DashboardStats, ReviewDecision } from '@/lib/types'
import UserSwitcher, { DEMO_USERS } from '@/components/UserSwitcher'
import SessionList from '@/components/SessionList'
import BlockedAccessLog from '@/components/BlockedAccessLog'
import ReviewPanel from '@/components/ReviewPanel'
import ExportButton from '@/components/ExportButton'
import StatsCards from '@/components/StatsCards'
import MatterList from '@/components/MatterList'

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [sessions, setSessions] = useState<AiSession[]>([])
  const [blockedEvents, setBlockedEvents] = useState<BlockedAccessEvent[]>([])
  const [matters, setMatters] = useState<any[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [activeTab, setActiveTab] = useState<'sessions' | 'blocked' | 'review' | 'export'>('sessions')
  const [loading, setLoading] = useState(true)

  async function fetchUserData(userId: string, userProfile: User) {
    try {
      // 1. Fetch sessions
      const sessRes = await fetch(`/api/sessions?userId=${userId}`)
      const sessData = await sessRes.json()
      setSessions(sessData.sessions || [])

      // 2. Fetch matters
      const mattersRes = await fetch(`/api/matters?userId=${userId}`)
      const mattersData = await mattersRes.json()
      setMatters(mattersData.matters || [])

      // 3. Fetch stats
      const statsRes = await fetch(`/api/stats?userId=${userId}`)
      const statsData = await statsRes.json()
      setStats(statsData.stats || null)

      // 4. Fetch blocked events
      const blockedRes = await fetch('/api/blocked-log')
      const blockedData = await blockedRes.json()
      setBlockedEvents(blockedData.events || [])
    } catch (err) {
      console.error('Error fetching user data:', err)
    }
  }

  async function handleUserSwitch(userId: string) {
    setLoading(true)
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (profile) {
      const userProfile = profile as User
      setCurrentUser(userProfile)
      await fetchUserData(userId, userProfile)
    } else {
      setCurrentUser(null)
    }
    setLoading(false)
  }

  async function handleStartSession(matterId: string) {
    if (!currentUser) return
    setLoading(true)
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          matterId,
          queryType: 'draft',
        }),
      })
      if (res.ok) {
        await fetchUserData(currentUser.id, currentUser)
      }
    } catch (err) {
      console.error('Error starting session:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleReviewSubmit(sessionId: string, decision: ReviewDecision, notes: string) {
    if (!currentUser) return
    setLoading(true)
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          reviewerId: currentUser.id,
          decision,
          notes,
        }),
      })
      if (res.ok) {
        await fetchUserData(currentUser.id, currentUser)
      }
    } catch (err) {
      console.error('Error submitting review:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    handleUserSwitch('user_partner')
  }, [])

  const roleBadgeClass: Record<string, string> = {
    partner:   'bg-purple-600',
    associate: 'bg-blue-600',
    paralegal: 'bg-green-600',
  }

  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: 'sessions', label: 'Sessions' },
    { key: 'blocked',  label: 'Blocked Access' },
    { key: 'review',   label: 'Review Queue' },
    { key: 'export',   label: 'Export' },
  ]

  if (loading && !currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500 text-sm animate-pulse">Loading compliance engine...</p>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white shadow rounded-lg p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">BRAHMO Compliance Engine</h1>
          <p className="text-gray-500 text-sm mb-6">Select a user to begin the demo</p>
          <UserSwitcher currentUserId="" onSwitch={handleUserSwitch} />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* TOP BAR */}
      <div className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg">BRAHMO</span>
          <span className="text-gray-400 text-sm">Compliance Engine</span>
        </div>
        {currentUser && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-300">{currentUser.name}</span>
            <span className={`text-xs text-white px-2 py-1 rounded-full ${roleBadgeClass[currentUser.role] ?? 'bg-gray-600'}`}>
              {currentUser.role.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* USER SWITCHER BAR */}
      <div className="bg-gray-100 px-6 py-3 border-b border-gray-200">
        <UserSwitcher currentUserId={currentUser.id} onSwitch={handleUserSwitch} />
      </div>

      {/* CONTENT */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* STATS CARDS */}
        <StatsCards
          stats={stats}
          loading={loading}
        />

        {/* TAB BAR */}
        <div className="border-b border-gray-200 mt-6 mb-4 flex">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium focus:outline-none ${
                activeTab === tab.key
                  ? 'border-b-2 border-gray-900 font-semibold text-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB CONTENT */}
        {activeTab === 'sessions' && (
          <div className="space-y-6">
            <MatterList matters={matters} loading={loading} userId={currentUser.id} onStartSession={handleStartSession} />
            <SessionList sessions={sessions} loading={loading} showReviewDetails={currentUser.role === 'partner'} />
          </div>
        )}

        {activeTab === 'blocked' && (
          <BlockedAccessLog
            events={blockedEvents}
            loading={loading}
          />
        )}

        {activeTab === 'review' && (
          <ReviewPanel
            pendingSessions={sessions.filter((s) => s.review_status === 'pending')}
            reviewerId={currentUser.id}
            onReviewSubmit={handleReviewSubmit}
            loading={loading}
          />
        )}

        {activeTab === 'export' && (
          <ExportButton />
        )}
      </div>
    </div>
  )
}
