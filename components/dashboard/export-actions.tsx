"use client";

import { useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { useAnalytics } from "@/components/dashboard/analytics-context";
import { Button } from "@/components/ui/button";
import { downloadSnapshotCsv, openSnapshotPdf } from "@/lib/report-export";

export function ExportActions({ compact = false }: { compact?: boolean }) {
  const { data, loading } = useAnalytics();
  const [message, setMessage] = useState<string | null>(null);

  const runExport = (kind: "csv" | "pdf") => {
    if (!data?.success) {
      setMessage("Connect Meta before exporting live data.");
      return;
    }
    try {
      if (kind === "csv") downloadSnapshotCsv(data);
      else openSnapshotPdf(data);
      setMessage(kind === "csv" ? "CSV downloaded." : "PDF print view opened — choose Save as PDF.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Export could not be created.");
    }
    window.setTimeout(() => setMessage(null), 5000);
  };

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2">
        <Button disabled={loading} onClick={() => runExport("csv")} size="sm" variant="secondary">
          {loading ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" /> : <Download aria-hidden="true" className="h-3.5 w-3.5" />}
          {compact ? "CSV" : "Export CSV"}
        </Button>
        <Button disabled={loading} onClick={() => runExport("pdf")} size="sm" variant="secondary">
          <FileText aria-hidden="true" className="h-3.5 w-3.5" />
          {compact ? "PDF" : "Save PDF"}
        </Button>
      </div>
      {message && <p aria-live="polite" className="max-w-[28rem] text-right text-[11px] leading-4 text-mutedText">{message}</p>}
    </div>
  );
}
