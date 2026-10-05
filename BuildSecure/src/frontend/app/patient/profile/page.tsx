'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { useToast } from '../../components/toast-provider';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Heart,
  MapPin,
  ShieldCheck,
  Save,
  CheckCircle,
  FileCheck
} from 'lucide-react';

type PatientProfile = {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: string | null;
  blood_group: string | null;
  address: string | null;
};

export default function PatientProfilePage() {
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { success, error: showError } = useToast();

  useEffect(() => {
    async function load() {
      try {
        const result = await apiRequest<{ data: PatientProfile }>('/patients/me');
        setProfile(result.data);
      } catch (e) {
        showError(e instanceof Error ? e.message : 'Unable to load profile.');
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
    const body = Object.fromEntries(form);

    try {
      const result = await apiRequest<{ data: PatientProfile }>('/patients/me', {
        method: 'PATCH',
        body
      });
      setProfile(result.data);
      success('Your profile details have been saved securely.');
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
            <h3>Profile Unavailable</h3>
            <p>Could not retrieve patient profile records.</p>
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
          <h1>Patient Profile</h1>
          <p>Manage your personal identification, contact channels, and emergency clinical metrics.</p>
        </div>
      </div>

      <div className="content-grid two-col" style={{ alignItems: 'start' }}>
        {/* Left Form Panel */}
        <div className="card">
          <div className="card-header">
            <h3>Personal & Medical Information</h3>
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
                <span className="text-xs text-muted" style={{ display: 'block', marginTop: '4px' }}>
                  Email address is linked to your authentication identity.
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label>
                  <span className="form-label">
                    <Phone size={14} /> Contact Phone
                  </span>
                  <input
                    name="phone"
                    type="tel"
                    minLength={7}
                    maxLength={20}
                    placeholder="+1 (555) 000-0000"
                    defaultValue={profile.phone || ''}
                  />
                </label>

                <label>
                  <span className="form-label">
                    <Calendar size={14} /> Date of Birth
                  </span>
                  <input
                    name="date_of_birth"
                    type="date"
                    defaultValue={profile.date_of_birth || ''}
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label>
                  <span className="form-label">Gender</span>
                  <select name="gender" defaultValue={profile.gender || ''}>
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-Binary">Non-Binary</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </label>

                <label>
                  <span className="form-label">
                    <Heart size={14} /> Blood Group
                  </span>
                  <select name="blood_group" defaultValue={profile.blood_group || ''}>
                    <option value="">Select blood group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                  </select>
                </label>
              </div>

              <div>
                <label>
                  <span className="form-label">
                    <MapPin size={14} /> Residential Address
                  </span>
                  <textarea
                    name="address"
                    maxLength={500}
                    rows={3}
                    placeholder="Enter current home or mailing address..."
                    defaultValue={profile.address || ''}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  type="submit"
                  disabled={saving}
                  className={`btn btn-primary ${saving ? 'btn-loading' : ''}`}
                >
                  <Save size={16} />
                  <span>{saving ? 'Saving Changes...' : 'Save Profile'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Details Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Patient Card */}
          <div className="card">
            <div className="card-body" style={{ textAlign: 'center', padding: '32px 24px' }}>
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--color-primary) 0%, #0ea5e9 100%)',
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
              <h3 style={{ margin: '0 0 4px 0' }}>{profile.full_name}</h3>
              <p className="text-sm text-muted" style={{ margin: '0 0 16px 0' }}>
                {profile.email}
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                <span className="badge badge-active">Active Patient</span>
                {profile.blood_group && (
                  <span className="badge badge-pending">Blood Group: {profile.blood_group}</span>
                )}
              </div>
            </div>
          </div>

          {/* Privacy & Compliance Assurance */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color="var(--color-success)" />
                <h3>Data Governance & Protection</h3>
              </div>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <FileCheck size={16} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p className="text-sm" style={{ margin: 0 }}>
                  <strong>HIPAA Regulated Storage:</strong> Your medical identifiers and demographic attributes are strictly isolated within high-integrity storage tiers.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <ShieldCheck size={16} color="var(--color-success)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p className="text-sm" style={{ margin: 0 }}>
                  <strong>Role-Based Access:</strong> Only attending doctors assigned to your active appointments can view clinical records.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
