'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { useToast } from '../../components/toast-provider';
import {
  Users,
  Search,
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';

type Patient = { id: number; full_name: string; email: string; phone: string | null; is_active: boolean };
type Listing = { data: Patient[]; pagination: { page: number; pages: number; total: number } };

export default function AdminPatientsPage() {
  const [listing, setListing] = useState<Listing | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const { success, error: showError } = useToast();

  async function load(search = query, nextPage = page) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, page: String(nextPage), limit: '20' });
      const data = await apiRequest<Listing>(`/admin/patients?${params}`);
      setListing(data);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Unable to load patients.');
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

  async function setStatus(patient: Patient) {
    setTogglingId(patient.id);
    const nextStatus = !patient.is_active;
    try {
      await apiRequest(`/admin/patients/${patient.id}/status`, {
        method: 'PATCH',
        body: { is_active: nextStatus },
      });
      success(`Patient account ${nextStatus ? 'reactivated' : 'deactivated'} successfully.`);
      await load();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Unable to update patient status.');
    } finally {
      setTogglingId(null);
    }
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <h1>Patient Accounts Governance</h1>
          <p>Review patient demographics, verify account statuses, and perform account lifecycle actions.</p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <form onSubmit={search} className="filter-bar">
        <div className="search-input-wrap">
          <Search size={16} />
          <input
            id="patient-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={100}
            placeholder="Search patient by name or registered email..."
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

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: '24px' }}>
            <div className="skeleton skeleton-row" style={{ marginBottom: '12px' }} />
            <div className="skeleton skeleton-row" style={{ marginBottom: '12px' }} />
            <div className="skeleton skeleton-row" style={{ marginBottom: '12px' }} />
          </div>
        ) : !listing?.data || listing.data.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Users />
            </div>
            <h3>No patients found</h3>
            <p>No patient records match the specified search query.</p>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Patient Name</th>
                    <th>Email Address</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {listing.data.map((patient) => (
                    <tr key={patient.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              background: 'var(--color-primary-light)',
                              color: 'var(--color-primary)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.75rem'
                            }}
                          >
                            {patient.full_name.charAt(0)}
                          </div>
                          <Link
                            href={`/admin/patients/${patient.id}`}
                            style={{ fontWeight: 600, color: 'var(--color-text)' }}
                          >
                            {patient.full_name}
                          </Link>
                        </div>
                      </td>
                      <td>{patient.email}</td>
                      <td>{patient.phone || '—'}</td>
                      <td>
                        <span className={`badge ${patient.is_active ? 'badge-active' : 'badge-inactive'}`}>
                          {patient.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td>
                        <div className="action-cell" style={{ justifyContent: 'flex-end' }}>
                          <Link
                            href={`/admin/patients/${patient.id}`}
                            className="btn btn-secondary btn-sm"
                          >
                            <ExternalLink size={14} />
                            <span>Record</span>
                          </Link>

                          <button
                            type="button"
                            className={`btn ${patient.is_active ? 'btn-danger' : 'btn-secondary'} btn-sm`}
                            disabled={togglingId === patient.id}
                            onClick={() => void setStatus(patient)}
                          >
                            {patient.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                            <span>
                              {togglingId === patient.id
                                ? 'Updating...'
                                : patient.is_active
                                ? 'Deactivate'
                                : 'Reactivate'}
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {listing.pagination && (
              <div className="pagination">
                <span>
                  Page {listing.pagination.page} of {listing.pagination.pages || 1} ({listing.pagination.total} patients)
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
    </div>
  );
}
