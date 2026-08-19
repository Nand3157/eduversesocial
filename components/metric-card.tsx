import { ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type MetricTone = "primary" | "success" | "warning";

const toneMap: Record<MetricTone, "primary" | "success" | "warning"> = {
  primary: "primary",
  success: "success",
  warning: "warning"
};

export function MetricCard({
  label,
  value,
  change,
  tone
}: {
  label: string;
  value: string;
  change: string;
  tone: MetricTone;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm text-mutedText">{label}</p>
          <span className="grid h-8 w-8 place-items-center rounded-full border border-borderSoft bg-surface">
            <ArrowUpRight className="h-4 w-4 text-mutedText" />
          </span>
        </div>
        <div className="mt-3 flex items-end justify-between gap-3">
          <strong className="font-display text-3xl font-medium tracking-tight text-ink">
            <span className="tabular-nums">{value}</span>
          </strong>
          <Badge variant={toneMap[tone]}>{change}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
