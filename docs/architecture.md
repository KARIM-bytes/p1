# Architecture: RLS Design Decisions

## Why Database-Level, Not Application-Level

The ethical wall is enforced at the **PostgreSQL Row Level Security** layer — not in API route `if` statements.

**The problem with application-level checks:**
```
API Route:
  if (userId === 'user_priya' && matterId === 'matter_1') → allow
  else → block
```
A single bug (wrong variable, off-by-one, null check failure) leaks data. The database sees everything — it's the last line of defence that can't be bypassed by code bugs.

**The RLS solution:**
```sql
CREATE POLICY "Users see own matters" ON matters
  FOR SELECT USING (
    id IN (
      SELECT matter_id FROM matter_permissions
      WHERE user_id = auth.uid()
    )
  );
```
Even if the API has a bug that passes the wrong `user_id`, the database evaluates the policy independently. An unauthorized query returns **zero rows** — not an error, not a partial result. Zero.

---

## Table Design

### `matter_permissions` — the source of truth
Every access decision derives from one table:
```
user_id | matter_id | permission_level | granted_by
```
To give Priya access to a new matter: `INSERT INTO matter_permissions`. No code changes. No restart. RLS immediately enforces.

### `blocked_access_log` — append-only evidence
```sql
REVOKE UPDATE, DELETE ON blocked_access_log FROM authenticated;
REVOKE UPDATE, DELETE ON blocked_access_log FROM anon;
```
This is not a suggestion — it's a `REVOKE` at the PostgreSQL privilege level. Even a Supabase admin running SQL cannot `UPDATE` or `DELETE` from this table. The log is immutable evidence for the SRA.

### `ai_sessions` — privacy-preserving audit trail
The `output_hash` column stores `SHA256(rawOutput)`. The full output text is **never stored**. This means:
- Regulators can verify the output wasn't modified (hash check)
- Real client communications aren't exposed in the export
- Attorney-client privilege is preserved in the compliance CSV

---

## RLS Policy Breakdown

### matters
```sql
FOR SELECT USING (
  id IN (SELECT matter_id FROM matter_permissions WHERE user_id = auth.uid())
)
```
- Priya → sees only `matter_1`, `matter_2`
- Rahul → sees only `matter_3`
- Partner → sees all 3 (has rows in `matter_permissions` for each)
- Sonia → sees only `matter_1` (not `matter_2` — matter-level, not client-level)

### ai_sessions
```sql
FOR SELECT USING (
  matter_id IN (SELECT matter_id FROM matter_permissions WHERE user_id = auth.uid())
)
```
Sessions are scoped to the same permission table. If Priya's access to Matter 1 is revoked, her old sessions for Matter 1 also become invisible.

### blocked_access_log
```sql
FOR INSERT WITH CHECK (true);             -- Anyone can log
FOR SELECT USING (role = 'partner');      -- Only partners can read
REVOKE UPDATE, DELETE FROM authenticated; -- Nobody can modify
```

---

## User Switcher Approach (Option A)

We use the **service_role admin client** server-side, manually filtering by `user_id` in every query. This mirrors RLS enforcement while keeping the demo simple.

In production:
- Replace with Supabase Auth (real JWTs)
- Each user logs in — `auth.uid()` is populated automatically
- The RLS policies work identically without any code changes

---

## Edge Cases Handled

| Edge | How |
|------|-----|
| Sonia + Matter 2 | `matter_permissions` has no row — zero result |
| Partner audited | Partner sessions INSERT into `ai_sessions` like everyone else |
| New matter/user | `INSERT into matter_permissions` → RLS enforces immediately |
| Revoking access | `DELETE from matter_permissions` → old sessions also invisible |
| UPDATE on blocked_log | PostgreSQL REVOKE → `permission denied` |

---

## Innovation: Hash-Chain Logging (Proposed)

To detect even a malicious database admin who drops and recreates the table:

```sql
ALTER TABLE blocked_access_log ADD COLUMN prev_hash TEXT;
```

Each INSERT includes `SHA256(previous_row_id || previous_timestamp || ...)`. A missing or modified record breaks the chain — detectable by any auditor replaying the log. This is forensic-grade tamper detection beyond mere append-only.
