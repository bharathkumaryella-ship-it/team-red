'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { AppointmentListing, AppointmentStatus, displayTime } from '@/lib/appointments';

type Result = AppointmentListing;

export default function PatientAppointmentsPage() {
  const [listing, setListing] = useState<Result | null>(null);
  const [status, setStatus] = useState('');
  const [period, setPeriod] = useState('all');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [detail, setDetail] = useState<AppointmentListing['data'][number] | null>(null);
  async function load(nextPage = page, nextStatus = status, nextPeriod = period) {
    try {
      const params = new URLSearchParams({ page: String(nextPage), limit: '20', period: nextPeriod });
      if (nextStatus) params.set('status', nextStatus);
      setListing(await apiRequest<Result>(`/appointments/my?${params}`));
      setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load appointments.'); }
  }
  useEffect(() => {
    const params = new URLSearchParams({ page: '1', limit: '20', period: 'all' });
    apiRequest<Result>(`/appointments/my?${params}`).then(setListing).catch((e: Error) => setError(e.message));
  }, []);
  async function cancel(id: number) {
    try {
      await apiRequest(`/appointments/${id}/cancel`, { method: 'POST', body: {} });
      setNotice('Appointment cancelled.'); setError(''); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to cancel appointment.'); }
  }
  async function openDetail(id: number) {
    try { const response = await apiRequest<{ data: AppointmentListing['data'][number] }>(`/appointments/${id}`); setDetail(response.data); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load appointment details.'); }
  }
  return <main className="container page-shell"><section className="panel"><p className="eyebrow">Patient portal</p><h1>My appointments</h1>
    <div className="search-row"><label>Status<select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); void load(1, e.target.value, period); }}><option value="">All statuses</option>{(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as AppointmentStatus[]).map((value) => <option key={value}>{value}</option>)}</select></label><label>Time period<select value={period} onChange={(e) => { setPeriod(e.target.value); setPage(1); void load(1, status, e.target.value); }}><option value="all">All</option><option value="upcoming">Upcoming</option><option value="history">History</option></select></label><Link className="primary-button" href="/patient/book-appointment">Book appointment</Link></div>
    {notice && <p role="status">{notice}</p>}{error && <p className="form-error" role="alert">{error}</p>}
    <div className="table-wrap"><table><thead><tr><th>Doctor</th><th>Specialty</th><th>Start</th><th>End</th><th>Status</th><th>Reason</th><th>Actions</th></tr></thead><tbody>{listing?.data.map((item) => <tr key={item.id}><td>{item.doctor.full_name}</td><td>{item.doctor.specialization || '—'}</td><td>{displayTime(item.start_at)}</td><td>{displayTime(item.end_at)}</td><td>{item.status}</td><td>{item.reason}</td><td><button className="secondary-button" onClick={() => void openDetail(item.id)}>Details</button>{['PENDING', 'CONFIRMED'].includes(item.status) && new Date(item.start_at).getTime() > Date.now() && <button className="secondary-button" onClick={() => void cancel(item.id)}>Cancel</button>}</td></tr>)}</tbody></table></div>
    {detail && <article className="info-card"><h2>Appointment #{detail.id}</h2><p>{detail.doctor.full_name} · {detail.doctor.specialization}</p><p>{displayTime(detail.start_at)} – {displayTime(detail.end_at)}</p><p>Status: {detail.status}</p><p>Reason: {detail.reason}</p><button className="secondary-button" onClick={() => setDetail(null)}>Close details</button></article>}
    {!listing?.data.length && <p className="muted">No appointments match these filters.</p>}
    {listing && <div className="button-row"><button className="secondary-button" disabled={page <= 1} onClick={() => { const next = page - 1; setPage(next); void load(next); }}>Previous</button><span>Page {listing.pagination.page} of {listing.pagination.pages || 1} · {listing.pagination.total} appointments</span><button className="secondary-button" disabled={page >= listing.pagination.pages} onClick={() => { const next = page + 1; setPage(next); void load(next); }}>Next</button></div>}
  </section></main>;
}
