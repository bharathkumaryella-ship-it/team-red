import Link from 'next/link';

export default async function PatientDashboard() {
  return (
    <div className="container page-shell">
      <section className="panel dashboard-panel">
        <p className="eyebrow">Patient portal</p>
        <h1>Patient dashboard</h1>
        <div className="grid two-up">
          <article className="info-card">
            <h2>Upcoming visits</h2>
            <p>Review your visits, check appointment details, or book time with an active doctor.</p>
            <Link href="/patient/appointments">View appointments</Link> · <Link href="/patient/book-appointment">Book a visit</Link>
          </article>
          <article className="info-card">
            <h2>Profile</h2>
            <p>Review and update your contact and demographic information.</p>
            <Link href="/patient/profile">Manage profile</Link>
          </article>
          <article className="info-card"><h2>Care team</h2><p>Browse active doctors and their professional information.</p><Link href="/patient/doctors">Find a doctor</Link></article>
        </div>
      </section>
    </div>
  );
}
