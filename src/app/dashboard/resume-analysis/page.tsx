import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function ResumePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Resume</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">Resume Management</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          You will be able to manage and upload your resume here.
        </p>
      </CardContent>
    </Card>
  );
}
