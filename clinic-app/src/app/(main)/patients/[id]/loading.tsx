import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function PatientDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <div className="h-4 w-16 bg-muted rounded" />
        <div className="h-4 w-4 bg-muted rounded" />
        <div className="h-4 w-32 bg-muted rounded" />
      </div>

      {/* Patient Header */}
      <div className="border-b pb-4 -mx-4 px-4 md:-mx-6 md:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-muted rounded-lg w-16 h-14" />
            <div className="space-y-2">
              <div className="h-6 w-48 bg-muted rounded" />
              <div className="h-4 w-64 bg-muted rounded" />
              <div className="h-3 w-40 bg-muted rounded" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-28 bg-muted rounded" />
            <div className="h-8 w-8 bg-muted rounded" />
          </div>
        </div>
      </div>

      {/* Treatment History Section */}
      <div className="space-y-3">
        <div className="h-5 w-36 bg-muted rounded" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="py-3 px-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <div className="h-4 w-44 bg-muted rounded" />
                  <div className="h-3 w-56 bg-muted rounded" />
                </div>
                <div className="h-6 w-20 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Patient Info Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="h-5 w-28 bg-muted rounded" />
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-3 w-20 bg-muted rounded" />
                <div className="h-4 w-36 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
