'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiRequest } from '@/lib/api';

type Doctor = { id: number; full_name: string; email: string; phone: string | null; specialization: string; experience_years: number | null; bio: string | null; license_number: string; is_active: boolean };
export default function AdminDoctorDetailPage() {
  const params = useParams<{ doctorId: string }>(); const [doctor, setDoctor] = useState<Doctor | null>(null); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  useEffect(() => { apiRequest<{ data: Doctor }>(`/admin/doctors/${encodeURIComponent(params.doctorId)}`).then((r) => setDoctor(r.data)).catch((e: Error) => setError(e.message)); }, [params.doctorId]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!doctor) return; setError(''); setNotice(''); const raw = Object.fromEntries(new FormData(event.currentTarget));
    const body = { ...raw, experience_years: raw.experience_years === '' ? null : Number(raw.experience_years) };
    try { const result = await apiRequest<{ data: Doctor }>(`/admin/doctors/${doctor.id}`, { method: 'PATCH', body }); setDoctor(result.data); setNotice('Doctor profile saved.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to save doctor.'); }
  }
  async function toggleStatus() {
    if (!doctor) return;
    try { await apiRequest(`/admin/doctors/${doctor.id}/status`, { method: 'PATCH', body: { is_active: !doctor.is_active } }); setDoctor({ ...doctor, is_active: !doctor.is_active }); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to change account status.'); }
  }
  if (error && !doctor) return <main className="container page-shell"><p role="alert">{error}</p><Link href="/admin/doctors">Back</Link></main>;
  if (!doctor) return <main className="container page-shell"><p>Loading doctor…</p></main>;
  return <main className="container auth-shell"><section className="panel"><p className="eyebrow">Administration · Doctor account</p><h1>Edit doctor</h1><p className="muted">License number: {doctor.license_number} · {doctor.is_active ? 'Active' : 'Inactive'}</p>
    <form className="stacked-form" onSubmit={save}><label>Full name<input name="full_name" required minLength={2} maxLength={255} defaultValue={doctor.full_name} /></label><label>Email<input name="email" type="email" required maxLength={255} defaultValue={doctor.email} /></label><label>Phone<input name="phone" type="tel" minLength={7} maxLength={20} defaultValue={doctor.phone || ''} /></label><label>Specialization<input name="specialization" required maxLength={255} defaultValue={doctor.specialization} /></label><label>License number<input name="license_number" required maxLength={100} defaultValue={doctor.license_number} /></label><label>Years of experience<input name="experience_years" type="number" min={0} max={80} defaultValue={doctor.experience_years ?? ''} /></label><label>Professional bio<textarea name="bio" maxLength={2000} defaultValue={doctor.bio || ''} /></label>{error && <p className="form-error" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}<button className="primary-button">Save changes</button><button className="secondary-button" type="button" onClick={() => void toggleStatus()}>{doctor.is_active ? 'Deactivate account' : 'Reactivate account'}</button></form><Link href="/admin/doctors">Back to doctors</Link>
  </section></main>;
}
