import { InfoPage } from "@/components/InfoPage";

export default function ContactPage() {
  const contactFormUrl = process.env.NEXT_PUBLIC_CONTACT_FORM_URL;

  return (
    <InfoPage eyebrow="Contact" title="Send ideas, bugs, and planter wishes.">
      <p>
        Use this page for template ideas, export bugs, printability feedback, and
        suggestions for new drainage or rim styles.
      </p>
      {contactFormUrl ? (
        <iframe
          className="min-h-[680px] w-full rounded-2xl border border-leaf-100 bg-white shadow-sm"
          src={contactFormUrl}
          title="LittleLeafy contact form"
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-leaf-200 bg-leaf-50/70 p-5">
          <h2>Contact form coming next</h2>
          <p>
            The page is ready for an embedded form. Send over the embed URL for Tally,
            Google Forms, Typeform, Fillout, or whichever form provider you want to use,
            and I will plug it into this page.
          </p>
          <p>
            If you prefer Vercel configuration, set
            <code className="mx-1 rounded bg-white px-2 py-1 text-sm font-black text-lilac-700">
              NEXT_PUBLIC_CONTACT_FORM_URL
            </code>
            to the public embed URL and redeploy.
          </p>
        </div>
      )}
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
