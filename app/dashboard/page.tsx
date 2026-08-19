"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const DashboardHome = dynamic(() => import("@/components/dashboard/dashboard-home").then((module) => module.DashboardHome), {
  ssr: false,
  loading: () => <div className="space-y-6"><div className="space-y-3"><Skeleton className="h-3 w-32" /><Skeleton className="h-10 w-72" /><Skeleton className="h-4 w-96 max-w-full" /></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <Skeleton className="h-32 rounded-2xl" key={index} />)}</div></div>
});

export default function DashboardPage() { return <DashboardHome />; }
