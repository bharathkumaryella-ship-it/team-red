'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '../../auth-provider';
import { apiRequest } from '@/lib/api';
import { AppointmentListing, displayTime } from '@/lib/appointments';
import {
  CalendarDays,
  Clock,
  User,
  FileText,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Stethoscope,
  Activity,
  Award
} from 'lucide-react';

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentListing | null>(null);
  const [stats, setStats] = useState({
    upcoming: 0,
    completed: 0,
    records: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [upResult, compResult, recResult] = await Promise.all([
          apiRequest<AppointmentListing>('/doctor/appointments?period=upcoming&limit=5'),
          apiRequest<AppointmentListing>('/doctor/appointments?status=COMPLETED&limit=1'),
          apiRequest<{ pagination: { total: number } }>('/doctor/medical-records?limit=1')
        ]);

        setAppointments(upResult);
        setStats({
          upcoming: upResult.pagination.total,
          completed: compResult.pagination.total,
          records: recResult.pagination.total
        });
      } catch {
        // Stats remain at defaults
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, []);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <h1>
            {greeting}, Dr. {user?.email ? user.email.split('@')[0] : 'Physician'}
          </h1>
          <p>Clinical practice overview, patient schedule, and medical documentation.</p>
        </div>
        <div className="page-header-actions">
          <Link href="/doctor/appointments" className="btn btn-primary">
            <CalendarDays size={16} />
            <span>Manage Schedule</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon blue">
            <CalendarDays />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">Upcoming Consultations</div>
            <div className="stat-card-value">{loading ? '…' : stats.upcoming}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon green">
            <CheckCircle />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">Completed Consultations</div>
            <div className="stat-card-value">{loading ? '…' : stats.completed}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon teal">
            <FileText />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">Clinical Records Authored</div>
            <div className="stat-card-value">{loading ? '…' : stats.records}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon amber">
            <ShieldCheck />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">Practice Status</div>
            <div className="stat-card-value" style={{ fontSize: '1.25rem', color: 'var(--color-success)', marginTop: '4px' }}>
              Verified Active
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="content-grid two-col" style={{ alignItems: 'start' }}>
        {/* Left Column: Upcoming Consultations */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="var(--color-primary)" />
              <h2>Upcoming Consultations</h2>
            </div>
            <Link href="/doctor/appointments" className="btn btn-ghost btn-sm">
              <span>View All</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="card-body">
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="skeleton skeleton-row" />
                <div className="skeleton skeleton-row" />
                <div className="skeleton skeleton-row" />
              </div>
            ) : !appointments?.data || appointments.data.length === 0 ? (
              <div className="empty-state" style={{ padding: '36px 16px' }}>
                <div className="empty-state-icon">
                  <CalendarDays />
                </div>
                <h3>No upcoming appointments</h3>
                <p>Your upcoming schedule is clear. Check the schedule tab for historical records.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {appointments.data.map((appt) => (
                  <div
                    key={appt.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 16px',
                      background: 'var(--color-bg)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border-light)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: 'var(--radius-md)',
                          background: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          color: 'var(--color-primary)',
                          border: '1px solid var(--color-border-light)'
                        }}
                      >
                        {appt.patient?.full_name ? appt.patient.full_name.charAt(0) : 'P'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{appt.patient?.full_name || 'Patient'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {displayTime(appt.start_at)}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className={`badge badge-${appt.status.toLowerCase()}`}>{appt.status}</span>
                      <Link href="/doctor/appointments" className="btn btn-secondary btn-sm">
                        Manage
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quick Actions & Workflow Hub */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <div className="card-header">
              <h2>Quick Actions</h2>
            </div>
            <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px' }}>
              <Link
                href="/doctor/appointments"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '16px',
                  background: 'var(--color-bg)',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-primary-light)',
                    color: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <CalendarDays size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>Appointment Schedule</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                    Confirm, cancel, or mark consultations as completed
                  </div>
                </div>
                <ArrowRight size={16} color="var(--color-text-muted)" />
              </Link>

              <Link
                href="/doctor/medical-records"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '16px',
                  background: 'var(--color-bg)',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-secondary-light)',
                    color: 'var(--color-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <FileText size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>Medical Records Hub</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                    Document diagnoses, treatment notes, and prescriptions
                  </div>
                </div>
                <ArrowRight size={16} color="var(--color-text-muted)" />
              </Link>

              <Link
                href="/doctor/profile"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '16px',
                  background: 'var(--color-bg)',
                  borderRadius: 'var(--radius-md)',
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-success-light)',
                    color: 'var(--color-success)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Award size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>Credentials & Bio</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                    Update clinical experience, bio, and license information
                  </div>
                </div>
                <ArrowRight size={16} color="var(--color-text-muted)" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
