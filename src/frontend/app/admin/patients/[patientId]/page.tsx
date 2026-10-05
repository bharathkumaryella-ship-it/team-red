'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';

type Patient = { id: number; full_name: string; email: string; phone: string | null; date_of_birth: string | null; gender: string | null; blood_group: string | null; address: string | null; is_active: boolean };
export default function AdminPatientDetailPage() {
  const params = useParams<{ patientId: string }>(); const [patient, setPatient] = useState<Patient | null>(null); const [error, setError] = useState('');
  useEffect(() => { apiRequest<{ data: Patient }>(`/admin/patients/${encodeURIComponent(params.patientId)}`).then((r) => setPatient(r.data)).catch((e: Error) => setError(e.message)); }, [params.patientId]);
  if (error) return <main className="container page-shell"><p role="alert">{error}</p><Link href="/admin/patients">Back</Link></main>;
  if (!patient) return <main className="container page-shell"><p>Loading patient…</p></main>;
  return <main className="container page-shell"><article className="panel"><p className="eyebrow">Administration · Patient record</p><h1>{patient.full_name}</h1><dl className="details-grid"><dt>Email</dt><dd>{patient.email}</dd><dt>Phone</dt><dd>{patient.phone || '—'}</dd><dt>Date of birth</dt><dd>{patient.date_of_birth || '—'}</dd><dt>Gender</dt><dd>{patient.gender || '—'}</dd><dt>Blood group</dt><dd>{patient.blood_group || '—'}</dd><dt>Address</dt><dd>{patient.address || '—'}</dd><dt>Account</dt><dd>{patient.is_active ? 'Active' : 'Inactive'}</dd></dl><Link href="/admin/patients">Back to patients</Link></article></main>;
}
