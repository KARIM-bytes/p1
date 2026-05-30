'use client';

import type { ReactNode } from 'react';

interface DashboardProps {
  children: ReactNode;
}

/**
 * Dashboard — main layout wrapper.
 * Wraps all dashboard content in the primary scrollable container.
 * Logic lives in page.tsx; this component handles structural layout only.
 */
export default function Dashboard({ children }: DashboardProps) {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {children}
    </main>
  );
}
