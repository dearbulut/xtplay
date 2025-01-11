/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'tvsmart.vip',
      },
      {
        protocol: 'http',
        hostname: 'fanc.tmsimg.com',
      },
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
      },
      {
        protocol: 'https',
        hostname: 'i4.hurimg.com',
      },
      {
        protocol: 'https',
        hostname: 'i.hurimg.com',
      },
      {
        protocol: 'https',
        hostname: 'i2.hurimg.com',
      },
      {
        protocol: 'https',
        hostname: 'i3.hurimg.com',
      }
    ],
  },
}

module.exports = nextConfig