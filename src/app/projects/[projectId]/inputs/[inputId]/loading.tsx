import { Skeleton } from "@/components/ui/skeleton";

export default function InputDetailLoading() {
  return (
    <div className="mx-auto max-w-7xl p-8">
      <Skeleton className="mb-4 h-4 w-32" />
      <div className="mb-6 flex items-center gap-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <Skeleton className="mb-3 h-6 w-48" />
          <div className="rounded-lg border p-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
        </div>
        <div>
          <Skeleton className="mb-3 h-6 w-40" />
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-lg border p-6 space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
