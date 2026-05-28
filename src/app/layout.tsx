import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BRAHMO Compliance Dashboard',
  description: 'Legal AI compliance engine — ethical walls, audit trail, and regulatory export for law firms.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ background: '#0A0A0A', color: '#F4F4F5', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  );
}
