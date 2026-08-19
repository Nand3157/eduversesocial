/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "recharts"]
  },
  images: {
    // Meta Graph avatar URLs are served from Meta's content CDNs.
    remotePatterns: [
      { protocol: "https", hostname: "graph.facebook.com" },
      { protocol: "https", hostname: "graph.threads.net" },
      { protocol: "https", hostname: "**.fbcdn.net" },
      { protocol: "https", hostname: "**.cdninstagram.com" },
      { protocol: "https", hostname: "lookaside.fbsbx.com" }
    ]
  }
};

export default nextConfig;
