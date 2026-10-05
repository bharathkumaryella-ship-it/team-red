'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';

type Doctor = { id: number; full_name: string; specialization: string; experience_years: number | null; bio: string | null };
type Listing = { data: Doctor[]; pagination: { page: number; pages: number; total: number } };

export default function DoctorDirectoryPage() {
  const [listing, setListing] = useState<Listing | null>(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  async function load(search = query, nextPage = page) {
    try {
      const params = new URLSearchParams({ search, page: String(nextPage), limit: '10' });
      setListing(await apiRequest<Listing>(`/doctors?${params}`)); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load doctors.'); }
  }
  useEffect(() => {
    const params = new URLSearchParams({ search: '', page: '1', limit: '10' });
    apiRequest<Listing>(`/doctors?${params}`).then(setListing).catch((e: Error) => setError(e.message));
  }, []);
  async function search(event: FormEvent) { event.preventDefault(); setPage(1); await load(query, 1); }
  return <main className="container page-shell"><section className="panel"><p className="eyebrow">Care team</p><h1>Find a doctor</h1>
    <form className="search-row" onSubmit={search}><label className="sr-only" htmlFor="doctor-search">Search doctors</label><input id="doctor-search" value={query} onChange={(e) => setQuery(e.target.value)} maxLength={100} placeholder="Name or specialty" /><button className="primary-button">Search</button></form>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="grid two-up">{listing?.data.map((doctor) => <article className="info-card" key={doctor.id}><h2>{doctor.full_name}</h2><p>{doctor.specialization}</p><p className="muted">{doctor.experience_years ?? '—'} years experience</p><p>{doctor.bio}</p><Link href={`/patient/doctors/${doctor.id}`}>View professional profile</Link></article>)}</div>
    {listing && <div className="button-row"><button className="secondary-button" disabled={page <= 1} onClick={() => { const next = page - 1; setPage(next); void load(query, next); }}>Previous</button><span>Page {listing.pagination.page} of {listing.pagination.pages || 1}</span><button className="secondary-button" disabled={page >= listing.pagination.pages} onClick={() => { const next = page + 1; setPage(next); void load(query, next); }}>Next</button></div>}
  </section></main>;
}
