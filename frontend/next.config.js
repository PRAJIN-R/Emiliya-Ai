/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  generateEtags: false,
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
    }
    return config;
  },
  async rewrites() {
    return [
      { source: '/login', destination: '/' },
      { source: '/signup', destination: '/' },
      { source: '/profile', destination: '/' },
    ];
  },
};

module.exports = nextConfig;
