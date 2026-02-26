export default function AppointmentsLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Date nav skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-8 bg-muted rounded" />
        <div className="h-7 w-48 bg-muted rounded" />
        <div className="h-8 w-8 bg-muted rounded" />
      </div>
      {/* View toggle */}
      <div className="flex justify-center">
        <div className="h-9 w-64 bg-muted rounded-lg" />
      </div>
      {/* Grid skeleton */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-lg" />
        ))}
      </div>
    </div>
  );
}
