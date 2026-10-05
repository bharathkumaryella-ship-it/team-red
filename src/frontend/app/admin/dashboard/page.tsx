import { getHealthStatus } from '@/lib/api';

export default async function AdminDashboard() {
  const health = await getHealthStatus();

  return (
    <div className="container page-shell">
      <section className="panel dashboard-panel">
        <p className="eyebrow">Admin portal</p>
        <h1>Admin dashboard</h1>
        <p className="muted">Backend health: {health.status}</p>
        <div className="grid two-up">
          <article className="info-card">
            <h2>Operations</h2>
            <p>Platform administration will be implemented in a later phase with validation and audit controls.</p>
          </article>
          <article className="info-card">
            <h2>Team oversight</h2>
            <p>Patient, doctor, and appointment management controls will follow after the security model is ready.</p>
          </article>
        </div>
      </section>
    </div>
  );
}
