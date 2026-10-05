import './globals.css';

import type { Metadata } from 'next';
import { AuthProvider } from './auth-provider';
import Navigation from './navigation';

export const metadata: Metadata = {
  title: 'MediDesk',
  description: 'Secure clinic and appointment management foundation',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider><Navigation /><main>{children}</main></AuthProvider>
      </body>
    </html>
  );
}
