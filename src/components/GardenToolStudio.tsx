"use client";

import Link from "next/link";
import { CalendarDays, Droplets, Tags } from "lucide-react";
import { useMemo, useState } from "react";

export type GardenTool = "labels" | "spacing" | "soil";
type SoilUse = "indoor" | "succulent" | "outdoor";

const gardenTools: Array<{
  id: GardenTool;
  name: string;
  href: string;
  description: string;
  icon: typeof Tags;
}> = [
  {
    id: "labels",
    name: "Plant labels",
    href: "/tools/labels",
    description: "Make cute printable tags for seedlings and pots.",
    icon: Tags,
  },
  {
    id: "spacing",
    name: "Spacing planner",
    href: "/tools/spacing",
    description: "Estimate how many plants fit in a bed or tray.",
    icon: CalendarDays,
  },
  {
    id: "soil",
    name: "Soil mix helper",
    href: "/tools/soil",
    description: "Create simple mix recipes by plant type.",
    icon: Droplets,
  },
];

const soilRecipes: Record<
  SoilUse,
  {
    label: string;
    note: string;
    parts: Array<{ name: string; ratio: number }>;
  }
> = {
  indoor: {
    label: "Indoor leafy plants",
    note: "Balanced moisture with enough air for happy roots.",
    parts: [
      { name: "Potting soil", ratio: 50 },
      { name: "Perlite", ratio: 25 },
      { name: "Coco coir", ratio: 25 },
    ],
  },
  succulent: {
    label: "Succulents + cactus",
    note: "Fast-draining and chunky so roots do not sit wet.",
    parts: [
      { name: "Cactus soil", ratio: 45 },
      { name: "Pumice or perlite", ratio: 35 },
      { name: "Coarse sand", ratio: 20 },
    ],
  },
  outdoor: {
    label: "Outdoor containers",
    note: "A sturdy all-rounder for patio herbs and flowers.",
    parts: [
      { name: "Compost", ratio: 35 },
      { name: "Potting soil", ratio: 45 },
      { name: "Perlite", ratio: 20 },
    ],
  },
};

function RangeControl({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block rounded-2xl border border-leaf-100 bg-white/85 p-4 shadow-sm">
      <span className="flex items-center justify-between gap-4 text-sm font-black text-stone-700">
        {label}
        <span className="rounded-full bg-lilac-50 px-3 py-1 text-xs text-lilac-700">
          {value}
          {unit}
        </span>
      </span>
      <input
        className="mt-4 w-full"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

function downloadPlantLabel(label: string) {
  const safeLabel = label.trim() || "Basil";
  const escapedLabel = safeLabel
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="180" viewBox="0 0 520 180">
  <rect x="22" y="22" width="476" height="118" rx="44" fill="#f2fbf3" stroke="#25843e" stroke-width="8"/>
  <path d="M260 140 L238 172 H282 Z" fill="#25843e"/>
  <circle cx="84" cy="80" r="26" fill="#dbf5de"/>
  <path d="M84 96 C78 76 80 60 96 48 C104 68 100 88 84 96 Z" fill="#42bd61"/>
  <text x="130" y="92" font-family="Arial, sans-serif" font-size="44" font-weight="800" fill="#253226">${escapedLabel}</text>
</svg>`;

  downloadBlob(
    new Blob([svg], { type: "image/svg+xml" }),
    `${safeLabel.toLowerCase().replaceAll(" ", "-")}-plant-label.svg`,
  );
}

export function GardenToolStudio({ initialTool }: { initialTool: GardenTool }) {
  const [labelText, setLabelText] = useState("Basil");
  const [bedLength, setBedLength] = useState(120);
  const [bedWidth, setBedWidth] = useState(60);
  const [plantSpacing, setPlantSpacing] = useState(20);
  const [soilUse, setSoilUse] = useState<SoilUse>("indoor");
  const [soilVolume, setSoilVolume] = useState(8);

  const spacingPlan = useMemo(() => {
    const columns = Math.max(1, Math.floor(bedLength / plantSpacing));
    const rows = Math.max(1, Math.floor(bedWidth / plantSpacing));

    return {
      columns,
      rows,
      total: columns * rows,
      marginX: Math.max(0, Math.round((bedLength - columns * plantSpacing) / 2)),
      marginY: Math.max(0, Math.round((bedWidth - rows * plantSpacing) / 2)),
    };
  }, [bedLength, bedWidth, plantSpacing]);

  const activeRecipe = soilRecipes[soilUse];
  const activeTool = gardenTools.find((tool) => tool.id === initialTool) ?? gardenTools[0];
  const ActiveIcon = activeTool.icon;

  return (
    <section className="animate-fade-up rounded-3xl border border-white/80 bg-white/88 p-4 shadow-soft backdrop-blur md:p-6">
      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-leaf-100 bg-leaf-50/70 p-3">
          <p className="px-2 pb-3 text-xs font-black uppercase tracking-[0.16em] text-leaf-700">
            Tool shelf
          </p>
          <div className="grid gap-2">
            {gardenTools.map((tool) => {
              const Icon = tool.icon;
              const isActive = tool.id === initialTool;

              return (
                <Link
                  key={tool.id}
                  className={`press-button rounded-2xl border p-4 shadow-sm transition ${
                    isActive
                      ? "border-leaf-300 bg-white text-leaf-700"
                      : "border-white/80 bg-white/75 text-stone-700 hover:bg-white"
                  }`}
                  href={tool.href}
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-black">{tool.name}</span>
                      <span className="mt-1 block text-xs font-semibold text-stone-500">
                        {tool.description}
                      </span>
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </aside>

        <div className="min-h-[520px] rounded-3xl border border-leaf-100 bg-leaf-50/60 p-4 md:p-6">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-leaf-700 shadow-sm">
              <ActiveIcon className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-2xl font-black text-stone-950">{activeTool.name}</h2>
              <p className="mt-1 max-w-2xl text-sm font-semibold text-stone-500">
                {activeTool.description}
              </p>
            </div>
          </div>

          {initialTool === "labels" ? (
            <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr] xl:items-center">
              <div className="grid gap-4">
                <label className="block rounded-2xl bg-white/85 p-4 shadow-sm">
                  <span className="text-sm font-black text-stone-700">Plant name</span>
                  <input
                    className="mt-2 w-full rounded-full border border-leaf-100 bg-white px-4 py-3 text-sm font-bold text-stone-800 outline-none ring-leaf-300 transition focus:ring-4"
                    maxLength={24}
                    value={labelText}
                    onChange={(event) => setLabelText(event.target.value)}
                    placeholder="Basil, Mint, Monstera..."
                  />
                </label>
                <button
                  className="press-button rounded-full bg-leaf-500 px-5 py-4 text-sm font-black text-white shadow-press"
                  type="button"
                  onClick={() => downloadPlantLabel(labelText)}
                >
                  Download label SVG
                </button>
                <p className="rounded-2xl bg-white/70 p-4 text-sm font-semibold text-stone-500">
                  Tip: import the SVG into your slicer or design app, then scale it for seed trays,
                  herb pots, or tiny desk gardens.
                </p>
              </div>
              <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                <div className="rounded-[2rem] border-4 border-leaf-700 bg-leaf-50 px-6 py-8 text-center shadow-inner">
                  <span className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-full bg-leaf-100 text-4xl">
                    🌿
                  </span>
                  <p className="truncate text-4xl font-black text-stone-900">
                    {labelText || "Basil"}
                  </p>
                </div>
                <div className="mx-auto h-16 w-12 bg-leaf-700 [clip-path:polygon(50%_100%,0_0,100%_0)]" />
              </div>
            </div>
          ) : null}

          {initialTool === "spacing" ? (
            <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="grid gap-4">
                <RangeControl label="Bed length" value={bedLength} min={40} max={300} unit="cm" onChange={setBedLength} />
                <RangeControl label="Bed width" value={bedWidth} min={30} max={180} unit="cm" onChange={setBedWidth} />
                <RangeControl label="Plant spacing" value={plantSpacing} min={8} max={60} unit="cm" onChange={setPlantSpacing} />
              </div>
              <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                <p className="text-sm font-black uppercase tracking-[0.14em] text-leaf-700">
                  Suggested layout
                </p>
                <p className="mt-4 text-6xl font-black text-stone-950">{spacingPlan.total}</p>
                <p className="mt-2 text-base font-bold text-stone-500">
                  plants in a {spacingPlan.columns} × {spacingPlan.rows} grid
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-leaf-50 p-4 text-sm font-bold text-stone-600">
                    Side margin
                    <span className="block text-2xl font-black text-leaf-700">
                      {spacingPlan.marginX}cm
                    </span>
                  </div>
                  <div className="rounded-2xl bg-lilac-50 p-4 text-sm font-bold text-stone-600">
                    End margin
                    <span className="block text-2xl font-black text-lilac-700">
                      {spacingPlan.marginY}cm
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {initialTool === "soil" ? (
            <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="grid gap-4">
                <label className="block rounded-2xl bg-white/85 p-4 shadow-sm">
                  <span className="text-sm font-black text-stone-700">Plant type</span>
                  <select
                    className="mt-2 w-full rounded-full border border-leaf-100 bg-white px-4 py-3 text-sm font-bold text-leaf-700 outline-none ring-leaf-300 transition focus:ring-4"
                    value={soilUse}
                    onChange={(event) => setSoilUse(event.target.value as SoilUse)}
                  >
                    {Object.entries(soilRecipes).map(([key, recipe]) => (
                      <option key={key} value={key}>
                        {recipe.label}
                      </option>
                    ))}
                  </select>
                </label>
                <RangeControl label="Total mix" value={soilVolume} min={2} max={40} unit="L" onChange={setSoilVolume} />
              </div>
              <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                <p className="text-sm font-black uppercase tracking-[0.14em] text-leaf-700">
                  {activeRecipe.label}
                </p>
                <p className="mt-2 text-sm font-semibold text-stone-500">{activeRecipe.note}</p>
                <div className="mt-5 grid gap-3">
                  {activeRecipe.parts.map((part) => (
                    <div
                      key={part.name}
                      className="flex items-center justify-between rounded-2xl bg-leaf-50 px-4 py-4 text-sm font-bold text-stone-700"
                    >
                      <span>{part.name}</span>
                      <span className="text-lg font-black text-leaf-700">
                        {((soilVolume * part.ratio) / 100).toFixed(1)}L
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
