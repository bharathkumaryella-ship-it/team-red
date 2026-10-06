'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { AppointmentListing, AppointmentStatus, displayTime } from '@/lib/appointments';
import { useToast } from '../../components/toast-provider';
import {
  CalendarDays,
  Clock,
  User,
  Filter,
  X,
  Plus,
  ChevronLeft,
  ChevronRight,
  Eye,
  Ban,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

type Result = AppointmentListing;

export default function PatientAppointmentsPage() {
  const [listing, setListing] = useState<Result | null>(null);
  const [status, setStatus] = useState('');
  const [period, setPeriod] = useState('all');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AppointmentListing['data'][number] | null>(null);
  const { success, error: showError } = useToast();

  async function load(nextPage = page, nextStatus = status, nextPeriod = period) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(nextPage), limit: '20', period: nextPeriod });
      if (nextStatus) params.set('status', nextStatus);
      const data = await apiRequest<Result>(`/appointments/my?${params}`);
      setListing(data);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Unable to load appointments.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(1, '', 'all');
  }, []);

  async function cancel(id: number) {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    setCancellingId(id);
    try {
      await apiRequest(`/appointments/${id}/cancel`, { method: 'POST', body: {} });
      success('Appointment cancelled successfully.');
      if (detail?.id === id) setDetail(null);
      await load();
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Unable to cancel appointment.');
    } finally {
      setCancellingId(null);
    }
  }

  async function openDetail(id: number) {
    try {
      const response = await apiRequest<{ data: AppointmentListing['data'][number] }>(`/appointments/${id}`);
      setDetail(response.data);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Unable to load appointment details.');
    }
  }

  const getStatusBadge = (s: string) => {
    switch (s.toUpperCase()) {
      case 'CONFIRMED':
        return <span className="badge badge-confirmed"><CheckCircle size={12} /> Confirmed</span>;
      case 'COMPLETED':
        return <span className="badge badge-completed"><CheckCircle size={12} /> Completed</span>;
      case 'CANCELLED':
        return <span className="badge badge-cancelled"><Ban size={12} /> Cancelled</span>;
      case 'PENDING':
      default:
        return <span className="badge badge-pending"><AlertCircle size={12} /> Pending</span>;
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <h1>My Appointments</h1>
          <p>View, schedule, and track all your healthcare consultations.</p>
        </div>
        <div className="page-header-actions">
          <Link href="/patient/doctors" className="btn btn-primary">
            <Plus size={16} />
            <span>Book Appointment</span>
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <label>
          <span className="form-label"><Filter size={14} /> Status</span>
          <select
            value={status}
            onChange={(e) => {
              const val = e.target.value;
              setStatus(val);
              setPage(1);
              void load(1, val, period);
            }}
          >
            <option value="">All Statuses</option>
            {(['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as AppointmentStatus[]).map((val) => (
              <option key={val} value={val}>{val}</option>
            ))}
          </select>
        </label>

        <label>
          <span className="form-label"><Clock size={14} /> Time Frame</span>
          <select
            value={period}
            onChange={(e) => {
              const val = e.target.value;
              setPeriod(val);
              setPage(1);
              void load(1, status, val);
            }}
          >
            <option value="all">All Time</option>
            <option value="upcoming">Upcoming</option>
            <option value="history">History</option>
          </select>
        </label>
      </div>

      {/* Table / Content */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: '24px' }}>
            <div className="skeleton skeleton-row" style={{ marginBottom: '12px' }} />
            <div className="skeleton skeleton-row" style={{ marginBottom: '12px' }} />
            <div className="skeleton skeleton-row" style={{ marginBottom: '12px' }} />
            <div className="skeleton skeleton-row" />
          </div>
        ) : !listing?.data || listing.data.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <CalendarDays />
            </div>
            <h3>No appointments found</h3>
            <p>You have no appointments matching your selected filters. Schedule a visit with a doctor whenever you need care.</p>
                <Link href="/patient/doctors" className="btn btn-primary">
              <Plus size={16} />
              <span>Book Your First Appointment</span>
            </Link>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Doctor</th>
                    <th>Specialty</th>
                    <th>Date & Time</th>
                    <th>Status</th>
                    <th>Reason</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {listing.data.map((item) => {
                    const isFuture = new Date(item.start_at).getTime() > Date.now();
                    const canCancel = ['PENDING', 'CONFIRMED'].includes(item.status) && isFuture;

                    return (
                      <tr key={item.id}>
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
                              {item.doctor.full_name.charAt(0)}
                            </div>
                            <div>
                              <span style={{ fontWeight: 600 }}>{item.doctor.full_name}</span>
                              {item.doctor.phone && <div className="text-xs text-muted"><a href={`tel:${item.doctor.phone}`}>{item.doctor.phone}</a></div>}
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ color: 'var(--color-text-secondary)' }}>
                            {item.doctor.specialization || 'General Practice'}
                          </span>
                        </td>
                        <td>
                          <div>
                            <div style={{ fontWeight: 500 }}>{displayTime(item.start_at)}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                              to {displayTime(item.end_at)}
                            </div>
                          </div>
                        </td>
                        <td>{getStatusBadge(item.status)}</td>
                        <td style={{ maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          <span title={item.reason ?? undefined}>{item.reason}</span>
                        </td>
                        <td>
                          <div className="action-cell" style={{ justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => void openDetail(item.id)}
                              title="View details"
                            >
                              <Eye size={14} />
                              <span>Details</span>
                            </button>
                            {canCancel && (
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                disabled={cancellingId === item.id}
                                onClick={() => void cancel(item.id)}
                                title="Cancel appointment"
                              >
                                <Ban size={14} />
                                <span>{cancellingId === item.id ? 'Cancelling...' : 'Cancel'}</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {listing && listing.pagination && (
              <div className="pagination">
                <span>
                  Showing page {listing.pagination.page} of {listing.pagination.pages || 1} (
                  {listing.pagination.total} total appointments)
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
                <h2>Appointment #{detail.id}</h2>
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
                  <span className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Status
                  </span>
                  <div style={{ marginTop: '4px' }}>{getStatusBadge(detail.status)}</div>
                </div>

                <div>
                  <span className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Doctor
                  </span>
                  <p style={{ fontWeight: 600, color: 'var(--color-text)', marginTop: '2px' }}>
                    {detail.doctor.full_name}
                  </p>
                  <p className="text-sm text-muted">{detail.doctor.specialization || 'General Healthcare'}</p>
                  {detail.doctor.phone && <p className="text-sm">Phone: <a href={`tel:${detail.doctor.phone}`}>{detail.doctor.phone}</a></p>}
                  {detail.doctor.clinic_location && <p className="text-sm">Clinic: {detail.doctor.clinic_location}</p>}
                </div>

                <div>
                  <span className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Schedule
                  </span>
                  <p style={{ fontWeight: 500, color: 'var(--color-text)', marginTop: '2px' }}>
                    {displayTime(detail.start_at)} — {displayTime(detail.end_at)}
                  </p>
                </div>

                <div>
                  <span className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Consultation Reason
                  </span>
                  <p
                    style={{
                      background: 'var(--color-bg)',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.875rem',
                      color: 'var(--color-text)',
                      marginTop: '4px',
                      lineHeight: 1.5
                    }}
                  >
                    {detail.reason}
                  </p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              {['PENDING', 'CONFIRMED'].includes(detail.status) && new Date(detail.start_at).getTime() > Date.now() && (
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => void cancel(detail.id)}
                >
                  <Ban size={14} />
                  <span>Cancel Appointment</span>
                </button>
              )}
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
