import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Create your account",
  description: "Create a free EduVerse account and start learning what your audience really wants."
};

export default function SignUpPage() { return <AuthShell description="Start building a better understanding of your audience." title="Create your account"><AuthForm mode="signup" /></AuthShell>; }
