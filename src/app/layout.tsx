import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BRAHMO Compliance Dashboard',
  description: 'Legal AI compliance engine - ethical walls, audit trail, and regulatory export for law firms.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
