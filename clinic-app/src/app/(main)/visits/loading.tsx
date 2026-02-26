import { Card, CardContent } from "@/components/ui/card";

export default function VisitsLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-7 w-20 bg-muted rounded" />
        <div className="h-9 w-28 bg-muted rounded" />
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="h-10 w-36 bg-muted rounded" />
        <div className="h-10 w-36 bg-muted rounded" />
        <div className="h-10 w-40 bg-muted rounded" />
        <div className="h-10 w-16 bg-muted rounded" />
      </div>
      <Card>
        <CardContent className="p-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3 border-b last:border-0">
              <div className="space-y-1.5">
                <div className="h-4 w-40 bg-muted rounded" />
                <div className="h-3 w-56 bg-muted rounded" />
              </div>
              <div className="h-6 w-20 bg-muted rounded" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
