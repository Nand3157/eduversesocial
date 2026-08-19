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

// Production-only headers: HSTS and a CSP. Next.js hydration relies on inline
// scripts/styles, so script-src/style-src keep 'unsafe-inline'; the CSP still
// blocks remote script/style/frame injection and locks data egress to the
// known Supabase and Meta endpoints.
const productionHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://graph.facebook.com https://graph.threads.net https://*.fbcdn.net https://*.cdninstagram.com https://lookaside.fbsbx.com",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://graph.facebook.com https://graph.threads.net https://threads.net",
      "upgrade-insecure-requests"
    ].join("; ")
  }
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
      { protocol: "https", hostname: "lookaside.fbsbx.com" }
    ]
  }
};

export default nextConfig;
