'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';

type Doctor = { id: number; full_name: string; specialization: string; experience_years: number | null; bio: string | null };
export default function DoctorDirectoryDetailPage() {
  const params = useParams<{ doctorId: string }>();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { apiRequest<{ data: Doctor }>(`/doctors/${encodeURIComponent(params.doctorId)}`).then((r) => setDoctor(r.data)).catch((e: Error) => setError(e.message)); }, [params.doctorId]);
  if (error) return <main className="container page-shell"><p role="alert">{error}</p><Link href="/patient/doctors">Back to directory</Link></main>;
  if (!doctor) return <main className="container page-shell"><p>Loading professional profile…</p></main>;
  return <main className="container page-shell"><article className="panel"><p className="eyebrow">Care team</p><h1>{doctor.full_name}</h1><h2>{doctor.specialization}</h2><p>{doctor.experience_years ?? '—'} years of experience</p><p>{doctor.bio || 'No biography provided.'}</p><Link href="/patient/doctors">Back to directory</Link></article></main>;
}
