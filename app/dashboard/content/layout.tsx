import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Content",
  description: "Your posts, drafts, and publishing queue across connected platforms."
};

export default function ContentRouteLayout({ children }: { children: React.ReactNode }) {
  return children;
}