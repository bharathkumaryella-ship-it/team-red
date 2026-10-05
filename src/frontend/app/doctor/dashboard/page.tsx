import Link from 'next/link';

export default async function DoctorDashboard() {
  return (
    <div className="container page-shell">
      <section className="panel dashboard-panel">
        <p className="eyebrow">Doctor portal</p>
        <h1>Doctor dashboard</h1>
        <div className="grid two-up">
          <article className="info-card">
            <h2>Schedule</h2>
            <p>Doctor appointment actions and workflow controls will be implemented later.</p>
          </article>
          <article className="info-card">
            <h2>Records</h2>
            <p>Update your professional biography and contact details.</p>
            <Link href="/doctor/profile">Manage profile</Link>
          </article>
        </div>
      </section>
    </div>
  );
}
