/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '16mb',
    },
  },
  images: {
    domains: [],
  },
}

module.exports = nextConfig
