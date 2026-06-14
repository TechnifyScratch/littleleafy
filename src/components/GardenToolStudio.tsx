"use client";

import Link from "next/link";
import JSZip from "jszip";
import { CalendarDays, Droplets, Tags } from "lucide-react";
import { useMemo, useState } from "react";
import {
  BoxGeometry,
  BufferGeometry,
  CircleGeometry,
  ExtrudeGeometry,
  Group,
  Matrix4,
  Mesh,
  Shape,
  Vector3,
} from "three";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import helvetikerBold from "three/examples/fonts/helvetiker_bold.typeface.json";

export type GardenTool = "labels" | "spacing" | "soil";
type SoilUse = "indoor" | "succulent" | "outdoor";
type LabelIcon = "sprout" | "leaf" | "cactus" | "flower" | "herb";

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

const labelIcons: Array<{ id: LabelIcon; emoji: string; label: string }> = [
  { id: "sprout", emoji: "🌱", label: "Sprout" },
  { id: "leaf", emoji: "🌿", label: "Leaf" },
  { id: "cactus", emoji: "🌵", label: "Cactus" },
  { id: "flower", emoji: "🌼", label: "Flower" },
  { id: "herb", emoji: "🪴", label: "Potted herb" },
];

const labelFont = new FontLoader().parse(helvetikerBold);

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

function fileSafeName(label: string) {
  return (label.trim() || "Basil").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function roundedRectShape(width: number, height: number, radius: number) {
  const shape = new Shape();
  const x = -width / 2;
  const y = -height / 2;

  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);

  return shape;
}

function leafShape(width: number, height: number) {
  const shape = new Shape();
  shape.moveTo(0, height / 2);
  shape.bezierCurveTo(width / 2, height / 4, width / 2, -height / 4, 0, -height / 2);
  shape.bezierCurveTo(-width / 2, -height / 4, -width / 2, height / 4, 0, height / 2);
  return shape;
}

function addExtrudedShape(group: Group, shape: Shape, depth: number, x: number, y: number, z: number) {
  const geometry = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 8,
    steps: 1,
  });
  geometry.translate(x, y, z);
  group.add(new Mesh(geometry));
}

function addBox(group: Group, width: number, height: number, depth: number, x: number, y: number, z: number) {
  const geometry = new BoxGeometry(width, height, depth);
  geometry.translate(x, y, z + depth / 2);
  group.add(new Mesh(geometry));
}

function addCircle(group: Group, radius: number, depth: number, x: number, y: number, z: number, scaleX = 1) {
  const geometry = new CircleGeometry(radius, 28);
  geometry.scale(scaleX, 1, 1);
  const shape = new Shape();
  const positions = geometry.getAttribute("position");

  for (let index = 1; index < positions.count; index += 1) {
    const pointX = positions.getX(index);
    const pointY = positions.getY(index);
    if (index === 1) {
      shape.moveTo(pointX, pointY);
    } else {
      shape.lineTo(pointX, pointY);
    }
  }

  addExtrudedShape(group, shape, depth, x, y, z);
}

function addPrintableIcon(group: Group, icon: LabelIcon, z: number) {
  if (icon === "cactus") {
    addExtrudedShape(group, roundedRectShape(7, 14, 2.8), 1.2, -33, 0, z);
    addExtrudedShape(group, roundedRectShape(4, 9, 2), 1.2, -38, -1, z);
    addExtrudedShape(group, roundedRectShape(4, 8, 2), 1.2, -28, 2, z);
    return;
  }

  if (icon === "flower") {
    addCircle(group, 2.8, 1.2, -33, 0, z);
    addCircle(group, 2.9, 1.2, -33, 6, z, 0.8);
    addCircle(group, 2.9, 1.2, -33, -6, z, 0.8);
    addCircle(group, 2.9, 1.2, -39, 0, z, 0.8);
    addCircle(group, 2.9, 1.2, -27, 0, z, 0.8);
    addBox(group, 1.4, 12, 1.2, -33, -10, z);
    return;
  }

  if (icon === "herb") {
    addExtrudedShape(group, roundedRectShape(16, 8, 2.5), 1.2, -33, -8, z);
    addBox(group, 1.3, 13, 1.2, -33, 0, z);
    addExtrudedShape(group, leafShape(7, 12), 1.2, -37, 1, z);
    addExtrudedShape(group, leafShape(7, 12), 1.2, -29, 2, z);
    addExtrudedShape(group, leafShape(6, 10), 1.2, -33, 6, z);
    return;
  }

  if (icon === "leaf") {
    addBox(group, 1.4, 16, 1.2, -33, -1, z);
    addExtrudedShape(group, leafShape(8, 16), 1.2, -37, 2, z);
    addExtrudedShape(group, leafShape(8, 16), 1.2, -29, 2, z);
    return;
  }

  addBox(group, 1.4, 15, 1.2, -33, -4, z);
  addExtrudedShape(group, leafShape(8, 13), 1.2, -37, 2, z);
  addExtrudedShape(group, leafShape(8, 13), 1.2, -29, 2, z);
}

function createPlantLabelObject(label: string, icon: LabelIcon) {
  const safeLabel = label.trim() || "Basil";
  const group = new Group();
  const baseDepth = 2.4;
  const raisedDepth = 1.1;

  addExtrudedShape(group, roundedRectShape(94, 28, 7), baseDepth, 0, 4, 0);

  const stakeShape = new Shape();
  stakeShape.moveTo(-8, -10);
  stakeShape.lineTo(8, -10);
  stakeShape.lineTo(0, -35);
  stakeShape.lineTo(-8, -10);
  addExtrudedShape(group, stakeShape, baseDepth, 0, 0, 0);

  addPrintableIcon(group, icon, baseDepth);

  const textGeometry = new TextGeometry(safeLabel.slice(0, 18), {
    font: labelFont,
    size: 7.2,
    depth: raisedDepth,
    curveSegments: 2,
    bevelEnabled: false,
  });
  textGeometry.computeBoundingBox();
  const textWidth = textGeometry.boundingBox
    ? textGeometry.boundingBox.max.x - textGeometry.boundingBox.min.x
    : 0;
  textGeometry.translate(Math.min(-18, 34 - textWidth), -0.5, baseDepth);
  group.add(new Mesh(textGeometry));

  group.updateMatrixWorld(true);
  return group;
}

function exportPlantLabelToStl(label: string, icon: LabelIcon) {
  const exporter = new STLExporter();
  return exporter.parse(createPlantLabelObject(label, icon), { binary: false }) as string;
}

function geometryToMeshXml(geometry: BufferGeometry, matrix: Matrix4) {
  const cloned = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  cloned.applyMatrix4(matrix);
  const positions = cloned.getAttribute("position");
  const vertices: string[] = [];
  const triangles: string[] = [];

  for (let index = 0; index < positions.count; index += 1) {
    vertices.push(
      `<vertex x="${positions.getX(index).toFixed(4)}" y="${positions.getY(index).toFixed(4)}" z="${positions.getZ(index).toFixed(4)}"/>`,
    );
  }

  for (let index = 0; index < positions.count; index += 3) {
    triangles.push(`<triangle v1="${index}" v2="${index + 1}" v3="${index + 2}"/>`);
  }

  cloned.dispose();
  return { vertices, triangles };
}

async function exportPlantLabelTo3mf(label: string, icon: LabelIcon) {
  const group = createPlantLabelObject(label, icon);
  const vertices: string[] = [];
  const triangles: string[] = [];
  let vertexOffset = 0;

  group.traverse((object) => {
    if (!(object instanceof Mesh)) {
      return;
    }

    const meshXml = geometryToMeshXml(object.geometry, object.matrixWorld);
    vertices.push(...meshXml.vertices);
    triangles.push(
      ...meshXml.triangles.map((triangle) =>
        triangle.replace(/v([123])="(\d+)"/g, (_match, vertex, value) => `v${vertex}="${Number(value) + vertexOffset}"`),
      ),
    );
    vertexOffset += meshXml.vertices.length;
  });

  const model = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Title">${escapeXml(label.trim() || "LittleLeafy plant label")}</metadata>
  <resources>
    <object id="1" type="model">
      <mesh>
        <vertices>${vertices.join("")}</vertices>
        <triangles>${triangles.join("")}</triangles>
      </mesh>
    </object>
  </resources>
  <build><item objectid="1"/></build>
</model>`;

  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>`,
  );
  zip.folder("_rels")?.file(
    ".rels",
    `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`,
  );
  zip.folder("3D")?.file("3dmodel.model", model);

  return zip.generateAsync({ type: "blob", mimeType: "model/3mf" });
}

function downloadPlantLabelSvg(label: string, icon: LabelIcon) {
  const safeLabel = label.trim() || "Basil";
  const selectedIcon = labelIcons.find((option) => option.id === icon) ?? labelIcons[0];
  const escapedLabel = safeLabel
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="180" viewBox="0 0 520 180">
  <rect x="22" y="22" width="476" height="118" rx="44" fill="#f2fbf3" stroke="#25843e" stroke-width="8"/>
  <path d="M260 140 L238 172 H282 Z" fill="#25843e"/>
  <circle cx="84" cy="80" r="26" fill="#dbf5de"/>
  <text x="84" y="96" text-anchor="middle" font-size="42">${selectedIcon.emoji}</text>
  <text x="130" y="92" font-family="Arial, sans-serif" font-size="44" font-weight="800" fill="#253226">${escapedLabel}</text>
</svg>`;

  downloadBlob(
    new Blob([svg], { type: "image/svg+xml" }),
    `${fileSafeName(safeLabel)}-plant-label.svg`,
  );
}

export function GardenToolStudio({ initialTool }: { initialTool: GardenTool }) {
  const [labelText, setLabelText] = useState("Basil");
  const [labelIcon, setLabelIcon] = useState<LabelIcon>("leaf");
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
                <div className="rounded-2xl bg-white/85 p-4 shadow-sm">
                  <p className="text-sm font-black text-stone-700">Icon style</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {labelIcons.map((icon) => (
                      <button
                        key={icon.id}
                        className={`press-button rounded-2xl border p-3 text-center shadow-sm transition ${
                          labelIcon === icon.id
                            ? "border-leaf-300 bg-leaf-50 text-leaf-700"
                            : "border-stone-100 bg-white text-stone-600"
                        }`}
                        type="button"
                        onClick={() => setLabelIcon(icon.id)}
                        title={icon.label}
                      >
                        <span className="block text-2xl">{icon.emoji}</span>
                        <span className="mt-1 block text-[11px] font-black uppercase tracking-[0.1em]">
                          {icon.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <button
                    className="press-button rounded-full bg-leaf-500 px-5 py-4 text-sm font-black text-white shadow-press"
                    type="button"
                    onClick={() => downloadPlantLabelSvg(labelText, labelIcon)}
                  >
                    Download SVG
                  </button>
                  <button
                    className="press-button rounded-full bg-lilac-500 px-5 py-4 text-sm font-black text-white shadow-press"
                    type="button"
                    onClick={() =>
                      downloadBlob(
                        new Blob([exportPlantLabelToStl(labelText, labelIcon)], {
                          type: "model/stl",
                        }),
                        `${fileSafeName(labelText)}-plant-label.stl`,
                      )
                    }
                  >
                    Download STL
                  </button>
                  <button
                    className="press-button rounded-full border border-lilac-200 bg-white px-5 py-4 text-sm font-black text-lilac-700 shadow-press"
                    type="button"
                    onClick={async () => {
                      const file = await exportPlantLabelTo3mf(labelText, labelIcon);
                      downloadBlob(file, `${fileSafeName(labelText)}-plant-label.3mf`);
                    }}
                  >
                    Download 3MF
                  </button>
                </div>
                <p className="rounded-2xl bg-white/70 p-4 text-sm font-semibold text-stone-500">
                  STL and 3MF exports are shallow raised-name tags, sized in millimeters for
                  easy scaling in your slicer.
                </p>
              </div>
              <div className="rounded-[2rem] bg-white p-6 shadow-sm">
                <div className="rounded-[2rem] border-4 border-leaf-700 bg-leaf-50 px-6 py-8 text-center shadow-inner">
                  <span className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-full bg-leaf-100 text-4xl">
                    {labelIcons.find((icon) => icon.id === labelIcon)?.emoji ?? "🌿"}
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
