import { InfoPage } from "@/components/InfoPage";

export default function ContactPage() {
  return (
    <InfoPage eyebrow="Contact" title="Send ideas, bugs, and planter wishes.">
      <p>
        Use this page for template ideas, export bugs, printability feedback, and
        suggestions for new drainage or rim styles.
      </p>
      <iframe
        className="min-h-[1143px] w-full rounded-2xl border border-leaf-100 bg-white shadow-sm"
        src="https://docs.google.com/forms/d/e/1FAIpQLSd0w7TTFa5AG_ZKxJqVQzy3dTaFKJRC3tWTMy1w-lO5klT06A/viewform?embedded=true"
        title="LittleLeafy contact form"
      >
        Loading...
      </iframe>
      <h2>What helps in a report</h2>
      <ul>
        <li>The template you started from.</li>
        <li>The settings you changed.</li>
        <li>Your browser and device.</li>
        <li>A screenshot or slicer note if the model looked wrong.</li>
      </ul>
    </InfoPage>
  );
}
