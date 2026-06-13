import { InfoPage } from "@/components/InfoPage";

export default function ContactPage() {
  return (
    <InfoPage eyebrow="Contact" title="Send ideas, bugs, and planter wishes.">
      <p>
        For now, the best place to share feedback is the GitHub repository where the app
        is hosted. Open an issue with the template, export, or printing detail you want
        improved.
      </p>
      <p>
        Helpful reports include your browser, the selected template, changed settings, and
        what looked wrong in the preview or slicer.
      </p>
    </InfoPage>
  );
}
