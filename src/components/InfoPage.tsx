import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";

type InfoPageProps = {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
};

export function InfoPage({ title, eyebrow, children }: InfoPageProps) {
  return (
    <main className="soft-grid min-h-screen bg-cream px-4 py-5 text-stone-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <SiteNav />
        <section className="mt-8 rounded-3xl border border-white/80 bg-white/90 p-6 shadow-soft backdrop-blur md:p-10">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-leaf-700">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-4xl font-black leading-tight text-stone-950 md:text-5xl">
            {title}
          </h1>
          <div className="mt-6 grid gap-5 text-base font-medium leading-7 text-stone-600">
            {children}
          </div>
          <Link
            className="press-button mt-8 inline-flex rounded-full bg-leaf-500 px-5 py-3 text-sm font-black text-white shadow-press"
            href="/"
          >
            Back to the builder
          </Link>
        </section>
      </div>
    </main>
  );
}
