/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'api.bigcompany.rw', 'bigcompany-api.alexandratechlab.com'],
  },
  async rewrites() {
    // Use MEDUSA_BACKEND_URL for server-side rewrites (Docker internal network)
    // Falls back to NEXT_PUBLIC for client-side compatibility
    const backendUrl = process.env.MEDUSA_BACKEND_URL || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || 'http://localhost:9000';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
