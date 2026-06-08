/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Aumenta o timeout máximo das API Routes para 30s (máximo no free tier da Vercel)
  serverRuntimeConfig: {
    apiTimeout: 25000,
  },
};

module.exports = nextConfig;
