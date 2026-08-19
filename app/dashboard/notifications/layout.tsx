import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notifications",
  description: "Alerts and audience updates from your connected accounts."
};

export default function NotificationsRouteLayout({ children }: { children: React.ReactNode }) {
  return children;
}