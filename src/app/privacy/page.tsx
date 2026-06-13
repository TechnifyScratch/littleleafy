import { InfoPage } from "@/components/InfoPage";

export default function PrivacyPage() {
  return (
    <InfoPage eyebrow="Privacy" title="Privacy Policy.">
      <p>
        <strong>Last updated:</strong> June 2026
      </p>
      <p>
        LittleLeafy is designed to be a simple browser-based planter generator. It does
        not require accounts, payments, or a database to create and download models.
      </p>
      <h2>Information we collect</h2>
      <p>
        LittleLeafy does not intentionally collect personal information through the
        builder. The planter settings you choose are processed in your browser to render
        the preview and create STL or ZIP downloads.
      </p>
      <h2>Generated planter files</h2>
      <p>
        STL files, ZIP files, and README files are generated locally in your browser.
        They are not uploaded to a LittleLeafy server by this app.
      </p>
      <h2>Contact forms</h2>
      <p>
        If a contact form is embedded on the Contact page, information you submit through
        that form is handled by the form provider shown there. Only send information you
        are comfortable sharing for support or feedback.
      </p>
      <h2>Hosting and basic logs</h2>
      <p>
        The site may be hosted on Vercel or a similar static hosting provider. That
        provider may process standard technical information such as IP address, browser,
        device type, and request logs to deliver and protect the site.
      </p>
      <h2>Cookies and analytics</h2>
      <p>
        LittleLeafy does not require cookies to generate models. If analytics are added
        later, this policy should be updated to explain what is collected and why.
      </p>
      <h2>Questions</h2>
      <p>
        For privacy questions or corrections, use the Contact page once the embedded form
        is connected.
      </p>
    </InfoPage>
  );
}
