import './globals.css';

import type { Metadata } from 'next';
import { AuthProvider } from './auth-provider';
import { ToastProvider } from './components/toast-provider';
import AppShell from './components/app-shell';

export const metadata: Metadata = {
  title: 'MediDesk — Secure Healthcare Management',
  description: 'Secure clinic and appointment management platform with role-based access control and comprehensive healthcare workflows.',
  icons: {
    icon: '/favicon.svg',
  },
};

// Per-request CSP nonces require dynamic rendering so Next can nonce its scripts.
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="/_next/static/css/app/layout.css" />
      </head>
      <body>
        <AuthProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
