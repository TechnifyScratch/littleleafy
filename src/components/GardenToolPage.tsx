import Link from "next/link";
import { GardenToolStudio, type GardenTool } from "@/components/GardenToolStudio";
import { SiteNav } from "@/components/SiteNav";

const titles: Record<GardenTool, string> = {
  labels: "Create garden labels.",
  spacing: "Plan plant spacing.",
  soil: "Mix better soil.",
};

const descriptions: Record<GardenTool, string> = {
  labels: "Make quick printable plant labels for herbs, seedlings, and tiny desk gardens.",
  spacing: "Estimate how many plants fit in a bed, planter box, tray, or patio container.",
  soil: "Scale simple soil mix recipes for indoor plants, succulents, and outdoor containers.",
};

export function GardenToolPage({ tool }: { tool: GardenTool }) {
  return (
    <main className="soft-grid min-h-screen bg-cream px-4 py-5 text-stone-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col">
        <SiteNav />
        <header className="animate-fade-up flex flex-col gap-4 py-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-leaf-700">
              Garden tools
            </p>
            <h1 className="mt-2 max-w-3xl text-4xl font-black leading-tight text-stone-950 sm:text-5xl">
              {titles[tool]}
            </h1>
            <p className="mt-3 max-w-2xl text-base font-semibold text-stone-600">
              {descriptions[tool]}
            </p>
          </div>
          <Link
            className="press-button rounded-full bg-lilac-500 px-5 py-3 text-sm font-black text-white shadow-press"
            href="/"
          >
            Back to planter builder
          </Link>
        </header>
        <GardenToolStudio initialTool={tool} />
        <footer className="mt-auto py-5 text-center text-sm font-semibold text-stone-500">
          Made for plant people, makers, and tiny desk gardens.
        </footer>
      </div>
    </main>
  );
}
