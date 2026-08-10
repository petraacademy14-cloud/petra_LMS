import Image from "next/image";
import Link from "next/link";
import { MobileMenu } from "./mobile-menu";

const links = [
  ["About", "/about"],
  ["Programs", "/programs"],
  ["Admissions", "/admissions"],
  ["News", "/news"],
  ["Contact", "/contact"],
] as const;

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="marketing-shell header-inner">
        <Link className="brand-lockup" href="/" aria-label="Petra Academy home">
          <span className="brand-mark">
            <Image
              className="brand-logo"
              src="/brand/petra-logo.webp"
              alt="Petra Academy official logo"
              width={64}
              height={64}
              priority
              unoptimized
            />
            <small className="brand-since">Since 2013</small>
          </span>
          <span className="brand-copy">
            <strong>Petra Academy</strong>
            <small>Firm foundation for building excellent leaders</small>
          </span>
        </Link>

        <nav className="desktop-nav" aria-label="Primary navigation">
          {links.map(([label, href]) => (
            <Link key={href} href={href}>{label}</Link>
          ))}
        </nav>

        <div className="header-actions">
          <Link className="button button-secondary header-visit" href="/book-visit">Book a visit</Link>
          <Link className="button header-login" href="/login">Login</Link>
        </div>

        <MobileMenu links={links} />
      </div>
    </header>
  );
}
