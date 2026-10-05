import './globals.css';

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'MediDesk',
  description: 'Secure clinic and appointment management foundation',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="container nav-wrap">
            <Link href="/" className="brand">
              MediDesk
            </Link>
            <nav className="nav-links" aria-label="Main navigation">
              <Link href="/">Home</Link>
              <Link href="/login">Login</Link>
              <Link href="/register">Register</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
