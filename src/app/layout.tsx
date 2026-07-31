import type { Metadata } from "next";
import "./globals.css";
import "./marketing.css";
import "./application.css";
import "./payment.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.BETTER_AUTH_URL ?? "https://petra-lms.vercel.app"),
  title: {
    default: "Petra Academy | Firm Foundation",
    template: "%s | Petra Academy",
  },
  description: "Petra Academy school website, admissions and operations platform.",
  applicationName: "Petra Academy",
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "Petra Academy | Firm Foundation",
    description: "Strong academics, character and confident learners in Awka, Anambra State.",
    type: "website",
    images: [{ url: "/petra-academy-logo.svg", width: 520, height: 520, alt: "Petra Academy" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
