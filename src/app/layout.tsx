import type { Metadata } from "next";
import { Merriweather } from "next/font/google";
import { AnnouncementRibbon } from "@/components/announcement-ribbon";
import "./globals.css";
import "./marketing.css";
import "./homepage-refresh.css";
import "./hero-fix.css";
import "./brand-fonts.css";
import "./about-page.css";
import "./announcement-ribbon.css";
import "./application.css";
import "./payment.css";
import "./exam.css";

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-merriweather",
  display: "swap",
});

const officialLogo = "/brand/petra-logo.webp";

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
    icon: [{ url: officialLogo, type: "image/webp", sizes: "384x384" }],
    apple: [{ url: officialLogo, sizes: "384x384" }],
  },
  openGraph: {
    title: "Petra Academy | Skilled and Future-Ready Leaders",
    description:
      "Firm foundation for building excellent leaders through academic excellence, innovation, practical skills and leadership development.",
    type: "website",
    images: [
      {
        url: officialLogo,
        width: 384,
        height: 384,
        alt: "Petra Academy official logo",
      },
    ],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={merriweather.variable}>
      <body>
        <AnnouncementRibbon />
        {children}
      </body>
    </html>
  );
}
