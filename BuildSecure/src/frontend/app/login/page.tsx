'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../auth-provider';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const user = await login(String(form.get('email')), String(form.get('password')));
      router.replace(user.role === 'ADMIN' ? '/admin/dashboard' : user.role === 'DOCTOR' ? '/doctor/dashboard' : '/patient/dashboard');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Sign in failed.'); }
    finally { setBusy(false); }
  }
  return (
    <div className="container auth-shell">
      <section className="panel">
        <p className="eyebrow">Access portal</p>
        <h1>Sign in</h1>
        <p className="muted">Sign in to your secure clinic account.</p>
        <form className="stacked-form" onSubmit={submit}>
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required placeholder="name@clinic.local" />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="current-password" required placeholder="Enter secure password" />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" disabled={busy} className="primary-button full-width">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="small-link">
          Need an account? <Link href="/register">Create one</Link>
        </p>
      </section>
    </div>
  );
}
