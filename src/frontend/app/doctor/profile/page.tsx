'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';

type DoctorProfile = { id: number; full_name: string; email: string; phone: string | null; specialization: string; experience_years: number | null; bio: string | null; license_number: string; is_active: boolean };

export default function DoctorProfilePage() {
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  useEffect(() => { apiRequest<{ data: DoctorProfile }>('/doctors/me').then((r) => setProfile(r.data)).catch((e: Error) => setError(e.message)); }, []);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setSaved(false);
    const form = new FormData(event.currentTarget);
    const raw = Object.fromEntries(form);
    const body = { ...raw, experience_years: raw.experience_years === '' ? null : Number(raw.experience_years) };
    try {
      const result = await apiRequest<{ data: DoctorProfile }>('/doctors/me', { method: 'PATCH', body });
      setProfile(result.data); setSaved(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save profile.'); }
  }
  if (!profile) return <main className="container page-shell"><p>{error || 'Loading profile…'}</p></main>;
  return <main className="container auth-shell"><section className="panel"><p className="eyebrow">Doctor portal</p><h1>Your profile</h1><p className="muted">License number: {profile.license_number} · {profile.email}</p>
    <form className="stacked-form" onSubmit={save}>
      <label>Full name<input name="full_name" required minLength={2} maxLength={255} defaultValue={profile.full_name} /></label>
      <label>Phone<input name="phone" type="tel" minLength={7} maxLength={20} defaultValue={profile.phone || ''} /></label>
      <label>Specialization<input name="specialization" required maxLength={255} defaultValue={profile.specialization} /></label>
      <label>Years of experience<input name="experience_years" type="number" min={0} max={80} defaultValue={profile.experience_years ?? ''} /></label>
      <label>Professional bio<textarea name="bio" maxLength={2000} defaultValue={profile.bio || ''} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}{saved && <p role="status">Profile saved.</p>}
      <button className="primary-button" type="submit">Save profile</button>
    </form></section></main>;
}
