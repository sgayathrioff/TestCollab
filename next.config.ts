import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize for faster dev server
  reactStrictMode: false, // Disable strict mode to prevent double-rendering in dev
  
  // Reduce compilation time
  experimental: {
    optimizePackageImports: ['lucide-react', '@supabase/supabase-js'],
  },
  
  // Use Turbopack (default in Next.js 16) - faster than webpack
  turbopack: {},
};

export default nextConfig;
