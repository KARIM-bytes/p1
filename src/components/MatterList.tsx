'use client';

// ============================================================
// components/MatterList.tsx
//
// Shows accessible matters for the current user.
// RLS guarantees only permitted matters are returned from DB.
// Matter 3 (TechCorp NDA) is INVISIBLE to Priya — not listed,
// not errored — it simply doesn't exist from her perspective.
// ============================================================

import { Matter } from '@/lib/types';

interface MatterListProps {
  matters: Matter[];
  loading: boolean;
  userId: string;
  /** Called when user wants to start a session on a matter */
  onStartSession?: (matterId: string) => void;
}

const PRACTICE_AREA_ICONS: Record<string, string> = {
  criminal:  '⚖️',
  property:  '🏠',
  corporate: '🏢',
  default:   '📁',
};

export default function MatterList({
  matters,
  loading,
  userId,
  onStartSession,
}: MatterListProps) {
  if (loading) {
    return <div className="matter-list matter-list--loading">Loading matters…</div>;
  }

  if (matters.length === 0) {
    return (
      <div className="matter-list matter-list--empty">
        No matters accessible. (RLS returned zero rows.)
      </div>
    );
  }

  return (
    <div className="matter-list">
      <h3 className="matter-list__title">✅ Accessible Matters</h3>
      <ul className="matter-list__items">
        {matters.map((m) => {
          const icon = PRACTICE_AREA_ICONS[m.practice_area ?? ''] ?? PRACTICE_AREA_ICONS.default;
          return (
            <li key={m.id} className="matter-item">
              <div className="matter-item__icon">{icon}</div>
              <div className="matter-item__info">
                <span className="matter-item__name">{m.matter_name}</span>
                <span className="matter-item__meta">
                  {m.practice_area} · {m.court} · {m.status}
                </span>
              </div>
              {onStartSession && (
                <button
                  id={`start-session-${m.id}`}
                  className="btn btn--sm btn--primary"
                  onClick={() => onStartSession(m.id)}
                >
                  + Start Session
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
