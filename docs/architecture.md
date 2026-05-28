# BRAHMO Compliance Engine — Architecture

## Security Boundary

The security boundary is **PostgreSQL Row Level Security (RLS)**, not React state or route parameters.

Every API route reads the `Authorization: Bearer <token>` header and creates a Supabase client bound to that JWT. All reads and writes execute as the signed-in user — `auth.uid()` is always the authenticated user identity inside every RLS policy. No `userId` is accepted from the browser body.

`service_role` (admin) is used in exactly two places:
1. **Compliance export** — partner-gated, needs firm-wide view
2. **Permission grant/revoke** — partner-gated admin action on `matter_permissions`

---

## Table Design

```
clients
  └── matters  (client_id → clients.id)
        └── matter_permissions  (matter_id + user_id)
        └── ai_sessions         (matter_id + user_id)

users  (linked to auth.users via UUID primary key)
blocked_access_log  (append-only forensic log)
```

---

## 1. Matter-Level Ethical Walls

Access is controlled by `matter_permissions` — one row per `(user_id, matter_id)` grant.

```sql
CREATE POLICY "Users see permitted matters" ON matters
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matter_permissions mp
      WHERE mp.user_id = auth.uid()
        AND mp.matter_id = matters.id
    )
  );
```

**Key design decisions:**

- Policy checks exact `matter_id`, **not** `client_id`. This is why Sonia sees `matter_1` but not `matter_2`, even though both belong to Client A.
- Removing a permission row **immediately** removes visibility to that matter and all its historical AI sessions — no code change, no restart.
- The same `matter_permissions` wall cascades to `clients`, `ai_sessions` via their own RLS policies — one permission row governs all linked tables.

---

## 2. Silent Ethical Wall (Zero-Row Response)

When a user queries a matter they cannot access, the system returns **zero rows** — not an error, not "Access Denied". This prevents information leakage about whether the matter exists.

```
ethical-wall.ts → checkAccess()
    queries matter_permissions WHERE user_id = auth.uid() AND matter_id = ?
    IF 0 rows:
        insert into blocked_access_log
        return { status: 'BLOCKED' }
    ELSE:
        return { status: 'CLEAR' }
```

The API returns only `{ "status": "BLOCKED" }` — no matter name, client name, or reason details cross the wall.

---

## 3. Append-Only Blocked Access Log

`blocked_access_log` is protected three independent ways:

| Layer | Mechanism |
|-------|-----------|
| RLS INSERT | `WITH CHECK (user_id = auth.uid())` — only own events |
| RLS SELECT | `current_user_is_partner()` — only partners read |
| REVOKE | `REVOKE UPDATE, DELETE ON blocked_access_log FROM authenticated, anon` |
| Trigger | `BEFORE UPDATE OR DELETE → RAISE EXCEPTION 'append-only'` |

The trigger also blocks accidental modifications through `service_role` application code.

**Proof:**
```sql
DELETE FROM blocked_access_log WHERE event_id = 'block_001';
-- ERROR: blocked_access_log is append-only
```

---

## 4. AI Session Audit Trail

Every session — including partner sessions — is written to `ai_sessions`.

### Session lifecycle

```
recordSessionStart()          → INSERT ai_sessions (status: pending)
        ↓
[AI work happens]
        ↓
recordSessionEnd()            → UPDATE output_hash, token_count, session_end
        ↓
recordReview()  [partner]     → UPDATE reviewer_id, review_timestamp, decision, notes
```

### Privacy-safe hashing

Raw AI output is **never stored**. `PATCH /api/sessions` accepts `rawOutput`, hashes it server-side:

```ts
const hash = await crypto.subtle.digest('SHA-256', encoder.encode(rawOutput));
// Only the hex hash is stored in output_hash
```

If `rawOutput` is not provided (demo flow), a deterministic hash is generated from `sessionId + userId + timestamp`.

---

## 5. Review & Supervision Chain

Only partners can call `GET /api/review` or `POST /api/review`.

The API enforces this at two layers:
1. **Application layer** — `requirePartner(profile)` checks the role in `users` table
2. **Database layer** — RLS policy `"Partners review sessions for permitted matters"` restricts UPDATE to partners who have permission to the matter

Review fields written atomically:
- `reviewer_id`
- `review_timestamp`
- `review_decision` (`approved` | `approved_with_edits` | `rejected`)
- `review_notes`

---

## 6. Dynamic Permission Management

Partners can grant or revoke matter access from the **Permission Manager** UI (Sessions tab, partner-only).

```
Partner clicks Grant  → POST /api/permissions
                      → supabaseAdmin.insert(matter_permissions)
                      → RLS applies instantly on next query

Partner clicks Revoke → DELETE /api/permissions
                      → supabaseAdmin.delete(matter_permissions)
                      → Matter + sessions disappear for that user immediately
```

This demonstrates that **system behavior changes purely through database permissions** — no code deployment, no restart required.

---

## 7. Compliance Export

`GET /api/export?from=YYYY-MM-DD&to=YYYY-MM-DD` — partner-only.

Uses `supabaseAdmin` (service role) after partner verification, because regulators need a firm-wide view across all matters.

### Anonymization map

| Raw value | Exported as |
|-----------|-------------|
| Client names | `Client A`, `Client B`, … |
| Matter IDs | `Matter 1`, `Matter 2`, … |
| User UUIDs | `User 1`, `User 2`, … |
| Review notes text | `yes` / `no` (presence only) |
| Output hash | Full SHA-256 hex (retained) |
| Timestamps | Retained |
| Practice area | Retained |
| Review decision | Retained |

CSV includes both AI sessions and blocked access events in one file.

---

## 8. RLS Force Mode

All tables use both `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`:

```sql
ALTER TABLE matters ENABLE ROW LEVEL SECURITY;
ALTER TABLE matters FORCE ROW LEVEL SECURITY;
```

`FORCE ROW LEVEL SECURITY` ensures policies apply even to the table owner, preventing privilege escalation through ownership.

---

## 9. SLA Monitoring (Innovation Workflow)

Sessions pending review for **more than 48 hours** are automatically flagged in the UI:

```
session_start + 48h < now()
    → hoursElapsed > 48
    → SLA breach badge shown on session row
```

This is computed client-side from `session_start` with no additional DB queries.

---

## Verification Checklist

```sql
-- 1. RLS enabled and forced on all tables
SELECT tablename, rowsecurity, forcerowsecurity
FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- 2. All active policies
SELECT tablename, policyname, cmd
FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;

-- 3. Append-only proof
DELETE FROM blocked_access_log WHERE event_id = 'block_001';
-- ERROR: blocked_access_log is append-only

-- 4. Sonia sees matter_1 only (not matter_2 — same client)
SELECT id, client_id, matter_name FROM matters ORDER BY id;
-- (run as Sonia's session) → 1 row

-- 5. Revoke proof — remove Priya's matter_2 permission
DELETE FROM matter_permissions
WHERE user_id = '<PRIYA_UUID>' AND matter_id = 'matter_2';
-- Sign in as Priya → matter_2 sessions gone immediately

-- 6. Dynamic grant proof
INSERT INTO matters VALUES ('matter_4', 'client_a', 'New Injunction', 'civil', 'Delhi HC', 'active', NOW());
INSERT INTO matter_permissions VALUES (DEFAULT, '<PRIYA_UUID>', 'matter_4', 'full', NOW(), 'demo');
-- Sign in as Priya → matter_4 visible with no code change
```
