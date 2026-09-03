import type { AnalyticsSnapshot } from "@/lib/meta-analytics";

type ExportCell = string | number | null | undefined;

const EXPORT_COLUMNS = [
  "section",
  "platform",
  "date",
  "label",
  "value",
  "likes",
  "comments",
  "shares",
  "reach",
  "status",
  "detail",
] as const;

function csvCell(value: ExportCell) {
  const text = value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadBlob(content: BlobPart, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function snapshotExportRows(snapshot: AnalyticsSnapshot) {
  const rows: Record<(typeof EXPORT_COLUMNS)[number], ExportCell>[] = [];

  snapshot.metrics.forEach((metric) => rows.push({ section: "metric", platform: "", date: "", label: metric.label, value: metric.value, likes: "", comments: "", shares: "", reach: "", status: "", detail: metric.detail }));
  snapshot.platformBreakdown.forEach((item) => rows.push({ section: "platform", platform: item.name, date: "", label: "Engagement share", value: item.value, likes: "", comments: "", shares: "", reach: "", status: "", detail: "" }));
  snapshot.postingData.forEach((item) => rows.push({ section: "posting", platform: item.label, date: "", label: "Published posts", value: item.value, likes: "", comments: "", shares: "", reach: "", status: "", detail: "" }));
  snapshot.growthData.forEach((item) => rows.push({ section: "audience", platform: item.label, date: "", label: "Followers", value: item.followers, likes: "", comments: "", shares: "", reach: "", status: "", detail: "" }));
  snapshot.engagementData.forEach((item) => rows.push({ section: "engagement", platform: "", date: item.label, label: "Engagement", value: item.engagement, likes: "", comments: item.comments, shares: "", reach: "", status: "", detail: "" }));
  snapshot.sentimentData.forEach((item) => rows.push({ section: "sentiment", platform: "", date: item.label, label: "Sentiment score", value: item.score, likes: "", comments: "", shares: "", reach: "", status: "", detail: "" }));
  snapshot.recentPosts.forEach((post) => rows.push({ section: "post", platform: post.platform, date: post.date, label: post.post, value: "", likes: post.likes, comments: post.comments, shares: post.shares, reach: post.reach, status: post.status, detail: "" }));
  snapshot.memoryItems.forEach((item) => rows.push({ section: "memory", platform: "", date: "", label: item, value: "", likes: "", comments: "", shares: "", reach: "", status: "", detail: "Derived from live insights" }));
  snapshot.recommendations.forEach(([title, timing, detail]) => rows.push({ section: "recommendation", platform: "", date: "", label: title, value: "", likes: "", comments: "", shares: "", reach: "", status: timing, detail }));

  return rows;
}

export function downloadSnapshotCsv(snapshot: AnalyticsSnapshot, filename = "eduverse-analytics.csv") {
  const rows = snapshotExportRows(snapshot);
  const csv = [
    EXPORT_COLUMNS.join(","),
    ...rows.map((row) => EXPORT_COLUMNS.map((column) => csvCell(row[column])).join(",")),
  ].join("\n");
  downloadBlob(`\ufeff${csv}\n`, filename, "text/csv;charset=utf-8");
}

export function downloadContentCsv(snapshot: AnalyticsSnapshot, filename = "eduverse-content.csv") {
  const rows = snapshot.recentPosts.map((post) => [post.platform.toLowerCase().replace(/ business| pages/g, ""), post.post, post.date]);
  const csv = ["platform,content,date", ...rows.map((row) => row.map(csvCell).join(","))].join("\n");
  downloadBlob(`\ufeff${csv}\n`, filename, "text/csv;charset=utf-8");
}

function escapeHtml(value: ExportCell) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function reportTable(headers: string[], rows: ExportCell[][]) {
  return `<table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

export function openSnapshotPdf(snapshot: AnalyticsSnapshot) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) throw new Error("Allow pop-ups to create the PDF report.");
  printWindow.opener = null;

  const generatedAt = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date());
  const metrics = snapshot.metrics.map((metric) => `<div class="metric"><span>${escapeHtml(metric.label)}</span><strong>${escapeHtml(metric.value)}${escapeHtml(metric.suffix)}</strong><small>${escapeHtml(metric.detail)}</small></div>`).join("");
  const platformRows = snapshot.platformBreakdown.map((item) => [item.name, item.value]);
  const postRows = snapshot.recentPosts.map((post) => [post.platform, post.date, post.post, post.likes, post.comments, post.reach]);
  const memoryRows = snapshot.memoryItems.map((item) => [item]);
  const recommendationRows = snapshot.recommendations.map(([title, timing, detail]) => [title, timing, detail]);

  printWindow.document.write(`<!doctype html><html><head><title>EduVerse analytics report</title><meta name="color-scheme" content="light"><style>
    @page{size:auto;margin:16mm}*{box-sizing:border-box}body{margin:0;color:#201b16;background:#fff;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:980px;margin:0 auto}header{display:flex;justify-content:space-between;gap:24px;align-items:flex-end;border-bottom:2px solid #c66b3d;padding-bottom:18px;margin-bottom:22px}h1{font:700 30px/1.1 Georgia,serif;margin:0}h2{font:700 17px/1.2 Georgia,serif;margin:28px 0 10px}p{margin:5px 0;color:#6f665e}.meta{font-size:12px;text-align:right;color:#6f665e}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.metric{border:1px solid #ded7ce;border-radius:10px;padding:13px}.metric span,.metric small{display:block;color:#6f665e;font-size:11px}.metric strong{display:block;font-size:25px;line-height:1.2;margin:5px 0}table{width:100%;border-collapse:collapse;font-size:12px}th,td{border-bottom:1px solid #e7e1d9;text-align:left;padding:8px 7px;vertical-align:top}th{background:#f5f1ec;color:#6f665e;font-size:10px;text-transform:uppercase;letter-spacing:.08em}td:nth-child(3){max-width:360px}footer{border-top:1px solid #ded7ce;margin-top:30px;padding-top:12px;color:#6f665e;font-size:11px}@media print{h2{break-after:avoid}.metrics,table{break-inside:avoid}}
  </style></head><body><main><header><div><p>EDUVERSE / AUDIENCE MEMORY</p><h1>Analytics report</h1><p>Live snapshot${snapshot.cached ? " · cached" : ""}</p></div><div class="meta">Generated ${escapeHtml(generatedAt)}<br>${snapshot.accounts.length} connected account${snapshot.accounts.length === 1 ? "" : "s"}</div></header><section class="metrics">${metrics || "<p>No metrics available.</p>"}</section><h2>Platform mix</h2>${reportTable(["Platform", "Value"], platformRows)}<h2>Recent posts</h2>${reportTable(["Platform", "Date", "Post", "Likes", "Comments", "Reach"], postRows)}<h2>Audience memory</h2>${reportTable(["Signal"], memoryRows)}<h2>Recommendations</h2>${reportTable(["Recommendation", "Window", "Why this"], recommendationRows)}<footer>EduVerse keeps recommendations grounded in connected Meta data. This report was generated from the current workspace snapshot.</footer></main></body></html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.setTimeout(() => printWindow.print(), 250);
}
