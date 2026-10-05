'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiRequest } from '@/lib/api';
import { useToast } from '../../../components/toast-provider';
import {
  UserCog,
  ArrowLeft,
  Mail,
  Phone,
  Stethoscope,
  Award,
  Briefcase,
  ShieldCheck,
  Save,
  UserCheck,
  UserX
} from 'lucide-react';

type Doctor = {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  specialization: string;
  experience_years: number | null;
  bio: string | null;
  license_number: string;
  is_active: boolean;
};

export default function AdminDoctorDetailPage() {
  const params = useParams<{ doctorId: string }>();
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const { success, error: showError } = useToast();

  useEffect(() => {
    async function load() {
      try {
        const response = await apiRequest<{ data: Doctor }>(
          `/admin/doctors/${encodeURIComponent(params.doctorId)}`
        );
        setDoctor(response.data);
      } catch (e) {
        showError(e instanceof Error ? e.message : 'Unable to load doctor profile.');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [params.doctorId, showError]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!doctor) return;
    setSaving(true);
    const raw = Object.fromEntries(new FormData(event.currentTarget));
    const body = {
      ...raw,
      experience_years: raw.experience_years === '' ? null : Number(raw.experience_years),
    };

    try {
      const result = await apiRequest<{ data: Doctor }>(`/admin/doctors/${doctor.id}`, {
        method: 'PATCH',
        body,
      });
      setDoctor(result.data);
      success('Physician profile changes saved successfully.');
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Unable to save doctor profile.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus() {
    if (!doctor) return;
    setToggling(true);
    const nextStatus = !doctor.is_active;
    try {
      await apiRequest(`/admin/doctors/${doctor.id}/status`, {
        method: 'PATCH',
        body: { is_active: nextStatus },
      });
      setDoctor({ ...doctor, is_active: nextStatus });
      success(`Doctor account ${nextStatus ? 'reactivated' : 'deactivated'}.`);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Unable to change account status.');
    } finally {
      setToggling(false);
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="skeleton skeleton-heading" />
        <div className="card skeleton skeleton-card" style={{ height: '350px' }} />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="page-container">
        <div className="card">
          <div className="card-body empty-state">
            <h3 style={{ color: 'var(--color-danger)' }}>Physician Not Found</h3>
            <p>Could not retrieve doctor profile records.</p>
            <Link href="/admin/doctors" className="btn btn-secondary">
              <ArrowLeft size={16} />
              <span>Back to Doctors</span>
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
        <Link href="/admin/doctors" className="btn btn-ghost btn-sm">
          <ArrowLeft size={16} />
          <span>Back to Care Team Directory</span>
        </Link>
      </div>

      <div className="content-grid two-col" style={{ alignItems: 'start' }}>
        {/* Left Form: Edit Doctor */}
        <div className="card">
          <div className="card-header">
            <h3>Edit Physician Profile</h3>
            <span className={`badge ${doctor.is_active ? 'badge-active' : 'badge-inactive'}`}>
              {doctor.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="card-body">
            <form className="stacked-form" onSubmit={save}>
              <div>
                <label>
                  <span className="form-label">Full Name *</span>
                  <input
                    name="full_name"
                    required
                    minLength={2}
                    maxLength={255}
                    defaultValue={doctor.full_name}
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label>
                  <span className="form-label">
                    <Mail size={14} /> Account Email *
                  </span>
                  <input
                    name="email"
                    type="email"
                    required
                    maxLength={255}
                    defaultValue={doctor.email}
                  />
                </label>

                <label>
                  <span className="form-label">
                    <Phone size={14} /> Contact Phone
                  </span>
                  <input
                    name="phone"
                    type="tel"
                    minLength={7}
                    maxLength={20}
                    defaultValue={doctor.phone || ''}
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label>
                  <span className="form-label">
                    <Stethoscope size={14} /> Specialization *
                  </span>
                  <input
                    name="specialization"
                    required
                    maxLength={255}
                    defaultValue={doctor.specialization}
                  />
                </label>

                <label>
                  <span className="form-label">
                    <Award size={14} /> License Number *
                  </span>
                  <input
                    name="license_number"
                    required
                    maxLength={100}
                    defaultValue={doctor.license_number}
                  />
                </label>
              </div>

              <div>
                <label>
                  <span className="form-label">
                    <Briefcase size={14} /> Years of Experience
                  </span>
                  <input
                    name="experience_years"
                    type="number"
                    min={0}
                    max={80}
                    defaultValue={doctor.experience_years ?? ''}
                  />
                </label>
              </div>

              <div>
                <label>
                  <span className="form-label">Professional Biography</span>
                  <textarea
                    name="bio"
                    maxLength={2000}
                    rows={4}
                    defaultValue={doctor.bio || ''}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                <button
                  type="button"
                  className={`btn ${doctor.is_active ? 'btn-danger' : 'btn-secondary'} btn-sm`}
                  disabled={toggling}
                  onClick={() => void toggleStatus()}
                >
                  {doctor.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                  <span>{doctor.is_active ? 'Deactivate Account' : 'Reactivate Account'}</span>
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className={`btn btn-primary ${saving ? 'btn-loading' : ''}`}
                >
                  <Save size={16} />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Details Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color="var(--color-success)" />
                <h3>Credential & Staff Verification</h3>
              </div>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Award size={16} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p className="text-sm" style={{ margin: 0 }}>
                  <strong>Verified License:</strong> License <code>{doctor.license_number}</code> is registered under active clinical jurisdiction.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <ShieldCheck size={16} color="var(--color-success)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p className="text-sm" style={{ margin: 0 }}>
                  <strong>Privileged Role:</strong> Member of <code>DOCTOR</code> role group. Authorized to author medical records and manage consultation slots.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
