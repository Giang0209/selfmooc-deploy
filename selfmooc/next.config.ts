/** @type {import('next').NextConfig} */
const nextConfig = {
  // 🎯 Ép Next.js xử lý lightningcss như một package ngoài
  serverExternalPackages: ['lightningcss'],

  // 🎯 Tăng giới hạn upload cho Server Action
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
};

export default nextConfig;