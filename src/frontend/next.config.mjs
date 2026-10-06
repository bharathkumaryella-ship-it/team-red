/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Keep file tracing inside this app instead of walking up into unrelated
  // lockfiles in the user's home directory (which can also fail in CI/sandbox).
  outputFileTracingRoot: process.cwd(),
  async headers() {
    const headers = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ];

    if (process.env.NODE_ENV === 'production') {
      headers.push({ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' });
    }

    return [{ source: '/:path*', headers }];
  },
};

export default nextConfig;
