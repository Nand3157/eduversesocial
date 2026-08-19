import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics",
  description: "Cross-platform telemetry and engagement trends from your connected Meta accounts."
};

export default function AnalyticsRouteLayout({ children }: { children: React.ReactNode }) {
  return children;
}