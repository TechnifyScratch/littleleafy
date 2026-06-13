"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Html, OrbitControls } from "@react-three/drei";
import JSZip from "jszip";
import {
  Download,
  Flower2,
  Package,
  RefreshCcw,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Suspense, useMemo, useRef, useState } from "react";
import type { Mesh } from "three";
import {
  createPotGeometry,
  exportPotToStl,
  type PotProfile,
  type PatternStyle,
  type PotSettings,
  settingsReadme,
} from "@/lib/potGeometry";

const classicSettings: PotSettings = {
  height: 96,
  topDiameter: 88,
  bottomDiameter: 62,
  wallThickness: 3,
  drainage: true,
  drainageHoles: 6,
  rimThickness: 5,
  pattern: "smooth",
  profile: "classic",
};

const defaultSettings: PotSettings = {
  height: 82,
  topDiameter: 112,
  bottomDiameter: 68,
  wallThickness: 3,
  drainage: true,
  drainageHoles: 7,
  rimThickness: 6,
  pattern: "smooth",
  profile: "soft-bowl",
};

type PotTemplate = {
  id: string;
  name: string;
  description: string;
  settings: PotSettings;
};

const templates: PotTemplate[] = [
  {
    id: "classic",
    name: "Classic Planter",
    description: "Clean taper with a sturdy rim.",
    settings: classicSettings,
  },
  {
    id: "soft-bowl",
    name: "Soft Bowl",
    description: "Rounded, ceramic-inspired sides.",
    settings: defaultSettings,
  },
  {
    id: "ripple",
    name: "Ripple Desk Pot",
    description: "Gentle waves for small plants.",
    settings: {
      height: 88,
      topDiameter: 84,
      bottomDiameter: 60,
      wallThickness: 3,
      drainage: true,
      drainageHoles: 5,
      rimThickness: 5,
      pattern: "wavy",
      profile: "bell",
    },
  },
  {
    id: "ribbed",
    name: "Ribbed Cachepot",
    description: "Subtle vertical texture.",
    settings: {
      height: 104,
      topDiameter: 94,
      bottomDiameter: 72,
      wallThickness: 3,
      drainage: true,
      drainageHoles: 8,
      rimThickness: 7,
      pattern: "ribs",
      profile: "classic",
    },
  },
  {
    id: "low-poly",
    name: "Low-Poly Mini",
    description: "Crisp facets with a compact base.",
    settings: {
      height: 76,
      topDiameter: 78,
      bottomDiameter: 54,
      wallThickness: 3,
      drainage: true,
      drainageHoles: 4,
      rimThickness: 4,
      pattern: "faceted",
      profile: "cylinder",
    },
  },
];

const patternLabels: Array<{ value: PatternStyle; label: string }> = [
  { value: "smooth", label: "Smooth" },
  { value: "ribs", label: "Vertical ribs" },
  { value: "wavy", label: "Wavy" },
  { value: "faceted", label: "Faceted low-poly" },
];

const profileLabels: Array<{ value: PotProfile; label: string }> = [
  { value: "classic", label: "Classic taper" },
  { value: "soft-bowl", label: "Soft bowl" },
  { value: "bell", label: "Bell curve" },
  { value: "cylinder", label: "Straight cylinder" },
];

const tips = [
  "Print upside down for best results.",
  "Use PETG for outdoor planters.",
  "Add drainage mesh before soil.",
  "Try a pale filament for a ceramic look.",
];

function LeafMascot() {
  return (
    <span className="relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-leaf-100 text-leaf-700 shadow-inner">
      <Flower2 className="h-6 w-6" aria-hidden="true" />
      <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-lilac-300" />
    </span>
  );
}

function RangeControl({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "mm",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block rounded-lg border border-leaf-100 bg-white/80 p-3 shadow-sm">
      <span className="flex items-center justify-between gap-4 text-sm font-semibold text-stone-700">
        {label}
        <span className="rounded-full bg-lilac-50 px-2.5 py-1 text-xs text-lilac-700">
          {value}
          {unit}
        </span>
      </span>
      <input
        className="mt-3 w-full"
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

function LoadingPot() {
  return (
    <Html center>
      <div className="rounded-full border border-leaf-100 bg-white/90 px-5 py-3 text-sm font-semibold text-leaf-700 shadow-soft">
        <span className="mr-2 inline-block animate-sprout">🌱</span>
        Warming up the planter
      </div>
    </Html>
  );
}

function PotModel({
  settings,
  pulseKey,
}: {
  settings: PotSettings;
  pulseKey: number;
}) {
  const meshRef = useRef<Mesh>(null);
  const geometry = useMemo(() => createPotGeometry(settings), [settings]);
  const scale = 1.86 / Math.max(settings.height, settings.topDiameter);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.24;
    }
  });

  return (
    <group key={pulseKey} scale={scale} position={[0, -0.78, 0]}>
      <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          color="#d4efd7"
          roughness={0.7}
          metalness={0.02}
          polygonOffset={settings.pattern === "faceted"}
        />
      </mesh>
    </group>
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

function randomBetween(min: number, max: number) {
  return Math.round(min + Math.random() * (max - min));
}

export function LittleLeafyGenerator() {
  const [settings, setSettings] = useState<PotSettings>(defaultSettings);
  const [exporting, setExporting] = useState<"stl" | "zip" | null>(null);
  const [toast, setToast] = useState(false);
  const [pulseKey, setPulseKey] = useState(0);
  const [activeTemplate, setActiveTemplate] = useState("soft-bowl");
  const activeTip = tips[pulseKey % tips.length];

  function updateSetting<Key extends keyof PotSettings>(key: Key, value: PotSettings[Key]) {
    setSettings((current) => ({ ...current, [key]: value }));
    setActiveTemplate("custom");
  }

  function showToast() {
    setToast(true);
    window.setTimeout(() => setToast(false), 2400);
  }

  async function exportStl() {
    setExporting("stl");
    await new Promise((resolve) => window.setTimeout(resolve, 220));
    const stl = await exportPotToStl(settings);
    downloadBlob(new Blob([stl], { type: "model/stl" }), "little-leafy-planter.stl");
    setExporting(null);
    showToast();
  }

  async function exportZip() {
    setExporting("zip");
    await new Promise((resolve) => window.setTimeout(resolve, 220));
    const zip = new JSZip();
    zip.file("little-leafy-planter.stl", await exportPotToStl(settings));
    zip.file("README.txt", settingsReadme(settings));
    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, "little-leafy-planter.zip");
    setExporting(null);
    showToast();
  }

  function applyTemplate(template: PotTemplate) {
    setSettings(template.settings);
    setActiveTemplate(template.id);
    setPulseKey((key) => key + 1);
  }

  function randomize() {
    const patterns = patternLabels.map((pattern) => pattern.value);
    setSettings({
      height: randomBetween(62, 142),
      topDiameter: randomBetween(66, 122),
      bottomDiameter: randomBetween(42, 92),
      wallThickness: randomBetween(2, 5),
      drainage: Math.random() > 0.15,
      drainageHoles: randomBetween(3, 9),
      rimThickness: randomBetween(3, 9),
      pattern: patterns[randomBetween(0, patterns.length - 1)],
      profile: profileLabels[randomBetween(0, profileLabels.length - 1)].value,
    });
    setActiveTemplate("custom");
    setPulseKey((key) => key + 1);
  }

  return (
    <main className="soft-grid min-h-screen overflow-hidden bg-cream text-stone-900">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="animate-fade-up flex flex-col gap-5 pb-5 pt-2 md:flex-row md:items-end md:justify-between">
          <div className="flex items-start gap-4">
            <LeafMascot />
            <div>
              <div className="mb-3 inline-flex rounded-full border border-leaf-200 bg-white/85 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-leaf-700 shadow-sm">
                Free • Browser-based • No login
              </div>
              <h1 className="max-w-3xl text-4xl font-black leading-tight text-stone-950 sm:text-5xl">
                Design a custom planter.
              </h1>
              <p className="mt-2 max-w-2xl text-base font-medium text-stone-600 sm:text-lg">
                Customize, preview, and download a printable plant pot — no account needed.
              </p>
            </div>
          </div>
          <p className="rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-stone-600 shadow-sm">
            {activeTip}
          </p>
        </header>

        <section className="grid flex-1 gap-5 lg:grid-cols-[410px_minmax(0,1fr)]">
          <aside className="animate-fade-up rounded-3xl border border-white/80 bg-white/88 p-4 shadow-soft backdrop-blur md:p-5 [animation-delay:120ms]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-stone-950">Pot settings</h2>
                <p className="text-sm font-medium text-stone-500">Tweak dimensions in millimeters.</p>
              </div>
              <button
                className="press-button rounded-full border border-lilac-100 bg-lilac-50 p-3 text-lilac-700 shadow-press hover:brightness-105"
                type="button"
                onClick={() => {
                  setSettings(defaultSettings);
                  setActiveTemplate("soft-bowl");
                }}
                aria-label="Reset settings"
                title="Reset"
              >
                <RotateCcw className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-3">
              <div className="rounded-2xl border border-leaf-100 bg-leaf-50/70 p-3 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-stone-800">Templates</p>
                    <p className="text-xs font-semibold text-stone-500">
                      Start with a nicer shape, then edit it.
                    </p>
                  </div>
                  {activeTemplate === "custom" ? (
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-black text-lilac-700">
                      Custom
                    </span>
                  ) : null}
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      className={`press-button rounded-2xl border p-3 text-left shadow-sm transition hover:-translate-y-0.5 ${
                        activeTemplate === template.id
                          ? "border-leaf-300 bg-white text-leaf-700"
                          : "border-white/80 bg-white/70 text-stone-700"
                      }`}
                      type="button"
                      onClick={() => applyTemplate(template)}
                    >
                      <span className="block text-sm font-black">{template.name}</span>
                      <span className="mt-1 block text-xs font-semibold text-stone-500">
                        {template.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <RangeControl label="Pot height" value={settings.height} min={50} max={160} onChange={(value) => updateSetting("height", value)} />
              <RangeControl label="Top diameter" value={settings.topDiameter} min={55} max={140} onChange={(value) => updateSetting("topDiameter", value)} />
              <RangeControl label="Bottom diameter" value={settings.bottomDiameter} min={35} max={115} onChange={(value) => updateSetting("bottomDiameter", value)} />
              <RangeControl label="Wall thickness" value={settings.wallThickness} min={2} max={7} onChange={(value) => updateSetting("wallThickness", value)} />
              <RangeControl label="Rim thickness" value={settings.rimThickness} min={2} max={12} onChange={(value) => updateSetting("rimThickness", value)} />

              <div className="rounded-lg border border-leaf-100 bg-white/80 p-3 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-stone-700">Drainage holes</p>
                    <p className="text-xs font-medium text-stone-500">Keeps roots happier.</p>
                  </div>
                  <button
                    className={`h-8 w-14 rounded-full p-1 transition ${settings.drainage ? "bg-leaf-500" : "bg-stone-200"}`}
                    type="button"
                    onClick={() => updateSetting("drainage", !settings.drainage)}
                    aria-pressed={settings.drainage}
                  >
                    <span
                      className={`block h-6 w-6 rounded-full bg-white shadow transition ${settings.drainage ? "translate-x-6" : "translate-x-0"}`}
                    />
                  </button>
                </div>
                <div className={settings.drainage ? "mt-3 opacity-100" : "mt-3 opacity-45"}>
                  <RangeControl
                    label="Number of holes"
                    value={settings.drainageHoles}
                    min={3}
                    max={10}
                    unit=""
                    onChange={(value) => updateSetting("drainageHoles", value)}
                  />
                </div>
              </div>

              <label className="block rounded-lg border border-leaf-100 bg-white/80 p-3 shadow-sm">
                <span className="text-sm font-semibold text-stone-700">Pattern style</span>
                <select
                  className="mt-2 w-full rounded-full border border-lilac-100 bg-lilac-50 px-4 py-3 text-sm font-bold text-lilac-700 outline-none ring-leaf-300 transition focus:ring-4"
                  value={settings.pattern}
                  onChange={(event) => updateSetting("pattern", event.target.value as PatternStyle)}
                >
                  {patternLabels.map((pattern) => (
                    <option key={pattern.value} value={pattern.value}>
                      {pattern.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block rounded-lg border border-leaf-100 bg-white/80 p-3 shadow-sm">
                <span className="text-sm font-semibold text-stone-700">Planter shape</span>
                <select
                  className="mt-2 w-full rounded-full border border-leaf-100 bg-white px-4 py-3 text-sm font-bold text-leaf-700 outline-none ring-leaf-300 transition focus:ring-4"
                  value={settings.profile}
                  onChange={(event) => updateSetting("profile", event.target.value as PotProfile)}
                >
                  {profileLabels.map((profile) => (
                    <option key={profile.value} value={profile.value}>
                      {profile.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </aside>

          <section
            className={`animate-fade-up relative flex min-h-[520px] flex-col overflow-hidden rounded-3xl border border-white/80 bg-white/86 shadow-soft backdrop-blur lg:max-h-[760px] [animation-delay:220ms] ${
              pulseKey ? "animate-pop" : ""
            }`}
          >
            <div className="absolute left-4 top-4 z-10 rounded-full bg-white/85 px-4 py-2 text-sm font-black text-leaf-700 shadow-sm">
              Live preview
            </div>
            <div className="absolute right-4 top-4 z-10 rounded-full bg-lilac-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-lilac-700 shadow-sm">
              Hollow STL
            </div>

            <div className="min-h-0 flex-1">
              <Canvas shadows camera={{ position: [2.5, 2, 4.2], fov: 38 }}>
                <color attach="background" args={["#fffdf6"]} />
                <ambientLight intensity={0.72} />
                <directionalLight position={[3, 5, 4]} intensity={1.55} castShadow />
                <Suspense fallback={<LoadingPot />}>
                  <PotModel settings={settings} pulseKey={pulseKey} />
                  <ContactShadows position={[0, -1.02, 0]} opacity={0.26} scale={5} blur={2.2} />
                  <Environment preset="city" />
                </Suspense>
                <OrbitControls enablePan={false} minDistance={2.6} maxDistance={6.4} />
              </Canvas>
            </div>

            <div className="grid gap-3 border-t border-leaf-100 bg-white/82 p-4 md:grid-cols-[1fr_1fr_1fr]">
              <button
                className="press-button inline-flex items-center justify-center gap-2 rounded-full bg-leaf-500 px-5 py-4 text-sm font-black text-white shadow-press hover:brightness-105 disabled:cursor-wait disabled:opacity-70"
                type="button"
                disabled={Boolean(exporting)}
                onClick={exportStl}
              >
                <Download className="h-5 w-5" />
                {exporting === "stl" ? "Sprouting your file..." : "Download STL"}
              </button>
              <button
                className="press-button inline-flex items-center justify-center gap-2 rounded-full bg-lilac-500 px-5 py-4 text-sm font-black text-white shadow-press hover:brightness-105 disabled:cursor-wait disabled:opacity-70"
                type="button"
                disabled={Boolean(exporting)}
                onClick={exportZip}
              >
                <Package className="h-5 w-5" />
                {exporting === "zip" ? "Sprouting your file..." : "Download ZIP"}
              </button>
              <button
                className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-full bg-stone-100 px-5 py-4 text-sm font-black text-stone-400 shadow-inner"
                type="button"
                disabled
                title="Coming soon"
              >
                <Sparkles className="h-5 w-5" />
                3MF Coming soon
              </button>
              <button
                className="press-button inline-flex items-center justify-center gap-2 rounded-full border border-leaf-200 bg-white px-5 py-4 text-sm font-black text-leaf-700 shadow-press hover:brightness-105 md:col-span-2"
                type="button"
                onClick={randomize}
              >
                <RefreshCcw className="h-5 w-5" />
                Randomize
              </button>
              <button
                className="press-button inline-flex items-center justify-center gap-2 rounded-full border border-lilac-200 bg-white px-5 py-4 text-sm font-black text-lilac-700 shadow-press hover:brightness-105"
                type="button"
                onClick={() => {
                  setSettings(defaultSettings);
                  setActiveTemplate("soft-bowl");
                }}
              >
                <RotateCcw className="h-5 w-5" />
                Reset
              </button>
            </div>
          </section>
        </section>

        <footer className="py-5 text-center text-sm font-semibold text-stone-500">
          Made for plant people, makers, and tiny desk gardens.
        </footer>
      </div>

      {toast ? (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full border border-leaf-200 bg-white px-5 py-3 text-sm font-black text-leaf-700 shadow-soft">
          Your pot is ready 🌱
        </div>
      ) : null}
    </main>
  );
}
