'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { useToast } from '../../components/toast-provider';
import {
  User,
  Stethoscope,
  Phone,
  Mail,
  Award,
  Save,
  CheckCircle,
  FileCheck,
  ShieldCheck,
  Briefcase
} from 'lucide-react';

type DoctorProfile = {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  specialization: string;
  experience_years: number | null;
  bio: string | null;
  clinic_location: string | null;
  license_number: string;
  is_active: boolean;
};

export default function DoctorProfilePage() {
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { success, error: showError } = useToast();

  useEffect(() => {
    async function load() {
      try {
        const result = await apiRequest<{ data: DoctorProfile }>('/doctors/me');
        setProfile(result.data);
      } catch (e) {
        showError(e instanceof Error ? e.message : 'Unable to load doctor profile.');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [showError]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    const form = new FormData(event.currentTarget);
    const raw = Object.fromEntries(form);
    const body = {
      ...raw,
      experience_years: raw.experience_years === '' ? null : Number(raw.experience_years),
    };

    try {
      const result = await apiRequest<{ data: DoctorProfile }>('/doctors/me', {
        method: 'PATCH',
        body,
      });
      setProfile(result.data);
      success('Professional credentials and profile updated.');
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Unable to save profile changes.');
    } finally {
      setSaving(false);
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

  if (!profile) {
    return (
      <div className="page-container">
        <div className="card">
          <div className="card-body empty-state">
            <h3>Profile Record Not Found</h3>
            <p>Could not retrieve physician profile information.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <h1>Physician Profile & Credentials</h1>
          <p>Maintain your clinical specialization, professional biography, and patient contact preferences.</p>
        </div>
      </div>

      <div className="content-grid two-col" style={{ alignItems: 'start' }}>
        {/* Left Form: Edit Profile */}
        <div className="card">
          <div className="card-header">
            <h3>Professional Identity</h3>
          </div>
          <div className="card-body">
            <form className="stacked-form" onSubmit={save}>
              <div>
                <label>
                  <span className="form-label">
                    <User size={14} /> Full Legal Name *
                  </span>
                  <input
                    name="full_name"
                    required
                    minLength={2}
                    maxLength={255}
                    defaultValue={profile.full_name}
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label>
                    <span className="form-label">
                      <Mail size={14} /> Account Email
                    </span>
                    <input
                      type="email"
                      disabled
                      value={profile.email}
                      style={{ background: 'var(--color-bg)', color: 'var(--color-text-muted)', cursor: 'not-allowed' }}
                    />
                  </label>
                </div>

                <div>
                  <label>
                    <span className="form-label">
                      <Phone size={14} /> Contact Phone
                    </span>
                    <input
                      name="phone"
                      type="tel"
                      minLength={7}
                      maxLength={20}
                      defaultValue={profile.phone || ''}
                      placeholder="+1 (555) 000-0000"
                    />
                  </label>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label>
                    <span className="form-label">
                      <Stethoscope size={14} /> Specialization *
                    </span>
                    <input
                      name="specialization"
                      required
                      maxLength={255}
                      defaultValue={profile.specialization}
                      placeholder="e.g. Cardiology, Neurology"
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
                      defaultValue={profile.experience_years ?? ''}
                      placeholder="Years in practice"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label>
                  <span className="form-label">Professional Biography & Focus</span>
                  <textarea
                    name="bio"
                    maxLength={2000}
                    rows={4}
                    placeholder="Describe clinical background, research areas, and approach to care..."
                    defaultValue={profile.bio || ''}
                  />
                </label>
              </div>

              <div>
                <label>
                  <span className="form-label">Clinic Location</span>
                  <textarea name="clinic_location" maxLength={500} rows={2} defaultValue={profile.clinic_location || ''} placeholder="Clinic name, street address, city" />
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  type="submit"
                  disabled={saving}
                  className={`btn btn-primary ${saving ? 'btn-loading' : ''}`}
                >
                  <Save size={16} />
                  <span>{saving ? 'Updating...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Details: Credentials Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <div className="card-body" style={{ textAlign: 'center', padding: '32px 24px' }}>
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--color-primary) 0%, #0284c7 100%)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.75rem',
                  fontWeight: 800,
                  margin: '0 auto 16px'
                }}
              >
                {profile.full_name.charAt(0)}
              </div>
              <h3 style={{ margin: '0 0 4px 0' }}>Dr. {profile.full_name}</h3>
              <p style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.9rem', margin: '0 0 16px 0' }}>
                {profile.specialization}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span className={`badge ${profile.is_active ? 'badge-active' : 'badge-inactive'}`}>
                  {profile.is_active ? 'Active Clinical Staff' : 'Inactive'}
                </span>
                <span className="badge badge-confirmed">License: {profile.license_number}</span>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color="var(--color-success)" />
                <h3>Licensing Verification</h3>
              </div>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <Award size={16} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p className="text-sm" style={{ margin: 0 }}>
                  <strong>State Medical License:</strong> Assigned license number <code>{profile.license_number}</code> is verified under clinic compliance.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <FileCheck size={16} color="var(--color-success)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p className="text-sm" style={{ margin: 0 }}>
                  <strong>Practice Privileges:</strong> Active clinical authorization to review patient charts, order diagnostic tests, and issue signed prescriptions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
