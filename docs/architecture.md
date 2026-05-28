# BRAHMO Compliance Engine - Secure Architecture

## 1. Security Boundary

The security boundary is PostgreSQL Row Level Security, not React state and not route parameters.

Every user-facing API route requires a Supabase Auth access token in the `Authorization: Bearer <token>` header. The server creates a Supabase client with the anon key plus that JWT. This means reads and writes execute as the signed-in user, so `auth.uid()` is available inside RLS policies.

The app no longer accepts `userId` from the browser. A user cannot impersonate Priya, Rahul, Sonia, or the partner by changing a query string or request body.

`service_role` is reserved for one privileged path: compliance export after the caller has been authenticated and verified as a partner. Normal flows use the authenticated client and RLS.

## 2. Matter-Level Ethical Walls

Access is controlled by `matter_permissions`, one row per `(user_id, matter_id)` grant.

The key policies are:

```sql
CREATE POLICY "Users see permitted matters" ON matters
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM matter_permissions mp
      WHERE mp.user_id = auth.uid()
        AND mp.matter_id = matters.id
    )
  );
```

The policy checks exact `matter_id`. It does not grant access by `client_id`. This is why Sonia can see `matter_1` but not `matter_2`, even though both are Client A matters.

Removing a row from `matter_permissions` immediately removes visibility to the matter and its historical AI sessions.

## 3. Blocked Access

`checkAccess()` queries the authenticated user's visible permission rows. If no row exists, it inserts a denied event into `blocked_access_log` and returns only:

```json
{ "status": "BLOCKED" }
```

The response does not include matter name, client name, reason details, or whether the requested matter exists. This avoids leaking information across the ethical wall.

## 4. Append-Only Audit Log

`blocked_access_log` is protected three ways:

1. RLS allows inserts only when `user_id = auth.uid()`.
2. `UPDATE` and `DELETE` are revoked from `authenticated` and `anon`.
3. A trigger raises an exception before any update or delete.

Expected proof:

```sql
DELETE FROM blocked_access_log WHERE event_id = 'block_001';
-- ERROR: blocked_access_log is append-only
```

## 5. AI Session Audit Trail

Every session, including partner sessions, is written to `ai_sessions`.

The system stores:

- user ID
- matter ID
- timestamps
- query type
- output token count
- SHA-256 output hash
- review status and decision

The system does not store raw AI output. `/api/sessions PATCH` accepts `rawOutput`, hashes it server-side with SHA-256, and stores only `output_hash`.

## 6. Review Chain

Only partners can call `/api/review`.

The route verifies the signed-in user's profile role before attempting the update. The database also requires the partner to have permission to the matter being reviewed.

Review records include:

- reviewer ID
- review timestamp
- decision
- notes

## 7. Compliance Export

Only partners can trigger `/api/export`.

The export uses `service_role` only after partner verification because regulators need a complete firm-wide export. The CSV masks client names, matter names, user IDs, reviewer IDs, and review note contents. It preserves audit-relevant fields such as roles, practice area, timestamps, review status, decisions, token counts, and output hashes.

## 8. Verification Queries

Confirm RLS:

```sql
SELECT tablename, rowsecurity, forcerowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'clients',
    'users',
    'matters',
    'matter_permissions',
    'ai_sessions',
    'blocked_access_log'
  )
ORDER BY tablename;
```

Confirm policies:

```sql
SELECT tablename, policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Sonia matter-level proof:

```sql
-- Run as Sonia's authenticated session.
SELECT id, client_id, matter_name
FROM matters
ORDER BY id;
-- Expected: matter_1 only. matter_2 must not appear.
```

Permission removal proof:

```sql
DELETE FROM matter_permissions
WHERE user_id = '<PRIYA_UUID>' AND matter_id = 'matter_2';

-- Then sign in as Priya and query:
SELECT id, matter_id
FROM ai_sessions
ORDER BY session_start DESC;
-- Expected: no matter_2 sessions.
```

New matter proof:

```sql
INSERT INTO matters (id, client_id, matter_name, practice_area, court)
VALUES ('matter_4', 'client_a', 'Client A - New Injunction', 'civil', 'Delhi High Court');

INSERT INTO matter_permissions (user_id, matter_id, permission_level, granted_by)
VALUES ('<PRIYA_UUID>', 'matter_4', 'full', 'demo');

-- Sign in as Priya. matter_4 appears without code changes.
```
