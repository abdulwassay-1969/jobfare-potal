import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase } from "lucide-react";

export default function JobsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Job Postings</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Briefcase className="h-16 w-16 mx-auto text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">Coming Soon</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          A list of available jobs from participating companies will appear here.
        </p>
      </CardContent>
    </Card>
  );
}
