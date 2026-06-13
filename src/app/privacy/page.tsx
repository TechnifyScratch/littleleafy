import { InfoPage } from "@/components/InfoPage";

export default function PrivacyPage() {
  return (
    <InfoPage eyebrow="Privacy" title="No accounts. No planter tracking.">
      <p>
        LittleLeafy runs in your browser. The planter settings you choose are used locally
        to generate the preview and downloads.
      </p>
      <p>
        This project does not require login, does not store planter designs in a database,
        and does not need API keys to work.
      </p>
    </InfoPage>
  );
}
