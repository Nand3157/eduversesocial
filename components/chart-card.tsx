"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAnalytics } from "@/components/dashboard/analytics-context";

const tooltipStyle = { background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, color: "var(--ink)", boxShadow: "var(--shadow-lift)", fontVariantNumeric: "tabular-nums" };
const axisTick = { fill: "var(--faint)", fontSize: 12, fontVariantNumeric: "tabular-nums" } as const;

function ChartState({ loading, message }: { loading: boolean; message?: string }) {
  const { data } = useAnalytics();
  const fallback = data?.live ? "Meta returned no data for the connected accounts in the last 28 days." : "Connect Meta to load live analytics.";
  return <div className="grid h-[220px] place-items-center rounded-xl border border-dashed border-borderSoft bg-surface/50 px-6 text-center text-xs leading-relaxed text-mutedText">{loading ? "Loading live Meta analytics…" : (message ?? fallback)}</div>;
}

export function EngagementChartCard() {
  const { data, loading } = useAnalytics();
  const chartData = data?.engagementData ?? [];
  return <Card className="lg:col-span-2"><CardHeader><CardTitle>Engagement over time</CardTitle><CardDescription>Daily activity returned by the Meta Graph API.</CardDescription></CardHeader><CardContent>{loading || chartData.length === 0 ? <ChartState loading={loading} /> : <div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><defs><linearGradient id="engagement" x1="0" x2="0" y1="0" y2="1"><stop offset="5%" stopColor="#C8552B" stopOpacity={0.28} /><stop offset="95%" stopColor="#C8552B" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid stroke="var(--line)" strokeOpacity={0.5} vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} /><YAxis hide /><Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "var(--line)" }} /><Area animationDuration={900} dataKey="engagement" fill="url(#engagement)" stroke="#C8552B" strokeWidth={2.5} type="monotone" /><Line animationDuration={1000} dataKey="comments" dot={false} stroke="#3E7D5A" strokeWidth={2} /></AreaChart></ResponsiveContainer></div>}</CardContent></Card>;
}

export function PostingFrequencyCard() {
  const { data, loading } = useAnalytics();
  const chartData = data?.postingData ?? [];
  return <Card><CardHeader><CardTitle>Posting frequency</CardTitle><CardDescription>Published posts returned by Meta.</CardDescription></CardHeader><CardContent>{loading || chartData.length === 0 ? <ChartState loading={loading} /> : <div className="h-[220px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid stroke="var(--line)" strokeOpacity={0.5} vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} /><YAxis hide /><Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent-soft)" }} /><Bar animationDuration={800} dataKey="value" fill="#C8552B" radius={[6, 6, 2, 2]} /></BarChart></ResponsiveContainer></div>}</CardContent></Card>;
}

export function AudienceGrowthCard() {
  const { data, loading } = useAnalytics();
  const chartData = data?.growthData ?? [];
  return <Card><CardHeader><CardTitle>Audience size</CardTitle><CardDescription>Follower counts returned by linked Instagram accounts.</CardDescription></CardHeader><CardContent>{loading || chartData.length === 0 ? <ChartState loading={loading} message="Meta did not return follower counts for the linked accounts." /> : <div className="h-[220px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><CartesianGrid stroke="var(--line)" strokeOpacity={0.5} vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} /><YAxis hide /><Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "var(--line)" }} /><Line animationDuration={900} dataKey="followers" dot={{ r: 4, fill: "#3E7D5A", strokeWidth: 0 }} stroke="#3E7D5A" strokeWidth={2.5} type="monotone" /></LineChart></ResponsiveContainer></div>}</CardContent></Card>;
}

export function SentimentTrendCard() {
  const { data, loading } = useAnalytics();
  const chartData = data?.sentimentData ?? [];
  return <Card><CardHeader><CardTitle>Sentiment trend</CardTitle><CardDescription>Available when comment-level sentiment data is connected.</CardDescription></CardHeader><CardContent>{loading || chartData.length === 0 ? <ChartState loading={loading} message="Meta analytics does not include sentiment by default." /> : <div className="h-[220px]"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><defs><linearGradient id="sentiment" x1="0" x2="0" y1="0" y2="1"><stop offset="5%" stopColor="#3E7D5A" stopOpacity={0.3} /><stop offset="95%" stopColor="#3E7D5A" stopOpacity={0.02} /></linearGradient></defs><XAxis dataKey="label" axisLine={false} tickLine={false} tick={axisTick} /><YAxis hide /><Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "var(--line)" }} /><Area animationDuration={900} dataKey="score" fill="url(#sentiment)" stroke="#3E7D5A" strokeWidth={2.5} type="monotone" /></AreaChart></ResponsiveContainer></div>}</CardContent></Card>;
}

export function PlatformBreakdownCard() {
  const { data, loading } = useAnalytics();
  const chartData = data?.platformBreakdown ?? [];
  const colors = ["#C8552B", "#3E7D5A", "#B7791F", "#7C6A5A"];
  if (loading || chartData.length === 0) return <ChartState loading={loading} />;
  return <div className="grid gap-5 lg:grid-cols-[220px_1fr] lg:items-center"><div className="h-[210px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie animationDuration={900} cx="50%" cy="50%" data={chartData} dataKey="value" innerRadius={54} outerRadius={82} paddingAngle={4}>{chartData.map((entry, index) => <Cell fill={colors[index % colors.length]} key={entry.name} />)}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart></ResponsiveContainer></div><div className="grid gap-3">{chartData.map((platform, index) => <div className="flex items-center justify-between gap-3 text-sm" key={platform.name}><span className="flex items-center gap-2 text-mutedText"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />{platform.name}</span><strong className="text-ink">{platform.value}%</strong></div>)}</div></div>;
}
