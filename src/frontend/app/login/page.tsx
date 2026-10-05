import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="container auth-shell">
      <section className="panel">
        <p className="eyebrow">Access portal</p>
        <h1>Sign in</h1>
        <p className="muted">Authentication will be implemented in a future phase.</p>
        <form className="stacked-form">
          <label>
            Email
            <input type="email" placeholder="name@clinic.local" defaultValue="" />
          </label>
          <label>
            Password
            <input type="password" placeholder="Enter secure password" defaultValue="" />
          </label>
          <button type="button" className="primary-button full-width">
            Login
          </button>
        </form>
        <p className="small-link">
          Need an account? <Link href="/register">Create one</Link>
        </p>
      </section>
    </div>
  );
}
