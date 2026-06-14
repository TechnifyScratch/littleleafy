"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Html, OrbitControls } from "@react-three/drei";
import JSZip from "jszip";
import {
  CheckCircle2,
  Download,
  Package,
  Palette,
  RefreshCcw,
  RotateCcw,
  Ruler,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Suspense, useMemo, useRef, useState } from "react";
import { DoubleSide, type Mesh } from "three";
import {
  createPotGeometry,
  createSnapBaseGeometry,
  exportPotPartsToStl,
  exportPotToStl,
  type DrainageStyle,
  type PotProfile,
  type PatternStyle,
  type PotSettings,
  settingsReadme,
} from "@/lib/potGeometry";
import { SiteNav } from "@/components/SiteNav";

const classicSettings: PotSettings = {
  height: 96,
  topDiameter: 88,
  bottomDiameter: 62,
  wallThickness: 3,
  drainage: true,
  drainageHoles: 6,
  drainageStyle: "radial",
  rimThickness: 5,
  pattern: "smooth",
  profile: "classic",
  twoPiece: false,
};

const defaultSettings: PotSettings = {
  height: 82,
  topDiameter: 112,
  bottomDiameter: 68,
  wallThickness: 3,
  drainage: true,
  drainageHoles: 7,
  drainageStyle: "mesh",
  rimThickness: 6,
  pattern: "smooth",
  profile: "soft-bowl",
  twoPiece: false,
};

type PotTemplate = {
  id: string;
  name: string;
  description: string;
  vibe: string;
  color: string;
  settings: PotSettings;
};

type BuilderStep = "style" | "size" | "details";

const stepLabels: Array<{
  id: BuilderStep;
  title: string;
  description: string;
  icon: typeof Palette;
}> = [
  {
    id: "style",
    title: "Style",
    description: "Choose a starting shape.",
    icon: Palette,
  },
  {
    id: "size",
    title: "Size",
    description: "Dial in dimensions.",
    icon: Ruler,
  },
  {
    id: "details",
    title: "Details",
    description: "Drainage, texture, export.",
    icon: SlidersHorizontal,
  },
];

const templates: PotTemplate[] = [
  {
    id: "classic",
    name: "Classic Garden",
    description: "Tapered outdoor pot with subtle ring detail.",
    vibe: "Inspired by patio planters",
    color: "#65a96b",
    settings: { ...classicSettings, pattern: "rings", rimThickness: 8 },
  },
  {
    id: "soft-bowl",
    name: "Ceramic Bowl",
    description: "Rounded patio shape with a thick soft rim.",
    vibe: "Smooth and modern",
    color: "#c24646",
    settings: defaultSettings,
  },
  {
    id: "ripple",
    name: "Cactus Cup",
    description: "Small tapered cup with a clean rolled lip.",
    vibe: "Great for succulents",
    color: "#f0a36e",
    settings: {
      height: 78,
      topDiameter: 76,
      bottomDiameter: 54,
      wallThickness: 3,
      drainage: true,
      drainageHoles: 5,
      drainageStyle: "center-plus",
      rimThickness: 9,
      pattern: "smooth",
      profile: "classic",
      twoPiece: false,
    },
  },
  {
    id: "ribbed",
    name: "Ribbed Cachepot",
    description: "Tall planter with print-friendly vertical texture.",
    vibe: "Maker-friendly texture",
    color: "#7f8580",
    settings: {
      height: 104,
      topDiameter: 94,
      bottomDiameter: 72,
      wallThickness: 3,
      drainage: true,
      drainageHoles: 8,
      drainageStyle: "radial",
      rimThickness: 7,
      pattern: "fluted",
      profile: "classic",
      twoPiece: true,
    },
  },
  {
    id: "arched",
    name: "Arch Relief Pot",
    description: "Soft repeating arches inspired by ceramic texture.",
    vibe: "Statement texture",
    color: "#e8e1d2",
    settings: {
      height: 92,
      topDiameter: 104,
      bottomDiameter: 86,
      wallThickness: 3,
      drainage: true,
      drainageHoles: 7,
      drainageStyle: "mesh",
      rimThickness: 6,
      pattern: "arches",
      profile: "cylinder",
      twoPiece: false,
    },
  },
  {
    id: "low-poly",
    name: "Square Studio",
    description: "A faceted square planter with crisp sides.",
    vibe: "Minimal desktop style",
    color: "#8e8e87",
    settings: {
      height: 96,
      topDiameter: 92,
      bottomDiameter: 64,
      wallThickness: 3,
      drainage: true,
      drainageHoles: 4,
      drainageStyle: "slots",
      rimThickness: 6,
      pattern: "geo",
      profile: "square",
      twoPiece: false,
    },
  },
];

const patternLabels: Array<{ value: PatternStyle; label: string }> = [
  { value: "smooth", label: "Smooth" },
  { value: "ribs", label: "Subtle vertical ribs" },
  { value: "fluted", label: "Deep fluted ribs" },
  { value: "spiral", label: "Spiral grooves" },
  { value: "arches", label: "Arched ceramic relief" },
  { value: "geo", label: "Geometric facets" },
  { value: "wave-ridges", label: "Wavy raised ridges" },
  { value: "wavy", label: "Soft wavy surface" },
  { value: "faceted", label: "Faceted low-poly" },
  { value: "rings", label: "Garden rings" },
];

const profileLabels: Array<{ value: PotProfile; label: string }> = [
  { value: "classic", label: "Classic taper" },
  { value: "soft-bowl", label: "Soft bowl" },
  { value: "bell", label: "Bell curve" },
  { value: "cylinder", label: "Straight cylinder" },
  { value: "square", label: "Square taper" },
];

const drainageOptions: Array<{
  value: DrainageStyle;
  label: string;
  description: string;
}> = [
  {
    value: "center-plus",
    label: "Center plus",
    description: "One center hole plus a small outer ring.",
  },
  {
    value: "radial",
    label: "Radial ring",
    description: "Evenly spaced holes for general planters.",
  },
  {
    value: "mesh",
    label: "Micro mesh",
    description: "Many small holes for finer soil mixes.",
  },
  {
    value: "slots",
    label: "Long slots",
    description: "Wider drainage for chunky soil and outdoor pots.",
  },
];

const colorSwatches = [
  { name: "Sage", value: "#65a96b" },
  { name: "Clay", value: "#f0a36e" },
  { name: "Berry", value: "#c24646" },
  { name: "Stone", value: "#8e8e87" },
  { name: "Cream", value: "#e8e1d2" },
];

const tips = [
  "Print upside down for best results.",
  "Use PETG for outdoor planters.",
  "Add drainage mesh before soil.",
  "Try a pale filament for a ceramic look.",
];

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
  color,
}: {
  settings: PotSettings;
  pulseKey: number;
  color: string;
}) {
  const meshRef = useRef<Mesh>(null);
  const potGeometry = useMemo(() => createPotGeometry(settings), [settings]);
  const baseGeometry = useMemo(
    () => (settings.twoPiece ? createSnapBaseGeometry(settings) : null),
    [settings],
  );
  const scale = 1.86 / Math.max(settings.height, settings.topDiameter);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.24;
    }
  });

  return (
    <group key={pulseKey} scale={scale} position={[0, -0.78, 0]}>
      <mesh ref={meshRef} geometry={potGeometry} castShadow receiveShadow>
        <meshStandardMaterial
          color={color}
          roughness={0.82}
          metalness={0.02}
          side={DoubleSide}
          transparent={false}
          opacity={1}
          depthWrite
          polygonOffset={settings.pattern === "faceted"}
        />
      </mesh>
      {baseGeometry ? (
        <mesh geometry={baseGeometry} castShadow receiveShadow>
          <meshStandardMaterial
            color="#b8793f"
            roughness={0.92}
            metalness={0}
            side={DoubleSide}
          />
        </mesh>
      ) : null}
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
  const [activeStep, setActiveStep] = useState<BuilderStep>("style");
  const [previewColor, setPreviewColor] = useState(templates[1].color);
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
    const parts = await exportPotPartsToStl(settings);

    if (parts.base) {
      zip.file("little-leafy-planter-body.stl", parts.body);
      zip.file("little-leafy-snap-base.stl", parts.base);
    } else {
      zip.file("little-leafy-planter.stl", parts.body);
    }

    zip.file("README.txt", settingsReadme(settings));
    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, "little-leafy-planter.zip");
    setExporting(null);
    showToast();
  }

  function applyTemplate(template: PotTemplate) {
    setSettings(template.settings);
    setActiveTemplate(template.id);
    setPreviewColor(template.color);
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
      drainageStyle: drainageOptions[randomBetween(0, drainageOptions.length - 1)].value,
      twoPiece: Math.random() > 0.66,
    });
    setPreviewColor(colorSwatches[randomBetween(0, colorSwatches.length - 1)].value);
    setActiveTemplate("custom");
    setPulseKey((key) => key + 1);
  }

  const selectedTemplate = templates.find((template) => template.id === activeTemplate);

  return (
    <main className="soft-grid min-h-screen overflow-hidden bg-cream text-stone-900">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <SiteNav />
        <header className="animate-fade-up flex flex-col gap-5 pb-5 pt-2 md:flex-row md:items-end md:justify-between">
          <div className="flex items-start gap-4 pt-4">
            <div>
              <h1 className="max-w-3xl text-4xl font-black leading-tight text-stone-950 sm:text-5xl">
                Build a planter in three steps.
              </h1>
              <p className="mt-2 max-w-2xl text-base font-medium text-stone-600 sm:text-lg">
                Pick a style, tune the size, and download a printable STL — no account needed.
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
                <h2 className="text-xl font-black text-stone-950">Planter builder</h2>
                <p className="text-sm font-medium text-stone-500">
                  Follow the steps, or jump around anytime.
                </p>
              </div>
              <button
                className="press-button rounded-full border border-lilac-100 bg-lilac-50 p-3 text-lilac-700 shadow-press hover:brightness-105"
                type="button"
                onClick={() => {
                  setSettings(defaultSettings);
                  setPreviewColor(templates[1].color);
                  setActiveTemplate("soft-bowl");
                  setActiveStep("style");
                }}
                aria-label="Reset settings"
                title="Reset"
              >
                <RotateCcw className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-2">
              {stepLabels.map((step, index) => {
                const Icon = step.icon;
                const isActive = activeStep === step.id;

                return (
                  <button
                    key={step.id}
                    className={`press-button rounded-2xl border p-3 text-left shadow-sm transition ${
                      isActive
                        ? "border-leaf-300 bg-leaf-50 text-leaf-700"
                        : "border-stone-100 bg-white text-stone-500"
                    }`}
                    type="button"
                    onClick={() => setActiveStep(step.id)}
                  >
                    <span className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-sm">
                      {isActive ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </span>
                    <span className="block text-xs font-black uppercase tracking-[0.12em]">
                      {index + 1}. {step.title}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl border border-leaf-100 bg-leaf-50/60 p-3 shadow-sm">
              {activeStep === "style" ? (
                <div className="grid gap-3">
                  <div>
                    <p className="text-base font-black text-stone-900">Choose a template</p>
                    <p className="text-sm font-semibold text-stone-500">
                      These are editable starting points inspired by common planter shapes.
                    </p>
                  </div>

                  <div className="grid gap-2">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        className={`press-button grid grid-cols-[3rem_1fr] gap-3 rounded-2xl border p-3 text-left shadow-sm transition hover:-translate-y-0.5 ${
                          activeTemplate === template.id
                            ? "border-leaf-300 bg-white text-leaf-700"
                            : "border-white/80 bg-white/75 text-stone-700"
                        }`}
                        type="button"
                        onClick={() => applyTemplate(template)}
                      >
                        <span
                          className="h-12 w-12 rounded-2xl border-4 border-white shadow-inner"
                          style={{ backgroundColor: template.color }}
                        />
                        <span>
                          <span className="block text-sm font-black">{template.name}</span>
                          <span className="mt-1 block text-xs font-bold text-stone-500">
                            {template.description}
                          </span>
                          <span className="mt-2 inline-flex rounded-full bg-lilac-50 px-2 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-lilac-700">
                            {template.vibe}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="rounded-2xl bg-white/80 p-3">
                    <p className="mb-2 text-sm font-black text-stone-800">Preview color</p>
                    <div className="flex flex-wrap gap-2">
                      {colorSwatches.map((swatch) => (
                        <button
                          key={swatch.value}
                          className={`h-10 w-10 rounded-full border-4 shadow-sm transition ${
                            previewColor === swatch.value
                              ? "border-lilac-500 scale-105"
                              : "border-white"
                          }`}
                          type="button"
                          title={swatch.name}
                          style={{ backgroundColor: swatch.value }}
                          onClick={() => {
                            setPreviewColor(swatch.value);
                            setActiveTemplate("custom");
                          }}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    className="press-button rounded-full bg-leaf-500 px-5 py-3 text-sm font-black text-white shadow-press"
                    type="button"
                    onClick={() => setActiveStep("size")}
                  >
                    Next: adjust size
                  </button>
                </div>
              ) : null}

              {activeStep === "size" ? (
                <div className="grid gap-3">
                  <div>
                    <p className="text-base font-black text-stone-900">Set the dimensions</p>
                    <p className="text-sm font-semibold text-stone-500">
                      Keep walls at least 2-3mm for easier printing.
                    </p>
                  </div>
                  <RangeControl label="Pot height" value={settings.height} min={50} max={160} onChange={(value) => updateSetting("height", value)} />
                  <RangeControl label="Top diameter" value={settings.topDiameter} min={55} max={150} onChange={(value) => updateSetting("topDiameter", value)} />
                  <RangeControl label="Bottom diameter" value={settings.bottomDiameter} min={35} max={120} onChange={(value) => updateSetting("bottomDiameter", value)} />
                  <RangeControl label="Wall thickness" value={settings.wallThickness} min={2} max={7} onChange={(value) => updateSetting("wallThickness", value)} />
                  <RangeControl label="Rim thickness" value={settings.rimThickness} min={2} max={14} onChange={(value) => updateSetting("rimThickness", value)} />
                  <button
                    className="press-button rounded-full bg-leaf-500 px-5 py-3 text-sm font-black text-white shadow-press"
                    type="button"
                    onClick={() => setActiveStep("details")}
                  >
                    Next: details and export
                  </button>
                </div>
              ) : null}

              {activeStep === "details" ? (
                <div className="grid gap-3">
                  <div>
                    <p className="text-base font-black text-stone-900">Finish the planter</p>
                    <p className="text-sm font-semibold text-stone-500">
                      Choose texture, drainage, and export when it feels right.
                    </p>
                  </div>
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
                      <div className="mb-3 grid gap-2">
                        {drainageOptions.map((option) => (
                          <button
                            key={option.value}
                            className={`rounded-2xl border p-3 text-left transition ${
                              settings.drainageStyle === option.value
                                ? "border-leaf-300 bg-leaf-50 text-leaf-700"
                                : "border-stone-100 bg-white text-stone-600"
                            }`}
                            type="button"
                            onClick={() => updateSetting("drainageStyle", option.value)}
                          >
                            <span className="block text-sm font-black">{option.label}</span>
                            <span className="mt-1 block text-xs font-semibold text-stone-500">
                              {option.description}
                            </span>
                          </button>
                        ))}
                      </div>
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
                    <span className="text-sm font-semibold text-stone-700">Surface style</span>
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

                  <div className="rounded-lg border border-leaf-100 bg-white/80 p-3 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-stone-700">Two-piece snap pot</p>
                        <p className="text-xs font-medium text-stone-500">
                          Adds a cork-textured base sleeve that clicks over a lower bead.
                        </p>
                      </div>
                      <button
                        className={`h-8 w-14 shrink-0 rounded-full p-1 transition ${settings.twoPiece ? "bg-lilac-500" : "bg-stone-200"}`}
                        type="button"
                        onClick={() => updateSetting("twoPiece", !settings.twoPiece)}
                        aria-pressed={Boolean(settings.twoPiece)}
                      >
                        <span
                          className={`block h-6 w-6 rounded-full bg-white shadow transition ${settings.twoPiece ? "translate-x-6" : "translate-x-0"}`}
                        />
                      </button>
                    </div>
                    {settings.twoPiece ? (
                      <p className="mt-3 rounded-2xl bg-lilac-50 px-3 py-2 text-xs font-bold text-lilac-700">
                        ZIP export includes separate body and snap-base STL files.
                      </p>
                    ) : null}
                  </div>

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
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-white/75 p-3 text-sm font-bold text-stone-600">
              <div>
                <span className="block text-xs uppercase tracking-[0.12em] text-stone-400">
                  Style
                </span>
                {selectedTemplate?.name ?? "Custom"}
              </div>
              <div>
                <span className="block text-xs uppercase tracking-[0.12em] text-stone-400">
                  Build
                </span>
                {settings.twoPiece ? "Two-piece snap fit" : `${settings.height} x ${settings.topDiameter}mm`}
              </div>
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
              {settings.twoPiece ? "Two-piece STL" : "Printable STL"}
            </div>

            <div className="min-h-0 flex-1">
              <Canvas shadows camera={{ position: [2.5, 2, 4.2], fov: 38 }}>
                <color attach="background" args={["#fffdf6"]} />
                <ambientLight intensity={0.72} />
                <directionalLight position={[3, 5, 4]} intensity={1.55} castShadow />
                <Suspense fallback={<LoadingPot />}>
                  <PotModel settings={settings} pulseKey={pulseKey} color={previewColor} />
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
                  setPreviewColor(templates[1].color);
                  setActiveTemplate("soft-bowl");
                  setActiveStep("style");
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
