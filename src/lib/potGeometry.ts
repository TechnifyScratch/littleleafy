import {
  BufferAttribute,
  BufferGeometry,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from "three";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";

export type PatternStyle = "smooth" | "ribs" | "wavy" | "faceted";
export type PotProfile = "classic" | "soft-bowl" | "bell" | "cylinder";

export type PotSettings = {
  height: number;
  topDiameter: number;
  bottomDiameter: number;
  wallThickness: number;
  drainage: boolean;
  drainageHoles: number;
  rimThickness: number;
  pattern: PatternStyle;
  profile: PotProfile;
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

  if (pattern === "wavy") {
    return detailFade * Math.sin(angle * 7 + level * 7.5) * Math.max(0.4, radius * 0.018);
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

  return baseRadius;
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
  const radius =
    baseRadius -
    (inner ? settings.wallThickness : 0) +
    (inner ? 0 : patternOffset(settings.pattern, angle, level, baseRadius));

  const pointAngle = settings.pattern === "faceted" ? facetedAngle : angle;

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

  if (Math.hypot(x, z) < holeRadius * 0.82) {
    return true;
  }

  const ringRadius = Math.max(settings.bottomDiameter * 0.16, holeRadius * 2.2);

  for (let index = 0; index < settings.drainageHoles; index += 1) {
    const angle = (index / settings.drainageHoles) * Math.PI * 2;
    const holeX = Math.cos(angle) * ringRadius;
    const holeZ = Math.sin(angle) * ringRadius;

    if (Math.hypot(x - holeX, z - holeZ) < holeRadius) {
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

export async function exportPotToStl(settings: PotSettings) {
  const geometry = createPotGeometry(settings);
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

export function settingsReadme(settings: PotSettings) {
  return `LittleLeafy printable plant pot

Selected settings
- Pot height: ${settings.height} mm
- Top diameter: ${settings.topDiameter} mm
- Bottom diameter: ${settings.bottomDiameter} mm
- Wall thickness: ${settings.wallThickness} mm
- Drainage holes: ${settings.drainage ? `${settings.drainageHoles} plus center hole` : "off"}
- Rim thickness: ${settings.rimThickness} mm
- Pattern style: ${settings.pattern}
- Profile: ${settings.profile}

Printing tips
- Print upside down for best results.
- Use PETG or ASA for outdoor planters.
- Add a small brim if your printer needs extra bed adhesion.
- Check slicer preview before printing.
`;
}
