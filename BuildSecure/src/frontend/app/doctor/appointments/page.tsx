'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { Appointment, AppointmentListing, displayTime } from '@/lib/appointments';

export default function DoctorAppointmentsPage() {
  const [listing, setListing] = useState<AppointmentListing | null>(null);
  const [period, setPeriod] = useState('upcoming');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function load(nextPage = page, nextPeriod = period, nextStatus = status) {
    try {
      const params = new URLSearchParams({ page: String(nextPage), limit: '20', period: nextPeriod });
      if (nextStatus) params.set('status', nextStatus);
      setListing(await apiRequest<AppointmentListing>(`/doctor/appointments?${params}`)); setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load your schedule.'); }
  }
  useEffect(() => {
    const params = new URLSearchParams({ page: '1', limit: '20', period: 'upcoming' });
    apiRequest<AppointmentListing>(`/doctor/appointments?${params}`).then(setListing).catch((e: Error) => setError(e.message));
  }, []);
  async function act(item: Appointment, action: 'confirm' | 'complete' | 'cancel') {
    try {
      await apiRequest(`/doctor/appointments/${item.id}/${action}`, { method: 'POST', body: {} });
      setNotice(`Appointment ${action === 'confirm' ? 'confirmed' : action === 'complete' ? 'completed' : 'cancelled'}.`); setError(''); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to update appointment.'); }
  }
  return <main className="container page-shell"><section className="panel"><p className="eyebrow">Doctor portal</p><h1>My schedule</h1>
    <div className="search-row"><label>Period<select value={period} onChange={(e) => { setPeriod(e.target.value); setPage(1); void load(1, e.target.value, status); }}><option value="upcoming">Upcoming</option><option value="history">History</option><option value="all">All</option></select></label><label>Status<select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); void load(1, period, e.target.value); }}><option value="">All statuses</option>{['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((value) => <option key={value}>{value}</option>)}</select></label></div>
    {notice && <p role="status">{notice}</p>}{error && <p role="alert" className="form-error">{error}</p>}
    <div className="table-wrap"><table><thead><tr><th>Patient</th><th>Start</th><th>End</th><th>Status</th><th>Reason</th><th>Actions</th></tr></thead><tbody>{listing?.data.map((item) => { const future = new Date(item.start_at).getTime() > Date.now(); const ended = new Date(item.end_at).getTime() <= Date.now(); return <tr key={item.id}><td>{item.patient?.full_name}</td><td>{displayTime(item.start_at)}</td><td>{displayTime(item.end_at)}</td><td>{item.status}</td><td>{item.reason}</td><td className="action-cell">{item.status === 'PENDING' && future && <button className="secondary-button" onClick={() => void act(item, 'confirm')}>Confirm</button>}{item.status === 'CONFIRMED' && ended && <button className="secondary-button" onClick={() => void act(item, 'complete')}>Complete</button>}{['PENDING', 'CONFIRMED'].includes(item.status) && future && <button className="secondary-button" onClick={() => void act(item, 'cancel')}>Cancel</button>}</td></tr>; })}</tbody></table></div>
    {!listing?.data.length && <p className="muted">No appointments match these filters.</p>}{listing && <div className="button-row"><button className="secondary-button" disabled={page <= 1} onClick={() => { const next = page - 1; setPage(next); void load(next); }}>Previous</button><span>Page {listing.pagination.page} of {listing.pagination.pages || 1} · {listing.pagination.total} appointments</span><button className="secondary-button" disabled={page >= listing.pagination.pages} onClick={() => { const next = page + 1; setPage(next); void load(next); }}>Next</button></div>}
  </section></main>;
}
