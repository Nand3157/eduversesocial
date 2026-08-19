import { FileUp, Plus } from "lucide-react";
import { PageHeading } from "@/components/dashboard/page-heading";
import { PostTable } from "@/components/dashboard/post-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ContentPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <PageHeading description="Search, filter, and understand every post in one place." eyebrow="Content intelligence" title="Content library" />
        <div className="flex gap-2">
          <Button size="sm" variant="secondary">
            <FileUp className="h-4 w-4" />
            Upload CSV
          </Button>
          <Button size="sm" className="bg-ink text-background hover:bg-ink/90">
            <Plus className="h-4 w-4" />
            New post
          </Button>
        </div>
      </div>
      <Card>
        <CardContent className="p-5">
          <PostTable />
        </CardContent>
      </Card>
    </div>
  );
}
