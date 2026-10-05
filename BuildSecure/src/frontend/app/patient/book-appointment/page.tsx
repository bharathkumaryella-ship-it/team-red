'use client';

import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { Appointment } from '@/lib/appointments';

type Doctor = { id: number; full_name: string; specialization: string; experience_years: number | null };
type Doctors = { data: Doctor[]; pagination: { page: number; pages: number; total: number } };
type AppointmentResult = { data: Appointment };
type Availability = { data: { available: boolean } };

function asApiInstant(value: string) { return value ? new Date(value).toISOString() : ''; }

export default function BookAppointmentPage() {
  const [doctorList, setDoctorList] = useState<Doctors | null>(null);
  const [doctorQuery, setDoctorQuery] = useState('');
  const [doctorPage, setDoctorPage] = useState(1);
  const [doctorId, setDoctorId] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [reason, setReason] = useState('');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Appointment | null>(null);
  const loadDoctors = useCallback(async (search: string, page: number) => {
    try {
      const params = new URLSearchParams({ search, limit: '20', page: String(page) });
      setDoctorList(await apiRequest<Doctors>(`/doctors?${params}`));
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load doctors.'); }
  }, []);
  useEffect(() => { void loadDoctors('', 1); }, [loadDoctors]);
  async function checkAvailability() {
    setAvailable(null); setError('');
    try {
      const params = new URLSearchParams({ doctor_id: doctorId, start_at: asApiInstant(startAt), end_at: asApiInstant(endAt) });
      const response = await apiRequest<Availability>(`/appointments/availability?${params}`);
      setAvailable(response.data.available);
      if (!response.data.available) setError('That time is already booked. Choose another time.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to check availability.'); }
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setResult(null);
    try {
      const response = await apiRequest<AppointmentResult>('/appointments', { method: 'POST', body: { doctor_id: Number(doctorId), start_at: asApiInstant(startAt), end_at: asApiInstant(endAt), reason } });
      setResult(response.data); setAvailable(null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to book appointment.'); }
  }
  async function searchDoctors(event: FormEvent) { event.preventDefault(); setDoctorPage(1); await loadDoctors(doctorQuery, 1); }
  return <main className="container page-shell"><section className="panel"><p className="eyebrow">Patient portal</p><h1>Book an appointment</h1><p className="muted">Choose an active doctor and a future time. Times are sent to the server with your browser’s UTC offset and stored as UTC.</p>
    {error && <p className="form-error" role="alert">{error}</p>}{result && <p role="status">Request #{result.id} is pending confirmation. <Link href="/patient/appointments">View your appointments</Link>.</p>}
    <form className="search-row" onSubmit={searchDoctors}><label>Find a doctor<input value={doctorQuery} maxLength={100} onChange={(e) => setDoctorQuery(e.target.value)} placeholder="Name or specialty" /></label><button className="secondary-button">Search doctors</button></form>
    <form className="stacked-form" onSubmit={submit}><label>Doctor<select required value={doctorId} onChange={(e) => { setDoctorId(e.target.value); setAvailable(null); }}><option value="">Choose a doctor</option>{doctorList?.data.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.full_name} · {doctor.specialization}</option>)}</select></label>{doctorList && <div className="button-row"><button type="button" className="secondary-button" disabled={doctorPage <= 1} onClick={() => { const next = doctorPage - 1; setDoctorPage(next); void loadDoctors(doctorQuery, next); }}>Previous doctors</button><span>Page {doctorList.pagination.page} of {doctorList.pagination.pages || 1} · {doctorList.pagination.total} doctors</span><button type="button" className="secondary-button" disabled={doctorPage >= doctorList.pagination.pages} onClick={() => { const next = doctorPage + 1; setDoctorPage(next); void loadDoctors(doctorQuery, next); }}>Next doctors</button></div>}<label>Start time<input required type="datetime-local" value={startAt} onChange={(e) => { setStartAt(e.target.value); setAvailable(null); }} /></label><label>End time<input required type="datetime-local" value={endAt} onChange={(e) => { setEndAt(e.target.value); setAvailable(null); }} /></label><label>Reason<textarea required maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} /></label><div className="button-row"><button type="button" className="secondary-button" disabled={!doctorId || !startAt || !endAt} onClick={() => void checkAvailability()}>Check time</button><span>{available === true ? 'Time appears available; it is checked again during booking.' : available === false ? 'Time unavailable' : ''}</span><button className="primary-button">Request appointment</button></div></form>
  </section></main>;
}
