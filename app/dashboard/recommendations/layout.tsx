import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recommendations",
  description: "AI posting recommendations grounded in your live audience memory."
};

export default function RecommendationsRouteLayout({ children }: { children: React.ReactNode }) {
  return children;
}