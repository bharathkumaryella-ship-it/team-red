'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../auth-provider';
import {
  LayoutDashboard, CalendarDays, FileText, User, Users, UserCog,
  Stethoscope, LogOut, Menu, X, Shield, ChevronRight,
  Lock, Search, Bell, MapPin
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { Appointment, AppointmentListing } from '@/lib/appointments';
import { useToast } from './toast-provider';

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

function getNavItems(role: string): { main: NavItem[]; section?: string; secondary?: NavItem[] } {
  if (role === 'PATIENT') {
    return {
      main: [
        { label: 'Dashboard', href: '/patient/dashboard', icon: <LayoutDashboard /> },
        { label: 'Appointments', href: '/patient/appointments', icon: <CalendarDays /> },
        { label: 'Medical Records', href: '/patient/medical-records', icon: <FileText /> },
        { label: 'Find Doctors', href: '/patient/doctors', icon: <Search /> },
      ],
      section: 'Account',
      secondary: [
        { label: 'Profile', href: '/patient/profile', icon: <User /> },
      ],
    };
  }
  if (role === 'DOCTOR') {
    return {
      main: [
        { label: 'Dashboard', href: '/doctor/dashboard', icon: <LayoutDashboard /> },
        { label: 'Schedule', href: '/doctor/appointments', icon: <CalendarDays /> },
        { label: 'Medical Records', href: '/doctor/medical-records', icon: <FileText /> },
      ],
      section: 'Account',
      secondary: [
        { label: 'Profile', href: '/doctor/profile', icon: <User /> },
      ],
    };
  }
  // ADMIN
  return {
    main: [
      { label: 'Dashboard', href: '/admin/dashboard', icon: <LayoutDashboard /> },
      { label: 'Appointments', href: '/admin/appointments', icon: <CalendarDays /> },
    ],
    section: 'Management',
    secondary: [
      { label: 'Patients', href: '/admin/patients', icon: <Users /> },
      { label: 'Doctors', href: '/admin/doctors', icon: <Stethoscope /> },
    ],
  };
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function getBreadcrumb(pathname: string): { label: string; href?: string }[] {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return [];
  const crumbs: { label: string; href?: string }[] = [];

  const roleLabels: Record<string, string> = {
    patient: 'Patient',
    doctor: 'Doctor',
    admin: 'Admin',
  };

  if (parts[0] && roleLabels[parts[0]]) {
    crumbs.push({ label: roleLabels[parts[0]], href: `/${parts[0]}/dashboard` });
  }

  if (parts[1]) {
    const label = parts[1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    crumbs.push({ label });
  }

  return crumbs;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [appointmentReminders, setAppointmentReminders] = useState<Appointment[] | null>(null);
  const { info } = useToast();

  useEffect(() => {
    if (!user || user.role !== 'PATIENT') return;
    let active = true;
    const checkReminders = async () => {
      try {
        const listing = await apiRequest<AppointmentListing>('/appointments/my?period=upcoming&limit=100');
        if (!active) return;
        const now = Date.now();
        const reminders = listing.data.filter((appointment) => {
          const startsAt = new Date(appointment.start_at).getTime();
          return startsAt >= now && startsAt - now <= 60 * 60 * 1000;
        });
        setAppointmentReminders(reminders);
        for (const appointment of reminders) {
          const startsAt = new Date(appointment.start_at).getTime();
          const key = `medidesk:appointment-reminder:${appointment.id}`;
          if (startsAt >= now && startsAt - now <= 60 * 60 * 1000 && !localStorage.getItem(key)) {
            localStorage.setItem(key, 'sent');
            const location = appointment.doctor.clinic_location ? ` at ${appointment.doctor.clinic_location}` : '';
            info(`Reminder: appointment with Dr. ${appointment.doctor.full_name}${location} starts within 1 hour.`);
          }
        }
      } catch {
        if (active) setAppointmentReminders([]);
      }
    };
    void checkReminders();
    const timer = window.setInterval(() => void checkReminders(), 60_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [user, info]);

  // For non-authenticated pages or landing, render children directly
  if (!user) return <>{children}</>;

  const nav = getNavItems(user.role);
  const breadcrumb = getBreadcrumb(pathname);
  const greeting = getGreeting();

  return (
    <div className="app-layout">
      {/* Sidebar overlay for mobile */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`} role="navigation" aria-label="Main navigation">
        <Link href={`/${user.role.toLowerCase()}/dashboard`} className="sidebar-brand">
          <div className="sidebar-logo">M</div>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">MediDesk</span>
            <span className="sidebar-brand-tag">Secure Healthcare</span>
          </div>
        </Link>

        <nav className="sidebar-nav">
          <span className="sidebar-section-label">Navigation</span>
          {nav.main.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${pathname === item.href || (item.href !== `/${user.role.toLowerCase()}/dashboard` && pathname.startsWith(item.href)) ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}

          {nav.section && nav.secondary && (
            <>
              <span className="sidebar-section-label">{nav.section}</span>
              {nav.secondary.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
                  onClick={() => setSidebarOpen(false)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">{getInitials(user.full_name)}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{user.full_name}</div>
              <div className="sidebar-user-role">{user.role.toLowerCase()}</div>
            </div>
          </div>
          <button
            className="sidebar-link"
            onClick={() => void logout()}
            style={{ marginTop: '4px', color: '#ef4444' }}
          >
            <LogOut size={20} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="main-content">
        {/* Top Navbar */}
        <header className="top-navbar">
          <div className="navbar-left">
            <button
              className="mobile-menu-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle navigation menu"
            >
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
            <nav className="navbar-breadcrumb" aria-label="Breadcrumb">
              {breadcrumb.map((crumb, i) => (
                <span key={i}>
                  {i > 0 && <ChevronRight size={14} className="navbar-breadcrumb-sep" />}
                  {crumb.href ? (
                    <Link href={crumb.href}>{crumb.label}</Link>
                  ) : (
                    <span className="navbar-breadcrumb-current">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>
          </div>
          <div className="navbar-right">
            {user.role === 'PATIENT' && (
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  aria-label={`Notifications, ${appointmentReminders?.length ?? 0} appointments in the next hour`}
                  aria-expanded={notificationsOpen}
                  onClick={() => setNotificationsOpen((open) => !open)}
                  style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Bell size={18} />
                  {!!appointmentReminders?.length && (
                    <span style={{ position: 'absolute', top: 0, right: 0, minWidth: '17px', height: '17px', padding: '0 4px', borderRadius: '999px', background: 'var(--color-danger)', color: '#fff', fontSize: '0.65rem', lineHeight: '17px' }}>
                      {appointmentReminders.length}
                    </span>
                  )}
                </button>
                {notificationsOpen && (
                  <div role="dialog" aria-label="Appointment notifications" style={{ position: 'absolute', zIndex: 50, top: 'calc(100% + 10px)', right: 0, width: 'min(360px, calc(100vw - 32px))', padding: '16px', background: 'var(--color-surface)', border: '1px solid var(--color-border-light)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)' }}>
                    <h3 style={{ margin: '0 0 12px', fontSize: '1rem' }}>Appointments in the next hour</h3>
                    {appointmentReminders === null ? (
                      <p className="text-sm text-muted" style={{ margin: 0 }}>Checking upcoming appointments...</p>
                    ) : appointmentReminders.length === 0 ? (
                      <p className="text-sm text-muted" style={{ margin: 0 }}>No appointments starting within the next hour.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {appointmentReminders.map((appointment) => (
                          <Link
                            key={appointment.id}
                            href="/patient/appointments"
                            onClick={() => setNotificationsOpen(false)}
                            style={{ display: 'block', padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--color-bg)', color: 'inherit', textDecoration: 'none' }}
                          >
                            <strong>Dr. {appointment.doctor.full_name}</strong>
                            <div className="text-sm" style={{ marginTop: '4px' }}>{new Date(appointment.start_at).toLocaleString()}</div>
                            <div className="text-sm text-muted" style={{ display: 'flex', gap: '5px', marginTop: '4px' }}>
                              <MapPin size={14} />
                              <span>{appointment.doctor.clinic_location || 'Clinic location not available'}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            <div className="navbar-security-badge">
              <Lock size={14} />
              <span>Secure session</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="page-container">
          {children}
        </main>
      </div>
    </div>
  );
}
