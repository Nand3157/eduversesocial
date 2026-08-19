import { AudienceGrowthCard, EngagementChartCard, PlatformBreakdownCard, PostingFrequencyCard, SentimentTrendCard } from "@/components/dashboard/lazy-charts";
import { PageHeading } from "@/components/dashboard/page-heading";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeading description="See the performance patterns shaping your next best move." eyebrow="Performance intelligence" title="Analytics" />
      <div className="grid gap-5 xl:grid-cols-3">
        <EngagementChartCard />
        <Card>
          <CardHeader>
            <CardTitle>Platform comparison</CardTitle>
            <CardDescription>Where attention is concentrated.</CardDescription>
          </CardHeader>
          <CardContent>
            <PlatformBreakdownCard />
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <PostingFrequencyCard />
        <AudienceGrowthCard />
        <SentimentTrendCard />
      </div>
    </div>
  );
}
