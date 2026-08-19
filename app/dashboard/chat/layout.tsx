import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Chat",
  description: "Ask EduVerse anything about your audience and get grounded answers."
};

export default function ChatRouteLayout({ children }: { children: React.ReactNode }) {
  return children;
}