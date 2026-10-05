'use client';

import Link from 'next/link';
import { Shield, CalendarDays, Lock, UserCheck } from 'lucide-react';
import { useAuth } from './auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace(
        user.role === 'ADMIN' ? '/admin/dashboard'
        : user.role === 'DOCTOR' ? '/doctor/dashboard'
        : '/patient/dashboard'
      );
    }
  }, [loading, user, router]);

  if (!loading && user) return null;

  return (
    <div className="landing-page">
      <section className="landing-hero">
        <div className="landing-content animate-in">
          <div className="landing-badge">
            <Shield size={14} />
            Secure Healthcare Platform
          </div>
          <h1>
            Modern Clinic Management,<br />
            <span>Built on Trust</span>
          </h1>
          <p>
            MediDesk provides secure appointment scheduling, medical record management,
            and role-based access — designed for patients, doctors, and administrators.
          </p>
          <div className="landing-actions">
            <Link href="/login" className="btn btn-primary btn-lg">
              Sign in to your account
            </Link>
            <Link href="/register" className="btn btn-secondary btn-lg" style={{ background: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)', color: '#e2e8f0' }}>
              Create patient account
            </Link>
          </div>
          <div className="landing-features">
            <div className="landing-feature animate-in animate-in-delay-1">
              <div className="landing-feature-icon"><CalendarDays /></div>
              <h3>Smart Scheduling</h3>
              <p>Book appointments with availability checks, status tracking, and real-time conflict prevention.</p>
            </div>
            <div className="landing-feature animate-in animate-in-delay-2">
              <div className="landing-feature-icon"><Lock /></div>
              <h3>Security First</h3>
              <p>Role-based access control, session security, and backend-enforced authorization on every request.</p>
            </div>
            <div className="landing-feature animate-in animate-in-delay-3">
              <div className="landing-feature-icon"><UserCheck /></div>
              <h3>Patient Privacy</h3>
              <p>Medical records accessible only to authorized doctors and patients through verified relationships.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
