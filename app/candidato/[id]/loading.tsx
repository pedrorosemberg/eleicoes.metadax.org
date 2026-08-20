import { Skeleton } from "@/components/Skeleton";

export default function LoadingCandidato() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-2 h-10 w-64" />
      <Skeleton className="mt-2 h-4 w-48" />
      <div className="mt-8 grid grid-cols-2 gap-y-4 border-t pt-6" style={{ borderColor: "var(--hairline)" }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-32" />
        ))}
      </div>
    </main>
  );
}
