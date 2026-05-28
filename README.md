# BRAHMO Compliance Engine

> **Database-enforced ethical walls, tamper-proof AI audit trails, partner review, and anonymized regulatory export for legal AI usage.**

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and fill in your Supabase project credentials:

```text
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

Get these from **Supabase Dashboard → Project Settings → API**.

### 3. Create four Auth users in Supabase

Go to **Authentication → Users → Add user** and create:

| Email | Password | Role |
|-------|----------|------|
| sharma@firm.com | Test1234! | partner |
| priya@firm.com | Test1234! | associate |
| rahul@firm.com | Test1234! | associate |
| sonia@firm.com | Test1234! | paralegal |

### 4. Copy their UUIDs into seed.sql

After creating the users, copy the auto-generated UUIDs from the Auth dashboard and paste them into `supabase/seed.sql` lines 8–11.

### 5. Run schema + seed in the Supabase SQL Editor

Run **`supabase/schema.sql`** first, then **`supabase/seed.sql`**.

### 6. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and select a demo user.

---

## Demo Workflows

### Workflow 1 — Normal AI Session
1. Select **Priya Mehta** from the demo switcher
2. In *Live Access Check*, choose **matter_1 / Rajesh Bail** → click *Check Access & Start Session*
3. Result: `CLEAR` — new row appears in the sessions table with `review_status: pending`

### Workflow 2 — Ethical Wall Breach
1. As Priya, select **matter_3 / TechCorp NDA** → click *Check Access*
2. Result: `BLOCKED` — zero matter data returned, new row in Blocked Access Log

### Workflow 3 — Matter Isolation Proof
1. Switch to **Rahul Singh**
2. Sessions tab shows **only matter_3** — matter_1 and matter_2 are completely invisible
3. SQL proof: `SELECT * FROM matters;` returns exactly 1 row as Rahul

### Workflow 4 — Sonia Paralegal Edge Case
1. Switch to **Sonia Das**
2. Sonia sees **matter_1 only**, not matter_2 — even though both are the same client
3. This proves isolation is per-matter, not per-client

### Workflow 5 — Partner Oversight (Nobody is exempt)
1. Switch to **Advocate Sharma**
2. Sessions tab shows Sharma's own sessions (sess_06, sess_07, sess_10) are audited just like associates

### Workflow 6 — Dynamic Permission Grant/Revoke ⭐
1. Sign in as **Advocate Sharma**
2. In *Sessions* tab → **Permission Manager** grid shows all user × matter permissions
3. Click **✓ Granted** on Priya → matter_3 → cell toggles to **— None** (permission revoked)
4. Switch to **Priya** → matter_3 disappears from her list instantly (RLS enforced)
5. Switch back to **Sharma** → click **+ Grant** on Priya → matter_3
6. Switch to **Priya** → matter_3 reappears — database-only change, no code restart

### Workflow 7 — Partner Review + SHA-256 Hash
1. As **Advocate Sharma** → click *Review Queue* tab
2. Select a pending session → click **✓ Approve**
3. The SHA-256 hash column fills in real-time before the decision is recorded
4. After approval: reviewer ID, timestamp, decision, and notes all written to `ai_sessions`

### Workflow 8 — Compliance Export
1. As Sharma → click **Export** tab
2. Set a date range → click *Export CSV*
3. Downloaded file contains: sessions, reviews, blocked events, hashes, timestamps
4. Client names → `Client A`, `Client B` · Users → `User 1`, `User 2` · Matters → `Matter 1`

---

## Evaluator SQL Proofs

Run these directly in the **Supabase SQL Editor**:

### Confirm RLS is enabled and forced on all tables

```sql
SELECT tablename, rowsecurity, forcerowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Expected: both `rowsecurity` and `forcerowsecurity` = `true` for all 6 tables.

### Show all active RLS policies

```sql
SELECT tablename, policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Prove append-only blocked log — UPDATE fails

```sql
UPDATE blocked_access_log SET reason = 'tampered' WHERE event_id = 'block_001';
-- ERROR: blocked_access_log is append-only
```

### Prove append-only blocked log — DELETE fails

```sql
DELETE FROM blocked_access_log WHERE event_id = 'block_001';
-- ERROR: blocked_access_log is append-only
```

### Prove Sonia sees matter_1 only (not matter_2 — same client)

```sql
-- Set context to Sonia's UUID first in your session, then:
SELECT id, client_id, matter_name FROM matters ORDER BY id;
-- Expected: 1 row — matter_1 only
```

### Prove permission removal instantly revokes historical session access

```sql
DELETE FROM matter_permissions
WHERE user_id = '<PRIYA_UUID>' AND matter_id = 'matter_2';

-- Now sign in as Priya and run:
SELECT id, matter_id FROM ai_sessions ORDER BY session_start DESC;
-- Expected: no matter_2 sessions appear
```

### Prove dynamic permission (no code change needed)

```sql
INSERT INTO matters (id, client_id, matter_name, practice_area, court)
VALUES ('matter_4', 'client_a', 'Client A - New Injunction', 'civil', 'Delhi High Court');

INSERT INTO matter_permissions (user_id, matter_id, permission_level, granted_by)
VALUES ('<PRIYA_UUID>', 'matter_4', 'full', 'demo');

-- Sign in as Priya — matter_4 appears without any code change or restart
```

---

## Architecture

See [`docs/architecture.md`](docs/architecture.md) for the full RLS design, security boundary, and audit trail decisions.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15 (App Router), React, TypeScript |
| Styling | Vanilla CSS (Grok dark theme) |
| Auth | Supabase Auth (JWT, per-request) |
| Database | Supabase (PostgreSQL + RLS) |
| Audit | SHA-256 hashing via Web Crypto API |
| Export | Server-side CSV generation |
