-- ============================================================
-- BRAHMO Compliance Engine - Secure Database Schema
-- Run this before seed.sql in the Supabase SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS clients (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matters (
  id             TEXT PRIMARY KEY,
  client_id      TEXT NOT NULL REFERENCES clients(id),
  matter_name    TEXT NOT NULL,
  practice_area  TEXT,
  court          TEXT,
  status         TEXT DEFAULT 'active',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('partner', 'associate', 'paralegal')),
  sra_number  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matter_permissions (
  id               BIGSERIAL PRIMARY KEY,
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matter_id        TEXT NOT NULL REFERENCES matters(id),
  permission_level TEXT NOT NULL DEFAULT 'full' CHECK (permission_level IN ('full', 'read_only')),
  granted_at       TIMESTAMPTZ DEFAULT NOW(),
  granted_by       TEXT NOT NULL,
  UNIQUE (user_id, matter_id)
);

CREATE TABLE IF NOT EXISTS ai_sessions (
  id                  TEXT PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  matter_id           TEXT NOT NULL REFERENCES matters(id),
  session_start       TIMESTAMPTZ NOT NULL,
  session_end         TIMESTAMPTZ,
  query_type          TEXT CHECK (query_type IN ('draft', 'research', 'review')),
  privilege_class     TEXT DEFAULT 'standard' CHECK (privilege_class IN ('standard', 'attorney_client', 'litigation', 'work_product')),
  output_token_count  INTEGER,
  output_hash         TEXT,
  review_status       TEXT DEFAULT 'pending' CHECK (review_status IN ('pending', 'reviewed', 'rejected')),
  reviewer_id         UUID REFERENCES users(id),
  review_timestamp    TIMESTAMPTZ,
  review_decision     TEXT CHECK (review_decision IN ('approved', 'approved_with_edits', 'rejected')),
  review_notes        TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS blocked_access_log (
  event_id            TEXT PRIMARY KEY,
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  attempted_matter_id TEXT NOT NULL,
  reason              TEXT NOT NULL,
  details             TEXT,
  timestamp           TIMESTAMPTZ DEFAULT NOW(),
  chain_hash          TEXT          -- SHA-256(prev_chain_hash || event_id || user_id || attempted_matter_id || timestamp)
);

ALTER TABLE clients            ENABLE ROW LEVEL SECURITY;
ALTER TABLE users              ENABLE ROW LEVEL SECURITY;
ALTER TABLE matters            ENABLE ROW LEVEL SECURITY;
ALTER TABLE matter_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_access_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE clients            FORCE ROW LEVEL SECURITY;
ALTER TABLE users              FORCE ROW LEVEL SECURITY;
ALTER TABLE matters            FORCE ROW LEVEL SECURITY;
ALTER TABLE matter_permissions FORCE ROW LEVEL SECURITY;
ALTER TABLE ai_sessions        FORCE ROW LEVEL SECURITY;
ALTER TABLE blocked_access_log FORCE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION current_user_is_partner()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM users u
    WHERE u.id = auth.uid()
      AND u.role = 'partner'
  );
$$;

-- USERS: a signed-in user can read only their own profile. Partner-only
-- operations verify against this row, then use RLS on target tables.
DROP POLICY IF EXISTS "Users read own profile" ON users;
CREATE POLICY "Users read own profile" ON users
  FOR SELECT USING (id = auth.uid());

-- MATTER PERMISSIONS: users can see their own grants. The application does
-- not need broad permission-table reads; adding/removing grants is an admin
-- setup action performed in the SQL editor for the assessment.
DROP POLICY IF EXISTS "Users read own matter permissions" ON matter_permissions;
CREATE POLICY "Users read own matter permissions" ON matter_permissions
  FOR SELECT USING (user_id = auth.uid());

-- MATTERS: matter-level isolation. Visibility is based on exact matter_id,
-- never on client_id.
DROP POLICY IF EXISTS "Users see permitted matters" ON matters;
CREATE POLICY "Users see permitted matters" ON matters
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM matter_permissions mp
      WHERE mp.user_id = auth.uid()
        AND mp.matter_id = matters.id
    )
  );

-- CLIENTS: clients are visible only if at least one of their matters is
-- visible to the current user.
DROP POLICY IF EXISTS "Users see clients for permitted matters" ON clients;
CREATE POLICY "Users see clients for permitted matters" ON clients
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM matters m
      JOIN matter_permissions mp ON mp.matter_id = m.id
      WHERE m.client_id = clients.id
        AND mp.user_id = auth.uid()
    )
  );

-- AI SESSIONS: reads follow the same matter-level wall. Removing a permission
-- immediately removes access to historical sessions for that matter.
DROP POLICY IF EXISTS "Users see sessions for permitted matters" ON ai_sessions;
CREATE POLICY "Users see sessions for permitted matters" ON ai_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM matter_permissions mp
      WHERE mp.user_id = auth.uid()
        AND mp.matter_id = ai_sessions.matter_id
    )
  );

DROP POLICY IF EXISTS "Users insert own sessions for permitted matters" ON ai_sessions;
CREATE POLICY "Users insert own sessions for permitted matters" ON ai_sessions
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM matter_permissions mp
      WHERE mp.user_id = auth.uid()
        AND mp.matter_id = ai_sessions.matter_id
    )
  );

DROP POLICY IF EXISTS "Users close own sessions" ON ai_sessions;
CREATE POLICY "Users close own sessions" ON ai_sessions
  FOR UPDATE USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM matter_permissions mp
      WHERE mp.user_id = auth.uid()
        AND mp.matter_id = ai_sessions.matter_id
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM matter_permissions mp
      WHERE mp.user_id = auth.uid()
        AND mp.matter_id = ai_sessions.matter_id
    )
  );

DROP POLICY IF EXISTS "Partners review sessions for permitted matters" ON ai_sessions;
CREATE POLICY "Partners review sessions for permitted matters" ON ai_sessions
  FOR UPDATE USING (
    current_user_is_partner()
    AND EXISTS (
      SELECT 1
      FROM matter_permissions mp
      WHERE mp.user_id = auth.uid()
        AND mp.matter_id = ai_sessions.matter_id
    )
  )
  WITH CHECK (
    current_user_is_partner()
    AND EXISTS (
      SELECT 1
      FROM matter_permissions mp
      WHERE mp.user_id = auth.uid()
        AND mp.matter_id = ai_sessions.matter_id
    )
  );

-- PRIVILEGE CLASS: Paralegals are blocked from attorney-client privileged sessions.
-- This is a RESTRICTIVE policy — it limits the permissive policies above.
-- Even if the matter-level wall allows a paralegal, privilege_class overrides.
DROP POLICY IF EXISTS "Privilege class restricts paralegal access" ON ai_sessions;
CREATE POLICY "Privilege class restricts paralegal access" ON ai_sessions
  AS RESTRICTIVE
  FOR SELECT USING (
    NOT (
      privilege_class IN ('attorney_client', 'litigation', 'work_product')
      AND EXISTS (
        SELECT 1
        FROM users u
        WHERE u.id = auth.uid()
          AND u.role = 'paralegal'
      )
    )
  );

-- BLOCKED ACCESS LOG: any authenticated user may append their own denied
-- event. Only partners may read the complete log.
DROP POLICY IF EXISTS "Users append own blocked events" ON blocked_access_log;
CREATE POLICY "Users append own blocked events" ON blocked_access_log
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Partners read blocked log" ON blocked_access_log;
CREATE POLICY "Partners read blocked log" ON blocked_access_log
  FOR SELECT USING (current_user_is_partner());

REVOKE UPDATE, DELETE ON blocked_access_log FROM authenticated;
REVOKE UPDATE, DELETE ON blocked_access_log FROM anon;

-- Trigger-level append-only protection. RLS and REVOKE cover anon and
-- authenticated roles; this trigger also blocks accidental privileged updates
-- through service-role application code.
CREATE OR REPLACE FUNCTION prevent_blocked_access_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'blocked_access_log is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS blocked_access_log_append_only ON blocked_access_log;
CREATE TRIGGER blocked_access_log_append_only
  BEFORE UPDATE OR DELETE ON blocked_access_log
  FOR EACH ROW EXECUTE FUNCTION prevent_blocked_access_log_mutation();
