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
          <span className="brand-mark" aria-hidden="true">PA</span>
          <span>
            <strong>Petra Academy</strong>
            <small>Firm Foundation</small>
          </span>
        </Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {links.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}
        </nav>
        <div className="header-actions">
          <Link className="text-link" href="/book-visit">Book a visit</Link>
          <Link className="button header-login" href="/login">Login</Link>
        </div>
      </div>
    </header>
  );
}
