'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { useToast } from '../../components/toast-provider';
import {
  Stethoscope,
  Search,
  Award,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Briefcase
} from 'lucide-react';

type Doctor = {
  id: number;
  full_name: string;
  specialization: string;
  experience_years: number | null;
  bio: string | null;
  clinic_location: string | null;
};

type Listing = { data: Doctor[]; pagination: { page: number; pages: number; total: number } };

export default function DoctorDirectoryPage() {
  const [listing, setListing] = useState<Listing | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const { error: showError } = useToast();

  async function load(search = query, nextPage = page) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, page: String(nextPage), limit: '9' });
      const data = await apiRequest<Listing>(`/doctors?${params}`);
      setListing(data);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Unable to load care team directory.');
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

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <h1>Find a Doctor</h1>
          <p>Discover board-certified physicians, clinical specialists, and medical experts.</p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <form onSubmit={search} className="filter-bar">
        <div className="search-input-wrap">
          <Search size={16} />
          <input
            id="doctor-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={100}
            placeholder="Search by physician name or medical specialty (e.g. Cardiology, Pediatrics)..."
          />
        </div>
        <button type="submit" className="btn btn-primary">
          Search
        </button>
        {query && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setQuery('');
              setPage(1);
              void load('', 1);
            }}
          >
            Reset
          </button>
        )}
      </form>

      {/* Directory Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          <div className="card skeleton skeleton-card" />
          <div className="card skeleton skeleton-card" />
          <div className="card skeleton skeleton-card" />
        </div>
      ) : !listing?.data || listing.data.length === 0 ? (
        <div className="card">
          <div className="card-body empty-state">
            <div className="empty-state-icon">
              <Stethoscope />
            </div>
            <h3>No doctors found</h3>
            <p>We could not find any healthcare specialists matching your search query. Try searching for a broader specialty or check back later.</p>
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {listing.data.map((doctor) => (
              <div key={doctor.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: 'var(--radius-lg)',
                        background: 'linear-gradient(135deg, var(--color-primary-light) 0%, #dbeafe 100%)',
                        color: 'var(--color-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        flexShrink: 0
                      }}
                    >
                      {doctor.full_name.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          Dr. {doctor.full_name}
                        </h3>
                        <span title="Verified Physician">
                          <UserCheck size={16} color="var(--color-primary)" />
                        </span>
                      </div>
                      <div style={{ color: 'var(--color-primary)', fontWeight: 500, fontSize: '0.8125rem', marginTop: '2px' }}>
                        {doctor.specialization || 'General Practice'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                        <Briefcase size={12} />
                        <span>{doctor.experience_years ? `${doctor.experience_years} years experience` : 'Licensed Physician'}</span>
                      </div>
                    </div>
                  </div>

                  <p
                    style={{
                      fontSize: '0.8125rem',
                      color: 'var(--color-text-secondary)',
                      lineHeight: 1.5,
                      marginBottom: '16px',
                      flex: 1,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {doctor.bio || 'Dedicated clinical specialist committed to patient wellness, accurate diagnostics, and compassionate healthcare.'}
                  </p>
                  {doctor.clinic_location && <p className="text-sm text-muted" style={{ margin: '0 0 14px' }}>Clinic: {doctor.clinic_location}</p>}

                  <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
                    <Link
                      href={`/patient/doctors/${doctor.id}`}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1 }}
                    >
                      <span>View Profile</span>
                    </Link>
                    <Link
                      href={`/patient/book-appointment?doctorId=${doctor.id}`}
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                    >
                      <span>Book Visit</span>
                      <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {listing.pagination && (
            <div className="pagination" style={{ marginTop: '24px', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border-light)' }}>
              <span>
                Page {listing.pagination.page} of {listing.pagination.pages || 1} ({listing.pagination.total} registered doctors)
              </span>
              <div className="pagination-controls">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={page <= 1}
                  onClick={() => {
                    const next = page - 1;
                    setPage(next);
                    void load(query, next);
                  }}
                >
                  <ChevronLeft size={16} />
                  <span>Previous</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={page >= listing.pagination.pages}
                  onClick={() => {
                    const next = page + 1;
                    setPage(next);
                    void load(query, next);
                  }}
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
