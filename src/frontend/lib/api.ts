const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function getHealthStatus() {
  const response = await fetch(`${apiBaseUrl}/api/health`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Unable to reach the backend health endpoint');
  }

  return response.json() as Promise<{ status: string; service: string }>;
}
