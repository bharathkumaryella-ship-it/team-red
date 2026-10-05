'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { useToast } from '../../components/toast-provider';
import {
  UserCog,
  Search,
  Plus,
  UserCheck,
  UserX,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Save,
  Lock,
  Mail,
  Phone,
  Briefcase,
  Award
} from 'lucide-react';

type Doctor = {
  id: number;
  full_name: string;
  email: string;
  specialization: string;
  license_number: string;
  is_active: boolean;
};

type Listing = { data: Doctor[]; pagination: { page: number; pages: number; total: number } };

export default function AdminDoctorsPage() {
  const [listing, setListing] = useState<Listing | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const { success, error: showError } = useToast();

  async function load(search = query, nextPage = page) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, page: String(nextPage), limit: '20' });
      const data = await apiRequest<Listing>(`/admin/doctors?${params}`);
      setListing(data);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Unable to load doctors.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load('', 1);
  }, []);

  async function search(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    await load(query, 1);
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const raw = Object.fromEntries(form);
    const body = {
      ...raw,
      experience_years: raw.experience_years ? Number(raw.experience_years) : null,
    };

    try {
      await apiRequest('/admin/doctors', { method: 'POST', body });
      formElement.reset();
      success('Doctor account provisioned successfully.');
      await load();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Unable to create doctor account.');
    } finally {
      setCreating(false);
    }
  }

  async function setStatus(doctor: Doctor) {
    setTogglingId(doctor.id);
    const nextStatus = !doctor.is_active;
    try {
      await apiRequest(`/admin/doctors/${doctor.id}/status`, {
        method: 'PATCH',
        body: { is_active: nextStatus },
      });
      success(`Dr. ${doctor.full_name}'s account ${nextStatus ? 'reactivated' : 'deactivated'}.`);
      await load();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Unable to update doctor status.');
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <h1>Physician Staff Oversight</h1>
          <p>Manage medical specialists, verify clinical credentials, and provision doctor accounts.</p>
        </div>
      </div>

      {/* Main Grid: Directory on Left / Provisioning on Right */}
      <div className="content-grid two-col" style={{ alignItems: 'start' }}>
        {/* Left Column: Staff Directory */}
        <div className="card">
          <div className="card-header">
            <h3>Medical Staff Directory</h3>
          </div>

          <div style={{ padding: '16px 24px 0' }}>
            <form onSubmit={search} style={{ display: 'flex', gap: '8px' }}>
              <div className="search-input-wrap">
                <Search size={16} />
                <input
                  id="doctor-admin-search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  maxLength={100}
                  placeholder="Search by name, email, or specialty..."
                />
              </div>
              <button type="submit" className="btn btn-primary btn-sm">
                Search
              </button>
            </form>
          </div>

          <div className="card-body">
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="skeleton skeleton-row" />
                <div className="skeleton skeleton-row" />
                <div className="skeleton skeleton-row" />
              </div>
            ) : !listing?.data || listing.data.length === 0 ? (
              <div className="empty-state" style={{ padding: '36px 16px' }}>
                <div className="empty-state-icon">
                  <UserCog />
                </div>
                <h3>No doctors found</h3>
                <p>No physician profiles match the specified query.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {listing.data.map((doctor) => (
                  <div
                    key={doctor.id}
                    style={{
                      padding: '16px',
                      background: 'var(--color-bg)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border-light)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: 'var(--radius-md)',
                            background: 'var(--color-primary-light)',
                            color: 'var(--color-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.85rem'
                          }}
                        >
                          {doctor.full_name.charAt(0)}
                        </div>
                        <div>
                          <Link
                            href={`/admin/doctors/${doctor.id}`}
                            style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: '0.95rem' }}
                          >
                            Dr. {doctor.full_name}
                          </Link>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)' }}>
                            {doctor.specialization} · License: <code>{doctor.license_number}</code>
                          </div>
                        </div>
                      </div>

                      <span className={`badge ${doctor.is_active ? 'badge-active' : 'badge-inactive'}`}>
                        {doctor.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span className="text-xs text-muted">{doctor.email}</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Link
                          href={`/admin/doctors/${doctor.id}`}
                          className="btn btn-secondary btn-sm"
                        >
                          Edit Profile
                        </Link>
                        <button
                          type="button"
                          className={`btn ${doctor.is_active ? 'btn-danger' : 'btn-secondary'} btn-sm`}
                          disabled={togglingId === doctor.id}
                          onClick={() => void setStatus(doctor)}
                        >
                          {togglingId === doctor.id
                            ? '...'
                            : doctor.is_active
                            ? 'Deactivate'
                            : 'Reactivate'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {listing.pagination && (
                  <div className="pagination" style={{ padding: '12px 0 0 0', borderTop: 'none' }}>
                    <span className="text-xs text-muted">
                      Page {listing.pagination.page} of {listing.pagination.pages || 1}
                    </span>
                    <div className="pagination-controls">
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={page <= 1}
                        onClick={() => {
                          const n = page - 1;
                          setPage(n);
                          void load(query, n);
                        }}
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={page >= listing.pagination.pages}
                        onClick={() => {
                          const n = page + 1;
                          setPage(n);
                          void load(query, n);
                        }}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Provision Doctor Account */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} color="var(--color-primary)" />
              <h3>Provision Physician Account</h3>
            </div>
          </div>
          <div className="card-body">
            <p className="text-sm text-muted" style={{ marginBottom: '18px' }}>
              Creates a verified DOCTOR user account with clinical privileges and licensing records.
            </p>

            <form className="stacked-form" onSubmit={create}>
              <div>
                <label>
                  <span className="form-label">Full Name *</span>
                  <input name="full_name" required minLength={2} maxLength={255} placeholder="Dr. Jane Doe" />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <label>
                  <span className="form-label">
                    <Mail size={14} /> Staff Email *
                  </span>
                  <input name="email" type="email" required maxLength={255} placeholder="doctor@clinic.com" />
                </label>

                <label>
                  <span className="form-label">
                    <Lock size={14} /> Initial Password *
                  </span>
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    placeholder="Min 8 characters"
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <label>
                  <span className="form-label">
                    <Phone size={14} /> Contact Phone
                  </span>
                  <input name="phone" type="tel" minLength={7} maxLength={20} placeholder="+1 555-0100" />
                </label>

                <label>
                  <span className="form-label">
                    <Stethoscope size={14} /> Specialization *
                  </span>
                  <input name="specialization" required maxLength={255} placeholder="e.g. Pediatrics" />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <label>
                  <span className="form-label">
                    <Award size={14} /> License Number *
                  </span>
                  <input name="license_number" required maxLength={100} placeholder="MD-XXXX-XXXX" />
                </label>

                <label>
                  <span className="form-label">
                    <Briefcase size={14} /> Years Experience
                  </span>
                  <input name="experience_years" type="number" min={0} max={80} placeholder="5" />
                </label>
              </div>

              <div>
                <label>
                  <span className="form-label">Professional Biography</span>
                  <textarea name="bio" maxLength={2000} rows={3} placeholder="Physician credentials and background..." />
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button
                  type="submit"
                  disabled={creating}
                  className={`btn btn-primary ${creating ? 'btn-loading' : ''}`}
                >
                  <Save size={16} />
                  <span>{creating ? 'Provisioning...' : 'Provision Doctor'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
