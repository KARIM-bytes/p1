-- ============================================================
-- BRAHMO Compliance Engine — Seed Data
-- Run this AFTER schema.sql
-- ============================================================
-- ⚠️  BEFORE RUNNING: Replace the UUIDs below with the real UUIDs
--     from Supabase Authentication → Users panel.
--
--     SHARMA_UUID  ← auth UUID for sharma@firm.com
--     PRIYA_UUID   ← auth UUID for priya@firm.com
--     RAHUL_UUID   ← auth UUID for rahul@firm.com
--     SONIA_UUID   ← auth UUID for sonia@firm.com
--
-- Example (replace with your real values):
--   SHARMA_UUID = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
-- ============================================================

-- ── CLIENTS ──────────────────────────────────────────────────
INSERT INTO clients (id, name) VALUES
  ('client_a', 'Rajesh Kumar'),
  ('client_b', 'TechCorp Pvt Ltd')
ON CONFLICT (id) DO NOTHING;

-- ── MATTERS ──────────────────────────────────────────────────
INSERT INTO matters (id, client_id, matter_name, practice_area, court, status) VALUES
  ('matter_1', 'client_a', 'Rajesh Kumar — Anticipatory Bail', 'criminal',  'Delhi High Court',  'active'),
  ('matter_2', 'client_a', 'Rajesh Kumar — Property Dispute',  'property',  'Civil Court Delhi', 'active'),
  ('matter_3', 'client_b', 'TechCorp — NDA Review',            'corporate', 'N/A',               'active')
ON CONFLICT (id) DO NOTHING;

-- ── MATTER PERMISSIONS ───────────────────────────────────────
-- Partner: all 3 matters
INSERT INTO matter_permissions (user_id, matter_id, permission_level, granted_by) VALUES
  ('user_partner', 'matter_1', 'full',      'system'),
  ('user_partner', 'matter_2', 'full',      'system'),
  ('user_partner', 'matter_3', 'full',      'system'),
-- Priya: Client A only (Matters 1 + 2)
  ('user_priya',   'matter_1', 'full',      'user_partner'),
  ('user_priya',   'matter_2', 'full',      'user_partner'),
-- Rahul: Client B only (Matter 3)
  ('user_rahul',   'matter_3', 'full',      'user_partner'),
-- Sonia: Matter 1 ONLY (NOT Matter 2 — matter-level isolation test)
  ('user_sonia',   'matter_1', 'read_only', 'user_partner')
ON CONFLICT (user_id, matter_id) DO NOTHING;

-- ── AI SESSIONS (10 sample) ──────────────────────────────────
INSERT INTO ai_sessions (
  id, user_id, matter_id,
  session_start, session_end,
  query_type, output_token_count, output_hash,
  review_status, reviewer_id, review_timestamp, review_decision, review_notes
) VALUES
  ('sess_01', 'user_priya',   'matter_1', '2026-05-01 09:00', '2026-05-01 09:15', 'draft',    3200, 'a1b2c3d4e5f6', 'reviewed', 'user_partner', '2026-05-01 14:00', 'approved',            'Good draft, added cooperation details'),
  ('sess_02', 'user_priya',   'matter_1', '2026-05-02 10:00', '2026-05-02 10:20', 'research', 2800, 'e5f6g7h8i9j0', 'reviewed', 'user_partner', '2026-05-02 16:00', 'approved',            NULL),
  ('sess_03', 'user_priya',   'matter_2', '2026-05-03 14:00', '2026-05-03 14:30', 'draft',    4100, 'i9j0k1l2m3n4', 'pending',  NULL,           NULL,               NULL,                  NULL),
  ('sess_04', 'user_rahul',   'matter_3', '2026-05-04 11:00', '2026-05-04 11:25', 'review',   2500, 'm3n4o5p6q7r8', 'reviewed', 'user_partner', '2026-05-04 17:00', 'approved_with_edits', 'Tightened NDA scope'),
  ('sess_05', 'user_rahul',   'matter_3', '2026-05-05 09:30', '2026-05-05 10:00', 'draft',    3800, 'q7r8s9t0u1v2', 'pending',  NULL,           NULL,               NULL,                  NULL),
  ('sess_06', 'user_partner', 'matter_1', '2026-05-06 08:00', '2026-05-06 08:45', 'draft',    5200, 'u1v2w3x4y5z6', 'reviewed', 'user_partner', '2026-05-06 09:00', 'approved',            'Self-reviewed — partner-authored'),
  ('sess_07', 'user_partner', 'matter_3', '2026-05-07 15:00', '2026-05-07 15:30', 'research', 2100, 'y5z6a7b8c9d0', 'pending',  NULL,           NULL,               NULL,                  NULL),
  ('sess_08', 'user_sonia',   'matter_1', '2026-05-08 10:00', '2026-05-08 10:10', 'research', 1200, 'c9d0e1f2g3h4', 'pending',  NULL,           NULL,               NULL,                  NULL),
  ('sess_09', 'user_priya',   'matter_1', '2026-05-10 09:00', '2026-05-10 09:40', 'draft',    4500, 'g3h4i5j6k7l8', 'reviewed', 'user_partner', '2026-05-10 15:00', 'approved',            NULL),
  ('sess_10', 'user_partner', 'matter_2', '2026-05-12 11:00', '2026-05-12 11:30', 'review',   3100, 'k7l8m9n0o1p2', 'reviewed', 'user_partner', '2026-05-12 11:35', 'approved',            'Self-reviewed')
ON CONFLICT (id) DO NOTHING;

-- ── BLOCKED ACCESS EVENTS (3 pre-seeded) ─────────────────────
INSERT INTO blocked_access_log (event_id, user_id, attempted_matter_id, reason, details, timestamp) VALUES
  ('block_001', 'user_priya', 'matter_3', 'no_permission', 'Associate Priya attempted to access TechCorp NDA matter. No permission.',               '2026-05-02 14:22:00'),
  ('block_002', 'user_sonia', 'matter_2', 'no_permission', 'Paralegal Sonia attempted to access Rajesh property matter. Only has Matter 1 access.', '2026-05-05 16:45:00'),
  ('block_003', 'user_rahul', 'matter_1', 'no_permission', 'Associate Rahul attempted to access Rajesh bail matter. Only has Client B access.',      '2026-05-09 11:30:00')
ON CONFLICT (event_id) DO NOTHING;
