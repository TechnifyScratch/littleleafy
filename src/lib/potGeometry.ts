import {
  BufferAttribute,
  BufferGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";

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
};

const SEGMENTS = 96;
const HEIGHT_STEPS = 34;

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
  geometry.computeBoundingSphere();

  return geometry;
}

function baseRingPoint(settings: PotSettings, level: number, segment: number, inner = false) {
  const angle = (segment / SEGMENTS) * Math.PI * 2;
  const baseHeight = Math.min(34, Math.max(22, settings.height * 0.26));
  const potLevel = (level * baseHeight) / settings.height;
  const potRadius = radiusAt(settings, potLevel);
  const groove =
    Math.exp(-Math.pow((potLevel - snapLevel(settings)) / 0.024, 2)) * (inner ? 1.15 : 0);
  const outerTexture = inner ? 0 : corkOffset(angle, level);
  const radius = inner
    ? potRadius + 0.3 - groove
    : potRadius + Math.max(3.8, settings.wallThickness * 1.3) + outerTexture;

  return new Vector3(
    Math.cos(angle) * radius,
    level * baseHeight,
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

export function createSnapBaseGeometry(settings: PotSettings) {
  const vertices: number[] = [];
  const normals: number[] = [];
  const steps = 16;

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

  addBaseAnnulus(vertices, normals, settings, 0, true);
  addBaseAnnulus(vertices, normals, settings, 1);

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(vertices), 3));
  geometry.setAttribute("normal", new BufferAttribute(new Float32Array(normals), 3));
  geometry.computeBoundingSphere();

  return geometry;
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
- Two-piece snap base: ${settings.twoPiece ? "on — exports planter body plus cork-textured snap sleeve" : "off"}

Printing tips
- Print upside down for best results.
- Use PETG or ASA for outdoor planters.
- Add a small brim if your printer needs extra bed adhesion.
- For two-piece pots, print the body and base separately, then press the base over the lower snap bead.
- Check slicer preview before printing.
`;
}
