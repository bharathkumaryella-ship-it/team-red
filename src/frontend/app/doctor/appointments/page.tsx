'use client';

import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { Appointment, AppointmentListing, AppointmentStatus, displayTime } from '@/lib/appointments';
import { useToast } from '../../components/toast-provider';
import {
  CalendarDays,
  Clock,
  User,
  Filter,
  CheckCircle,
  CheckCheck,
  Ban,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  X
} from 'lucide-react';

export default function DoctorAppointmentsPage() {
  const [listing, setListing] = useState<AppointmentListing | null>(null);
  const [period, setPeriod] = useState('upcoming');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<number | null>(null);
  const [detail, setDetail] = useState<Appointment | null>(null);
  const { success, error: showError } = useToast();

  async function load(nextPage = page, nextPeriod = period, nextStatus = status) {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(nextPage), limit: '20', period: nextPeriod });
      if (nextStatus) params.set('status', nextStatus);
      const data = await apiRequest<AppointmentListing>(`/doctor/appointments?${params}`);
      setListing(data);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Unable to load consultation schedule.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(1, 'upcoming', '');
  }, []);

  async function act(item: Appointment, action: 'confirm' | 'complete' | 'cancel') {
    if (action === 'cancel' && !confirm('Are you sure you want to cancel this scheduled appointment?')) {
      return;
    }

    setActionInProgress(item.id);
    try {
      await apiRequest(`/doctor/appointments/${item.id}/${action}`, { method: 'POST', body: {} });
      const actionLabels = {
        confirm: 'confirmed',
        complete: 'marked as completed',
        cancel: 'cancelled'
      };
      success(`Appointment #${item.id} has been ${actionLabels[action]}.`);
      if (detail?.id === item.id) setDetail(null);
      await load();
    } catch (e) {
      showError(e instanceof Error ? e.message : `Failed to ${action} appointment.`);
    } finally {
      setActionInProgress(null);
    }
  }

  const getStatusBadge = (s: string) => {
    switch (s.toUpperCase()) {
      case 'CONFIRMED':
        return <span className="badge badge-confirmed"><CheckCircle size={12} /> Confirmed</span>;
      case 'COMPLETED':
        return <span className="badge badge-completed"><CheckCheck size={12} /> Completed</span>;
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
          <h1>Clinical Schedule</h1>
          <p>Review assigned patient appointments, confirm bookings, and finalize consultations.</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <label>
          <span className="form-label"><Clock size={14} /> Schedule View</span>
          <select
            value={period}
            onChange={(e) => {
              const val = e.target.value;
              setPeriod(val);
              setPage(1);
              void load(1, val, status);
            }}
          >
            <option value="upcoming">Upcoming Consultations</option>
            <option value="history">Historical Records</option>
            <option value="all">All Appointments</option>
          </select>
        </label>

        <label>
          <span className="form-label"><Filter size={14} /> Status</span>
          <select
            value={status}
            onChange={(e) => {
              const val = e.target.value;
              setStatus(val);
              setPage(1);
              void load(1, period, val);
            }}
          >
            <option value="">All Statuses</option>
            {['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((val) => (
              <option key={val} value={val}>{val}</option>
            ))}
          </select>
        </label>
      </div>

      {/* Table Container */}
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
            <h3>No appointments scheduled</h3>
            <p>There are no consultations matching your selected filters.</p>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Date & Time</th>
                    <th>Status</th>
                    <th>Reason</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {listing.data.map((item) => {
                    const future = new Date(item.start_at).getTime() > Date.now();
                    const ended = new Date(item.end_at).getTime() <= Date.now();
                    const isBusy = actionInProgress === item.id;

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
                              {item.patient?.full_name ? item.patient.full_name.charAt(0) : 'P'}
                            </div>
                            <span style={{ fontWeight: 600 }}>{item.patient?.full_name || 'Patient'}</span>
                          </div>
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
                              onClick={() => setDetail(item)}
                              title="View details"
                            >
                              <Eye size={14} />
                              <span>Details</span>
                            </button>

                            {item.status === 'PENDING' && future && (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                disabled={isBusy}
                                onClick={() => void act(item, 'confirm')}
                              >
                                <CheckCircle size={14} />
                                <span>Confirm</span>
                              </button>
                            )}

                            {item.status === 'CONFIRMED' && ended && (
                              <button
                                type="button"
                                className="btn btn-success btn-sm"
                                disabled={isBusy}
                                onClick={() => void act(item, 'complete')}
                              >
                                <CheckCheck size={14} />
                                <span>Complete</span>
                              </button>
                            )}

                            {['PENDING', 'CONFIRMED'].includes(item.status) && future && (
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                disabled={isBusy}
                                onClick={() => void act(item, 'cancel')}
                              >
                                <Ban size={14} />
                                <span>Cancel</span>
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
            {listing.pagination && (
              <div className="pagination">
                <span>
                  Showing page {listing.pagination.page} of {listing.pagination.pages || 1} (
                  {listing.pagination.total} total consultations)
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
                  <span className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Status
                  </span>
                  <div style={{ marginTop: '4px' }}>{getStatusBadge(detail.status)}</div>
                </div>

                <div>
                  <span className="text-xs text-muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Patient
                  </span>
                  <p style={{ fontWeight: 600, color: 'var(--color-text)', marginTop: '2px' }}>
                    {detail.patient?.full_name || 'Patient'}
                  </p>
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
                    Patient Consultation Reason
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
