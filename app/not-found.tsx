import Link from "next/link";
import { Compass, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-accent-soft text-primary">
          <Compass />
        </span>
        <p className="mt-6 text-sm font-semibold text-primary">404</p>
        <h1 className="mt-2 font-heading text-4xl font-medium tracking-tight">
          This path lost its signal.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-mutedText">
          The page you requested is not available. Head back to the dashboard or start from the home
          page.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/">
            <Button>Back home</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="secondary">
              <LayoutDashboard className="h-4 w-4" />
              Open dashboard
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}