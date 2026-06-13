import { InfoPage } from "@/components/InfoPage";

export default function TermsPage() {
  return (
    <InfoPage eyebrow="Terms and Conditions" title="Use the files thoughtfully.">
      <p>
        LittleLeafy is provided as a lightweight design tool. Always inspect generated
        models in your slicer before printing and use your own judgment for material,
        printer settings, and outdoor use.
      </p>
      <p>
        Generated files are intended for personal maker projects. You are responsible for
        testing printability and safety for your use case.
      </p>
    </InfoPage>
  );
}
