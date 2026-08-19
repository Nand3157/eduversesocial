import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Reset your password",
  description: "Request a secure password reset link for your EduVerse account."
};

export default function ForgotPasswordPage() { return <AuthShell description="Enter your email and we will send a secure reset link." title="Reset your password"><AuthForm mode="forgot" /></AuthShell>; }
