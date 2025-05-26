/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'www.youtube.com',
      'youtube.com',
      'zimdiaspora.vercel.app',
      'supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_URL?.replace('https://', '').replace('http://', ''),
      'sdlrxbcshhjhuaqoidzh.supabase.co'
    ].filter(Boolean),
  },
};

export default nextConfig;
