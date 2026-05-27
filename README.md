# BRAHMO Compliance Dashboard

**Assessment 6 — Ethical Walls + Audit Trail + Compliance Export**

A compliance engine that makes law firms regulator-ready. Every AI session audited. Every cross-client access blocked and logged. Every output reviewed before it reaches a filing. Exportable. Provable. Tamper-proof.

---

## Quick Start

### 1. Prerequisites
- Node.js v18+
- A free [Supabase](https://supabase.com) account

### 2. Clone & Install
```bash
cd "E:\assesment 6"
npm install
```

### 3. Set up Supabase
1. Create a project at [supabase.com](https://supabase.com) → name it `brahmo-compliance`
2. Go to **Settings → API** and copy:
   - Project URL
   - `anon` key
   - `service_role` key (scroll down, click Reveal)
3. Copy `.env.local.example` → `.env.local` and fill in your keys

### 4. Run the database schema
In the Supabase **SQL Editor**, run in order:
```
supabase/schema.sql   ← Creates tables + RLS policies + REVOKE
supabase/seed.sql     ← Inserts all demo data
```

### 5. Start the app
```bash
npm run dev   # → http://localhost:3000
```

---

## Architecture Overview

See [`docs/architecture.md`](./docs/architecture.md) for full RLS design decisions.

### Key Principle: Database-enforced isolation
```
matter_permissions table
       │
       ▼ RLS policy checks this
matters ──────────────┐
ai_sessions ──────────┤  Users can ONLY see rows where
blocked_access_log ───┘  their user_id appears in matter_permissions
```

### The 5-Step Demo
| Step | Who | Action | Expected |
|------|-----|--------|----------|
| 1 | Priya | Access Matter 1 | ✅ CLEAR — session recorded |
| 2 | Priya | Access Matter 3 | 🚫 BLOCKED — empty result, event logged |
| 3 | Rahul | List matters | Only Matter 3 returned — zero rows for 1 & 2 |
| 4 | Partner | Review Priya's session | Review chain recorded |
| 5 | Partner | Export CSV | Anonymized, includes blocked event |

---

## Project Structure

```
brahmo-compliance/
├── README.md
├── .env.local.example
├── src/
│   ├── app/
│   │   ├── page.tsx              ← Main dashboard
│   │   └── api/
│   │       ├── access-check/     ← Ethical wall check
│   │       ├── sessions/         ← Session lifecycle
│   │       ├── review/           ← Partner review
│   │       ├── export/           ← CSV download
│   │       ├── matters/          ← Accessible matters
│   │       ├── stats/            ← Dashboard metrics
│   │       └── blocked-log/      ← Blocked events
│   ├── lib/
│   │   ├── supabase.ts           ← Anon + admin clients
│   │   ├── ethical-wall.ts       ← checkAccess + BLOCKED logging
│   │   ├── audit-trail.ts        ← Session recording + review chain
│   │   ├── compliance-export.ts  ← CSV + anonymization
│   │   └── types.ts              ← TypeScript interfaces
│   └── components/
│       ├── Dashboard.tsx         ← Main UI
│       ├── SessionList.tsx
│       ├── BlockedAccessLog.tsx
│       ├── UserSwitcher.tsx
│       ├── ReviewPanel.tsx
│       └── ExportButton.tsx
├── supabase/
│   ├── schema.sql                ← Tables + RLS + REVOKE
│   └── seed.sql                  ← Demo data
└── docs/
    └── architecture.md
```

---

## Demo Users

| User | Role | Accessible Matters |
|------|------|-------------------|
| Advocate Sharma | Partner | All 3 matters |
| Priya Mehta | Associate | Matter 1, 2 (Client A) |
| Rahul Singh | Associate | Matter 3 (Client B) |
| Sonia Das | Paralegal | Matter 1 only |

Switch between users via the dropdown — each switch changes the data scope live.

---

## Submission Checklist

- [x] `README.md` with setup instructions
- [x] `.env.local.example` (placeholder values)
- [x] `supabase/schema.sql` — tables + RLS policies + REVOKE
- [x] `supabase/seed.sql` — all seed data
- [x] All 5 demo steps work with real Supabase queries
- [x] RLS policies are database-enforced (show SQL in `schema.sql`)
- [x] `blocked_access_log` is truly append-only (REVOKE in `schema.sql`)
- [x] Denied access returns EMPTY result (not error)
- [x] Compliance export CSV has anonymized client names
- [x] Export includes blocked access events
- [x] Dashboard shows meaningful metrics
- [x] User switcher works for all 4 users
- [x] Sonia sees Matter 1 but NOT Matter 2
- [x] Partner sessions are audited (nobody exempt)
- [ ] Clean git history
- [x] `docs/architecture.md` explains RLS design decisions
