'use client';

import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { Appointment, AppointmentListing, AppointmentStatus, displayTime } from '@/lib/appointments';
import { useToast } from '../../components/toast-provider';
import {
  CalendarDays,
  Search,
  Filter,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  Stethoscope
} from 'lucide-react';

export default function AdminAppointmentsPage() {
  const [listing, setListing] = useState<AppointmentListing | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Appointment | null>(null);
  const { success, error: showError } = useToast();

  async function load(nextPage = page) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(nextPage), limit: '20' });
      if (search.trim()) params.set('search', search.trim());
      if (status) params.set('status', status);
      if (doctorId.trim()) params.set('doctor_id', doctorId.trim());
      if (date) params.set('date', date);
      const data = await apiRequest<AppointmentListing>(`/admin/appointments?${params}`);
      setListing(data);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Unable to load appointment logs.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(1);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    await load(1);
  }

  async function open(item: Appointment) {
    try {
      const response = await apiRequest<{ data: Appointment }>(`/admin/appointments/${item.id}`);
      setDetail(response.data);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Unable to load appointment detail.');
    }
  }

  async function setAppointmentStatus(item: Appointment, next: AppointmentStatus) {
    try {
      await apiRequest(`/admin/appointments/${item.id}/status`, {
        method: 'PATCH',
        body: { status: next },
      });
      success(`Appointment #${item.id} status transitioned to ${next}.`);
      await load();
      if (detail?.id === item.id) {
        await open(item);
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Unable to update appointment status.');
    }
  }

  const getStatusBadge = (s: string) => {
    switch (s.toUpperCase()) {
      case 'CONFIRMED':
        return <span className="badge badge-confirmed">Confirmed</span>;
      case 'COMPLETED':
        return <span className="badge badge-completed">Completed</span>;
      case 'CANCELLED':
        return <span className="badge badge-cancelled">Cancelled</span>;
      case 'PENDING':
      default:
        return <span className="badge badge-pending">Pending</span>;
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <h1>Clinic Appointments Oversight</h1>
          <p>Global monitor of all medical consultations across all clinical departments.</p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <form onSubmit={submit} className="filter-bar">
        <div className="search-input-wrap" style={{ minWidth: '220px' }}>
          <Search size={16} />
          <input
            value={search}
            maxLength={100}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient or doctor name..."
          />
        </div>

        <label style={{ minWidth: '150px' }}>
          <span className="form-label"><Filter size={14} /> Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as AppointmentStatus[]).map((val) => (
              <option key={val} value={val}>{val}</option>
            ))}
          </select>
        </label>

        <label style={{ minWidth: '110px' }}>
          <span className="form-label">Doctor ID</span>
          <input
            inputMode="numeric"
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            placeholder="ID #"
          />
        </label>

        <label style={{ minWidth: '140px' }}>
          <span className="form-label">Date</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        <button type="submit" className="btn btn-primary">
          Filter
        </button>

        {(search || status || doctorId || date) && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setSearch('');
              setStatus('');
              setDoctorId('');
              setDate('');
              setPage(1);
              void load(1);
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
              <CalendarDays />
            </div>
            <h3>No appointments found</h3>
            <p>No consultations match the specified filter criteria.</p>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Patient</th>
                    <th>Doctor</th>
                    <th>Schedule</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {listing.data.map((item) => {
                    const future = new Date(item.start_at).getTime() > Date.now();
                    const ended = new Date(item.end_at).getTime() <= Date.now();

                    return (
                      <tr key={item.id}>
                        <td>
                          <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>#{item.id}</span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{item.patient?.full_name || 'Patient'}</div>
                        </td>
                        <td>
                          <div>
                            <div style={{ fontWeight: 600 }}>Dr. {item.doctor.full_name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                              {item.doctor.specialization || 'General'}
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{displayTime(item.start_at)}</div>
                        </td>
                        <td>{getStatusBadge(item.status)}</td>
                        <td>
                          <div className="action-cell" style={{ justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => void open(item)}
                            >
                              <Eye size={14} />
                              <span>Details</span>
                            </button>

                            <select
                              style={{ width: 'auto', minHeight: '34px', padding: '4px 28px 4px 10px', fontSize: '0.75rem' }}
                              aria-label={`Change status for appointment ${item.id}`}
                              value={item.status}
                              onChange={(e) => void setAppointmentStatus(item, e.target.value as AppointmentStatus)}
                            >
                              <option value={item.status}>{item.status}</option>
                              {item.status === 'PENDING' && <option value="CONFIRMED">CONFIRMED</option>}
                              {['PENDING', 'CONFIRMED'].includes(item.status) && future && (
                                <option value="CANCELLED">CANCELLED</option>
                              )}
                              {item.status === 'CONFIRMED' && ended && (
                                <option value="COMPLETED">COMPLETED</option>
                              )}
                            </select>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {listing.pagination && (
              <div className="pagination">
                <span>
                  Page {listing.pagination.page} of {listing.pagination.pages || 1} ({listing.pagination.total} records)
                </span>
                <div className="pagination-controls">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={page <= 1}
                    onClick={() => {
                      const next = page - 1;
                      setPage(next);
                      void load(next);
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
                      void load(next);
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

      {/* Appointment Detail Modal */}
      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarDays size={20} color="var(--color-primary)" />
                <h2>Consultation #{detail.id}</h2>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setDetail(null)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <span className="text-xs text-muted">Status</span>
                  <div style={{ marginTop: '4px' }}>{getStatusBadge(detail.status)}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <span className="text-xs text-muted">Patient Name</span>
                    <p style={{ fontWeight: 600, color: 'var(--color-text)', marginTop: '2px' }}>
                      {detail.patient?.full_name || 'Patient'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted">Physician</span>
                    <p style={{ fontWeight: 600, color: 'var(--color-text)', marginTop: '2px' }}>
                      Dr. {detail.doctor.full_name}
                    </p>
                    <p className="text-sm text-muted">{detail.doctor.specialization}</p>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-muted">Consultation Timing</span>
                  <p style={{ fontWeight: 500, color: 'var(--color-text)', marginTop: '2px' }}>
                    {displayTime(detail.start_at)} — {displayTime(detail.end_at)}
                  </p>
                </div>

                <div>
                  <span className="text-xs text-muted">Reason for Appointment</span>
                  <p
                    style={{
                      background: 'var(--color-bg)',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.875rem',
                      color: 'var(--color-text)',
                      marginTop: '4px'
                    }}
                  >
                    {detail.reason || 'None provided'}
                  </p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setDetail(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
