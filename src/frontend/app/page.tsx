import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="container page-shell">
      <section className="hero-card">
        <p className="eyebrow">Foundation phase</p>
        <h1>MediDesk</h1>
        <p className="lead">
          Secure clinic and appointment management built on a modular backend and
          role-based frontend foundation.
        </p>
        <div className="button-row">
          <Link href="/login" className="primary-button">
            Login
          </Link>
          <Link href="/register" className="secondary-button">
            Register
          </Link>
        </div>
      </section>

      <section className="grid three-up">
        <article className="info-card">
          <h2>Patients</h2>
          <p>Register, manage a profile, and review upcoming appointments.</p>
        </article>
        <article className="info-card">
          <h2>Doctors</h2>
          <p>Review clinic schedules and manage authorized patient information.</p>
        </article>
        <article className="info-card">
          <h2>Admins</h2>
          <p>Coordinate patient, doctor, and appointment administration.</p>
        </article>
      </section>
    </div>
  );
}
