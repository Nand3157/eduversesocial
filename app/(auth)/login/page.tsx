import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to EduVerse to view your audience data and saved recommendations."
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <AuthShell description="Sign in to view your audience data and saved recommendations." title="Sign in"><AuthForm mode="login" next={next} /></AuthShell>;
}
