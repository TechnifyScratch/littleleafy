import { InfoPage } from "@/components/InfoPage";

export default function TermsPage() {
  return (
    <InfoPage eyebrow="Terms and Conditions" title="Use the files thoughtfully.">
      <p>
        <strong>Last updated:</strong> June 2026
      </p>
      <p>
        These terms describe how you may use LittleLeafy and the planter files it
        generates. By using the site, you agree to use it responsibly and check generated
        files before printing.
      </p>
      <h2>What LittleLeafy provides</h2>
      <p>
        LittleLeafy is a browser-based design tool for creating simple printable planter
        models. It provides a live preview, customization controls, and client-side file
        export.
      </p>
      <h2>Your responsibility</h2>
      <ul>
        <li>Inspect every generated model in your slicer before printing.</li>
        <li>Choose safe materials and printer settings for your intended use.</li>
        <li>Test drainage, wall thickness, and stability before using a planter with plants.</li>
        <li>Use extra care for outdoor planters, heavy soil, hanging use, or large prints.</li>
      </ul>
      <h2>Generated files</h2>
      <p>
        You may use generated STL and ZIP files for personal maker projects. LittleLeafy
        does not guarantee that generated models are fit for a specific printer, plant,
        material, climate, or commercial purpose.
      </p>
      <h2>No professional advice</h2>
      <p>
        Printing guidance, planter tips, and material suggestions are general information,
        not engineering, safety, horticultural, or legal advice.
      </p>
      <h2>Availability</h2>
      <p>
        The site may change, break, or be unavailable at times. Features such as 3MF
        export may be experimental or marked as coming soon until reliable.
      </p>
      <h2>Limitation of liability</h2>
      <p>
        LittleLeafy is provided as-is. To the fullest extent allowed by law, the project
        owners are not responsible for failed prints, damaged materials, plant loss,
        printer issues, or other losses from using generated files.
      </p>
    </InfoPage>
  );
}
