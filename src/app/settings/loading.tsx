import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-lg p-8">
      <Skeleton className="mb-4 h-4 w-16" />
      <div className="rounded-lg border p-6 space-y-4">
        <Skeleton className="h-7 w-32" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <Skeleton className="h-10 w-20" />
      </div>
    </div>
  );
}
