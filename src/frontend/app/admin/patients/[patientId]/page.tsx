'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import {
  User,
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Heart,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  FileText
} from 'lucide-react';

type Patient = {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  blood_group: string | null;
  address: string | null;
  is_active: boolean;
};

export default function AdminPatientDetailPage() {
  const params = useParams<{ patientId: string }>();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const response = await apiRequest<{ data: Patient }>(
          `/admin/patients/${encodeURIComponent(params.patientId)}`
        );
        setPatient(response.data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unable to load patient records.');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [params.patientId]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="skeleton skeleton-heading" />
        <div className="card skeleton skeleton-card" style={{ height: '300px' }} />
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="page-container">
        <div className="card">
          <div className="card-body empty-state">
            <h3 style={{ color: 'var(--color-danger)' }}>Patient Record Not Found</h3>
            <p>{error || 'The requested patient profile does not exist.'}</p>
            <Link href="/admin/patients" className="btn btn-secondary">
              <ArrowLeft size={16} />
              <span>Back to Patients</span>
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
        <Link href="/admin/patients" className="btn btn-ghost btn-sm">
          <ArrowLeft size={16} />
          <span>Back to Patients List</span>
        </Link>
      </div>

      <div className="content-grid two-col" style={{ alignItems: 'start' }}>
        {/* Main Details Card */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={18} color="var(--color-primary)" />
              <h2>Patient Record: {patient.full_name}</h2>
            </div>
            <span className={`badge ${patient.is_active ? 'badge-active' : 'badge-inactive'}`}>
              {patient.is_active ? 'Active Account' : 'Deactivated'}
            </span>
          </div>

          <div className="card-body">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '16px',
                marginBottom: '20px'
              }}
            >
              <div>
                <span className="text-xs text-muted">Full Legal Name</span>
                <p style={{ fontWeight: 600, margin: '2px 0 0 0' }}>{patient.full_name}</p>
              </div>

              <div>
                <span className="text-xs text-muted">Account Email</span>
                <p style={{ fontWeight: 600, margin: '2px 0 0 0' }}>{patient.email}</p>
              </div>

              <div>
                <span className="text-xs text-muted">Phone Number</span>
                <p style={{ fontWeight: 500, margin: '2px 0 0 0' }}>{patient.phone || '—'}</p>
              </div>

              <div>
                <span className="text-xs text-muted">Date of Birth</span>
                <p style={{ fontWeight: 500, margin: '2px 0 0 0' }}>{patient.date_of_birth || '—'}</p>
              </div>

              <div>
                <span className="text-xs text-muted">Gender</span>
                <p style={{ fontWeight: 500, margin: '2px 0 0 0' }}>{patient.gender || '—'}</p>
              </div>

              <div>
                <span className="text-xs text-muted">Blood Group</span>
                <p style={{ fontWeight: 600, color: 'var(--color-danger)', margin: '2px 0 0 0' }}>
                  {patient.blood_group || '—'}
                </p>
              </div>
            </div>

            <div>
              <span className="text-xs text-muted">Residential Address</span>
              <p
                style={{
                  background: 'var(--color-bg)',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  margin: '4px 0 0 0',
                  fontSize: '0.875rem'
                }}
              >
                {patient.address || 'No residential address on file.'}
              </p>
            </div>
          </div>
        </div>

        {/* Security & Access Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color="var(--color-success)" />
                <h3>Account Governance</h3>
              </div>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <FileText size={16} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p className="text-sm" style={{ margin: 0 }}>
                  <strong>Patient ID #{patient.id}:</strong> Demographic and contact records are encrypted in the central hospital database.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                {patient.is_active ? (
                  <ShieldCheck size={16} color="var(--color-success)" style={{ flexShrink: 0, marginTop: '2px' }} />
                ) : (
                  <ShieldAlert size={16} color="var(--color-danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
                )}
                <p className="text-sm" style={{ margin: 0 }}>
                  <strong>Authentication Access:</strong> Account is currently{' '}
                  {patient.is_active ? 'authorized to log in and book consultations.' : 'suspended from accessing the patient portal.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
