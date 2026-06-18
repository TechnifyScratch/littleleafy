import {
  BufferAttribute,
  BufferGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from "three";
import JSZip from "jszip";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type PatternStyle =
  | "smooth"
  | "ribs"
  | "fluted"
  | "spiral"
  | "arches"
  | "geo"
  | "wave-ridges"
  | "wavy"
  | "faceted"
  | "rings";
export type PotProfile = "classic" | "soft-bowl" | "bell" | "cylinder" | "square";
export type DrainageStyle = "center-plus" | "radial" | "mesh" | "slots";
export type BaseTextureStyle = "cork" | "smooth" | "vertical-ribs" | "soft-rings" | "faceted";

export type PotSettings = {
  height: number;
  topDiameter: number;
  bottomDiameter: number;
  wallThickness: number;
  drainage: boolean;
  drainageHoles: number;
  drainageStyle: DrainageStyle;
  rimThickness: number;
  pattern: PatternStyle;
  profile: PotProfile;
  twoPiece?: boolean;
  baseTexture?: BaseTextureStyle;
  selfWatering?: boolean;
};

const SEGMENTS = 96;
const HEIGHT_STEPS = 56;

function patternOffset(
  pattern: PatternStyle,
  angle: number,
  level: number,
  radius: number,
) {
  const detailFade = Math.pow(Math.sin(Math.PI * level), 0.7);

  if (pattern === "ribs") {
    return detailFade * Math.max(0.45, radius * 0.026) * Math.pow(Math.sin(angle * 16), 8);
  }

  if (pattern === "fluted") {
    return detailFade * Math.max(0.9, radius * 0.052) * Math.pow(Math.max(0, Math.cos(angle * 28)), 1.8);
  }

  if (pattern === "spiral") {
    return detailFade * Math.max(0.85, radius * 0.045) * Math.pow(Math.max(0, Math.sin(angle * 18 + level * 18)), 1.6);
  }

  if (pattern === "wave-ridges") {
    return detailFade * Math.max(0.8, radius * 0.044) * Math.pow(Math.max(0, Math.sin(angle * 20 + Math.sin(level * Math.PI) * 5)), 1.7);
  }

  if (pattern === "arches") {
    const columns = 12;
    const rows = 4;
    const column = ((angle / (Math.PI * 2)) * columns) % 1;
    const row = (level * rows) % 1;
    const centeredX = Math.abs(column - 0.5) / 0.5;
    const archY = 0.18 + Math.sqrt(Math.max(0, 1 - centeredX * centeredX)) * 0.62;
    const archLine = Math.exp(-Math.pow((row - archY) / 0.045, 2));
    const sideLine =
      row < archY
        ? Math.exp(-Math.pow((centeredX - 0.78) / 0.055, 2)) * 0.8
        : 0;

    return detailFade * Math.max(0.75, radius * 0.038) * Math.max(archLine, sideLine);
  }

  if (pattern === "geo") {
    const columns = 18;
    const rows = 7;
    const column = Math.abs((((angle / (Math.PI * 2)) * columns) % 1) - 0.5) * 2;
    const row = Math.abs(((level * rows) % 1) - 0.5) * 2;
    const diamond = Math.max(0, 1 - (column + row));

    return detailFade * Math.max(0.9, radius * 0.05) * diamond;
  }

  if (pattern === "wavy") {
    return detailFade * Math.sin(angle * 7 + level * 7.5) * Math.max(0.4, radius * 0.018);
  }

  if (pattern === "rings") {
    const band =
      Math.exp(-Math.pow((level - 0.18) / 0.035, 2)) +
      Math.exp(-Math.pow((level - 0.78) / 0.035, 2)) +
      Math.exp(-Math.pow((level - 0.84) / 0.03, 2));

    return band * Math.max(0.7, radius * 0.032);
  }

  return 0;
}

function pushVertex(
  vertices: number[],
  normals: number[],
  point: Vector3,
  normal: Vector3,
) {
  vertices.push(point.x, point.y, point.z);
  normals.push(normal.x, normal.y, normal.z);
}

function addTriangle(
  vertices: number[],
  normals: number[],
  a: Vector3,
  b: Vector3,
  c: Vector3,
  flip = false,
) {
  const normal = new Vector3()
    .subVectors(b, a)
    .cross(new Vector3().subVectors(c, a))
    .normalize();

  if (flip) {
    normal.multiplyScalar(-1);
    pushVertex(vertices, normals, a, normal);
    pushVertex(vertices, normals, c, normal);
    pushVertex(vertices, normals, b, normal);
    return;
  }

  pushVertex(vertices, normals, a, normal);
  pushVertex(vertices, normals, b, normal);
  pushVertex(vertices, normals, c, normal);
}

function addQuad(
  vertices: number[],
  normals: number[],
  a: Vector3,
  b: Vector3,
  c: Vector3,
  d: Vector3,
  flip = false,
) {
  addTriangle(vertices, normals, a, b, c, flip);
  addTriangle(vertices, normals, a, c, d, flip);
}

function radiusAt(settings: PotSettings, level: number) {
  const bottomRadius = settings.bottomDiameter / 2;
  const topRadius = settings.topDiameter / 2;
  const eased = level * level * (3 - 2 * level);
  const baseRadius = bottomRadius + (topRadius - bottomRadius) * eased;

  if (settings.profile === "soft-bowl") {
    const belly = Math.sin(Math.PI * level) * Math.max(1.5, settings.topDiameter * 0.035);
    return baseRadius + belly;
  }

  if (settings.profile === "bell") {
    const waist = Math.sin(Math.PI * level) * Math.max(1, settings.topDiameter * 0.018);
    return baseRadius - waist;
  }

  if (settings.profile === "cylinder") {
    const averageRadius = (bottomRadius + topRadius) / 2;
    return averageRadius + (topRadius - averageRadius) * level * 0.18;
  }

  if (settings.profile === "square") {
    return baseRadius;
  }

  return baseRadius;
}

function snapLevel(settings: PotSettings) {
  return Math.min(0.32, Math.max(0.2, 26 / settings.height));
}

function corkOffset(angle: number, level: number) {
  const grain =
    Math.sin(angle * 19 + level * 41) * 0.34 +
    Math.sin(angle * 43 - level * 18) * 0.18 +
    Math.sin(angle * 8 + level * 77) * 0.12;

  return grain * 0.8;
}

function baseTextureOffset(texture: BaseTextureStyle | undefined, angle: number, level: number) {
  if (texture === "smooth") {
    return 0;
  }

  if (texture === "vertical-ribs") {
    return Math.pow(Math.max(0, Math.cos(angle * 26)), 1.8) * 1.15;
  }

  if (texture === "soft-rings") {
    return (
      Math.exp(-Math.pow((level - 0.22) / 0.035, 2)) +
      Math.exp(-Math.pow((level - 0.64) / 0.045, 2))
    ) * 0.9;
  }

  if (texture === "faceted") {
    return Math.pow(Math.max(0, Math.cos(angle * 14)), 1.25) * 0.72;
  }

  return corkOffset(angle, level);
}

function ringPoint(
  settings: PotSettings,
  level: number,
  segment: number,
  inner = false,
) {
  const angle = (segment / SEGMENTS) * Math.PI * 2;
  const facetedSegment =
    settings.pattern === "faceted" ? Math.floor(segment / 6) * 6 : segment;
  const facetedAngle = (facetedSegment / SEGMENTS) * Math.PI * 2;
  const baseRadius = radiusAt(settings, level);
  const rimLip =
    inner || level < 0.84
      ? 0
      : Math.exp(-Math.pow((level - 0.965) / 0.055, 2)) *
        Math.max(1.2, settings.rimThickness * 0.44);
  const snapBead =
    settings.twoPiece && !inner
      ? Math.exp(-Math.pow((level - snapLevel(settings)) / 0.018, 2)) * 1.2
      : 0;
  let radius =
    baseRadius -
    (inner ? settings.wallThickness : 0) +
    (inner ? 0 : patternOffset(settings.pattern, angle, level, baseRadius)) +
    rimLip +
    snapBead;

  if (settings.profile === "square") {
    const squareAmount = 0.68;
    const squareRadius =
      radius / Math.max(Math.abs(Math.cos(angle)), Math.abs(Math.sin(angle)));

    radius = radius + (squareRadius - radius) * squareAmount;
  }

  const pointAngle =
    settings.pattern === "faceted" || settings.profile === "square"
      ? facetedAngle
      : angle;

  return new Vector3(
    Math.cos(pointAngle) * radius,
    level * settings.height,
    Math.sin(pointAngle) * radius,
  );
}

function isInsideDrainageHole(
  x: number,
  z: number,
  settings: PotSettings,
  holeRadius: number,
) {
  if (!settings.drainage) {
    return false;
  }

  const distanceFromCenter = Math.hypot(x, z);

  if (settings.drainageStyle === "mesh") {
    const spacing = Math.max(holeRadius * 2.35, settings.bottomDiameter * 0.12);
    const columns = [-2, -1, 0, 1, 2];

    return columns.some((column) =>
      columns.some((row) => {
        const holeX = column * spacing;
        const holeZ = row * spacing;
        const active = Math.hypot(holeX, holeZ) < settings.bottomDiameter * 0.36;

        return active && Math.hypot(x - holeX, z - holeZ) < holeRadius * 0.54;
      }),
    );
  }

  if (settings.drainageStyle === "slots") {
    const slotCount = Math.max(3, Math.min(8, settings.drainageHoles));
    const slotRadius = Math.max(settings.bottomDiameter * 0.18, holeRadius * 2.2);
    const slotLength = Math.max(settings.bottomDiameter * 0.16, holeRadius * 3);
    const slotWidth = Math.max(1.5, holeRadius * 0.62);

    for (let index = 0; index < slotCount; index += 1) {
      const angle = (index / slotCount) * Math.PI * 2;
      const tangentX = -Math.sin(angle);
      const tangentZ = Math.cos(angle);
      const centerX = Math.cos(angle) * slotRadius;
      const centerZ = Math.sin(angle) * slotRadius;
      const localX = (x - centerX) * tangentX + (z - centerZ) * tangentZ;
      const localZ = -(x - centerX) * tangentZ + (z - centerZ) * tangentX;

      if (Math.abs(localX) < slotLength / 2 && Math.abs(localZ) < slotWidth) {
        return true;
      }
    }

    return false;
  }

  if (settings.drainageStyle === "center-plus" && distanceFromCenter < holeRadius * 0.9) {
    return true;
  }

  const ringRadius = Math.max(settings.bottomDiameter * 0.16, holeRadius * 2.2);
  const ringHoleRadius =
    settings.drainageStyle === "center-plus" ? holeRadius * 0.78 : holeRadius;

  for (let index = 0; index < settings.drainageHoles; index += 1) {
    const angle = (index / settings.drainageHoles) * Math.PI * 2;
    const holeX = Math.cos(angle) * ringRadius;
    const holeZ = Math.sin(angle) * ringRadius;

    if (Math.hypot(x - holeX, z - holeZ) < ringHoleRadius) {
      return true;
    }
  }

  return false;
}

function addBottomDisc(
  vertices: number[],
  normals: number[],
  settings: PotSettings,
) {
  const bottomRadius = settings.bottomDiameter / 2;
  const holeRadius = Math.max(1.6, Math.min(4.5, settings.wallThickness * 1.8));
  const radialSteps = 24;

  for (let radialIndex = 0; radialIndex < radialSteps; radialIndex += 1) {
    const r1 = (bottomRadius * radialIndex) / radialSteps;
    const r2 = (bottomRadius * (radialIndex + 1)) / radialSteps;

    for (let segment = 0; segment < SEGMENTS; segment += 1) {
      const a1 = (segment / SEGMENTS) * Math.PI * 2;
      const a2 = ((segment + 1) / SEGMENTS) * Math.PI * 2;
      const points = [
        new Vector3(Math.cos(a1) * r1, 0, Math.sin(a1) * r1),
        new Vector3(Math.cos(a2) * r1, 0, Math.sin(a2) * r1),
        new Vector3(Math.cos(a2) * r2, 0, Math.sin(a2) * r2),
        new Vector3(Math.cos(a1) * r2, 0, Math.sin(a1) * r2),
      ];
      const centerX = points.reduce((sum, point) => sum + point.x, 0) / 4;
      const centerZ = points.reduce((sum, point) => sum + point.z, 0) / 4;

      if (!isInsideDrainageHole(centerX, centerZ, settings, holeRadius)) {
        addQuad(vertices, normals, points[0], points[1], points[2], points[3], true);
      }
    }
  }
}

export function createPotGeometry(settings: PotSettings) {
  const vertices: number[] = [];
  const normals: number[] = [];

  for (let heightIndex = 0; heightIndex < HEIGHT_STEPS; heightIndex += 1) {
    const levelA = heightIndex / HEIGHT_STEPS;
    const levelB = (heightIndex + 1) / HEIGHT_STEPS;

    for (let segment = 0; segment < SEGMENTS; segment += 1) {
      const nextSegment = segment + 1;
      addQuad(
        vertices,
        normals,
        ringPoint(settings, levelA, segment),
        ringPoint(settings, levelA, nextSegment),
        ringPoint(settings, levelB, nextSegment),
        ringPoint(settings, levelB, segment),
      );

      addQuad(
        vertices,
        normals,
        ringPoint(settings, levelA, nextSegment, true),
        ringPoint(settings, levelA, segment, true),
        ringPoint(settings, levelB, segment, true),
        ringPoint(settings, levelB, nextSegment, true),
        true,
      );
    }
  }

  addBottomDisc(vertices, normals, settings);

  const topLevel = 1;
  const rimInset = Math.max(settings.wallThickness, settings.rimThickness);

  for (let segment = 0; segment < SEGMENTS; segment += 1) {
    const nextSegment = segment + 1;
    const outerA = ringPoint(settings, topLevel, segment);
    const outerB = ringPoint(settings, topLevel, nextSegment);
    const innerA = ringPoint({ ...settings, wallThickness: rimInset }, topLevel, segment, true);
    const innerB = ringPoint(
      { ...settings, wallThickness: rimInset },
      topLevel,
      nextSegment,
      true,
    );

    addQuad(vertices, normals, innerA, innerB, outerB, outerA);
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(vertices), 3));
  geometry.setAttribute("normal", new BufferAttribute(new Float32Array(normals), 3));

  return finalizeGeometry(
    geometry,
    settings.pattern !== "faceted" && settings.profile !== "square",
  );
}

function baseBasinDepth(settings: PotSettings) {
  return settings.selfWatering
    ? Math.min(26, Math.max(19, settings.height * 0.2))
    : Math.min(14, Math.max(9, settings.height * 0.11));
}

function baseCollarHeight(settings: PotSettings) {
  return settings.selfWatering
    ? Math.min(18, Math.max(12, settings.height * 0.13))
    : Math.min(16, Math.max(9, settings.height * 0.12));
}

function baseRingPoint(settings: PotSettings, level: number, segment: number, inner = false) {
  const angle = (segment / SEGMENTS) * Math.PI * 2;
  const basinDepth = baseBasinDepth(settings);
  const collarHeight = baseCollarHeight(settings);
  const y = level * (collarHeight + basinDepth) - basinDepth;
  const potLevel = Math.max(0, Math.min(0.44, y / settings.height));
  const potRadius = radiusAt(settings, potLevel);
  const groove =
    y >= 0
      ? Math.exp(-Math.pow((potLevel - snapLevel(settings)) / 0.024, 2)) *
        (inner ? 1.15 : 0)
      : 0;
  const outerTexture = inner ? 0 : baseTextureOffset(settings.baseTexture, angle, level);
  const clearance = settings.selfWatering ? 2.4 : 1.25;
  const wall = Math.max(3.2, settings.wallThickness * 1.2);
  const reservoirShoulder = settings.selfWatering ? 2.6 : 2.4;
  const trayCurve = settings.selfWatering
    ? Math.sin(Math.PI * level) * 1.2 - (1 - level) * 1.8
    : Math.sin(Math.PI * level) * 0.7 - (1 - level) * 0.9;
  const softLip = inner
    ? 0
    : Math.exp(-Math.pow((level - 0.94) / 0.09, 2)) * (settings.selfWatering ? 1.8 : 1.1);
  const radius = inner
    ? potRadius + clearance - groove
    : potRadius + clearance + wall + reservoirShoulder + trayCurve + softLip + outerTexture;

  return new Vector3(
    Math.cos(angle) * radius,
    y,
    Math.sin(angle) * radius,
  );
}

function addBaseAnnulus(
  vertices: number[],
  normals: number[],
  settings: PotSettings,
  level: number,
  flip = false,
) {
  for (let segment = 0; segment < SEGMENTS; segment += 1) {
    const nextSegment = segment + 1;
    const outerA = baseRingPoint(settings, level, segment);
    const outerB = baseRingPoint(settings, level, nextSegment);
    const innerA = baseRingPoint(settings, level, segment, true);
    const innerB = baseRingPoint(settings, level, nextSegment, true);

    addQuad(vertices, normals, innerA, innerB, outerB, outerA, flip);
  }
}

function addBaseFloor(
  vertices: number[],
  normals: number[],
  settings: PotSettings,
) {
  const radialSteps = 22;

  for (let radialIndex = 0; radialIndex < radialSteps; radialIndex += 1) {
    const innerScale = radialIndex / radialSteps;
    const outerScale = (radialIndex + 1) / radialSteps;

    for (let segment = 0; segment < SEGMENTS; segment += 1) {
      const nextSegment = segment + 1;
      const outerA = baseRingPoint(settings, 0, segment);
      const outerB = baseRingPoint(settings, 0, nextSegment);
      const a = outerA.clone().multiplyScalar(innerScale);
      const b = outerB.clone().multiplyScalar(innerScale);
      const c = outerB.clone().multiplyScalar(outerScale);
      const d = outerA.clone().multiplyScalar(outerScale);

      a.y = outerA.y;
      b.y = outerB.y;
      c.y = outerB.y;
      d.y = outerA.y;

      addQuad(vertices, normals, a, b, c, d, true);
    }
  }
}

export function createSnapBaseGeometry(settings: PotSettings) {
  const vertices: number[] = [];
  const normals: number[] = [];
  const steps = settings.selfWatering ? 28 : 22;

  for (let heightIndex = 0; heightIndex < steps; heightIndex += 1) {
    const levelA = heightIndex / steps;
    const levelB = (heightIndex + 1) / steps;

    for (let segment = 0; segment < SEGMENTS; segment += 1) {
      const nextSegment = segment + 1;
      addQuad(
        vertices,
        normals,
        baseRingPoint(settings, levelA, segment),
        baseRingPoint(settings, levelA, nextSegment),
        baseRingPoint(settings, levelB, nextSegment),
        baseRingPoint(settings, levelB, segment),
      );

      addQuad(
        vertices,
        normals,
        baseRingPoint(settings, levelA, nextSegment, true),
        baseRingPoint(settings, levelA, segment, true),
        baseRingPoint(settings, levelB, segment, true),
        baseRingPoint(settings, levelB, nextSegment, true),
        true,
      );
    }
  }

  addBaseFloor(vertices, normals, settings);
  addBaseAnnulus(vertices, normals, settings, 1);

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(vertices), 3));
  geometry.setAttribute("normal", new BufferAttribute(new Float32Array(normals), 3));

  return finalizeGeometry(geometry, settings.baseTexture !== "faceted");
}

function finalizeGeometry(geometry: BufferGeometry, smooth = true) {
  if (!smooth) {
    geometry.computeBoundingSphere();
    return geometry;
  }

  geometry.deleteAttribute("normal");
  const merged = mergeVertices(geometry, 0.001);
  geometry.dispose();
  merged.computeVertexNormals();
  merged.computeBoundingSphere();

  return merged;
}

function stlFromGeometry(geometry: BufferGeometry) {
  const material = new MeshStandardMaterial();
  const mesh = new Mesh(geometry, material);

  mesh.applyMatrix4(new Matrix4().makeRotationX(-Math.PI / 2));
  mesh.updateMatrixWorld(true);

  const exporter = new STLExporter();
  const stl = exporter.parse(mesh, { binary: false }) as string;
  geometry.dispose();
  material.dispose();

  return stl;
}

function exportObjectToStl(object: Mesh | Group) {
  object.applyMatrix4(new Matrix4().makeRotationX(-Math.PI / 2));
  object.updateMatrixWorld(true);

  const exporter = new STLExporter();
  return exporter.parse(object, { binary: false }) as string;
}

function format3mfNumber(value: number) {
  return Number.parseFloat(value.toFixed(5)).toString();
}

function transform3mfPoint(x: number, y: number, z: number, offsetX = 0) {
  return {
    x: x + offsetX,
    y: z,
    z: -y,
  };
}

function geometryTo3mfMesh(geometry: BufferGeometry, offsetX = 0) {
  const position = geometry.getAttribute("position");
  const vertexLines: string[] = [];
  const triangleLines: string[] = [];

  for (let index = 0; index < position.count; index += 1) {
    const point = transform3mfPoint(
      position.getX(index),
      position.getY(index),
      position.getZ(index),
      offsetX,
    );

    vertexLines.push(
      `<vertex x="${format3mfNumber(point.x)}" y="${format3mfNumber(point.y)}" z="${format3mfNumber(point.z)}" />`,
    );
  }

  for (let index = 0; index < position.count; index += 3) {
    triangleLines.push(
      `<triangle v1="${index}" v2="${index + 1}" v3="${index + 2}" />`,
    );
  }

  return `<mesh><vertices>${vertexLines.join("")}</vertices><triangles>${triangleLines.join("")}</triangles></mesh>`;
}

function modelXml(objects: Array<{ id: number; name: string; mesh: string; materialIndex: number }>) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Title">LittleLeafy planter</metadata>
  <metadata name="Designer">LittleLeafy</metadata>
  <metadata name="Application">LittleLeafy browser planter studio</metadata>
  <resources>
    <basematerials id="1">
      <base name="Planter body" displaycolor="#62B06AFF" />
      <base name="Snap base or reservoir" displaycolor="#B8793FFF" />
    </basematerials>
    ${objects
      .map(
        (object) =>
          `<object id="${object.id}" type="model" name="${object.name}" pid="1" pindex="${object.materialIndex}">${object.mesh}</object>`,
      )
      .join("")}
  </resources>
  <build>
    ${objects.map((object) => `<item objectid="${object.id}" />`).join("")}
  </build>
</model>`;
}

async function zip3mf(model: string) {
  const zip = new JSZip();

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml" />
  <Override PartName="/3D/3dmodel.model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml" />
  <Override PartName="/_rels/.rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />
</Types>`,
  );

  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" />
</Relationships>`,
  );

  zip.file("3D/3dmodel.model", model);

  return zip.generateAsync({
    type: "blob",
    mimeType: "model/3mf",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}

export async function exportPotToStl(settings: PotSettings) {
  const potGeometry = createPotGeometry(settings);

  if (!settings.twoPiece) {
    return stlFromGeometry(potGeometry);
  }

  const baseGeometry = createSnapBaseGeometry(settings);
  const material = new MeshStandardMaterial();
  const group = new Group();
  const separation = settings.topDiameter * 0.72;
  const pot = new Mesh(potGeometry, material);
  const base = new Mesh(baseGeometry, material);

  pot.position.x = -separation / 2;
  base.position.x = separation / 2;
  group.add(pot, base);

  const stl = exportObjectToStl(group);
  potGeometry.dispose();
  baseGeometry.dispose();
  material.dispose();

  return stl;
}

export async function exportPotPartsToStl(settings: PotSettings) {
  const potGeometry = createPotGeometry(settings);
  const body = stlFromGeometry(potGeometry);

  if (!settings.twoPiece) {
    return { body };
  }

  const baseGeometry = createSnapBaseGeometry(settings);
  const base = stlFromGeometry(baseGeometry);

  return { body, base };
}

export async function exportPotTo3mf(settings: PotSettings) {
  const potGeometry = createPotGeometry(settings);

  if (!settings.twoPiece) {
    const model = modelXml([
      {
        id: 2,
        name: "LittleLeafy planter",
        materialIndex: 0,
        mesh: geometryTo3mfMesh(potGeometry),
      },
    ]);
    const blob = await zip3mf(model);
    potGeometry.dispose();

    return blob;
  }

  const baseGeometry = createSnapBaseGeometry(settings);
  const separation = settings.topDiameter * 0.72;
  const model = modelXml([
    {
      id: 2,
      name: "LittleLeafy planter body",
      materialIndex: 0,
      mesh: geometryTo3mfMesh(potGeometry, -separation / 2),
    },
    {
      id: 3,
      name: settings.selfWatering ? "LittleLeafy water reservoir tray" : "LittleLeafy catch tray base",
      materialIndex: 1,
      mesh: geometryTo3mfMesh(baseGeometry, separation / 2),
    },
  ]);
  const blob = await zip3mf(model);

  potGeometry.dispose();
  baseGeometry.dispose();

  return blob;
}

export function settingsReadme(settings: PotSettings) {
  return `LittleLeafy printable plant pot

Selected settings
- Pot height: ${settings.height} mm
- Top diameter: ${settings.topDiameter} mm
- Bottom diameter: ${settings.bottomDiameter} mm
- Wall thickness: ${settings.wallThickness} mm
- Drainage holes: ${settings.drainage ? settings.drainageHoles : "off"}
- Drainage style: ${settings.drainage ? settings.drainageStyle : "off"}
- Rim thickness: ${settings.rimThickness} mm
- Pattern style: ${settings.pattern}
- Profile: ${settings.profile}
- Two-piece catch tray: ${settings.twoPiece ? "on — exports planter body plus a separate click-fit catch tray" : "off"}
- Base texture: ${settings.twoPiece ? settings.baseTexture ?? "cork" : "not used"}
- Self-watering setup: ${settings.selfWatering ? "on — use the lower tray as a water reservoir, keep wick openings clear, and add a wick through the center holes" : "off"}

Printing tips
- Print upside down for best results.
- Use PETG or ASA for outdoor planters.
- Add a small brim if your printer needs extra bed adhesion.
- For two-piece pots, print the body and catch tray separately, then press the tray over the lower snap bead.
- If drainage is enabled without a tray, place the pot on a saucer or use it outdoors.
- For self-watering pots, test fit the reservoir tray, add cotton or nylon wick through the center openings, and fill only below the planter floor.
- Empty ordinary catch trays after watering so roots do not sit in stagnant water.
- Check slicer preview before printing.

MakerWorld note
- LittleLeafy exports a model 3MF, not a Bambu Studio print-profile 3MF.
- To upload a MakerWorld print profile, import the STL or model 3MF into Bambu Studio, choose a Bambu Lab printer, set filament/process settings, slice, and save/export the Bambu Studio project 3MF from there.
`;
}
