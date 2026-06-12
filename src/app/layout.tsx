import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LittleLeafy",
  description:
    "Customize, preview, and download printable plant pots from your browser.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
