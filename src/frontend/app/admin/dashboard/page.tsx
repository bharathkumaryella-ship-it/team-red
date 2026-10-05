import Link from 'next/link';

export default async function AdminDashboard() {
  return (
    <div className="container page-shell">
      <section className="panel dashboard-panel">
        <p className="eyebrow">Admin portal</p>
        <h1>Admin dashboard</h1>
        <div className="grid two-up">
          <article className="info-card">
            <h2>Operations</h2>
            <p>Search patient accounts, review permitted profile details, and deactivate or reactivate accounts.</p>
            <Link href="/admin/patients">Manage patients</Link>
          </article>
          <article className="info-card">
            <h2>Team oversight</h2>
            <p>Manage doctor profiles and account status.</p>
            <Link href="/admin/doctors">Manage doctors</Link>
          </article>
          <article className="info-card"><h2>Appointments</h2><p>Search appointments, review their details, and apply valid status changes.</p><Link href="/admin/appointments">Manage appointments</Link></article>
        </div>
      </section>
    </div>
  );
}
