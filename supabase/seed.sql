-- ============================================================
-- BRAHMO Compliance Engine — Seed Data
-- Run this AFTER schema.sql
-- ============================================================
--
-- ⚠️  STEP 1: Replace these 4 UUIDs BEFORE running.
--     Go to Supabase → Authentication → Users
--     Click each user → copy the UUID shown next to their email
--
DO $$
DECLARE
  sharma_id UUID := 'REPLACE_WITH_SHARMA_UUID';   -- sharma@firm.com
  priya_id  UUID := 'REPLACE_WITH_PRIYA_UUID';    -- priya@firm.com
  rahul_id  UUID := 'REPLACE_WITH_RAHUL_UUID';    -- rahul@firm.com
  sonia_id  UUID := 'REPLACE_WITH_SONIA_UUID';    -- sonia@firm.com
BEGIN

-- ── SANITY CHECK: fail early if UUIDs not replaced ──────────
IF sharma_id::TEXT LIKE 'REPLACE%' OR
   priya_id::TEXT  LIKE 'REPLACE%' OR
   rahul_id::TEXT  LIKE 'REPLACE%' OR
   sonia_id::TEXT  LIKE 'REPLACE%' THEN
  RAISE EXCEPTION 'You must replace the UUID placeholders at the top of seed.sql before running it.';
END IF;

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

-- ── PUBLIC USERS (profile rows — auth users must already exist) ─
INSERT INTO users (id, name, email, role, sra_number) VALUES
  (sharma_id, 'Advocate Sharma', 'sharma@firm.com', 'partner',   'SRA-001'),
  (priya_id,  'Priya Mehta',     'priya@firm.com',  'associate', 'SRA-002'),
  (rahul_id,  'Rahul Singh',     'rahul@firm.com',  'associate', 'SRA-003'),
  (sonia_id,  'Sonia Das',       'sonia@firm.com',  'paralegal',  NULL)
ON CONFLICT (id) DO NOTHING;

-- ── MATTER PERMISSIONS ───────────────────────────────────────
-- Partner: all 3 matters
INSERT INTO matter_permissions (user_id, matter_id, permission_level, granted_by) VALUES
  (sharma_id, 'matter_1', 'full',      'system'),
  (sharma_id, 'matter_2', 'full',      'system'),
  (sharma_id, 'matter_3', 'full',      'system'),
-- Priya: Client A only (Matters 1 + 2)
  (priya_id,  'matter_1', 'full',      'system'),
  (priya_id,  'matter_2', 'full',      'system'),
-- Rahul: Client B only (Matter 3)
  (rahul_id,  'matter_3', 'full',      'system'),
-- Sonia: Matter 1 ONLY — NOT Matter 2 (matter-level isolation test)
  (sonia_id,  'matter_1', 'read_only', 'system')
ON CONFLICT (user_id, matter_id) DO NOTHING;

-- ── AI SESSIONS (10 sample) ──────────────────────────────────
INSERT INTO ai_sessions (
  id, user_id, matter_id,
  session_start, session_end,
  query_type, output_token_count, output_hash,
  review_status, reviewer_id, review_timestamp, review_decision, review_notes
) VALUES
  ('sess_01', priya_id,  'matter_1', '2026-05-01 09:00', '2026-05-01 09:15', 'draft',    3200, 'a1b2c3d4e5f6', 'reviewed', sharma_id, '2026-05-01 14:00', 'approved',            'Good draft, added cooperation details'),
  ('sess_02', priya_id,  'matter_1', '2026-05-02 10:00', '2026-05-02 10:20', 'research', 2800, 'e5f6g7h8i9j0', 'reviewed', sharma_id, '2026-05-02 16:00', 'approved',            NULL),
  ('sess_03', priya_id,  'matter_2', '2026-05-03 14:00', '2026-05-03 14:30', 'draft',    4100, 'i9j0k1l2m3n4', 'pending',  NULL,      NULL,               NULL,                  NULL),
  ('sess_04', rahul_id,  'matter_3', '2026-05-04 11:00', '2026-05-04 11:25', 'review',   2500, 'm3n4o5p6q7r8', 'reviewed', sharma_id, '2026-05-04 17:00', 'approved_with_edits', 'Tightened NDA scope'),
  ('sess_05', rahul_id,  'matter_3', '2026-05-05 09:30', '2026-05-05 10:00', 'draft',    3800, 'q7r8s9t0u1v2', 'pending',  NULL,      NULL,               NULL,                  NULL),
  ('sess_06', sharma_id, 'matter_1', '2026-05-06 08:00', '2026-05-06 08:45', 'draft',    5200, 'u1v2w3x4y5z6', 'reviewed', sharma_id, '2026-05-06 09:00', 'approved',            'Self-reviewed — partner-authored'),
  ('sess_07', sharma_id, 'matter_3', '2026-05-07 15:00', '2026-05-07 15:30', 'research', 2100, 'y5z6a7b8c9d0', 'pending',  NULL,      NULL,               NULL,                  NULL),
  ('sess_08', sonia_id,  'matter_1', '2026-05-08 10:00', '2026-05-08 10:10', 'research', 1200, 'c9d0e1f2g3h4', 'pending',  NULL,      NULL,               NULL,                  NULL),
  ('sess_09', priya_id,  'matter_1', '2026-05-10 09:00', '2026-05-10 09:40', 'draft',    4500, 'g3h4i5j6k7l8', 'reviewed', sharma_id, '2026-05-10 15:00', 'approved',            NULL),
  ('sess_10', sharma_id, 'matter_2', '2026-05-12 11:00', '2026-05-12 11:30', 'review',   3100, 'k7l8m9n0o1p2', 'reviewed', sharma_id, '2026-05-12 11:35', 'approved',            'Self-reviewed')
ON CONFLICT (id) DO NOTHING;

-- ── BLOCKED ACCESS EVENTS (3 pre-seeded) ─────────────────────
INSERT INTO blocked_access_log (event_id, user_id, attempted_matter_id, reason, details, timestamp) VALUES
  ('block_001', priya_id, 'matter_3', 'no_permission', 'Associate Priya attempted to access TechCorp NDA matter. No permission.',               '2026-05-02 14:22:00'),
  ('block_002', sonia_id, 'matter_2', 'no_permission', 'Paralegal Sonia attempted to access Rajesh property matter. Only has Matter 1 access.', '2026-05-05 16:45:00'),
  ('block_003', rahul_id, 'matter_1', 'no_permission', 'Associate Rahul attempted to access Rajesh bail matter. Only has Client B access.',      '2026-05-09 11:30:00')
ON CONFLICT (event_id) DO NOTHING;

END $$;

-- ── VERIFICATION QUERY (run after seeding) ───────────────────
-- Expected: Sharma=3, Priya=2, Rahul=1, Sonia=1
--
-- SELECT u.name, COUNT(mp.matter_id) AS permitted_matters
-- FROM users u
-- LEFT JOIN matter_permissions mp ON mp.user_id = u.id
-- GROUP BY u.name
-- ORDER BY permitted_matters DESC;
