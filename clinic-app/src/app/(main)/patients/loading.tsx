import { Card, CardContent } from "@/components/ui/card";

export default function PatientsLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-7 w-28 bg-muted rounded" />
        <div className="h-9 w-32 bg-muted rounded" />
      </div>
      <div className="flex gap-2">
        <div className="h-10 flex-1 max-w-md bg-muted rounded" />
        <div className="h-10 w-20 bg-muted rounded" />
      </div>
      <div className="h-4 w-32 bg-muted rounded" />
      <Card>
        <CardContent className="p-0">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b last:border-0">
              <div className="flex items-center gap-3">
                <div className="h-5 w-14 bg-muted rounded" />
                <div className="space-y-1">
                  <div className="h-4 w-36 bg-muted rounded" />
                  <div className="h-3 w-24 bg-muted rounded" />
                </div>
              </div>
              <div className="h-6 w-16 bg-muted rounded" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
