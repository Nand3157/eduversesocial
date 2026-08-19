import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Set a new password",
  description: "Choose a new, strong password for your EduVerse account."
};

export default function ResetPasswordPage() { return <AuthShell description="Choose a new, strong password for your account." title="Set a new password"><AuthForm mode="reset" /></AuthShell>; }
