import { Skeleton } from "@/components/ui/skeleton";

export default function AuthLoading() {
  return <main className="grid min-h-screen place-items-center p-6"><div className="w-full max-w-md space-y-5 rounded-3xl border border-borderSoft bg-card p-8 shadow-glass" role="status" aria-label="Loading authentication"><Skeleton className="mx-auto h-12 w-12 rounded-2xl" /><Skeleton className="mx-auto h-8 w-48" /><Skeleton className="h-12 w-full rounded-xl" /><Skeleton className="h-12 w-full rounded-xl" /><Skeleton className="h-12 w-full rounded-xl" /></div></main>;
}
