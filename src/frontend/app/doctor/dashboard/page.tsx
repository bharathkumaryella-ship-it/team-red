import { getHealthStatus } from '@/lib/api';

export default async function DoctorDashboard() {
  const health = await getHealthStatus();

  return (
    <div className="container page-shell">
      <section className="panel dashboard-panel">
        <p className="eyebrow">Doctor portal</p>
        <h1>Doctor dashboard</h1>
        <p className="muted">Backend health: {health.status}</p>
        <div className="grid two-up">
          <article className="info-card">
            <h2>Schedule</h2>
            <p>Doctor appointment actions and workflow controls will be implemented later.</p>
          </article>
          <article className="info-card">
            <h2>Records</h2>
            <p>Authorized patient information access will be added when the domain model is ready.</p>
          </article>
        </div>
      </section>
    </div>
  );
}
