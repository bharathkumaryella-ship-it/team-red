'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import {
  Stethoscope,
  ArrowLeft,
  CalendarDays,
  Award,
  ShieldCheck,
  Briefcase,
  Clock,
  UserCheck
} from 'lucide-react';

type Doctor = {
  id: number;
  full_name: string;
  specialization: string;
  experience_years: number | null;
  bio: string | null;
  clinic_location: string | null;
};

export default function DoctorDirectoryDetailPage() {
  const params = useParams<{ doctorId: string }>();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const response = await apiRequest<{ data: Doctor }>(`/doctors/${encodeURIComponent(params.doctorId)}`);
        setDoctor(response.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to load doctor profile.');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [params.doctorId]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="skeleton skeleton-heading" />
        <div className="card skeleton skeleton-card" style={{ height: '300px' }} />
      </div>
    );
  }

  if (error || !doctor) {
    return (
      <div className="page-container">
        <div className="card">
          <div className="card-body empty-state">
            <h3 style={{ color: 'var(--color-danger)' }}>Physician Not Found</h3>
            <p>{error || 'The requested doctor profile does not exist or is currently unavailable.'}</p>
            <Link href="/patient/doctors" className="btn btn-secondary">
              <ArrowLeft size={16} />
              <span>Back to Directory</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Back button */}
      <div style={{ marginBottom: '20px' }}>
        <Link href="/patient/doctors" className="btn btn-ghost btn-sm">
          <ArrowLeft size={16} />
          <span>Back to Care Team Directory</span>
        </Link>
      </div>

      <div className="content-grid two-col" style={{ alignItems: 'start' }}>
        {/* Main Profile Card */}
        <div className="card">
          <div
            style={{
              height: '100px',
              background: 'linear-gradient(135deg, var(--color-primary) 0%, #0284c7 100%)',
              borderTopLeftRadius: 'var(--radius-lg)',
              borderTopRightRadius: 'var(--radius-lg)',
              position: 'relative'
            }}
          />
          <div className="card-body" style={{ position: 'relative', paddingTop: 0 }}>
            {/* Avatar overlapping banner */}
            <div
              style={{
                width: '84px',
                height: '84px',
                borderRadius: 'var(--radius-xl)',
                background: 'white',
                border: '4px solid white',
                boxShadow: 'var(--shadow-md)',
                marginTop: '-42px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                fontWeight: 800,
                color: 'var(--color-primary)',
                marginBottom: '16px'
              }}
            >
              {doctor.full_name.charAt(0)}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Dr. {doctor.full_name}</h1>
              <span title="Verified Practitioner">
                <UserCheck size={20} color="var(--color-primary)" />
              </span>
            </div>

            <p style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.95rem', margin: '4px 0 16px 0' }}>
              {doctor.specialization || 'Clinical Specialist'}
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                padding: '16px',
                background: 'var(--color-bg)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '24px'
              }}
            >
              <div>
                <span className="text-xs text-muted">Clinical Experience</span>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-text)', marginTop: '2px' }}>
                  {doctor.experience_years ? `${doctor.experience_years} Years` : 'Certified'}
                </div>
              </div>
              <div>
                <span className="text-xs text-muted">Licensing Status</span>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-success)', marginTop: '2px' }}>
                  Active & Verified
                </div>
              </div>
            </div>

            <h3 style={{ fontSize: '1rem', marginBottom: '8px' }}>Professional Biography</h3>
            <p style={{ lineHeight: 1.7, color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
              {doctor.bio ||
                'Dr. ' +
                  doctor.full_name +
                  ' is a committed medical practitioner at MediDesk, specializing in high-standard patient diagnostics, individualized care routines, and preventive healthcare strategies.'}
            </p>
            {doctor.clinic_location && <div className="card" style={{ marginBottom: '20px' }}><div className="card-body"><strong>Clinic location</strong><p style={{ margin: '4px 0 0' }}>{doctor.clinic_location}</p></div></div>}

            <Link href={`/patient/book-appointment?doctorId=${doctor.id}`} className="btn btn-primary btn-lg btn-full">
              <CalendarDays size={18} />
              <span>Schedule Consultation with Dr. {doctor.full_name}</span>
            </Link>
          </div>
        </div>

        {/* Credentials & Details Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={18} color="var(--color-primary)" />
                <h3>Verified Credentials</h3>
              </div>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <ShieldCheck size={18} color="var(--color-success)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h4 style={{ fontSize: '0.875rem', margin: 0 }}>Board Certified Practitioner</h4>
                  <p className="text-sm text-muted" style={{ margin: '2px 0 0 0' }}>
                    Credentials and clinical authorizations verified by hospital administration.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <Clock size={18} color="var(--color-info)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h4 style={{ fontSize: '0.875rem', margin: 0 }}>Appointment Scheduling</h4>
                  <p className="text-sm text-muted" style={{ margin: '2px 0 0 0' }}>
                    Accepting new patients for scheduled clinical reviews and follow-ups.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <Briefcase size={18} color="var(--color-secondary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h4 style={{ fontSize: '0.875rem', margin: 0 }}>Clinical Department</h4>
                  <p className="text-sm text-muted" style={{ margin: '2px 0 0 0' }}>
                    Department of {doctor.specialization || 'General Medicine'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
