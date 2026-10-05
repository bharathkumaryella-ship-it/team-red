'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';

type Doctor = { id: number; full_name: string; email: string; specialization: string; license_number: string; is_active: boolean };
type Listing = { data: Doctor[]; pagination: { page: number; pages: number; total: number } };

export default function AdminDoctorsPage() {
  const [listing, setListing] = useState<Listing | null>(null); const [query, setQuery] = useState(''); const [page, setPage] = useState(1); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  async function load(search = query, nextPage = page) {
    try { const params = new URLSearchParams({ search, page: String(nextPage), limit: '20' }); setListing(await apiRequest<Listing>(`/admin/doctors?${params}`)); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load doctors.'); }
  }
  useEffect(() => {
    const params = new URLSearchParams({ search: '', page: '1', limit: '20' });
    apiRequest<Listing>(`/admin/doctors?${params}`).then(setListing).catch((e: Error) => setError(e.message));
  }, []);
  async function search(event: FormEvent) { event.preventDefault(); setPage(1); await load(query, 1); }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setNotice(''); const formElement = event.currentTarget; const form = new FormData(formElement); const raw = Object.fromEntries(form);
    const body = { ...raw, experience_years: raw.experience_years ? Number(raw.experience_years) : null };
    try { await apiRequest('/admin/doctors', { method: 'POST', body }); formElement.reset(); setNotice('Doctor account created.'); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to create doctor.'); }
  }
  async function setStatus(doctor: Doctor) {
    try { await apiRequest(`/admin/doctors/${doctor.id}/status`, { method: 'PATCH', body: { is_active: !doctor.is_active } }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to update status.'); }
  }
  return <main className="container page-shell"><section className="panel"><p className="eyebrow">Administration</p><h1>Doctors</h1>
    <form className="search-row" onSubmit={search}><label className="sr-only" htmlFor="doctor-admin-search">Search doctors</label><input id="doctor-admin-search" value={query} onChange={(e) => setQuery(e.target.value)} maxLength={100} placeholder="Name, email, or specialty" /><button className="primary-button">Search</button></form>
    {error && <p role="alert" className="form-error">{error}</p>}{notice && <p role="status">{notice}</p>}
    <div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Specialty</th><th>License</th><th>Status</th><th>Actions</th></tr></thead><tbody>{listing?.data.map((doctor) => <tr key={doctor.id}><td><Link href={`/admin/doctors/${doctor.id}`}>{doctor.full_name}</Link></td><td>{doctor.email}</td><td>{doctor.specialization}</td><td>{doctor.license_number}</td><td>{doctor.is_active ? 'Active' : 'Inactive'}</td><td><button className="secondary-button" onClick={() => void setStatus(doctor)}>{doctor.is_active ? 'Deactivate' : 'Reactivate'}</button></td></tr>)}</tbody></table></div>
    {listing && <div className="button-row"><button className="secondary-button" disabled={page <= 1} onClick={() => { const n = page - 1; setPage(n); void load(query, n); }}>Previous</button><span>Page {listing.pagination.page} of {listing.pagination.pages || 1}</span><button className="secondary-button" disabled={page >= listing.pagination.pages} onClick={() => { const n = page + 1; setPage(n); void load(query, n); }}>Next</button></div>}
  </section>
  <section className="panel create-doctor"><p className="eyebrow">Staff access</p><h2>Create doctor account</h2><p className="muted">This creates a DOCTOR account and profile. ADMIN role assignment is not available here.</p>
    <form className="stacked-form" onSubmit={create}>
      <label>Full name<input name="full_name" required minLength={2} maxLength={255} /></label><label>Email<input name="email" type="email" required maxLength={255} /></label><label>Initial password<input name="password" type="password" required minLength={8} maxLength={128} autoComplete="new-password" /></label><label>Phone<input name="phone" type="tel" minLength={7} maxLength={20} /></label><label>Specialization<input name="specialization" required maxLength={255} /></label><label>License number<input name="license_number" required maxLength={100} /></label><label>Years of experience<input name="experience_years" type="number" min={0} max={80} /></label><label>Professional bio<textarea name="bio" maxLength={2000} /></label><button className="primary-button" type="submit">Create doctor</button>
    </form>
  </section></main>;
}
