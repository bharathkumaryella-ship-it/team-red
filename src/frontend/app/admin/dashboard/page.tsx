'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import {
  Users,
  UserCog,
  CalendarDays,
  ShieldCheck,
  ArrowRight,
  Activity,
  Lock,
  Server,
  FileText
} from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    patients: 0,
    doctors: 0,
    appointments: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [pat, doc, appt] = await Promise.all([
          apiRequest<{ pagination: { total: number } }>('/admin/patients?limit=1'),
          apiRequest<{ pagination: { total: number } }>('/admin/doctors?limit=1'),
          apiRequest<{ pagination: { total: number } }>('/admin/appointments?limit=1'),
        ]);

        setStats({
          patients: pat.pagination.total,
          doctors: doc.pagination.total,
          appointments: appt.pagination.total,
        });
      } catch {
        // Defaults maintained
      } finally {
        setLoading(false);
      }
    }
    void loadStats();
  }, []);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-content">
          <h1>System Administration & Governance</h1>
          <p>Clinic operations control center, user role management, and compliance auditing.</p>
        </div>
        <div className="page-header-actions">
          <div className="navbar-security-badge">
            <ShieldCheck size={14} />
            <span>Root Admin Mode</span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-icon blue">
            <Users />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">Registered Patients</div>
            <div className="stat-card-value">{loading ? '…' : stats.patients}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon teal">
            <UserCog />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">Medical Staff</div>
            <div className="stat-card-value">{loading ? '…' : stats.doctors}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon amber">
            <CalendarDays />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">Total Appointments</div>
            <div className="stat-card-value">{loading ? '…' : stats.appointments}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-icon green">
            <Activity />
          </div>
          <div className="stat-card-content">
            <div className="stat-card-label">System Security</div>
            <div className="stat-card-value" style={{ fontSize: '1.25rem', color: 'var(--color-success)', marginTop: '4px' }}>
              Hardened & Active
            </div>
          </div>
        </div>
      </div>

      {/* Main Operations Grid */}
      <div className="content-grid two-col" style={{ alignItems: 'start' }}>
        {/* Operations Hub */}
        <div className="card">
          <div className="card-header">
            <h2>Administrative Operations</h2>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <Link
              href="/admin/patients"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
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
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-primary-light)',
                  color: 'var(--color-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <Users size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>Patient Account Governance</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                  Search patient records, view details, activate or deactivate accounts
                </div>
              </div>
              <ArrowRight size={16} color="var(--color-text-muted)" />
            </Link>

            <Link
              href="/admin/doctors"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
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
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-secondary-light)',
                  color: 'var(--color-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <UserCog size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>Physician Directory Oversight</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                  Provision new doctor credentials, manage licenses, and edit profiles
                </div>
              </div>
              <ArrowRight size={16} color="var(--color-text-muted)" />
            </Link>

            <Link
              href="/admin/appointments"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
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
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-warning-light)',
                  color: 'var(--color-warning)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <CalendarDays size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>Clinic Appointment Oversight</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                  Monitor system-wide bookings, override status, and filter by doctor/date
                </div>
              </div>
              <ArrowRight size={16} color="var(--color-text-muted)" />
            </Link>
          </div>
        </div>

        {/* Security & Health Card */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="var(--color-success)" />
              <h2>System Security & Audit Controls</h2>
            </div>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <Lock size={18} color="var(--color-primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h4 style={{ fontSize: '0.875rem', margin: 0 }}>RBAC Enforcement</h4>
                <p className="text-sm text-muted" style={{ margin: '2px 0 0 0' }}>
                  Role boundaries (PATIENT, DOCTOR, ADMIN) verified on each API transaction.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <Server size={18} color="var(--color-secondary)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h4 style={{ fontSize: '0.875rem', margin: 0 }}>Database Security</h4>
                <p className="text-sm text-muted" style={{ margin: '2px 0 0 0' }}>
                  MySQL parameterization and strict schema migrations prevent SQL injections.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <FileText size={18} color="var(--color-warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h4 style={{ fontSize: '0.875rem', margin: 0 }}>Cryptographic Audit Trail</h4>
                <p className="text-sm text-muted" style={{ margin: '2px 0 0 0' }}>
                  Sensitive actions and status transitions logged with timestamp and user ID.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
