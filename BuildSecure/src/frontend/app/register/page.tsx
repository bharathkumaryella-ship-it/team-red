'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../auth-provider';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      await register({ full_name: String(form.get('full_name')), email: String(form.get('email')), phone: String(form.get('phone')), password: String(form.get('password')) });
      router.replace('/patient/dashboard');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Registration failed.'); }
    finally { setBusy(false); }
  }
  return (
    <div className="container auth-shell">
      <section className="panel">
        <p className="eyebrow">New account</p>
        <h1>Register</h1>
        <p className="muted">Create a patient account. Clinic staff accounts are provisioned separately.</p>
        <form className="stacked-form" onSubmit={submit}>
          <label>
            Full name
            <input name="full_name" autoComplete="name" required minLength={2} maxLength={255} placeholder="Jane Doe" />
          </label>
          <label>
            Email
            <input name="email" type="email" autoComplete="email" required maxLength={255} placeholder="name@clinic.local" />
          </label>
          <label>
            Phone
            <input name="phone" type="tel" autoComplete="tel" required minLength={7} maxLength={20} placeholder="+1 555 0100" />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button type="submit" disabled={busy} className="primary-button full-width">
            {busy ? 'Creating account…' : 'Create patient account'}
          </button>
        </form>
        <p className="small-link">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </section>
    </div>
  );
}
