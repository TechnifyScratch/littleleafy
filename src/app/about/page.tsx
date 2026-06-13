import { InfoPage } from "@/components/InfoPage";

export default function AboutPage() {
  return (
    <InfoPage eyebrow="About" title="A tiny tool for printable planters.">
      <p>
        LittleLeafy is a browser-based planter generator for makers, gardeners, and
        desk-plant people. Pick a shape, adjust the dimensions, preview it in 3D, and
        download files without creating an account.
      </p>
      <p>
        The models are generated locally in JavaScript. There is no backend, no database,
        and no paid API dependency.
      </p>
    </InfoPage>
  );
}
