import { Skeleton } from "@/components/Skeleton";

export default function LoadingMapa() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="mt-3 h-4 w-full max-w-md" />
      <div className="mt-10 flex flex-col gap-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-full" />
        ))}
      </div>
    </main>
  );
}
