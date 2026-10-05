'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';

type RecordItem = { id: number; appointment_id: number | null; diagnosis: string | null; notes: string | null; prescription: string | null; created_at: string; doctor: { full_name: string; specialization: string | null } };
type Listing = { data: RecordItem[]; pagination: { page: number; pages: number; total: number } };

export default function PatientMedicalRecordsPage() {
  const [listing, setListing] = useState<Listing | null>(null);
  const [selected, setSelected] = useState<RecordItem | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { apiRequest<Listing>('/patients/me/medical-records').then(setListing).catch((e: Error) => setError(e.message)); }, []);
  async function open(id: number) {
    try { const response = await apiRequest<{ data: RecordItem }>(`/medical-records/${id}`); setSelected(response.data); setError(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to load record.'); }
  }
  return <main className="container page-shell"><section className="panel"><p className="eyebrow">Patient portal</p><h1>My medical records</h1>
    {error && <p className="form-error" role="alert">{error}</p>}
    {!listing?.data.length && <p className="muted">No medical records are available.</p>}
    <ul className="record-list">{listing?.data.map((record) => <li key={record.id}><button className="secondary-button" onClick={() => void open(record.id)}>Record #{record.id} · {new Date(record.created_at).toLocaleDateString()}</button><p>{record.diagnosis}</p><p className="muted">Dr. {record.doctor.full_name} · {record.doctor.specialization || 'Doctor'}</p></li>)}</ul>
    {selected && <article className="panel" aria-live="polite"><h2>Record #{selected.id}</h2><p><strong>Diagnosis:</strong> {selected.diagnosis}</p><p><strong>Notes:</strong> {selected.notes || 'None'}</p><p><strong>Prescription:</strong> {selected.prescription || 'None'}</p><p className="muted">Recorded by Dr. {selected.doctor.full_name}</p></article>}
  </section></main>;
}
