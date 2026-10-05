'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { Appointment, AppointmentListing, AppointmentStatus, displayTime } from '@/lib/appointments';

export default function AdminAppointmentsPage() {
  const [listing, setListing] = useState<AppointmentListing | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<Appointment | null>(null);
  async function load(nextPage = page) {
    try {
      const params = new URLSearchParams({ page: String(nextPage), limit: '20' });
      if (search.trim()) params.set('search', search.trim());
      if (status) params.set('status', status);
      if (doctorId.trim()) params.set('doctor_id', doctorId.trim());
      if (date) params.set('date', date);
      setListing(await apiRequest<AppointmentListing>(`/admin/appointments?${params}`)); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load appointments.'); }
  }
  useEffect(() => {
    const params = new URLSearchParams({ page: '1', limit: '20' });
    apiRequest<AppointmentListing>(`/admin/appointments?${params}`).then(setListing).catch((e: Error) => setError(e.message));
  }, []);
  async function submit(event: FormEvent) { event.preventDefault(); setPage(1); await load(1); }
  async function open(item: Appointment) {
    try { const response = await apiRequest<{ data: Appointment }>(`/admin/appointments/${item.id}`); setDetail(response.data); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load appointment detail.'); }
  }
  async function setAppointmentStatus(item: Appointment, next: AppointmentStatus) {
    try { await apiRequest(`/admin/appointments/${item.id}/status`, { method: 'PATCH', body: { status: next } }); await load(); if (detail?.id === item.id) await open(item); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to update appointment.'); }
  }
  return <main className="container page-shell"><section className="panel"><p className="eyebrow">Administration</p><h1>Appointments</h1>
    <form className="search-row" onSubmit={submit}><label>Search patient or doctor<input value={search} maxLength={100} onChange={(e) => setSearch(e.target.value)} /></label><label>Status<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as AppointmentStatus[]).map((value) => <option key={value}>{value}</option>)}</select></label><label>Doctor ID<input inputMode="numeric" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} /></label><label>Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label><button className="primary-button">Search</button></form>
    {error && <p role="alert" className="form-error">{error}</p>}
    <div className="table-wrap"><table><thead><tr><th>Patient</th><th>Doctor</th><th>Start</th><th>Status</th><th>Actions</th></tr></thead><tbody>{listing?.data.map((item) => <tr key={item.id}><td>{item.patient?.full_name}</td><td>{item.doctor.full_name}</td><td>{displayTime(item.start_at)}</td><td>{item.status}</td><td className="action-cell"><button className="secondary-button" onClick={() => void open(item)}>Details</button><select aria-label={`Change status for appointment ${item.id}`} value={item.status} onChange={(e) => void setAppointmentStatus(item, e.target.value as AppointmentStatus)}><option>{item.status}</option>{item.status === 'PENDING' && <option value="CONFIRMED">CONFIRMED</option>}{['PENDING', 'CONFIRMED'].includes(item.status) && new Date(item.start_at).getTime() > Date.now() && <option value="CANCELLED">CANCELLED</option>}{item.status === 'CONFIRMED' && new Date(item.end_at).getTime() <= Date.now() && <option value="COMPLETED">COMPLETED</option>}</select></td></tr>)}</tbody></table></div>
    {listing && <div className="button-row"><button className="secondary-button" disabled={page <= 1} onClick={() => { const next = page - 1; setPage(next); void load(next); }}>Previous</button><span>Page {listing.pagination.page} of {listing.pagination.pages || 1} · {listing.pagination.total} appointments</span><button className="secondary-button" disabled={page >= listing.pagination.pages} onClick={() => { const next = page + 1; setPage(next); void load(next); }}>Next</button></div>}
    {detail && <article className="info-card"><h2>Appointment #{detail.id}</h2><dl className="details-grid"><dt>Patient</dt><dd>{detail.patient?.full_name}</dd><dt>Doctor</dt><dd>{detail.doctor.full_name} · {detail.doctor.specialization}</dd><dt>Start</dt><dd>{displayTime(detail.start_at)}</dd><dt>End</dt><dd>{displayTime(detail.end_at)}</dd><dt>Status</dt><dd>{detail.status}</dd></dl><button className="secondary-button" onClick={() => setDetail(null)}>Close details</button></article>}
  </section></main>;
}
