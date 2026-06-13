import { InfoPage } from "@/components/InfoPage";

export default function ChangelogPage() {
  return (
    <InfoPage eyebrow="Changelog" title="What changed recently.">
      <p>
        Added the guided three-step builder, planter templates, color swatches, improved
        opaque preview materials, and a visible rolled rim for the Cactus Cup template.
      </p>
      <p>
        Current export options include STL and ZIP with a README. 3MF is still marked as
        coming soon until it can be generated reliably in the browser.
      </p>
    </InfoPage>
  );
}
