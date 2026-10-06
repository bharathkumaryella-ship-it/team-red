'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '../../auth-provider';
import { apiRequest } from '@/lib/api';
import { AppointmentListing, displayTime } from '@/lib/appointments';
import {
  CalendarDays, FileText, ClipboardList, Search,
  Clock, CheckCircle, AlertCircle, User
} from 'lucide-react';

type Stats = {
  upcoming: number;
  total: number;
  records: number;
};

export default function PatientDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ upcoming: 0, total: 0, records: 0 });
  const [upcoming, setUpcoming] = useState<AppointmentListing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [upcomingResult, allResult, recordsResult] = await Promise.all([
          apiRequest<AppointmentListing>('/appointments/my?period=upcoming&limit=3&page=1'),
          apiRequest<AppointmentListing>('/appointments/my?period=all&limit=1&page=1'),
          apiRequest<{ pagination: { total: number } }>('/patients/me/medical-records?limit=1'),
        ]);
        setUpcoming(upcomingResult);
        setStats({
          upcoming: upcomingResult.pagination.total,
          total: allResult.pagination.total,
          records: recordsResult.pagination.total,
        });
      } catch {
        // Stats remain at defaults
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  })();

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div className="page-header-content">
            <div className="skeleton skeleton-heading" />
            <div className="skeleton skeleton-text" style={{ width: '40%' }} />
          </div>
        </div>
        <div className="stats-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton skeleton-stat animate-in" style={{ animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
        <div className="skeleton skeleton-card" style={{ height: 200 }} />
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header animate-in">
        <div className="page-header-content">
          <h1 className="greeting">
            {greeting}, {user?.full_name?.split(' ')[0] || 'there'} 👋
          </h1>
          <p>Here&apos;s an overview of your healthcare activity.</p>
        </div>
        <div className="page-header-actions">
          <Link href="/patient/doctors" className="btn btn-primary">
            <ClipboardList size={16} />
            Book appointment
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card animate-in animate-in-delay-1">
          <div className="stat-card-icon blue"><CalendarDays /></div>
          <div className="stat-card-content">
            <div className="stat-card-label">Upcoming</div>
            <div className="stat-card-value">{stats.upcoming}</div>
          </div>
        </div>
        <div className="stat-card animate-in animate-in-delay-2">
          <div className="stat-card-icon teal"><CheckCircle /></div>
          <div className="stat-card-content">
            <div className="stat-card-label">Total Appointments</div>
            <div className="stat-card-value">{stats.total}</div>
          </div>
        </div>
        <div className="stat-card animate-in animate-in-delay-3">
          <div className="stat-card-icon green"><FileText /></div>
          <div className="stat-card-content">
            <div className="stat-card-label">Medical Records</div>
            <div className="stat-card-value">{stats.records}</div>
          </div>
        </div>
        <div className="stat-card animate-in animate-in-delay-4">
          <div className="stat-card-icon amber"><User /></div>
          <div className="stat-card-content">
            <div className="stat-card-label">Profile</div>
            <div className="stat-card-value" style={{ fontSize: '0.875rem', fontWeight: 600 }}>Active</div>
          </div>
        </div>
      </div>

      {/* Two column layout */}
      <div className="content-grid two-col">
        {/* Upcoming Appointments */}
        <div className="card animate-in animate-in-delay-3">
          <div className="card-header">
            <h2>Upcoming Appointments</h2>
            <Link href="/patient/appointments" className="btn btn-ghost btn-sm">View all</Link>
          </div>
          <div className="card-body">
            {upcoming && upcoming.data.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {upcoming.data.map((apt) => {
                  const date = new Date(apt.start_at);
                  return (
                    <div className="appointment-card" key={apt.id}>
                      <div className="appointment-card-time">
                        <span className="appointment-card-time-day">{date.getDate()}</span>
                        <span className="appointment-card-time-month">
                          {date.toLocaleString('default', { month: 'short' })}
                        </span>
                      </div>
                      <div className="appointment-card-details">
                        <div className="appointment-card-doctor">{apt.doctor.full_name}</div>
                        <div className="appointment-card-spec">{apt.doctor.specialization || 'Doctor'}</div>
                        {apt.doctor.clinic_location && <div className="text-xs text-muted">Clinic: {apt.doctor.clinic_location}</div>}
                        <div className="appointment-card-datetime">
                          {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} — {new Date(apt.end_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <div className="appointment-card-actions">
                        <span className={`badge badge-${apt.status.toLowerCase()}`}>
                          {apt.status === 'PENDING' && <Clock size={12} />}
                          {apt.status === 'CONFIRMED' && <CheckCircle size={12} />}
                          {apt.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon"><CalendarDays /></div>
                <h3>No upcoming appointments</h3>
                <p>Book your next visit with one of our doctors.</p>
                <Link href="/patient/doctors" className="btn btn-primary btn-sm">
                  Book appointment
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="animate-in animate-in-delay-4">
          <h2 style={{ marginBottom: 16, fontSize: '1.1rem' }}>Quick actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link href="/patient/doctors" className="quick-action">
              <div className="quick-action-icon" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                <ClipboardList />
              </div>
              <div>
                <div className="quick-action-text">Book Appointment</div>
                <div className="quick-action-desc">Schedule a new visit with a doctor</div>
              </div>
            </Link>
            <Link href="/patient/appointments" className="quick-action">
              <div className="quick-action-icon" style={{ background: 'var(--color-secondary-light)', color: 'var(--color-secondary)' }}>
                <CalendarDays />
              </div>
              <div>
                <div className="quick-action-text">View Appointments</div>
                <div className="quick-action-desc">Check appointment history and status</div>
              </div>
            </Link>
            <Link href="/patient/medical-records" className="quick-action">
              <div className="quick-action-icon" style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
                <FileText />
              </div>
              <div>
                <div className="quick-action-text">Medical Records</div>
                <div className="quick-action-desc">Access your clinical records</div>
              </div>
            </Link>
            <Link href="/patient/doctors" className="quick-action">
              <div className="quick-action-icon" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
                <Search />
              </div>
              <div>
                <div className="quick-action-text">Find a Doctor</div>
                <div className="quick-action-desc">Browse active care providers</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
