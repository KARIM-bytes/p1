'use client';

import { supabase } from '@/lib/supabase';
import type { User, UserRole } from '@/lib/types';

const DEMO_PASSWORD = 'Test1234!';

export const DEMO_USERS: Array<Pick<User, 'id' | 'name' | 'email' | 'role' | 'sra_number' | 'created_at'>> = [
  {
    id: 'a165eb17-a1ae-434c-88ae-8d970773b45f',
    name: 'Advocate Sharma',
    email: 'sharma@firm.com',
    role: 'partner',
    sra_number: 'SRA-001',
    created_at: '',
  },
  {
    id: '335f7d86-f261-4d74-9b05-b84b88057279',
    name: 'Priya Mehta',
    email: 'priya@firm.com',
    role: 'associate',
    sra_number: 'SRA-002',
    created_at: '',
  },
  {
    id: 'dcc22e7e-c94f-4ee0-84bb-ac4cac063ed5',
    name: 'Rahul Singh',
    email: 'rahul@firm.com',
    role: 'associate',
    sra_number: 'SRA-003',
    created_at: '',
  },
  {
    id: 'ff1a4163-ca37-45de-9bf4-76e0d59ee128',
    name: 'Sonia Das',
    email: 'sonia@firm.com',
    role: 'paralegal',
    sra_number: null,
    created_at: '',
  },
];

interface UserSwitcherProps {
  currentUserId: string;
  currentUserEmail?: string;
  onSwitch: (userId: string) => void;
}

const roleClass: Record<UserRole, string> = {
  partner: 'bg-violet-100 text-violet-800 border-violet-200',
  associate: 'bg-blue-100 text-blue-800 border-blue-200',
  paralegal: 'bg-emerald-100 text-emerald-800 border-emerald-200',
};

export default function UserSwitcher({ currentUserId, currentUserEmail, onSwitch }: UserSwitcherProps) {
  const currentDemo = DEMO_USERS.find((user) =>
    user.id === currentUserId || user.email === currentUserEmail
  );

  async function handleChange(email: string) {
    await supabase.auth.signOut();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: DEMO_PASSWORD,
    });

    if (error || !data.user) {
      console.error('[UserSwitcher] sign-in failed:', error?.message);
      return;
    }

    onSwitch(data.user.id);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label htmlFor="user-select" className="text-sm font-medium text-slate-700">
        Demo user
      </label>
      <select
        id="user-select"
        value={currentDemo?.email ?? ''}
        onChange={(event) => handleChange(event.target.value)}
        className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
      >
        <option value="" disabled>
          Select a user
        </option>
        {DEMO_USERS.map((user) => (
          <option key={user.email} value={user.email}>
            {user.name} ({user.role})
          </option>
        ))}
      </select>
      {currentDemo && (
        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${roleClass[currentDemo.role]}`}>
          {currentDemo.role.toUpperCase()}
        </span>
      )}
      <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
        DEMO MODE
      </span>
    </div>
  );
}
