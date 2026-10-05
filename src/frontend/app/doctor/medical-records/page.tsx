'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { Appointment, AppointmentListing } from '@/lib/appointments';

type RecordItem = { id: number; appointment_id: number; diagnosis: string; notes: string | null; prescription: string | null; patient: { id: number; full_name: string } };
type RecordListing = { data: RecordItem[]; pagination: { page: number; pages: number; total: number } };

export default function DoctorMedicalRecordsPage() {
  const [records, setRecords] = useState<RecordListing | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selected, setSelected] = useState<RecordItem | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function load() {
    try {
      const [recordResult, appointmentResult] = await Promise.all([
        apiRequest<RecordListing>('/doctor/medical-records'),
        apiRequest<AppointmentListing>('/doctor/appointments?status=COMPLETED&limit=100'),
      ]);
      setRecords(recordResult);
      const existing = new Set(recordResult.data.map((record) => record.appointment_id));
      setAppointments(appointmentResult.data.filter((item) => !existing.has(item.id)));
      setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load medical records.'); }
  }
  useEffect(() => { void load(); }, []);
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    try {
      await apiRequest('/medical-records', { method: 'POST', body: { appointment_id: Number(form.get('appointment_id')), diagnosis: form.get('diagnosis'), notes: form.get('notes'), prescription: form.get('prescription') } });
      event.currentTarget.reset(); setNotice('Medical record created.'); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to create record.'); }
  }
  async function open(id: number) {
    try { const result = await apiRequest<{ data: RecordItem }>(`/doctor/medical-records/${id}`); setSelected(result.data); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load record.'); }
  }
  async function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return; const form = new FormData(event.currentTarget);
    try {
      const result = await apiRequest<{ data: RecordItem }>(`/doctor/medical-records/${selected.id}`, { method: 'PATCH', body: { diagnosis: form.get('diagnosis'), notes: form.get('notes'), prescription: form.get('prescription') } });
      setSelected(result.data); setNotice('Medical record updated.'); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to update record.'); }
  }
  return <main className="container page-shell"><section className="panel"><p className="eyebrow">Doctor portal</p><h1>Medical records</h1>
    {error && <p className="form-error" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    <h2>New record from completed appointment</h2>
    <form className="stack-form" onSubmit={create}><label>Completed appointment<select name="appointment_id" required defaultValue=""><option value="" disabled>Select an appointment</option>{appointments.map((item) => <option key={item.id} value={item.id}>#{item.id} · {item.patient?.full_name || 'Patient'} · {new Date(item.start_at).toLocaleString()}</option>)}</select></label>
      <label>Diagnosis<textarea name="diagnosis" required maxLength={2000} /></label><label>Notes<textarea name="notes" maxLength={10000} /></label><label>Prescription<textarea name="prescription" maxLength={5000} /></label><button className="primary-button" disabled={!appointments.length}>Create record</button></form>
    <h2>Existing records</h2><ul className="record-list">{records?.data.map((record) => <li key={record.id}><button className="secondary-button" onClick={() => void open(record.id)}>Record #{record.id} · {record.patient.full_name}</button><p>{record.diagnosis}</p></li>)}</ul>
    {selected && <form className="stack-form panel" onSubmit={update}><h2>Edit record #{selected.id} · {selected.patient.full_name}</h2><label>Diagnosis<textarea name="diagnosis" required maxLength={2000} defaultValue={selected.diagnosis} /></label><label>Notes<textarea name="notes" maxLength={10000} defaultValue={selected.notes || ''} /></label><label>Prescription<textarea name="prescription" maxLength={5000} defaultValue={selected.prescription || ''} /></label><button className="primary-button">Save changes</button></form>}
  </section></main>;
}
