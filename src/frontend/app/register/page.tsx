import Link from 'next/link';

export default function RegisterPage() {
  return (
    <div className="container auth-shell">
      <section className="panel">
        <p className="eyebrow">New account</p>
        <h1>Register</h1>
        <p className="muted">Role-based onboarding begins in the next implementation phase.</p>
        <form className="stacked-form">
          <label>
            Full name
            <input type="text" placeholder="Jane Doe" defaultValue="" />
          </label>
          <label>
            Email
            <input type="email" placeholder="name@clinic.local" defaultValue="" />
          </label>
          <label>
            Role
            <select defaultValue="patient">
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button type="button" className="primary-button full-width">
            Create account
          </button>
        </form>
        <p className="small-link">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </section>
    </div>
  );
}
