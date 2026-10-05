'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { Appointment } from '@/lib/appointments';
import { useToast } from '../../components/toast-provider';
import {
  CalendarDays,
  Clock,
  Search,
  CheckCircle,
  AlertCircle,
  User,
  ShieldCheck,
  ArrowRight,
  Info,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

type Doctor = { id: number; full_name: string; specialization: string; experience_years: number | null };
type Doctors = { data: Doctor[]; pagination: { page: number; pages: number; total: number } };
type AppointmentResult = { data: Appointment };
type Availability = { data: { available: boolean } };

function asApiInstant(value: string) {
  return value ? new Date(value).toISOString() : '';
}

export default function BookAppointmentPage() {
  const router = useRouter();
  const { success, error: showError } = useToast();

  const [doctorList, setDoctorList] = useState<Doctors | null>(null);
  const [doctorQuery, setDoctorQuery] = useState('');
  const [doctorPage, setDoctorPage] = useState(1);
  const [doctorId, setDoctorId] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [reason, setReason] = useState('');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [booking, setBooking] = useState(false);
  const [result, setResult] = useState<Appointment | null>(null);

  const loadDoctors = useCallback(async (search: string, page: number) => {
    try {
      const params = new URLSearchParams({ search, limit: '20', page: String(page) });
      const data = await apiRequest<Doctors>(`/doctors?${params}`);
      setDoctorList(data);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Unable to load doctors.');
    }
  }, [showError]);

  useEffect(() => {
    void loadDoctors('', 1);
  }, [loadDoctors]);

  async function checkAvailability() {
    if (!doctorId || !startAt || !endAt) return;
    setAvailable(null);
    setCheckingAvailability(true);
    try {
      const params = new URLSearchParams({
        doctor_id: doctorId,
        start_at: asApiInstant(startAt),
        end_at: asApiInstant(endAt)
      });
      const response = await apiRequest<Availability>(`/appointments/availability?${params}`);
      setAvailable(response.data.available);
      if (response.data.available) {
        success('Doctor is available for the selected time window!');
      } else {
        showError('Selected time slot is already booked. Please select a different time.');
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Unable to check availability.');
    } finally {
      setCheckingAvailability(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBooking(true);
    setResult(null);

    try {
      const response = await apiRequest<AppointmentResult>('/appointments', {
        method: 'POST',
        body: {
          doctor_id: Number(doctorId),
          start_at: asApiInstant(startAt),
          end_at: asApiInstant(endAt),
          reason
        }
      });
      setResult(response.data);
      setAvailable(null);
      success(`Appointment request #${response.data.id} submitted successfully!`);
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Unable to book appointment.');
    } finally {
      setBooking(false);
    }
  }

  async function searchDoctors(event: FormEvent) {
    event.preventDefault();
    setDoctorPage(1);
    await loadDoctors(doctorQuery, 1);
  }

  const selectedDoctor = doctorList?.data.find((d) => String(d.id) === doctorId);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <h1>Book an Appointment</h1>
          <p>Schedule a secure consultation with certified healthcare specialists.</p>
        </div>
      </div>

      {result && (
        <div
          className="card"
          style={{
            marginBottom: '24px',
            background: 'var(--color-success-light)',
            borderColor: 'var(--color-success-border)'
          }}
        >
          <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'var(--color-success)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <CheckCircle size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ color: 'var(--color-success)', margin: '0 0 4px 0' }}>
                Appointment Request Submitted!
              </h3>
              <p style={{ margin: 0, color: 'var(--color-text)' }}>
                Your appointment request <strong>#{result.id}</strong> has been logged and is pending confirmation by the doctor.
              </p>
            </div>
            <Link href="/patient/appointments" className="btn btn-primary btn-sm">
              <span>View Appointments</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      <div className="content-grid two-col" style={{ alignItems: 'start' }}>
        {/* Left Form Panel */}
        <div className="card">
          <div className="card-header">
            <h3>Consultation Request Details</h3>
          </div>
          <div className="card-body">
            {/* Search doctors sub-form */}
            <form onSubmit={searchDoctors} style={{ marginBottom: '20px' }}>
              <label>
                <span className="form-label">Search Specialist</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div className="search-input-wrap">
                    <Search size={16} />
                    <input
                      value={doctorQuery}
                      maxLength={100}
                      onChange={(e) => setDoctorQuery(e.target.value)}
                      placeholder="Doctor name or specialty (e.g. Cardiology)"
                    />
                  </div>
                  <button type="submit" className="btn btn-secondary">
                    Search
                  </button>
                </div>
              </label>
            </form>

            <form className="stacked-form" onSubmit={submit}>
              {/* Doctor select */}
              <div>
                <label>
                  <span className="form-label">Select Doctor *</span>
                  <select
                    required
                    value={doctorId}
                    onChange={(e) => {
                      setDoctorId(e.target.value);
                      setAvailable(null);
                    }}
                  >
                    <option value="">-- Choose a doctor --</option>
                    {doctorList?.data.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        Dr. {doctor.full_name} — {doctor.specialization || 'General Medicine'}
                        {doctor.experience_years ? ` (${doctor.experience_years} yrs exp)` : ''}
                      </option>
                    ))}
                  </select>
                </label>

                {doctorList && doctorList.pagination.pages > 1 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '8px',
                      fontSize: '0.75rem',
                      color: 'var(--color-text-muted)'
                    }}
                  >
                    <span>
                      Page {doctorList.pagination.page} of {doctorList.pagination.pages}
                    </span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={doctorPage <= 1}
                        onClick={() => {
                          const next = doctorPage - 1;
                          setDoctorPage(next);
                          void loadDoctors(doctorQuery, next);
                        }}
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        disabled={doctorPage >= doctorList.pagination.pages}
                        onClick={() => {
                          const next = doctorPage + 1;
                          setDoctorPage(next);
                          void loadDoctors(doctorQuery, next);
                        }}
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Start & End Time */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label>
                  <span className="form-label">Preferred Start Time *</span>
                  <input
                    required
                    type="datetime-local"
                    value={startAt}
                    onChange={(e) => {
                      setStartAt(e.target.value);
                      setAvailable(null);
                    }}
                  />
                </label>
                <label>
                  <span className="form-label">Preferred End Time *</span>
                  <input
                    required
                    type="datetime-local"
                    value={endAt}
                    onChange={(e) => {
                      setEndAt(e.target.value);
                      setAvailable(null);
                    }}
                  />
                </label>
              </div>

              {/* Availability check bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  background: 'var(--color-bg)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border-light)'
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={!doctorId || !startAt || !endAt || checkingAvailability}
                  onClick={() => void checkAvailability()}
                >
                  <Clock size={14} />
                  <span>{checkingAvailability ? 'Checking...' : 'Check Availability'}</span>
                </button>

                <div>
                  {available === true && (
                    <span className="badge badge-completed">
                      <CheckCircle size={12} /> Available
                    </span>
                  )}
                  {available === false && (
                    <span className="badge badge-cancelled">
                      <AlertCircle size={12} /> Slot Unavailable
                    </span>
                  )}
                  {available === null && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      Select time & verify slot
                    </span>
                  )}
                </div>
              </div>

              {/* Reason */}
              <label>
                <span className="form-label">Reason for Consultation *</span>
                <textarea
                  required
                  maxLength={500}
                  rows={4}
                  placeholder="Describe your symptoms, concerns, or reason for this medical appointment..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <Link href="/patient/appointments" className="btn btn-secondary">
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={booking || !doctorId || !startAt || !endAt}
                  className={`btn btn-primary ${booking ? 'btn-loading' : ''}`}
                >
                  <CalendarDays size={16} />
                  <span>{booking ? 'Scheduling...' : 'Request Appointment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Info Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {selectedDoctor && (
            <div className="card">
              <div className="card-header">
                <h3>Selected Specialist</h3>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-primary-light)',
                      color: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                      fontWeight: 700
                    }}
                  >
                    {selectedDoctor.full_name.charAt(0)}
                  </div>
                  <div>
                    <h4 style={{ margin: 0 }}>Dr. {selectedDoctor.full_name}</h4>
                    <p style={{ margin: '2px 0 0 0', color: 'var(--color-primary)', fontWeight: 500 }}>
                      {selectedDoctor.specialization || 'General Healthcare'}
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    padding: '12px',
                    background: 'var(--color-bg)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <div>
                    <span className="text-xs text-muted">Experience</span>
                    <p style={{ fontWeight: 600, margin: '2px 0 0 0' }}>
                      {selectedDoctor.experience_years ? `${selectedDoctor.experience_years} Years` : 'Certified'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted">Verification</span>
                    <p style={{ fontWeight: 600, color: 'var(--color-success)', margin: '2px 0 0 0' }}>
                      Verified Staff
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security & Guidelines Card */}
          <div className="card">
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color="var(--color-success)" />
                <h3>Secure Booking Assurance</h3>
              </div>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <Info size={16} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p className="text-sm" style={{ margin: 0 }}>
                  <strong>Timezone Standard:</strong> Appointment times are automatically converted to UTC to ensure seamless scheduling across timezones.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <ShieldCheck size={16} color="var(--color-success)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p className="text-sm" style={{ margin: 0 }}>
                  <strong>Confidentiality Protected:</strong> Appointment reasons, clinical notes, phone numbers, selected profile fields, and uploaded files are encrypted at rest using clinic-managed keys.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <Clock size={16} color="var(--color-warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p className="text-sm" style={{ margin: 0 }}>
                  <strong>Cancellation Policy:</strong> You may cancel pending or confirmed appointments at any point prior to the scheduled start time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
