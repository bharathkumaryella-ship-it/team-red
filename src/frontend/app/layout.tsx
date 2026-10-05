import './globals.css';

import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthProvider, useAuth } from './auth-provider';

export const metadata: Metadata = {
  title: 'MediDesk',
  description: 'Secure clinic and appointment management foundation',
};

function Navigation() {
  const { user, logout } = useAuth();
  return (
    <header className="site-header">
      <div className="container nav-wrap">
        <Link href="/" className="brand">MediDesk</Link>
        <nav className="nav-links" aria-label="Main navigation">
          <Link href="/">Home</Link>
          {user ? <><span className="muted">{user.full_name}</span><button className="link-button" onClick={() => void logout()}>Logout</button></>
            : <><Link href="/login">Login</Link><Link href="/register">Register</Link></>}
        </nav>
      </div>
    </header>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider><Navigation /><main>{children}</main></AuthProvider>
      </body>
    </html>
  );
}
