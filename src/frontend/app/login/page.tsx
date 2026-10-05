'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../auth-provider';
import { Shield, CalendarDays, FileText, Lock } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const DEMO_ACCOUNTS = [
    { role: 'Admin', email: 'admin@demo.local', pass: 'DEMO-ONLY-Password123!' },
    { role: 'Doctor', email: 'doctor1@demo.local', pass: 'DEMO-ONLY-Password123!' },
    { role: 'Patient', email: 'patient1@demo.local', pass: 'DEMO-ONLY-Password123!' },
  ];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await login(email.trim(), password);
      router.replace(
        user.role === 'ADMIN' ? '/admin/dashboard'
        : user.role === 'DOCTOR' ? '/doctor/dashboard'
        : '/patient/dashboard'
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sign in failed. Check your email and password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      {/* Left branding panel */}
      <div className="auth-branding">
        <div className="auth-branding-content animate-in">
          <div className="auth-branding-logo">M</div>
          <h1>Welcome to MediDesk</h1>
          <p>
            Secure clinic management platform for healthcare professionals
            and patients.
          </p>
          <div className="auth-branding-features">
            <div className="auth-feature">
              <div className="auth-feature-icon"><Shield size={18} /></div>
              <span>Role-based access control for all accounts</span>
            </div>
            <div className="auth-feature">
              <div className="auth-feature-icon"><CalendarDays size={18} /></div>
              <span>Smart appointment scheduling and tracking</span>
            </div>
            <div className="auth-feature">
              <div className="auth-feature-icon"><FileText size={18} /></div>
              <span>Secure medical record management</span>
            </div>
            <div className="auth-feature">
              <div className="auth-feature-icon"><Lock size={18} /></div>
              <span>Backend-enforced session security</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-form-side">
        <div className="auth-form-container animate-in">
          <div className="auth-form-header">
            <div className="auth-mobile-logo">M</div>
            <h1>Sign in</h1>
            <p>Enter your credentials to access your secure clinic account.</p>
          </div>

          <form className="stacked-form" onSubmit={submit}>
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@clinic.example"
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </label>

            {error && <p className="form-error" role="alert">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className={`btn btn-primary btn-lg btn-full ${busy ? 'btn-loading' : ''}`}
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          {/* Quick Demo Credentials Helper */}
          <div style={{ marginTop: '20px', padding: '16px', background: 'var(--color-surface-raised, #f8fafc)', borderRadius: '12px', border: '1px solid var(--color-border, #e2e8f0)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Quick Demo Fill:</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>Pass: DEMO-ONLY-Password123!</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword(acc.pass);
                    setError('');
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '6px 8px', justifyContent: 'center' }}
                >
                  {acc.role}
                </button>
              ))}
            </div>
          </div>

          <div className="auth-form-footer">
            Don&apos;t have an account?{' '}
            <Link href="/register">Create a patient account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
