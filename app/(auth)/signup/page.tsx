import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Create a free EduVerse workspace to connect your Meta accounts and learn from live engagement."
};

export default function SignUpPage() { return <AuthShell description="Create a workspace to connect Instagram, Facebook, or Threads and learn from live engagement." title="Create your account"><AuthForm mode="signup" /></AuthShell>; }
