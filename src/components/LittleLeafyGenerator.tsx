"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Html, OrbitControls } from "@react-three/drei";
import JSZip from "jszip";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Package,
  Palette,
  RefreshCcw,
  RotateCcw,
  Ruler,
  Share2,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { DoubleSide, type Mesh } from "three";
import {
  createPotGeometry,
  createSnapBaseGeometry,
  exportPotTo3mf,
  exportPotPartsToStl,
  exportPotToStl,
  type BaseTextureStyle,
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
  baseTexture: "cork",
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
  twoPiece: true,
  baseTexture: "cork",
};

type PotTemplate = {
  id: string;
  name: string;
  description: string;
  vibe: string;
  category: string;
  color: string;
  special?: boolean;
  settings: PotSettings;
};

type BuilderStep = "style" | "size" | "shape" | "texture" | "drainage" | "base";
type UnitSystem = "metric" | "imperial";
type UnitChoice = "auto" | UnitSystem;
type ExportFormat = "stl" | "zip" | "3mf";

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
    id: "shape",
    title: "Shape",
    description: "Pick profile and color.",
    icon: Palette,
  },
  {
    id: "texture",
    title: "Texture",
    description: "Choose body relief.",
    icon: SlidersHorizontal,
  },
  {
    id: "drainage",
    title: "Drainage",
    description: "Tune the bottom holes.",
    icon: SlidersHorizontal,
  },
  {
    id: "base",
    title: "Base",
    description: "Set snap-fit options.",
    icon: SlidersHorizontal,
  },
];

const templates: PotTemplate[] = [
  {
    id: "classic",
    name: "Classic Garden",
    description: "Tapered outdoor pot with subtle ring detail.",
    vibe: "Inspired by patio planters",
    category: "Outdoor",
    color: "#65a96b",
    settings: { ...classicSettings, pattern: "rings", rimThickness: 8 },
  },
  {
    id: "soft-bowl",
    name: "Ceramic Bowl",
    description: "Rounded patio shape with a thick soft rim.",
    vibe: "Smooth and modern",
    category: "Indoor",
    color: "#c24646",
    settings: defaultSettings,
  },
  {
    id: "ripple",
    name: "Cactus Cup",
    description: "Small tapered cup with a clean rolled lip.",
    vibe: "Great for succulents",
    category: "Succulents",
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
      twoPiece: true,
      baseTexture: "smooth",
    },
  },
  {
    id: "ribbed",
    name: "Ribbed Cachepot",
    description: "Tall planter with print-friendly vertical texture.",
    vibe: "Maker-friendly texture",
    category: "Two-piece",
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
      baseTexture: "cork",
    },
  },
  {
    id: "arched",
    name: "Arch Relief Pot",
    description: "Soft repeating arches inspired by ceramic texture.",
    vibe: "Statement texture",
    category: "Decorative",
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
      twoPiece: true,
      baseTexture: "soft-rings",
    },
  },
  {
    id: "low-poly",
    name: "Square Studio",
    description: "A faceted square planter with crisp sides.",
    vibe: "Minimal desktop style",
    category: "Modern",
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
      twoPiece: true,
      baseTexture: "faceted",
    },
  },
  {
    id: "self-watering",
    name: "Self-Watering Smart Pot",
    description: "A two-piece planter with bottom wick openings and a sealed water reservoir tray.",
    vibe: "Wick-fed reservoir",
    category: "Special",
    color: "#e8e1d2",
    special: true,
    settings: {
      height: 96,
      topDiameter: 102,
      bottomDiameter: 86,
      wallThickness: 3,
      drainage: true,
      drainageHoles: 5,
      drainageStyle: "center-plus",
      rimThickness: 6,
      pattern: "smooth",
      profile: "cylinder",
      twoPiece: true,
      baseTexture: "smooth",
      selfWatering: true,
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

const baseTextureLabels: Array<{
  value: BaseTextureStyle;
  label: string;
  description: string;
}> = [
  {
    value: "cork",
    label: "Subtle cork grain",
    description: "Warm organic texture, not too intense.",
  },
  {
    value: "smooth",
    label: "Smooth modern band",
    description: "Clean two-tone base.",
  },
  {
    value: "vertical-ribs",
    label: "Fine vertical ribs",
    description: "Matches modern ribbed planters.",
  },
  {
    value: "soft-rings",
    label: "Soft horizontal rings",
    description: "Gentle stacked ceramic detail.",
  },
  {
    value: "faceted",
    label: "Tiny facets",
    description: "Low-poly grip with subtle highlights.",
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

const unitChoices: Array<{
  value: UnitChoice;
  label: string;
  description: string;
}> = [
  {
    value: "auto",
    label: "Auto",
    description: "Browser region",
  },
  {
    value: "imperial",
    label: "Inches",
    description: "Imperial",
  },
  {
    value: "metric",
    label: "Millimeters",
    description: "Metric",
  },
];

function detectUnitSystem(): UnitSystem {
  if (typeof navigator === "undefined") {
    return "metric";
  }

  const locale = navigator.languages?.[0] ?? navigator.language;

  try {
    const region = new Intl.Locale(locale).region;
    return region === "US" || region === "LR" || region === "MM" ? "imperial" : "metric";
  } catch {
    return locale.toLowerCase().includes("-us") ? "imperial" : "metric";
  }
}

function formatMillimeters(value: number, unitSystem: UnitSystem) {
  if (unitSystem === "imperial") {
    const inches = value / 25.4;
    return `${Number.isInteger(inches) ? inches.toFixed(0) : inches.toFixed(2)}in`;
  }

  return `${Math.round(value)}mm`;
}

function encodeDesign(settings: PotSettings, color: string) {
  const design = JSON.stringify({ settings, color });
  return btoa(design).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeDesign(value: string) {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const parsed = JSON.parse(atob(padded)) as {
      settings?: Partial<PotSettings>;
      color?: string;
    };

    if (!parsed.settings) {
      return null;
    }

    return {
      settings: { ...defaultSettings, ...parsed.settings },
      color: parsed.color,
    };
  } catch {
    return null;
  }
}

function getPrintWarnings(settings: PotSettings) {
  const warnings: string[] = [];

  if (settings.wallThickness < 3) {
    warnings.push("Wall thickness under 3mm can feel fragile on larger prints.");
  }

  if (settings.bottomDiameter < settings.topDiameter * 0.52) {
    warnings.push("The base is quite narrow, so use heavier soil or widen the bottom for stability.");
  }

  if (settings.rimThickness > settings.wallThickness * 3.2) {
    warnings.push("The rim is much thicker than the wall; preview slicer overhangs before printing.");
  }

  if (!settings.drainage) {
    warnings.push("No drainage holes selected. Best for cachepots or plants kept in nursery inserts.");
  }

  if (settings.drainage && !settings.twoPiece) {
    warnings.push("Drainage exits through the bottom; use this outdoors or place it on a saucer.");
  }

  if (settings.drainage && settings.twoPiece && !settings.selfWatering) {
    warnings.push("The catch tray collects runoff; empty it after watering so roots do not sit in water.");
  }

  if (settings.pattern === "arches" || settings.pattern === "geo") {
    warnings.push("Relief textures look best with a 0.16–0.2mm layer height.");
  }

  if (settings.twoPiece) {
    warnings.push("Print both click-fit pieces before forcing the fit; scale the tray by 101% if your printer runs tight.");
  }

  if (settings.selfWatering) {
    warnings.push("Thread cotton or nylon wick through the center openings and fill the reservoir only below the planter floor.");
  }

  return warnings;
}

function getMaterialSuggestions(settings: PotSettings) {
  const suggestions = ["PLA works well for indoor decorative planters."];

  if (settings.drainage) {
    suggestions.push("PETG is a safer pick for damp soil and sunny windowsills.");
  }

  if (settings.twoPiece) {
    suggestions.push("Try matte PLA for the body and PETG for the catch tray if it will hold water.");
  }

  if (settings.selfWatering) {
    suggestions.push("PETG is recommended for the reservoir tray because it handles moisture better.");
  }

  if (settings.pattern === "fluted" || settings.pattern === "spiral" || settings.pattern === "wave-ridges") {
    suggestions.push("Silk or matte filament makes the raised texture pop.");
  }

  return suggestions.slice(0, 3);
}

function getWaterPath(settings: PotSettings) {
  if (!settings.drainage) {
    return "Water stays inside this shell, so use it as a cachepot with a nursery insert or water very lightly.";
  }

  if (settings.selfWatering) {
    return "Water sits in the lower reservoir tray and reaches soil through cotton or nylon wick threaded through the center openings.";
  }

  if (settings.twoPiece) {
    return "Water drains through the planter body into the click-fit catch tray, which should be emptied after watering.";
  }

  return "Water exits through the bottom holes, so this setup needs a saucer, sink, outdoor surface, or separate cachepot.";
}

function getDrainageRecommendation(settings: PotSettings) {
  if (settings.selfWatering) {
    return "Best for herbs and small foliage plants that like consistent moisture; avoid cactus or plants that need to fully dry out.";
  }

  if (settings.drainageStyle === "slots") {
    return "Slots are best for chunky outdoor soil where fast runoff matters.";
  }

  if (settings.drainageStyle === "mesh") {
    return "Mesh drainage suits finer potting mixes, but still needs a tray or saucer indoors.";
  }

  return "Round bottom holes are the most general-purpose choice for everyday potting soil.";
}

function RangeControl({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "mm",
  displayValue,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  displayValue?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block rounded-lg border border-leaf-100 bg-white/80 p-3 shadow-sm">
      <span className="flex items-center justify-between gap-4 text-sm font-semibold text-stone-700">
        {label}
        <span className="rounded-full bg-lilac-50 px-2.5 py-1 text-xs text-lilac-700">
          {displayValue ?? `${value}${unit}`}
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
            color={settings.selfWatering ? "#b6956b" : "#b8793f"}
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

function scratchSettings(): PotSettings {
  return {
    height: 90,
    topDiameter: 96,
    bottomDiameter: 70,
    wallThickness: 3,
    drainage: true,
    drainageHoles: 6,
    drainageStyle: "radial",
    rimThickness: 6,
    pattern: "smooth",
    profile: "classic",
    twoPiece: false,
    baseTexture: "cork",
    selfWatering: false,
  };
}

export function LittleLeafyGenerator() {
  const [settings, setSettings] = useState<PotSettings>(defaultSettings);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [pendingExport, setPendingExport] = useState<ExportFormat | null>(null);
  const [showDirections, setShowDirections] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [pulseKey, setPulseKey] = useState(0);
  const [activeTemplate, setActiveTemplate] = useState("soft-bowl");
  const [activeStep, setActiveStep] = useState<BuilderStep>("style");
  const [previewColor, setPreviewColor] = useState(templates[1].color);
  const [unitChoice, setUnitChoice] = useState<UnitChoice>("auto");
  const [detectedUnitSystem, setDetectedUnitSystem] = useState<UnitSystem>("metric");
  const activeTip = tips[pulseKey % tips.length];
  const unitSystem = unitChoice === "auto" ? detectedUnitSystem : unitChoice;
  const unitLabel = unitSystem === "imperial" ? "inches" : "millimeters";
  const printWarnings = getPrintWarnings(settings);
  const materialSuggestions = getMaterialSuggestions(settings);

  useEffect(() => {
    setDetectedUnitSystem(detectUnitSystem());

    const sharedDesign = new URLSearchParams(window.location.search).get("design");
    if (sharedDesign) {
      const decodedDesign = decodeDesign(sharedDesign);

      if (decodedDesign) {
        setSettings(decodedDesign.settings);
        setPreviewColor(decodedDesign.color ?? templates[1].color);
        setActiveTemplate("custom");
        setActiveStep("size");
      }
    }

    const savedUnitChoice = window.localStorage.getItem("littleleafy-unit-choice");
    if (
      savedUnitChoice === "auto" ||
      savedUnitChoice === "metric" ||
      savedUnitChoice === "imperial"
    ) {
      setUnitChoice(savedUnitChoice);
    }
  }, []);

  function changeUnitChoice(value: UnitChoice) {
    setUnitChoice(value);
    window.localStorage.setItem("littleleafy-unit-choice", value);
  }

  function updateSetting<Key extends keyof PotSettings>(key: Key, value: PotSettings[Key]) {
    setSettings((current) => ({ ...current, [key]: value }));
    setActiveTemplate("custom");
  }

  function formatDimension(value: number) {
    return formatMillimeters(value, unitSystem);
  }

  function showToast(message = "Your pot is ready 🌱") {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  }

  function requestExport(format: ExportFormat) {
    setPendingExport(format);
  }

  async function finishExport(format: ExportFormat) {
    setPendingExport(null);

    if (format === "stl") {
      await exportStl();
    }

    if (format === "zip") {
      await exportZip();
    }

    if (format === "3mf") {
      await export3mf();
    }

    setShowDirections(true);
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
      zip.file(
        settings.selfWatering
          ? "little-leafy-reservoir-tray.stl"
          : "little-leafy-catch-tray.stl",
        parts.base,
      );
    } else {
      zip.file("little-leafy-planter.stl", parts.body);
    }

    zip.file("README.txt", settingsReadme(settings));
    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, "little-leafy-planter.zip");
    setExporting(null);
    showToast();
  }

  async function export3mf() {
    setExporting("3mf");
    await new Promise((resolve) => window.setTimeout(resolve, 220));
    const blob = await exportPotTo3mf(settings);
    downloadBlob(blob, "little-leafy-planter.3mf");
    setExporting(null);
    showToast();
  }

  async function shareDesign() {
    const url = new URL(window.location.href);
    url.searchParams.set("design", encodeDesign(settings, previewColor));
    const shareUrl = url.toString();

    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast("Share link copied");
        return;
      } catch {
        window.prompt("Copy your LittleLeafy design link:", shareUrl);
        showToast("Share link ready");
        return;
      }
    }

    window.prompt("Copy your LittleLeafy design link:", shareUrl);
    showToast("Share link ready");
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
      baseTexture: baseTextureLabels[randomBetween(0, baseTextureLabels.length - 1)].value,
      selfWatering: false,
    });
    setPreviewColor(colorSwatches[randomBetween(0, colorSwatches.length - 1)].value);
    setActiveTemplate("custom");
    setPulseKey((key) => key + 1);
  }

  const selectedTemplate = templates.find((template) => template.id === activeTemplate);

  function createFromScratch() {
    setSettings(scratchSettings());
    setPreviewColor(colorSwatches[0].value);
    setActiveTemplate("custom");
    setActiveStep("size");
    setPulseKey((key) => key + 1);
  }

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
                <a
                  className="mt-2 inline-flex rounded-full bg-leaf-50 px-3 py-1 text-xs font-black text-leaf-700 lg:hidden"
                  href="#preview"
                >
                  Jump to preview
                </a>
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

            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
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
                    <span className="block text-[11px] font-black uppercase tracking-[0.12em]">
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
                      Pick a starting point or make every choice yourself.
                    </p>
                  </div>

                  <button
                    className={`press-button rounded-2xl border p-4 text-left shadow-sm transition ${
                      activeTemplate === "custom"
                        ? "border-lilac-300 bg-white text-lilac-700"
                        : "border-lilac-100 bg-lilac-50/80 text-stone-700"
                    }`}
                    type="button"
                    onClick={createFromScratch}
                  >
                    <span className="block text-base font-black">Build your own</span>
                    <span className="mt-1 block text-[11px] font-black uppercase tracking-[0.14em] text-lilac-700">
                      Create from scratch
                    </span>
                    <span className="mt-2 block text-xs font-semibold text-stone-500">
                      Walk through size, shape, body texture, drainage, and two-piece base details.
                    </span>
                  </button>

                  <div className="grid gap-2">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        className={`press-button grid grid-cols-[3rem_1fr] gap-3 rounded-2xl border p-3 text-left shadow-sm transition hover:-translate-y-0.5 ${
                          template.special
                            ? activeTemplate === template.id
                              ? "border-emerald-200 bg-gradient-to-br from-stone-950 via-emerald-800 to-lilac-800 text-white shadow-soft"
                              : "border-transparent bg-gradient-to-br from-stone-900 via-emerald-800 to-lilac-800 text-white shadow-soft"
                            : activeTemplate === template.id
                              ? "border-leaf-300 bg-white text-leaf-700"
                              : "border-white/80 bg-white/75 text-stone-700"
                        }`}
                        type="button"
                        onClick={() => applyTemplate(template)}
                      >
                        <span
                          className={`relative h-12 w-12 overflow-hidden rounded-2xl border-4 border-white shadow-inner ${
                            template.special ? "bg-white/90" : ""
                          }`}
                          style={template.special ? undefined : { backgroundColor: template.color }}
                        >
                          {template.special ? (
                            <span className="absolute inset-x-2 top-2 h-8 rounded-t-2xl rounded-b-md bg-gradient-to-b from-white to-stone-100" />
                          ) : null}
                          {template.settings.twoPiece ? (
                            <span
                              className={`absolute inset-x-1 bottom-1 h-2 rounded-full ${
                                template.special ? "bg-stone-950/35" : "bg-amber-800/70"
                              }`}
                            />
                          ) : null}
                        </span>
                        <span>
                          <span
                            className={`mb-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] shadow-sm ${
                              template.special
                                ? "bg-white/15 text-emerald-50"
                                : "bg-white text-stone-400"
                            }`}
                          >
                            {template.category}
                          </span>
                          <span className="block text-sm font-black">{template.name}</span>
                          <span
                            className={`mt-1 block text-xs font-bold ${
                              template.special ? "text-white/90" : "text-stone-500"
                            }`}
                          >
                            {template.description}
                          </span>
                          <span
                            className={`mt-2 inline-flex rounded-full px-2 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${
                              template.special
                                ? "bg-white text-emerald-800"
                                : "bg-lilac-50 text-lilac-700"
                            }`}
                          >
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
                    Next: size
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
                  <RangeControl
                    label="Pot height"
                    value={settings.height}
                    min={50}
                    max={160}
                    displayValue={formatDimension(settings.height)}
                    onChange={(value) => updateSetting("height", value)}
                  />
                  <RangeControl
                    label="Top diameter"
                    value={settings.topDiameter}
                    min={55}
                    max={150}
                    displayValue={formatDimension(settings.topDiameter)}
                    onChange={(value) => updateSetting("topDiameter", value)}
                  />
                  <RangeControl
                    label="Bottom diameter"
                    value={settings.bottomDiameter}
                    min={35}
                    max={120}
                    displayValue={formatDimension(settings.bottomDiameter)}
                    onChange={(value) => updateSetting("bottomDiameter", value)}
                  />
                  <RangeControl
                    label="Wall thickness"
                    value={settings.wallThickness}
                    min={2}
                    max={7}
                    displayValue={formatDimension(settings.wallThickness)}
                    onChange={(value) => updateSetting("wallThickness", value)}
                  />
                  <RangeControl
                    label="Rim thickness"
                    value={settings.rimThickness}
                    min={2}
                    max={14}
                    displayValue={formatDimension(settings.rimThickness)}
                    onChange={(value) => updateSetting("rimThickness", value)}
                  />
                  <button
                    className="press-button rounded-full bg-leaf-500 px-5 py-3 text-sm font-black text-white shadow-press"
                    type="button"
                    onClick={() => setActiveStep("shape")}
                  >
                    Next: shape and color
                  </button>
                </div>
              ) : null}

              {activeStep === "shape" ? (
                <div className="grid gap-3">
                  <div>
                    <p className="text-base font-black text-stone-900">Choose the silhouette</p>
                    <p className="text-sm font-semibold text-stone-500">
                      This controls the overall planter profile before texture is applied.
                    </p>
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
                  <div className="rounded-2xl bg-white/80 p-3">
                    <p className="mb-2 text-sm font-black text-stone-800">Preview color</p>
                    <div className="flex flex-wrap gap-2">
                      {colorSwatches.map((swatch) => (
                        <button
                          key={swatch.value}
                          className={`h-10 w-10 rounded-full border-4 shadow-sm transition ${
                            previewColor === swatch.value
                              ? "scale-105 border-lilac-500"
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
                    onClick={() => setActiveStep("texture")}
                  >
                    Next: body texture
                  </button>
                </div>
              ) : null}

              {activeStep === "texture" ? (
                <div className="grid gap-3">
                  <div>
                    <p className="text-base font-black text-stone-900">Choose body texture</p>
                    <p className="text-sm font-semibold text-stone-500">
                      These are generated as printable relief, not just a visual material.
                    </p>
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
                  <button
                    className="press-button rounded-full bg-leaf-500 px-5 py-3 text-sm font-black text-white shadow-press"
                    type="button"
                    onClick={() => setActiveStep("drainage")}
                  >
                    Next: drainage
                  </button>
                </div>
              ) : null}

              {activeStep === "drainage" ? (
                <div className="grid gap-3">
                  <div>
                    <p className="text-base font-black text-stone-900">Set drainage</p>
                    <p className="text-sm font-semibold text-stone-500">
                      Choose whether the pot has holes and what pattern they use.
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

                  <button
                    className="press-button rounded-full bg-leaf-500 px-5 py-3 text-sm font-black text-white shadow-press"
                    type="button"
                    onClick={() => setActiveStep("base")}
                  >
                    Next: two-piece base
                  </button>
                </div>
              ) : null}

              {activeStep === "base" ? (
                <div className="grid gap-3">
                  <div>
                    <p className="text-base font-black text-stone-900">Choose base construction</p>
                    <p className="text-sm font-semibold text-stone-500">
                      Make a one-piece planter or add a click-fit catch tray for drainage or self-watering.
                    </p>
                  </div>
                  <div className="rounded-lg border border-leaf-100 bg-white/80 p-3 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-stone-700">Two-piece snap pot</p>
                        <p className="text-xs font-medium text-stone-500">
                          {settings.selfWatering
                            ? "Adds a sealed reservoir tray with wick access through the bottom openings."
                            : "Adds a catch tray that clicks over a lower bead instead of draining onto the desk."}
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
                      <div className="mt-3 grid gap-3">
                        <p className="rounded-2xl bg-lilac-50 px-3 py-2 text-xs font-bold text-lilac-700">
                          {settings.selfWatering
                            ? "ZIP export includes a planter body plus a separate water reservoir tray STL."
                            : "ZIP export includes separate body and catch-tray STL files."}
                        </p>
                        <div className="grid gap-2">
                          {baseTextureLabels.map((texture) => (
                            <button
                              key={texture.value}
                              className={`rounded-2xl border p-3 text-left transition ${
                                settings.baseTexture === texture.value
                                  ? "border-lilac-300 bg-lilac-50 text-lilac-700"
                                  : "border-stone-100 bg-white text-stone-600"
                              }`}
                              type="button"
                              onClick={() => updateSetting("baseTexture", texture.value)}
                            >
                              <span className="block text-sm font-black">{texture.label}</span>
                              <span className="mt-1 block text-xs font-semibold text-stone-500">
                                {texture.description}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
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
                {settings.twoPiece
                  ? "Two-piece snap fit"
                  : `${formatDimension(settings.height)} × ${formatDimension(settings.topDiameter)}`}
              </div>
            </div>
          </aside>

          <section
            id="preview"
            className={`animate-fade-up relative flex min-h-[460px] scroll-mt-4 flex-col overflow-hidden rounded-3xl border border-white/80 bg-white/86 shadow-soft backdrop-blur sm:min-h-[560px] lg:h-[760px] lg:self-start [animation-delay:220ms] ${
              pulseKey ? "animate-pop" : ""
            }`}
          >
            <div className="absolute left-4 top-4 z-10 rounded-full bg-white/85 px-4 py-2 text-sm font-black text-leaf-700 shadow-sm">
              Live preview
            </div>
            <div className="absolute right-4 top-4 z-10 rounded-full bg-lilac-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-lilac-700 shadow-sm">
              {settings.selfWatering
                ? "Self-watering STL"
                : settings.twoPiece
                  ? "Two-piece STL"
                  : "Printable STL"}
            </div>

            <div className="min-h-0 flex-1">
              <Canvas className="h-full w-full" shadows camera={{ position: [2.5, 2, 4.2], fov: 38 }}>
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

            <div className="grid gap-3 border-t border-leaf-100 bg-white/82 p-4 md:grid-cols-3">
              <button
                className="press-button inline-flex items-center justify-center gap-2 rounded-full bg-leaf-500 px-5 py-4 text-sm font-black text-white shadow-press hover:brightness-105 disabled:cursor-wait disabled:opacity-70"
                type="button"
                disabled={Boolean(exporting)}
                onClick={() => requestExport("stl")}
              >
                <Download className="h-5 w-5" />
                {exporting === "stl" ? "Sprouting your file..." : "Download STL"}
              </button>
              <button
                className="press-button inline-flex items-center justify-center gap-2 rounded-full bg-lilac-500 px-5 py-4 text-sm font-black text-white shadow-press hover:brightness-105 disabled:cursor-wait disabled:opacity-70"
                type="button"
                disabled={Boolean(exporting)}
                onClick={() => requestExport("zip")}
              >
                <Package className="h-5 w-5" />
                {exporting === "zip" ? "Sprouting your file..." : "Download ZIP"}
              </button>
              <button
                className="press-button inline-flex items-center justify-center gap-2 rounded-full bg-stone-900 px-5 py-4 text-sm font-black text-white shadow-press hover:brightness-110 disabled:cursor-wait disabled:opacity-70"
                type="button"
                disabled={Boolean(exporting)}
                onClick={() => requestExport("3mf")}
              >
                <Sparkles className="h-5 w-5" />
                {exporting === "3mf" ? "Sprouting your file..." : "Download 3MF"}
              </button>
              <button
                className="press-button inline-flex items-center justify-center gap-2 rounded-full border border-leaf-200 bg-white px-5 py-4 text-sm font-black text-leaf-700 shadow-press hover:brightness-105"
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
              <button
                className="press-button inline-flex items-center justify-center gap-2 rounded-full border border-lilac-200 bg-white px-5 py-4 text-sm font-black text-lilac-700 shadow-press hover:brightness-105"
                type="button"
                onClick={shareDesign}
              >
                <Share2 className="h-5 w-5" />
                Share design
              </button>
            </div>
          </section>
        </section>

        <footer className="flex flex-col items-center justify-between gap-3 py-5 text-sm font-semibold text-stone-500 sm:flex-row">
          <span>Made for plant people, makers, and tiny desk gardens.</span>
          <label className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/85 px-3 py-2 shadow-sm backdrop-blur">
            <span className="text-xs font-black uppercase tracking-[0.12em] text-stone-400">
              Units
            </span>
            <select
              className="max-w-[11rem] bg-transparent text-xs font-black text-stone-700 outline-none"
              value={unitChoice}
              onChange={(event) => changeUnitChoice(event.target.value as UnitChoice)}
              aria-label="Choose unit system"
            >
              {unitChoices.map((choice) => (
                <option key={choice.value} value={choice.value}>
                  {choice.label} — {choice.value === "auto" ? unitLabel : choice.description}
                </option>
              ))}
            </select>
          </label>
        </footer>
      </div>

      {pendingExport ? (
        <div className="fixed inset-0 z-50 flex items-end bg-stone-950/28 px-3 pb-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6">
          <div className="w-full max-w-xl rounded-3xl border border-white/80 bg-white p-5 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xl font-black text-stone-950">Quick print check</p>
                <p className="mt-1 text-sm font-semibold text-stone-500">
                  A few things to review before downloading your file.
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${
                  printWarnings.length
                    ? "bg-amber-50 text-amber-700"
                    : "bg-leaf-50 text-leaf-700"
                }`}
              >
                {printWarnings.length ? `${printWarnings.length} note${printWarnings.length > 1 ? "s" : ""}` : "Looks good"}
              </span>
            </div>

            <div className="mt-4 grid gap-2">
              {printWarnings.length ? (
                printWarnings.map((warning) => (
                  <p
                    key={warning}
                    className="flex gap-2 rounded-2xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{warning}</span>
                  </p>
                ))
              ) : (
                <p className="rounded-2xl bg-leaf-50 px-3 py-2 text-sm font-bold text-leaf-700">
                  These settings look balanced for a typical desktop FDM print.
                </p>
              )}
            </div>

            <div className="mt-4 rounded-2xl bg-lilac-50/70 p-3">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-lilac-700">
                Filament ideas
              </p>
              <ul className="mt-2 grid gap-1 text-sm font-semibold text-stone-600">
                {materialSuggestions.map((suggestion) => (
                  <li key={suggestion}>• {suggestion}</li>
                ))}
              </ul>
            </div>

            <div className="mt-3 rounded-2xl bg-leaf-50/80 p-3">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-leaf-700">
                Water path
              </p>
              <p className="mt-2 text-sm font-semibold text-stone-600">{getWaterPath(settings)}</p>
              <p className="mt-1 text-xs font-bold text-stone-500">
                {getDrainageRecommendation(settings)}
              </p>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-[0.8fr_1.2fr]">
              <button
                className="press-button rounded-full border border-stone-200 bg-white px-5 py-3 text-sm font-black text-stone-600 shadow-press"
                type="button"
                onClick={() => setPendingExport(null)}
              >
                Keep editing
              </button>
              <button
                className="press-button rounded-full bg-leaf-500 px-5 py-3 text-sm font-black text-white shadow-press disabled:cursor-wait disabled:opacity-70"
                type="button"
                disabled={Boolean(exporting)}
                onClick={() => finishExport(pendingExport)}
              >
                {exporting
                  ? "Sprouting your file..."
                  : `Download ${pendingExport.toUpperCase()}`}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showDirections ? (
        <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-3xl border border-leaf-100 bg-white p-5 shadow-soft">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-lg font-black text-stone-950">Your file downloaded</p>
              <p className="mt-1 text-sm font-semibold text-stone-500">
                Next steps for the best print.
              </p>
              <ul className="mt-3 grid gap-1 text-sm font-bold text-stone-600">
                <li>• Open the file in your slicer and confirm the scale is in millimeters.</li>
                <li>• Print the planter upside down for a cleaner rim and fewer supports.</li>
                <li>• Use PETG for outdoor or damp planters; PLA is great for indoor decor.</li>
                <li>• {getWaterPath(settings)}</li>
                {settings.drainage && !settings.twoPiece ? (
                  <li>• Water will drain out the bottom, so use a saucer or outdoor surface.</li>
                ) : null}
                {settings.drainage && settings.twoPiece && !settings.selfWatering ? (
                  <li>• The catch tray collects runoff; empty it after watering.</li>
                ) : null}
                <li>• For two-piece pots, print both parts separately before test fitting.</li>
                {settings.selfWatering ? (
                  <li>• Add cotton or nylon wick through the center openings and fill the reservoir only below the pot floor.</li>
                ) : null}
              </ul>
            </div>
            <button
              className="press-button shrink-0 rounded-full bg-lilac-500 px-5 py-3 text-sm font-black text-white shadow-press"
              type="button"
              onClick={() => setShowDirections(false)}
            >
              Got it
            </button>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div
          className={`fixed left-1/2 z-50 -translate-x-1/2 rounded-full border border-leaf-200 bg-white px-5 py-3 text-sm font-black text-leaf-700 shadow-soft ${
            showDirections ? "bottom-56" : "bottom-5"
          }`}
        >
          {toast}
        </div>
      ) : null}
    </main>
  );
}
