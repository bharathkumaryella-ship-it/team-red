'use client';

import Link from 'next/link';
import { useAuth } from './auth-provider';

export default function Navigation() {
  const { user, logout } = useAuth();
  return (
    <header className="site-header">
      <div className="container nav-wrap">
        <Link href="/" className="brand">MediDesk</Link>
        <nav className="nav-links" aria-label="Main navigation">
          <Link href="/">Home</Link>
          {user ? <><Link href={user.role === 'PATIENT' ? '/patient/appointments' : user.role === 'DOCTOR' ? '/doctor/appointments' : '/admin/appointments'}>Appointments</Link>{user.role !== 'ADMIN' && <Link href={user.role === 'PATIENT' ? '/patient/medical-records' : '/doctor/medical-records'}>Medical records</Link>}<span className="muted">{user.full_name}</span><button className="link-button" onClick={() => void logout()}>Logout</button></>
            : <><Link href="/login">Login</Link><Link href="/register">Register</Link></>}
        </nav>
      </div>
    </header>
  );
}
