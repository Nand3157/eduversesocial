import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings",
  description: "Manage your profile, security, notifications, and connected Meta accounts."
};

export default function SettingsRouteLayout({ children }: { children: React.ReactNode }) {
  return children;
}