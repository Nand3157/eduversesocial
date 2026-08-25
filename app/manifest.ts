import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EduVerse — Social intelligence that remembers your audience",
    short_name: "EduVerse",
    description: "Indexes IG/FB/Threads engagement into persistent memory, then tells you what to post and when.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#faf7f0",
    theme_color: "#c8552b",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}
