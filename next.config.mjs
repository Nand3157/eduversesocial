/** @type {import('next').NextConfig} */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  // Isolate this origin from other windows/top-level documents: same-origin
  // window references stay, cross-origin ones are opened in their own context.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Block other sites from embedding EduVerse resources (guard against
  // cross-site data exfiltration via subresource/frame inclusion).
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" }
];

// Production-only headers: HSTS. The Content-Security-Policy is issued per
// request with a fresh nonce by proxy.ts (static CSP here could not carry a
// nonce, which would force keeping 'unsafe-inline' for scripts).
const productionHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion", "recharts"]
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: process.env.NODE_ENV === "production" ? [...securityHeaders, ...productionHeaders] : securityHeaders
      }
    ];
  },
  images: {
    // Meta Graph avatar URLs are served from Meta's content CDNs.
    remotePatterns: [
      { protocol: "https", hostname: "graph.facebook.com" },
      { protocol: "https", hostname: "graph.threads.net" },
      { protocol: "https", hostname: "**.fbcdn.net" },
      { protocol: "https", hostname: "**.cdninstagram.com" },
      { protocol: "https", hostname: "lookaside.fbsbx.com" },
      { protocol: "https", hostname: "**.supabase.co" }
    ]
  },
  // Exclude docs-only folder from output tracing
  outputFileTracingExcludes: { "*": ["./css-dev-skills/**/*", "./tests/**/*"] }
};

export default nextConfig;
