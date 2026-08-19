import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Verify your email",
  description: "Confirm your email address to activate your EduVerse workspace."
};

export default function VerifyEmailPage() { return <AuthShell description="We sent a confirmation link to your inbox. Open it to activate your workspace." title="Verify your email"><div className="mt-8 rounded-xl border border-primary/25 bg-accent-soft p-5 text-center"><MailCheck className="mx-auto h-8 w-8 text-primary" /><p className="mt-3 text-sm text-mutedText">You can close this tab after confirming your email.</p></div><Button className="mt-5 w-full" variant="secondary"><Link href="/login">Back to sign in</Link></Button></AuthShell>; }
