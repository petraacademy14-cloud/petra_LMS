import type { Metadata } from "next";
import "./globals.css";
import "./marketing.css";
import "./homepage-refresh.css";
import "./application.css";
import "./payment.css";
import "./exam.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.BETTER_AUTH_URL ?? "https://petra-lms.vercel.app"),
  title: {
    default: "Petra Academy | Skilled and Future-Ready Leaders",
    template: "%s | Petra Academy",
  },
  description:
    "Petra Academy provides an inclusive, skill-based and technology-driven learning environment across its Awka and Nnewi campuses.",
  applicationName: "Petra Academy",
  icons: {
    icon: [{ url: "/petra-academy-logo.jpg", type: "image/jpeg" }],
    apple: "/petra-academy-logo.jpg",
  },
  openGraph: {
    title: "Petra Academy | Skilled and Future-Ready Leaders",
    description:
      "Firm foundation for building excellent leaders through academic excellence, innovation, practical skills and leadership development.",
    type: "website",
    images: [
      {
        url: "/petra-academy-logo.jpg",
        width: 480,
        height: 480,
        alt: "Petra Academy official logo",
      },
    ],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
