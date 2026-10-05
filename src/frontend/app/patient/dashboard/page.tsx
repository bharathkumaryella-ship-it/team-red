import { getHealthStatus } from '@/lib/api';

export default async function PatientDashboard() {
  const health = await getHealthStatus();

  return (
    <div className="container page-shell">
      <section className="panel dashboard-panel">
        <p className="eyebrow">Patient portal</p>
        <h1>Patient dashboard</h1>
        <p className="muted">Backend health: {health.status}</p>
        <div className="grid two-up">
          <article className="info-card">
            <h2>Upcoming visits</h2>
            <p>Appointment views and booking workflows will be implemented later.</p>
          </article>
          <article className="info-card">
            <h2>Profile</h2>
            <p>Basic patient profile management will be added in the next phase.</p>
          </article>
        </div>
      </section>
    </div>
  );
}
