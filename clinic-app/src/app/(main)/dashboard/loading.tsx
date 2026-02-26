import { Card, CardContent } from "@/components/ui/card";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-muted rounded" />
          <div className="h-4 w-64 bg-muted rounded" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 bg-muted rounded" />
          <div className="h-9 w-28 bg-muted rounded" />
        </div>
      </div>
      {/* Appointments skeleton */}
      <Card>
        <CardContent className="p-0">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3 border-b last:border-0">
              <div className="space-y-1.5">
                <div className="h-4 w-32 bg-muted rounded" />
                <div className="h-3 w-48 bg-muted rounded" />
              </div>
              <div className="h-6 w-16 bg-muted rounded" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
