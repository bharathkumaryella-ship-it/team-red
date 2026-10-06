'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { Appointment } from '@/lib/appointments';
import { useToast } from '../../components/toast-provider';
import { CalendarDays, Clock, CheckCircle, AlertCircle, User, ShieldCheck, ArrowRight, Info, MapPin } from 'lucide-react';

type Doctor = { id: number; full_name: string; specialization: string; experience_years: number | null; clinic_location: string | null };
type AppointmentResult = { data: Appointment };
type Availability = { data: { available: boolean } };

const APPOINTMENT_TIME_SLOTS = Array.from({ length: 18 }, (_, index) => {
  const totalMinutes = 9 * 60 + index * 30;
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const minutes = String(totalMinutes % 60).padStart(2, '0');
  return `${hours}:${minutes}`;
});

function localInputValue(value: Date) {
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

export default function BookAppointmentPage() {
  const router = useRouter();
  const { success, error: showError } = useToast();

  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [doctorId, setDoctorId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [reason, setReason] = useState('');
  const [available, setAvailable] = useState<boolean | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [booking, setBooking] = useState(false);
  const [result, setResult] = useState<Appointment | null>(null);

  function updateAppointmentSlot(date: string, time: string) {
    setAppointmentDate(date);
    setAppointmentTime(time);
    setAvailable(null);
    if (!date || !time) {
      setStartAt('');
      setEndAt('');
      return;
    }
    const start = new Date(`${date}T${time}:00`);
    if (Number.isNaN(start.getTime())) {
      setStartAt('');
      setEndAt('');
      return;
    }
    setStartAt(localInputValue(start));
    setEndAt(localInputValue(new Date(start.getTime() + 30 * 60 * 1000)));
  }

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('doctorId');
    if (!id || !/^\d+$/.test(id)) { router.replace('/patient/doctors'); return; }
    setDoctorId(id);
    apiRequest<{ data: Doctor }>(`/doctors/${id}`)
      .then((response) => setSelectedDoctor(response.data))
      .catch((e) => showError(e instanceof Error ? e.message : 'Unable to load selected doctor.'));
  }, [router, showError]);

  async function checkAvailability() {
    if (!doctorId || !startAt || !endAt) return;
    setAvailable(null);
    setCheckingAvailability(true);
    try {
      const params = new URLSearchParams({
        doctor_id: doctorId,
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString()
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
          start_at: new Date(startAt).toISOString(),
          end_at: new Date(endAt).toISOString(),
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
            <form className="stacked-form" onSubmit={submit}>
              <div className="card" style={{ background: 'var(--color-bg)' }}><div className="card-body">
                <span className="form-label">Selected doctor</span>
                <strong>{selectedDoctor ? `Dr. ${selectedDoctor.full_name} - ${selectedDoctor.specialization}` : 'Loading doctor...'}</strong>
              </div></div>

              <div className="card" style={{ background: 'var(--color-primary-light)', borderColor: 'var(--color-primary)' }}>
                <div className="card-body" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <MapPin size={20} color="var(--color-primary)" />
                  <div>
                    <span className="form-label">Clinic location</span>
                    <p style={{ margin: 0, color: 'var(--color-text)', fontWeight: 600 }}>
                      {selectedDoctor ? selectedDoctor.clinic_location || 'The clinic has not added a location yet.' : 'Loading clinic location...'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Date and fixed 30-minute start slot */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label>
                  <span className="form-label">Appointment Date *</span>
                  <input
                    required
                    type="date"
                    min={localInputValue(new Date()).slice(0, 10)}
                    value={appointmentDate}
                    onChange={(e) => updateAppointmentSlot(e.target.value, appointmentTime)}
                  />
                </label>
                <label>
                  <span className="form-label">Available 30-Minute Slot *</span>
                  <select
                    required
                    value={appointmentTime}
                    disabled={!appointmentDate}
                    onChange={(e) => updateAppointmentSlot(appointmentDate, e.target.value)}
                  >
                    <option value="">Choose a time</option>
                    {APPOINTMENT_TIME_SLOTS.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
                  </select>
                </label>
              </div>
              {startAt && endAt && <p className="text-sm text-muted" style={{ margin: '-8px 0 0' }}>Each appointment is 30 minutes, ending at {new Date(endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.</p>}

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
                  disabled={!doctorId || !selectedDoctor || !startAt || !endAt || checkingAvailability}
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
                  disabled={booking || !doctorId || !selectedDoctor || !startAt || !endAt}
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
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '14px' }}>
                  <MapPin size={16} color="var(--color-primary)" />
                  <div>
                    <span className="text-xs text-muted">Clinic location</span>
                    <p style={{ margin: '2px 0 0', fontWeight: 600 }}>
                      {selectedDoctor.clinic_location || 'The clinic has not added a location yet.'}
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
