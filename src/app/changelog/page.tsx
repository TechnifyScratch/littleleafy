import { InfoPage } from "@/components/InfoPage";

const releases = [
  {
    version: "0.4.0",
    date: "June 2026",
    title: "Drainage styles and site pages",
    changes: [
      "Added selectable drainage patterns: Center plus, Radial ring, Micro mesh, and Long slots.",
      "Made each drainage style affect the generated STL geometry.",
      "Added full site navigation with About, Changelog, Privacy, Terms and Conditions, and Contact pages.",
      "Removed the old marketing badge above the builder header.",
    ],
  },
  {
    version: "0.3.0",
    date: "June 2026",
    title: "Guided planter builder",
    changes: [
      "Reworked the generator into a three-step flow: Style, Size, and Details.",
      "Added editable templates inspired by common planter forms.",
      "Added color swatches for the live preview.",
      "Improved the preview material so planters look solid instead of see-through.",
    ],
  },
  {
    version: "0.2.0",
    date: "June 2026",
    title: "Better planter geometry",
    changes: [
      "Removed the custom text label feature because it made prints and previews look worse.",
      "Added a visible rolled rim lip for cup-style planters.",
      "Improved base geometry and softened surface detail near rims and bottoms.",
    ],
  },
  {
    version: "0.1.0",
    date: "June 2026",
    title: "Initial browser-only generator",
    changes: [
      "Added live 3D preview with React Three Fiber.",
      "Added procedural STL export in the browser.",
      "Added ZIP export with STL and README settings.",
      "Built the first Next.js and Tailwind interface for Vercel deployment.",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <InfoPage eyebrow="Changelog" title="LittleLeafy release notes.">
      <p>
        A running log of product, model-generation, and interface updates for the
        LittleLeafy planter builder.
      </p>
      {releases.map((release) => (
        <article
          className="rounded-2xl border border-leaf-100 bg-leaf-50/60 p-5"
          key={release.version}
        >
          <p className="text-xs font-black uppercase tracking-[0.18em] text-leaf-700">
            {release.version} • {release.date}
          </p>
          <h2>{release.title}</h2>
          <ul className="mt-3 grid gap-2">
            {release.changes.map((change) => (
              <li key={change}>{change}</li>
            ))}
          </ul>
        </article>
      ))}
    </InfoPage>
  );
}
