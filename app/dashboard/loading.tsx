import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-label="Loading dashboard" role="status">
      <div className="flex items-end justify-between gap-4"><div className="space-y-3"><Skeleton className="h-3 w-32" /><Skeleton className="h-10 w-72" /><Skeleton className="h-4 w-96 max-w-full" /></div><Skeleton className="hidden h-10 w-36 sm:block" /></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton className="h-32 rounded-2xl" key={index} />)}</div>
      <div className="grid gap-5 xl:grid-cols-3"><Skeleton className="h-[340px] rounded-2xl xl:col-span-2" /><Skeleton className="h-[340px] rounded-2xl" /></div>
    </div>
  );
}
