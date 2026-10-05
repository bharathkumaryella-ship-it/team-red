'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';

type Patient = { id: number; full_name: string; email: string; phone: string | null; is_active: boolean };
type Listing = { data: Patient[]; pagination: { page: number; pages: number; total: number } };

export default function AdminPatientsPage() {
  const [listing, setListing] = useState<Listing | null>(null);
  const [query, setQuery] = useState(''); const [page, setPage] = useState(1); const [error, setError] = useState('');
  async function load(search = query, nextPage = page) {
    try { const params = new URLSearchParams({ search, page: String(nextPage), limit: '20' }); setListing(await apiRequest<Listing>(`/admin/patients?${params}`)); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load patients.'); }
  }
  useEffect(() => {
    const params = new URLSearchParams({ search: '', page: '1', limit: '20' });
    apiRequest<Listing>(`/admin/patients?${params}`).then(setListing).catch((e: Error) => setError(e.message));
  }, []);
  async function search(event: FormEvent) { event.preventDefault(); setPage(1); await load(query, 1); }
  async function setStatus(patient: Patient) {
    try { await apiRequest(`/admin/patients/${patient.id}/status`, { method: 'PATCH', body: { is_active: !patient.is_active } }); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to update status.'); }
  }
  return <main className="container page-shell"><section className="panel"><p className="eyebrow">Administration</p><h1>Patients</h1>
    <form className="search-row" onSubmit={search}><label className="sr-only" htmlFor="patient-search">Search patients</label><input id="patient-search" value={query} onChange={(e) => setQuery(e.target.value)} maxLength={100} placeholder="Name or email" /><button className="primary-button">Search</button></form>
    {error && <p role="alert" className="form-error">{error}</p>}
    <div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Actions</th></tr></thead><tbody>{listing?.data.map((patient) => <tr key={patient.id}><td><Link href={`/admin/patients/${patient.id}`}>{patient.full_name}</Link></td><td>{patient.email}</td><td>{patient.phone || '—'}</td><td>{patient.is_active ? 'Active' : 'Inactive'}</td><td><button className="secondary-button" onClick={() => void setStatus(patient)}>{patient.is_active ? 'Deactivate' : 'Reactivate'}</button></td></tr>)}</tbody></table></div>
    {listing && <div className="button-row"><button className="secondary-button" disabled={page <= 1} onClick={() => { const n = page - 1; setPage(n); void load(query, n); }}>Previous</button><span>Page {listing.pagination.page} of {listing.pagination.pages || 1} · {listing.pagination.total} patients</span><button className="secondary-button" disabled={page >= listing.pagination.pages} onClick={() => { const n = page + 1; setPage(n); void load(query, n); }}>Next</button></div>}
  </section></main>;
}
