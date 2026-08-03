import Image from "next/image";
import Link from "next/link";

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
            <a href="mailto:nnewiadmin@petraacdemy.co">nnewiadmin@petraacdemy.co</a>
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
        </div>
      </div>

      <div className="marketing-shell footer-bottom">
        <span>© {new Date().getFullYear()} Petra Academy. All rights reserved.</span>
        <span>Awka Campus · Nnewi Campus</span>
      </div>
    </footer>
  );
}
