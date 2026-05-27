-- ============================================================
-- BRAHMO Compliance Engine — Database Schema
-- Run this in Supabase SQL Editor BEFORE seed.sql
-- ============================================================

-- ── 1. CLIENTS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id         TEXT PRIMARY KEY,       -- e.g. 'client_a'
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. MATTERS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matters (
  id             TEXT PRIMARY KEY,   -- e.g. 'matter_1'
  client_id      TEXT NOT NULL REFERENCES clients(id),
  matter_name    TEXT NOT NULL,
  practice_area  TEXT,               -- 'criminal', 'property', 'corporate'
  court          TEXT,
  status         TEXT DEFAULT 'active',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── 3. USERS ────────────────────────────────────────────────
-- id mirrors auth.users(id) — set by Supabase Auth on signup
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  role        TEXT NOT NULL,         -- 'partner' | 'associate' | 'paralegal'
  sra_number  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 4. MATTER PERMISSIONS ───────────────────────────────────
-- One row per (user, matter) grant. RLS is built on this table.
CREATE TABLE IF NOT EXISTS matter_permissions (
  id               BIGSERIAL PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matter_id        TEXT NOT NULL REFERENCES matters(id),
  permission_level TEXT NOT NULL DEFAULT 'full',  -- 'full' | 'read_only'
  granted_at       TIMESTAMPTZ DEFAULT NOW(),
  granted_by       TEXT NOT NULL,
  UNIQUE (user_id, matter_id)
);

-- ── 5. AI SESSIONS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_sessions (
  id                  TEXT PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matter_id           TEXT NOT NULL REFERENCES matters(id),
  session_start       TIMESTAMPTZ NOT NULL,
  session_end         TIMESTAMPTZ,
  query_type          TEXT,          -- 'draft' | 'research' | 'review'
  output_token_count  INTEGER,
  output_hash         TEXT,          -- SHA-256 of output — NOT full text (privacy)
  review_status       TEXT DEFAULT 'pending', -- 'pending' | 'reviewed' | 'rejected'
  reviewer_id         UUID REFERENCES users(id),
  review_timestamp    TIMESTAMPTZ,
  review_decision     TEXT,          -- 'approved' | 'approved_with_edits' | 'rejected'
  review_notes        TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ── 6. BLOCKED ACCESS LOG (APPEND-ONLY) ─────────────────────
CREATE TABLE IF NOT EXISTS blocked_access_log (
  event_id            TEXT PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attempted_matter_id TEXT NOT NULL,
  reason              TEXT NOT NULL,  -- 'no_permission'
  details             TEXT,
  timestamp           TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE matters            ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_access_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own matters" ON matters;
CREATE POLICY "Users see own matters" ON matters
  FOR SELECT USING (
    id IN (
      SELECT matter_id FROM matter_permissions
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users see own sessions" ON ai_sessions;
CREATE POLICY "Users see own sessions" ON ai_sessions
  FOR SELECT USING (
    matter_id IN (
      SELECT matter_id FROM matter_permissions
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users insert own sessions" ON ai_sessions;
CREATE POLICY "Users insert own sessions" ON ai_sessions
  FOR INSERT WITH CHECK (
    matter_id IN (
      SELECT matter_id FROM matter_permissions
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Partners can review sessions" ON ai_sessions;
CREATE POLICY "Partners can review sessions" ON ai_sessions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'partner'
    )
  );

DROP POLICY IF EXISTS "All can log blocked access" ON blocked_access_log;
CREATE POLICY "All can log blocked access" ON blocked_access_log
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Partners can read blocked log" ON blocked_access_log;
CREATE POLICY "Partners can read blocked log" ON blocked_access_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'partner'
    )
  );

-- ============================================================
-- CRITICAL: Make blocked_access_log TRULY append-only
-- ============================================================
REVOKE UPDATE, DELETE ON blocked_access_log FROM authenticated;
REVOKE UPDATE, DELETE ON blocked_access_log FROM anon;
