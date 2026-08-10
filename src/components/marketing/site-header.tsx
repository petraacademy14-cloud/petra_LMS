import Image from "next/image";
import Link from "next/link";

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
          <Image
            className="brand-logo"
            src="/brand/petra-logo.webp"
            alt="Petra Academy official logo"
            width={64}
            height={64}
            priority
            unoptimized
          />
          <span>
            <strong>Petra Academy</strong>
            <small>Firm foundation for building excellent leaders</small>
            <small className="brand-since">Since 2013</small>
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

        <details className="mobile-menu">
          <summary aria-label="Open navigation menu">Menu</summary>
          <nav aria-label="Mobile navigation">
            {links.map(([label, href]) => (
              <Link key={href} href={href}>{label}</Link>
            ))}
            <Link href="/book-visit">Book a visit</Link>
            <Link href="/login">Login</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}
