import type { AnalyticsSnapshot } from "@/lib/meta-analytics";
import { computeBestTimes, type TimedPost } from "@/lib/best-time";

const DEMO_SIGNALS: TimedPost[] = [
  { timestamp: "2026-07-22T13:30:00Z", platform: "instagram", engagement: 4521, likes: 4200, comments: 312, shares: 9, mediaType: "CAROUSEL", accountId: "demo_ig_001", accountLabel: "@eduverse.demo" },
  { timestamp: "2026-07-24T13:15:00Z", platform: "instagram", engagement: 3950, likes: 3600, comments: 248, shares: 102, mediaType: "CAROUSEL", accountId: "demo_ig_001", accountLabel: "@eduverse.demo" },
  { timestamp: "2026-07-29T13:45:00Z", platform: "instagram", engagement: 4680, likes: 4300, comments: 290, shares: 90, mediaType: "IMAGE", accountId: "demo_ig_001", accountLabel: "@eduverse.demo" },
  { timestamp: "2026-08-05T13:20:00Z", platform: "instagram", engagement: 4590, likes: 4200, comments: 301, shares: 89, mediaType: "CAROUSEL", accountId: "demo_ig_001", accountLabel: "@eduverse.demo" },
  { timestamp: "2026-07-23T01:30:00Z", platform: "facebook", engagement: 3160, likes: 2800, comments: 204, shares: 156, mediaType: "TEXT", accountId: "demo_fb_001", accountLabel: "EduVerse Demo Page" },
  { timestamp: "2026-07-30T01:45:00Z", platform: "facebook", engagement: 2980, likes: 2600, comments: 210, shares: 170, mediaType: "TEXT", accountId: "demo_fb_001", accountLabel: "EduVerse Demo Page" },
  { timestamp: "2026-08-02T02:00:00Z", platform: "facebook", engagement: 1539, likes: 1400, comments: 96, shares: 43, mediaType: "VIDEO", accountId: "demo_fb_001", accountLabel: "EduVerse Demo Page" },
  { timestamp: "2026-07-26T04:00:00Z", platform: "threads", engagement: 2145, likes: 1900, comments: 178, shares: 67, mediaType: "TEXT", accountId: "demo_th_001", accountLabel: "@eduverse.demo" },
  { timestamp: "2026-07-28T14:00:00Z", platform: "threads", engagement: 1980, likes: 1750, comments: 160, shares: 70, mediaType: "TEXT", accountId: "demo_th_001", accountLabel: "@eduverse.demo" },
  { timestamp: "2026-08-01T13:00:00Z", platform: "instagram", engagement: 4100, likes: 3800, comments: 220, shares: 80, mediaType: "VIDEO", accountId: "demo_ig_001", accountLabel: "@eduverse.demo" },
  { timestamp: "2026-07-20T13:30:00Z", platform: "instagram", engagement: 3800, likes: 3500, comments: 210, shares: 90, mediaType: "CAROUSEL", accountId: "demo_ig_001", accountLabel: "@eduverse.demo" },
  { timestamp: "2026-07-21T01:30:00Z", platform: "facebook", engagement: 2750, likes: 2400, comments: 190, shares: 160, mediaType: "TEXT", accountId: "demo_fb_001", accountLabel: "EduVerse Demo Page" }
];

const DEMO_BEST_TIMES = computeBestTimes(DEMO_SIGNALS, { timezone: "UTC", topN: 3 });

export const DEMO_SNAPSHOT: AnalyticsSnapshot = {
  success: true,
  live: true,
  cached: false,
  accounts: [
    {
      id: "demo_ig_001",
      name: "EduVerse Demo — Instagram",
      platform: "instagram",
      handle: "@eduverse.demo",
      avatarUrl: undefined,
      connectedAt: new Date().toISOString(),
      status: "active",
    },
    {
      id: "demo_fb_001",
      name: "EduVerse Demo — Facebook Page",
      platform: "facebook",
      handle: "EduVerse Demo Page",
      avatarUrl: undefined,
      connectedAt: new Date().toISOString(),
      status: "active",
    },
    {
      id: "demo_th_001",
      name: "EduVerse Demo — Threads",
      platform: "threads",
      handle: "@eduverse.demo",
      avatarUrl: undefined,
      connectedAt: new Date().toISOString(),
      status: "active",
    },
  ],
  metrics: [
    { label: "Views (28d)", value: 142_890, suffix: "", detail: "Simulated · based on sample Meta Graph data" },
    { label: "Engagement (28d)", value: 18_420, suffix: "", detail: "Simulated · likes + comments + shares" },
    { label: "Published posts", value: 47, suffix: "", detail: "Simulated · Instagram + Facebook + Threads" },
    { label: "Engagement rate", value: 12.9, suffix: "%", detail: "Simulated · engaged / reach" },
  ],
  engagementData: [
    { label: "Jul 12", engagement: 820, comments: 94 },
    { label: "Jul 14", engagement: 1120, comments: 118 },
    { label: "Jul 16", engagement: 940, comments: 102 },
    { label: "Jul 18", engagement: 1350, comments: 148 },
    { label: "Jul 20", engagement: 1680, comments: 192 },
    { label: "Jul 22", engagement: 1420, comments: 154 },
    { label: "Jul 24", engagement: 1890, comments: 210 },
    { label: "Jul 26", engagement: 1650, comments: 176 },
    { label: "Jul 28", engagement: 2100, comments: 240 },
    { label: "Jul 30", engagement: 1780, comments: 198 },
    { label: "Aug 1", engagement: 2240, comments: 256 },
    { label: "Aug 3", engagement: 2010, comments: 222 },
    { label: "Aug 5", engagement: 2450, comments: 280 },
    { label: "Aug 7", engagement: 2320, comments: 268 },
  ],
  platformBreakdown: [
    { name: "Instagram Business", value: 52 },
    { name: "Facebook Pages", value: 31 },
    { name: "Threads", value: 17 },
  ],
  postingData: [
    { label: "Instagram", value: 22 },
    { label: "Facebook", value: 16 },
    { label: "Threads", value: 9 },
  ],
  growthData: [
    { label: "EduVerse IG", followers: 34200 },
    { label: "EduVerse FB", followers: 18750 },
    { label: "Threads", followers: 9320 },
  ],
  sentimentData: [
    { label: "Jul 21", score: 0.62 },
    { label: "Jul 24", score: 0.68 },
    { label: "Jul 27", score: 0.71 },
    { label: "Jul 30", score: 0.66 },
    { label: "Aug 2", score: 0.74 },
    { label: "Aug 5", score: 0.72 },
    { label: "Aug 7", score: 0.78 },
  ],
  recentPosts: [
    {
      platform: "Instagram Business",
      post: "Behind the scenes: How we design carousel hooks that stop the scroll →",
      date: "Aug 7",
      likes: "4.2K",
      comments: "312",
      shares: "89",
      reach: "28.4K",
      status: "Live",
      timestamp: "2026-08-05T13:20:00Z",
      mediaType: "CAROUSEL",
      accountLabel: "@eduverse.demo"
    },
    {
      platform: "Facebook Pages",
      post: "New study: Posts at 9am + 7pm drive 2.1× more saves for education creators",
      date: "Aug 6",
      likes: "2.8K",
      comments: "204",
      shares: "156",
      reach: "19.1K",
      status: "Live",
      timestamp: "2026-07-23T01:30:00Z",
      mediaType: "TEXT",
      accountLabel: "EduVerse Demo Page"
    },
    {
      platform: "Threads",
      post: "Your audience isn't ignoring you — they're scrolling past. Here's the fix in 3 lines.",
      date: "Aug 5",
      likes: "1.9K",
      comments: "178",
      shares: "67",
      reach: "14.3K",
      status: "Live",
      timestamp: "2026-07-26T04:00:00Z",
      mediaType: "TEXT",
      accountLabel: "@eduverse.demo"
    },
    {
      platform: "Instagram Business",
      post: "POV: You finally know *exactly* what to post next Monday",
      date: "Aug 4",
      likes: "3.6K",
      comments: "248",
      shares: "102",
      reach: "22.7K",
      status: "Live",
      timestamp: "2026-07-24T13:15:00Z",
      mediaType: "CAROUSEL",
      accountLabel: "@eduverse.demo"
    },
    {
      platform: "Facebook Pages",
      post: "Live teardown: Why this reel outperformed the last 20 by 3×",
      date: "Aug 2",
      likes: "1.4K",
      comments: "96",
      shares: "43",
      reach: "11.2K",
      status: "Live",
      timestamp: "2026-08-02T02:00:00Z",
      mediaType: "VIDEO",
      accountLabel: "EduVerse Demo Page"
    },
  ],
  timingSignals: DEMO_SIGNALS,
  bestTimes: DEMO_BEST_TIMES,
  memoryItems: [
    "3 connected Meta surfaces returned by Graph API (simulated sample).",
    "47 posts from the last 28 days are available for analysis (simulated).",
    "Highest recent interaction volume: 4.2K likes, 312 comments, and 89 shares.",
    "Optimal window detected: 09:00–10:30 and 19:00–20:30 IST (simulated).",
  ],
  recommendations: [
    [
      "Repurpose your top carousel hook as a 15-sec Reel",
      "Based on Aug 7",
      "This post led the sample with 4.2K likes and a 12.9% engagement rate. In a live workspace EduVerse would generate the brief, caption, and dispatch via Meta Graph publish.",
    ],
    [
      "Post on Wed 1–2 PM (UTC) — simulated best window",
      "Best window · high confidence · 12 timed posts (simulated)",
      "Simulated sample: early-afternoon UTC slots averaged the highest engagement for Instagram carousels. In a live workspace this window is recomputed from your real timestamps."
    ]
  ],
};

export const DEMO_HIGHLIGHTS = {
  reach: "142.9K views",
  engaged: "18.4K engaged",
  posts: 47,
  topPost: "4.2K likes · Behind the scenes carousel",
} as const;
