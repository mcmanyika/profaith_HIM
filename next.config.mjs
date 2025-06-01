/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.youtube.com',
      },
      {
        protocol: 'https',
        hostname: 'youtube.com',
      },
      {
        protocol: 'https',
        hostname: 'zimdiaspora.vercel.app',
      },
      {
        protocol: 'https',
        hostname: 'supabase.co',
      },
      {
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '').replace('http://', ''),
      },
      {
        protocol: 'https',
        hostname: 'sdlrxbcshhjhuaqoidzh.supabase.co',
      }
    ].filter(Boolean),
  },
};

export default nextConfig;
