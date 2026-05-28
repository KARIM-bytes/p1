# BRAHMO Compliance Engine

Ethical walls, audit trail, partner review, and anonymized compliance export for legal AI usage.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp .env.local.example .env.local
```

Fill in:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

3. Create four Supabase Auth users:

```text
sharma@firm.com / Test1234!
priya@firm.com  / Test1234!
rahul@firm.com  / Test1234!
sonia@firm.com  / Test1234!
```

4. Run `supabase/schema.sql` in the Supabase SQL Editor.

5. Confirm the UUIDs in `supabase/seed.sql` match the four Auth users, then run `supabase/seed.sql`.

6. Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo Script

1. Sign in as Priya and view Sessions.
   Expected: Priya sees Matter 1 and Matter 2 only.

2. As Priya, run the Live Access Check against Matter 3.
   Expected: response is blocked, no matter details are returned, and a row is appended to `blocked_access_log`.

3. Sign in as Sonia.
   Expected: Sonia sees Matter 1 only, not Matter 2, even though both are Client A matters.

4. Sign in as Advocate Sharma.
   Expected: blocked log, review queue, and export tabs are available. Approving a pending session writes reviewer, timestamp, decision, and notes.

5. Export the compliance CSV as Advocate Sharma.
   Expected: clients, matters, users, reviewers, and notes are masked; hashes and audit timestamps remain.

## Evaluator SQL Proofs

Confirm RLS and force RLS:

```sql
SELECT tablename, rowsecurity, forcerowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Show active policies:

```sql
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Prove append-only blocked log:

```sql
DELETE FROM blocked_access_log WHERE event_id = 'block_001';
-- Expected: ERROR: blocked_access_log is append-only
```

Prove Sonia matter-level isolation:

```sql
-- Run as Sonia's authenticated session.
SELECT id, client_id, matter_name FROM matters ORDER BY id;
-- Expected: matter_1 only.
```

Prove permission removal affects historical sessions:

```sql
DELETE FROM matter_permissions
WHERE user_id = '<PRIYA_UUID>' AND matter_id = 'matter_2';

-- Sign in as Priya and query sessions.
SELECT id, matter_id FROM ai_sessions ORDER BY session_start DESC;
-- Expected: no matter_2 sessions.
```

## Notes

This workspace uses the installed Next.js 16 runtime. The project follows the local `node_modules/next/dist/docs` guidance for current route handlers and authentication checks. The assessment brief mentioned Next.js 14, but downgrading without the matching lockfile/runtime would be less reliable than using the installed framework version consistently.
