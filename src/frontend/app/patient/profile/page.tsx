'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';

type PatientProfile = {
  id: number; full_name: string; email: string; phone: string | null;
  date_of_birth: string | null; gender: string | null; blood_group: string | null; address: string | null;
};

export default function PatientProfilePage() {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  useEffect(() => { apiRequest<{ data: PatientProfile }>('/patients/me').then((r) => setProfile(r.data)).catch((e: Error) => setError(e.message)); }, []);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setSaved(false);
    const form = new FormData(event.currentTarget);
    try {
      const result = await apiRequest<{ data: PatientProfile }>('/patients/me', { method: 'PATCH', body: Object.fromEntries(form) });
      setProfile(result.data); setSaved(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save profile.'); }
  }
  if (!profile) return <main className="container page-shell"><p>{error || 'Loading profile…'}</p></main>;
  return <main className="container auth-shell"><section className="panel"><p className="eyebrow">Patient portal</p><h1>Your profile</h1><p className="muted">Account email: {profile.email}</p>
    <form className="stacked-form" onSubmit={save}>
      <label>Full name<input name="full_name" required minLength={2} maxLength={255} defaultValue={profile.full_name} /></label>
      <label>Phone<input name="phone" type="tel" minLength={7} maxLength={20} defaultValue={profile.phone || ''} /></label>
      <label>Date of birth<input name="date_of_birth" type="date" defaultValue={profile.date_of_birth || ''} /></label>
      <label>Gender<input name="gender" maxLength={50} defaultValue={profile.gender || ''} /></label>
      <label>Blood group<input name="blood_group" maxLength={10} defaultValue={profile.blood_group || ''} /></label>
      <label>Address<textarea name="address" maxLength={500} defaultValue={profile.address || ''} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}{saved && <p role="status">Profile saved.</p>}
      <button className="primary-button" type="submit">Save profile</button>
    </form></section></main>;
}
