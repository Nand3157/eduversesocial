"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Cloud, Code2, Copy, Download, ExternalLink, Palette, Send, Zap } from "lucide-react";
import { useAnalytics } from "@/components/dashboard/analytics-context";
import { ExportActions } from "@/components/dashboard/export-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { downloadContentCsv, downloadSnapshotCsv } from "@/lib/report-export";

const subscribeToStorage = (callback: () => void) => {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
};

const getStoredZapierUrl = () => {
  try { return localStorage.getItem("eduverse:zapier-webhook-url") || ""; } catch { return ""; }
};

const getServerZapierUrl = () => "";

export function IntegrationCenter() {
  const { data } = useAnalytics();
  const apiUrl = "/api/v1";
  const storedZapierUrl = useSyncExternalStore(subscribeToStorage, getStoredZapierUrl, getServerZapierUrl);
  const [zapierDraft, setZapierDraft] = useState<string | null>(null);
  const zapierUrl = zapierDraft ?? storedZapierUrl;
  const [zapierMessage, setZapierMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const saveZapierUrl = (value: string) => {
    setZapierDraft(value);
    try { localStorage.setItem("eduverse:zapier-webhook-url", value); } catch {}
  };

  const sendToZapier = async () => {
    if (!zapierUrl.trim()) {
      setZapierMessage("Paste a Zapier Catch Hook URL first.");
      return;
    }
    if (!data?.success) {
      setZapierMessage("Connect Meta before sending an analytics event.");
      return;
    }
    try {
      const response = await fetch(zapierUrl.trim(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source: "eduverse", event: "analytics.snapshot", sent_at: new Date().toISOString(), snapshot: data }),
      });
      if (!response.ok) throw new Error(`Zapier returned ${response.status}. Check the hook URL.`);
      setZapierMessage("Snapshot sent to Zapier.");
    } catch (error) {
      setZapierMessage(error instanceof Error ? error.message : "Could not reach Zapier.");
    }
    window.setTimeout(() => setZapierMessage(null), 5000);
  };

  const copyApiUrl = async () => {
    try {
      const absoluteApiUrl = `${window.location.origin}${apiUrl}`;
      await navigator.clipboard.writeText(absoluteApiUrl);
      setCopied(true);
    } catch {
      setZapierMessage("Clipboard access is unavailable. Copy the API URL manually.");
      return;
    }
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Data transfer</p>
          <h1 className="mt-2 font-heading text-3xl font-medium tracking-tight text-ink sm:text-4xl">Exports & integrations</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-mutedText">Move your audience memory into the tools your team already uses. Live exports stay grounded in the current workspace snapshot.</p>
        </div>
        <ExportActions compact />
      </div>

      <Card className="border-primary/25 bg-accent-soft/30">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-ink">Export center</p>
            <p className="mt-1 text-sm leading-6 text-mutedText">CSV contains metrics, posts, memory, and recommendations. PDF opens a print-ready report you can save from your browser.</p>
          </div>
          <ExportActions />
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Cloud aria-hidden="true" className="h-5 w-5 text-primary" /> Google Drive</CardTitle>
            <CardDescription>Save workspace exports alongside your existing lesson and campaign files.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-mutedText">The export is ready now: download a CSV or PDF, then place it in Drive. Direct Drive OAuth upload can be enabled later with a Google client ID.</p>
            <div className="flex flex-wrap gap-2">
              <Button disabled={!data?.success} onClick={() => data && downloadSnapshotCsv(data)} size="sm" variant="secondary"><Cloud aria-hidden="true" className="h-3.5 w-3.5" /> Download for Drive</Button>
              <a className="inline-flex h-10 min-h-[44px] items-center gap-2 rounded-full border border-borderSoft bg-card px-3.5 text-xs font-medium text-ink transition hover:border-mutedText/40 hover:bg-surface" href="https://drive.google.com/drive/my-drive" rel="noreferrer" target="_blank">Open Drive <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" /></a>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Palette aria-hidden="true" className="h-5 w-5 text-primary" /> Canva</CardTitle>
            <CardDescription>Turn high-performing post rows into a Canva Bulk Create input.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-mutedText">EduVerse exports a simple platform, content, and date CSV so you can map content into Canva templates without copying each post by hand.</p>
            <div className="flex flex-wrap gap-2">
              <Button disabled={!data?.success} onClick={() => data && downloadContentCsv(data)} size="sm" variant="secondary"><Download aria-hidden="true" className="h-3.5 w-3.5" /> Content CSV</Button>
              <a className="inline-flex h-10 min-h-[44px] items-center gap-2 rounded-full border border-borderSoft bg-card px-3.5 text-xs font-medium text-ink transition hover:border-mutedText/40 hover:bg-surface" href="https://www.canva.com/" rel="noreferrer" target="_blank">Open Canva <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" /></a>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Zap aria-hidden="true" className="h-5 w-5 text-primary" /> Zapier webhook</CardTitle>
            <CardDescription>Send a live analytics snapshot to any Zapier workflow with a Catch Hook trigger.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-borderSoft bg-surface-muted p-4 text-sm leading-6 text-mutedText">Create a Zap with <strong className="font-semibold text-ink">Webhooks by Zapier → Catch Hook</strong>, paste the generated URL below, then send a test snapshot. The URL is stored only in this browser.</div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="sr-only" htmlFor="zapier-webhook-url">Zapier Catch Hook URL</label>
              <input id="zapier-webhook-url" className="h-11 min-w-0 flex-1 rounded-full border border-borderSoft bg-surface px-4 text-sm outline-none transition focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40" onChange={(event) => saveZapierUrl(event.target.value)} placeholder="https://hooks.zapier.com/hooks/catch/…" spellCheck={false} type="url" value={zapierUrl} />
              <Button disabled={!data?.success} onClick={sendToZapier} size="sm" variant="primary"><Send aria-hidden="true" className="h-3.5 w-3.5" /> Send test snapshot</Button>
            </div>
            {zapierMessage && <p aria-live="polite" className="text-xs text-mutedText">{zapierMessage}</p>}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Code2 aria-hidden="true" className="h-5 w-5 text-primary" /> Public API</CardTitle>
            <CardDescription>Use the machine-readable discovery surface while authenticated operations continue to be added.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-mono text-xs text-mutedText">{apiUrl}</p>
              <p className="mt-1 text-sm leading-6 text-mutedText">Read the developer guide and OpenAPI document before wiring an external automation.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={copyApiUrl} size="sm" variant="secondary">{copied ? <Check aria-hidden="true" className="h-3.5 w-3.5 text-success" /> : <Copy aria-hidden="true" className="h-3.5 w-3.5" />}{copied ? "Copied" : "Copy base URL"}</Button>
              <Button asChild size="sm" variant="secondary"><Link href="/developers">Developer guide <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" /></Link></Button>
              <Button asChild size="sm" variant="secondary"><a href="/openapi.json" target="_blank" rel="noreferrer">OpenAPI <ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5" /></a></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
