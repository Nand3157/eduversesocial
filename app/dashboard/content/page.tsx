"use client";

import { useRef, useState } from "react";
import { FileUp, Plus, Download, CheckCircle2, X, FileText } from "lucide-react";
import { PageHeading } from "@/components/dashboard/page-heading";
import { PostTable } from "@/components/dashboard/post-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MetaPublisherModal } from "@/components/meta/meta-publisher-modal";
import { Modal, ModalContent, ModalTitle, ModalDescription } from "@/components/ui/modal";

type CsvRow = { platform: string; content: string; date: string };

export default function ContentPage() {
  const [publisherOpen, setPublisherOpen] = useState(false);
  const [csvPreview, setCsvPreview] = useState<CsvRow[] | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvSuccess, setCsvSuccess] = useState<string | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCsvPick = () => fileInputRef.current?.click();

  const handleCsvFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setCsvError("Please upload a .csv file.");
      setIsCsvModalOpen(true);
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setCsvError("CSV must be under 2 MB.");
      setIsCsvModalOpen(true);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
        if (lines.length < 2) throw new Error("CSV is empty. Needs header + at least 1 row.");
        const header = lines[0].toLowerCase().split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
        const hasPlatform = header.includes("platform");
        const hasContent = header.includes("content") || header.includes("caption") || header.includes("post");
        if (!hasPlatform || !hasContent) throw new Error("CSV header must include 'platform' and 'content' (or caption/post). Optional: date.");
        const platformIdx = header.indexOf("platform");
        const contentIdx = header.indexOf("content") !== -1 ? header.indexOf("content") : header.indexOf(header.includes("caption") ? "caption" : "post");
        const dateIdx = header.indexOf("date");
        const rows: CsvRow[] = [];
        for (let i = 1; i < Math.min(lines.length, 51); i++) {
          const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
          const platform = (cols[platformIdx] || "instagram").toLowerCase();
          const content = cols[contentIdx] || "";
          const date = dateIdx !== -1 ? cols[dateIdx] || new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(new Date()) : new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(new Date());
          if (!content) continue;
          if (!["instagram","facebook","threads"].includes(platform)) continue;
          rows.push({ platform, content: content.slice(0, 2200), date });
        }
        if (rows.length === 0) throw new Error("No valid rows. Check platform is instagram/facebook/threads and content is not empty.");
        if (lines.length > 51) setCsvError(`Showing first 50 of ${lines.length - 1} rows. Split larger files.`);
        else setCsvError(null);
        setCsvPreview(rows);
        setIsCsvModalOpen(true);
        try { localStorage.setItem("eduverse:csv-import", JSON.stringify({ at: new Date().toISOString(), rows })); } catch {}
        window.dispatchEvent(new CustomEvent("eduverse:csv-imported", { detail: rows }));
      } catch (e) {
        setCsvPreview(null);
        setCsvError(e instanceof Error ? e.message : "Could not parse CSV.");
        setIsCsvModalOpen(true);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const downloadTemplate = () => {
    const csv = "platform,content,date\ninstagram,5 AI automations creators use weekly 🚀,2026-08-21\nfacebook,How we grew engagement 20% this month,2026-08-22\nthreads,Hot take: carousels beat reels for saves,2026-08-23\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "eduverse-content-template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <PageHeading description="Search, filter, and understand every post in one place." eyebrow="Content intelligence" title="Content library" />
        <div className="flex flex-wrap gap-2">
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsvFile(f); }} />
          <Button size="sm" variant="secondary" onClick={handleCsvPick}>
            <FileUp aria-hidden="true" className="h-4 w-4" />
            Upload CSV
          </Button>
          <Button size="sm" variant="ghost" onClick={downloadTemplate} title="Download CSV template">
            <Download aria-hidden="true" className="h-3.5 w-3.5" />
            Template
          </Button>
          <Button size="sm" className="bg-ink text-background hover:bg-ink/90" onClick={() => setPublisherOpen(true)}>
            <Plus aria-hidden="true" className="h-4 w-4" />
            New post
          </Button>
        </div>
      </div>

      {csvSuccess && (
        <div role="status" aria-live="polite" className="flex items-center gap-2 rounded-xl border border-success/25 bg-success/10 px-4 py-3 text-sm text-success">
          <CheckCircle2 aria-hidden="true" className="h-4 w-4" /> {csvSuccess}
          <button onClick={() => setCsvSuccess(null)} aria-label="Dismiss message" className="ml-auto rounded-lg p-1.5 text-success hover:text-success/70 focus-visible:ring-2 focus-visible:ring-success/50 focus-visible:outline-none"><X aria-hidden="true" className="h-4 w-4" /></button>
        </div>
      )}

      <Card>
        <CardContent className="p-5">
          <PostTable csvRows={csvPreview ?? undefined} />
        </CardContent>
      </Card>

      <MetaPublisherModal isOpen={publisherOpen} onClose={() => setPublisherOpen(false)} onSuccess={() => { setPublisherOpen(false); setCsvSuccess("Post dispatched — check Meta and analytics will refresh shortly."); setTimeout(() => setCsvSuccess(null), 4000); }} />

      <Modal open={isCsvModalOpen} onOpenChange={setIsCsvModalOpen}>
        <ModalContent className="max-w-2xl">
          <ModalTitle>CSV Import Preview</ModalTitle>
          <ModalDescription>Parsed {csvPreview?.length ?? 0} rows. Content stays local until you publish. Max 50 rows per import.</ModalDescription>
          {csvError && <div className="mt-4 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning">{csvError}</div>}
          {csvPreview && csvPreview.length > 0 ? (
            <>
              <div className="mt-4 max-h-72 overflow-auto rounded-xl border border-borderSoft">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-surface text-mutedText"><tr><th className="px-3 py-2">Platform</th><th className="px-3 py-2">Content</th><th className="px-3 py-2">Date</th></tr></thead>
                  <tbody>{csvPreview.slice(0, 10).map((r, i) => <tr key={i} className="border-t border-borderSoft"><td className="px-3 py-2 font-medium capitalize">{r.platform}</td><td className="max-w-[320px] truncate px-3 py-2">{r.content}</td><td className="px-3 py-2 tabular-nums">{r.date}</td></tr>)}</tbody>
                </table>
              </div>
              {csvPreview.length > 10 && <p className="mt-2 text-xs text-mutedText">Showing 10 of {csvPreview.length} rows. All rows are searchable in the library below after import.</p>}
              <div className="mt-4 flex justify-between gap-2">
                <Button variant="ghost" onClick={() => { setCsvPreview(null); setIsCsvModalOpen(false); }}>Discard</Button>
                <Button variant="primary" onClick={() => { setCsvSuccess(`Imported ${csvPreview.length} rows from CSV — visible in library (local only, not yet published). Use New post to dispatch.`); setIsCsvModalOpen(false); setTimeout(() => setCsvSuccess(null), 5000); }}>
                  <FileText className="h-4 w-4" /> Keep in library
                </Button>
              </div>
            </>
          ) : (
            <div className="mt-6 flex justify-end"><Button variant="secondary" onClick={() => setIsCsvModalOpen(false)}>Close</Button></div>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
