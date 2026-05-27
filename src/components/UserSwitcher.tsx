'use client';

// ============================================================
// components/UserSwitcher.tsx
//
// Demo user switcher dropdown — changes which user's perspective
// the dashboard shows. In real auth this would be Supabase Auth.
//
// Each user switch re-fetches all data as that user, so RLS
// filtering is demonstrated live during the 5-step scenario.
// ============================================================

import { User } from '@/lib/types';

// Hard-coded demo users — in production these come from Supabase Auth
export const DEMO_USERS: User[] = [
  { id: 'user_partner', name: 'Advocate Sharma (Partner)', email: 'sharma@firm.com', role: 'partner',   sra_number: 'SRA-001', created_at: '' },
  { id: 'user_priya',   name: 'Priya Mehta (Associate)',   email: 'priya@firm.com',  role: 'associate', sra_number: 'SRA-002', created_at: '' },
  { id: 'user_rahul',   name: 'Rahul Singh (Associate)',   email: 'rahul@firm.com',  role: 'associate', sra_number: 'SRA-003', created_at: '' },
  { id: 'user_sonia',   name: 'Sonia Das (Paralegal)',     email: 'sonia@firm.com',  role: 'paralegal', sra_number: null,      created_at: '' },
];

interface UserSwitcherProps {
  currentUserId: string;
  onSwitch: (userId: string) => void;
}

export default function UserSwitcher({ currentUserId, onSwitch }: UserSwitcherProps) {
  const currentUser = DEMO_USERS.find((u) => u.id === currentUserId);

  return (
    <div className="user-switcher">
      <label htmlFor="user-select" className="user-switcher__label">
        👤 Demo User
      </label>
      <select
        id="user-select"
        value={currentUserId}
        onChange={(e) => onSwitch(e.target.value)}
        className="user-switcher__select"
      >
        {DEMO_USERS.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))}
      </select>
      <span className="user-switcher__badge user-switcher__badge--{currentUser?.role}">
        {currentUser?.role?.toUpperCase()}
      </span>

      {/* Demo indicator — makes clear this is not real auth */}
      <span className="user-switcher__demo-tag">⚠️ DEMO MODE</span>
    </div>
  );
}
