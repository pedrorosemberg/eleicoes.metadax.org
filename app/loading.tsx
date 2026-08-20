import { SkeletonLista } from "@/components/Skeleton";
import { TopProgressBar } from "@/components/TopProgressBar";

export default function Loading() {
  return (
    <>
      <TopProgressBar />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <SkeletonLista itens={3} />
      </main>
    </>
  );
}
