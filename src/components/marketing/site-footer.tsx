import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="marketing-shell footer-grid">
        <div>
          <Link className="brand-lockup footer-brand" href="/">
            <Image src="/petra-academy-logo.svg" alt="Petra Academy" width={76} height={76} />
            <span>
              <strong>Petra Academy</strong>
              <small>Firm Foundation</small>
            </span>
          </Link>
          <p>Building confident learners on a firm academic and moral foundation in Awka, Anambra State.</p>
        </div>
        <div>
          <h2>Explore</h2>
          <Link href="/about">About us</Link>
          <Link href="/programs">Our programs</Link>
          <Link href="/admissions">Admissions</Link>
          <Link href="/news">News</Link>
        </div>
        <div>
          <h2>Take the next step</h2>
          <Link href="/apply">Apply now</Link>
          <Link href="/book-visit">Book a visit</Link>
          <Link href="/login">Login</Link>
          <Link href="/contact">Contact us</Link>
        </div>
        <div>
          <h2>Petra Academy</h2>
          <p>Awka, Anambra State, Nigeria</p>
          <p>Monday to Friday · 8:00 AM–4:00 PM</p>
        </div>
      </div>
      <div className="marketing-shell footer-bottom">
        <span>© {new Date().getFullYear()} Petra Academy. All rights reserved.</span>
        <span>Firm Foundation</span>
      </div>
    </footer>
  );
}
