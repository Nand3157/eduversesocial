import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Memory",
  description: "The audience memory EduVerse builds from real engagement callbacks."
};

export default function MemoryRouteLayout({ children }: { children: React.ReactNode }) {
  return children;
}