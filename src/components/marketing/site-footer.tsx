import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

const socialIconStyle = {
  display: "inline-flex",
  width: 38,
  height: 38,
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid #343436",
  borderRadius: 10,
  background: "#202022",
  color: "#f5f2f2",
  textDecoration: "none",
} as const;

function SocialIcon({
  label,
  href,
  children,
}: {
  label: string;
  href?: string;
  children: ReactNode;
}) {
  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Visit Petra Academy on ${label}`}
        title={label}
        style={socialIconStyle}
      >
        {children}
      </a>
    );
  }

  return (
    <span
      aria-label={`${label} link coming soon`}
      aria-disabled="true"
      title={`${label} — coming soon`}
      style={{ ...socialIconStyle, opacity: 0.45, cursor: "not-allowed" }}
    >
      {children}
    </span>
  );
}

function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.6 21v-8h2.7l.4-3h-3.1V8.1c0-.9.3-1.5 1.6-1.5H17V3.9c-.3 0-1.4-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3V10H7.5v3h2.8v8h3.3Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.6 7.1a3 3 0 0 0-2.1-2.1C17.7 4.5 12 4.5 12 4.5s-5.7 0-7.5.5a3 3 0 0 0-2.1 2.1C2 9 2 12 2 12s0 3 .4 4.9A3 3 0 0 0 4.5 19c1.8.5 7.5.5 7.5.5s5.7 0 7.5-.5a3 3 0 0 0 2.1-2.1C22 15 22 12 22 12s0-3-.4-4.9ZM10 15.3V8.7l5.6 3.3-5.6 3.3Z" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M14.2 3h3a4.7 4.7 0 0 0 3.8 3.8v3a7.7 7.7 0 0 1-3.8-1v6.1A6.1 6.1 0 1 1 12 8.9v3.2a3 3 0 1 0 2.2 2.8V3Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.2 3H21l-6.1 7 7.2 11h-5.6l-4.4-6.8L6.1 21H3.3l7.5-8.6L3.9 3h5.8l4 6.2L18.2 3Zm-1 16h1.5L8.9 4.9H7.3L17.2 19Z" />
    </svg>
  );
}

function CiscoNetworkingLogo() {
  return (
    <div className="affiliate-logo" aria-label="Cisco Networking Academy">
      <svg className="affiliate-mark cisco-mark" viewBox="0 0 64 42" aria-hidden="true">
        <rect x="5" y="17" width="4" height="12" rx="2" />
        <rect x="13" y="11" width="4" height="24" rx="2" />
        <rect x="21" y="7" width="4" height="32" rx="2" />
        <rect x="29" y="13" width="4" height="20" rx="2" />
        <rect x="37" y="7" width="4" height="32" rx="2" />
        <rect x="45" y="11" width="4" height="24" rx="2" />
        <rect x="53" y="17" width="4" height="12" rx="2" />
      </svg>
      <span><strong>Cisco</strong><small>Networking Academy</small></span>
    </div>
  );
}

function GoogleWorkspaceLogo() {
  return (
    <div className="affiliate-logo" aria-label="Google Workspace">
      <svg className="affiliate-mark" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M8 12.5 16 8l8 14-8 14-8-4.5Z" fill="#34a853" />
        <path d="M16 8h16l8 14H24Z" fill="#4285f4" />
        <path d="M24 22h16l-8 14H16Z" fill="#fbbc04" />
        <path d="M8 12.5 16 8l8 14-8 14-8-4.5Z" fill="#ea4335" fillOpacity=".72" />
      </svg>
      <span><strong>Google Workspace</strong><small>Digital collaboration</small></span>
    </div>
  );
}

function CodeAILogo() {
  return (
    <a
      className="affiliate-logo affiliate-logo-link codeai-affiliate"
      href="https://code.org/"
      target="_blank"
      rel="noreferrer"
      aria-label="Visit CodeAI"
    >
      <img
        className="codeai-logo"
        src="https://code.org/_next/static/media/codeai-logo-inverse.a30ff4e2.svg"
        alt="CodeAI"
      />
      <span><small>AI + CS education</small></span>
    </a>
  );
}

function GoogleVerifiedLogo() {
  return (
    <div className="affiliate-logo" aria-label="Google Verified">
      <svg className="affiliate-mark" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M24 8a16 16 0 1 0 11.3 27.3" fill="none" stroke="#4285f4" strokeWidth="6" strokeLinecap="round" />
        <path d="M35.3 35.3A16 16 0 0 0 40 24" fill="none" stroke="#34a853" strokeWidth="6" strokeLinecap="round" />
        <path d="M40 24h-14" fill="none" stroke="#ea4335" strokeWidth="6" strokeLinecap="round" />
        <path d="m27 31 4 4 9-10" fill="none" stroke="#34a853" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span><strong>Google Verified</strong><small>Trusted digital presence</small></span>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="marketing-shell footer-grid">
        <div>
          <Link className="brand-lockup footer-brand" href="/">
            <Image
              src="/brand/petra-logo.webp"
              alt="Petra Academy official logo"
              width={76}
              height={76}
              unoptimized
            />
            <span>
              <strong>Petra Academy</strong>
              <small>Firm foundation for building excellent leaders</small>
            </span>
          </Link>
          <p>
            An inclusive, skill-based and technology-driven learning environment preparing excellent,
            confident and future-ready leaders.
          </p>
          <p className="footer-hours">
            Mon–Fri: 7:30 AM–5:30 PM<br />
            After-school Coding: Fri 3:00 PM–5:00 PM<br />
            After-school Mathematics: Sat 9:00 AM–12 noon<br />
            After-school Coding: Sat 12 noon–4:00 PM
          </p>
          <div style={{ marginTop: 22 }}>
            <h2 style={{ marginBottom: 12 }}>Follow Petra Academy</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
              <SocialIcon label="Facebook" href="https://www.facebook.com/share/1DL8NrSvyz/">
                <FacebookIcon />
              </SocialIcon>
              <SocialIcon label="Instagram" href="https://www.instagram.com/petraacademyawka?igsi=cWI3MmwwNXA2ZXR5">
                <InstagramIcon />
              </SocialIcon>
              <SocialIcon label="YouTube">
                <YouTubeIcon />
              </SocialIcon>
              <SocialIcon label="TikTok">
                <TikTokIcon />
              </SocialIcon>
              <SocialIcon label="X">
                <XIcon />
              </SocialIcon>
            </div>
          </div>
        </div>
        <div>
          <h2>Explore</h2>
          <Link href="/about">About us</Link>
          <Link href="/programs">Our programs</Link>
          <Link href="/admissions">Admissions</Link>
          <Link href="/news">News</Link>
          <Link href="/contact">Contact us</Link>
        </div>
        <div>
          <h2>Awka Campus</h2>
          <address>
            <span>#5 Abakaliki Street, Iyiagu Estate, Awka, Anambra State</span>
            <a href="tel:+2348033130456">08033130456</a>
            <a href="tel:+2348121997970">08121997970</a>
            <a href="mailto:awkaadmin@petraacademy.co">awkaadmin@petraacademy.co</a>
            <span>@PetraAcademyAwka</span>
          </address>
        </div>
        <div>
          <h2>Nnewi Campus</h2>
          <address>
            <span>Lasel Junction, No. 11 Godwin Chris Street, off Ukpor Road, by Nwafor Junction, Umudim, Nnewi</span>
            <a href="tel:+2348033130456">08033130456</a>
            <a href="tel:+2348121997970">08121997970</a>
            <a href="mailto:nnewiadmin@petraacademy.co">nnewiadmin@petraacademy.co</a>
            <span>@PetraAcademyAwka</span>
          </address>
        </div>
      </div>

      <div className="marketing-shell footer-affiliates" aria-label="Petra Academy affiliates">
        <h2>Our affiliates</h2>
        <div className="affiliate-grid">
          <CiscoNetworkingLogo />
          <GoogleWorkspaceLogo />
          <GoogleVerifiedLogo />
          <CodeAILogo />
        </div>
      </div>

      <div className="marketing-shell footer-bottom">
        <span>© {new Date().getFullYear()} Petra Academy. All rights reserved.</span>
        <span>Awka Campus · Nnewi Campus</span>
      </div>
    </footer>
  );
}
