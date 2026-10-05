'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../auth-provider';
import { Shield, CalendarDays, FileText, Lock, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  function evaluatePassword(value: string) {
    let score = 0;
    if (value.length >= 8) score++;
    if (value.length >= 12) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/[0-9]/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;
    setPasswordStrength(score);
  }

  const strengthLabels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['#dc2626', '#f97316', '#eab308', '#22c55e', '#059669'];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      await register({
        full_name: String(form.get('full_name')),
        email: String(form.get('email')),
        phone: String(form.get('phone')),
        password: String(form.get('password')),
      });
      router.replace('/patient/dashboard');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Registration failed.');
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
          <h1>Join MediDesk</h1>
          <p>
            Create your patient account to access secure appointment booking and medical record management.
          </p>
          <div className="auth-branding-features">
            <div className="auth-feature">
              <div className="auth-feature-icon"><Shield size={18} /></div>
              <span>Passwords are protected with one-way Argon2id hashing</span>
            </div>
            <div className="auth-feature">
              <div className="auth-feature-icon"><CalendarDays size={18} /></div>
              <span>Book and manage appointments online</span>
            </div>
            <div className="auth-feature">
              <div className="auth-feature-icon"><FileText size={18} /></div>
              <span>Access your medical records anytime</span>
            </div>
            <div className="auth-feature">
              <div className="auth-feature-icon"><Lock size={18} /></div>
              <span>Your data is protected and private</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-form-side">
        <div className="auth-form-container animate-in">
          <div className="auth-form-header">
            <div className="auth-mobile-logo">M</div>
            <h1>Create account</h1>
            <p>Register as a patient. Doctor and admin accounts are provisioned separately.</p>
          </div>

          <form className="stacked-form" onSubmit={submit}>
            <label>
              Full name
              <input
                name="full_name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={255}
                placeholder="Jane Doe"
              />
            </label>
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={255}
                placeholder="name@example.com"
              />
            </label>
            <label>
              Phone number
              <input
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                minLength={7}
                maxLength={20}
                placeholder="+1 555 0100"
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
                placeholder="Min. 8 characters"
                onChange={(e) => evaluatePassword(e.target.value)}
              />
            </label>

            {/* Password strength indicator */}
            {passwordStrength > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 4, borderRadius: 2, background: '#e2e8f0', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${(passwordStrength / 5) * 100}%`,
                      height: '100%',
                      borderRadius: 2,
                      background: strengthColors[passwordStrength - 1],
                      transition: 'all 300ms ease',
                    }}
                  />
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: strengthColors[passwordStrength - 1] }}>
                  {strengthLabels[passwordStrength - 1]}
                </span>
              </div>
            )}

            {error && <p className="form-error" role="alert">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className={`btn btn-primary btn-lg btn-full ${busy ? 'btn-loading' : ''}`}
            >
              {busy ? 'Creating account…' : 'Create patient account'}
            </button>
          </form>

          <div className="auth-form-footer">
            Already have an account?{' '}
            <Link href="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
