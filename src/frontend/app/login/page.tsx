'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../auth-provider';
import { Shield, CalendarDays, FileText, Lock } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const user = await login(String(form.get('email')), String(form.get('password')));
      router.replace(
        user.role === 'ADMIN' ? '/admin/dashboard'
        : user.role === 'DOCTOR' ? '/doctor/dashboard'
        : '/patient/dashboard'
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sign in failed.');
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

          <div className="auth-form-footer">
            Don&apos;t have an account?{' '}
            <Link href="/register">Create a patient account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
