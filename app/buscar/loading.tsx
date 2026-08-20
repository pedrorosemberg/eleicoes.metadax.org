import { Skeleton, SkeletonLista } from "@/components/Skeleton";
import { TopProgressBar } from "@/components/TopProgressBar";

export default function LoadingBusca() {
  return (
    <>
      <TopProgressBar />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="mt-3 h-4 w-full max-w-md" />
        <div className="mt-8">
          <SkeletonLista itens={5} />
        </div>
      </main>
    </>
  );
}
