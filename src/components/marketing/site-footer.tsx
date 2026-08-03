import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="marketing-shell footer-grid">
        <div>
          <Link className="brand-lockup footer-brand" href="/">
            <Image src="/petra-academy-logo.webp" alt="Petra Academy official logo" width={76} height={76} />
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
            After-school Coding: Fri 4:30–6:30 PM<br />
            Saturday: 9:00 AM–3:00 PM
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
            <a href="mailto:admin@petraacademy.co">admin@petraacademy.co</a>
            <span>@PetraAcademyAwka</span>
          </address>
        </div>
        <div>
          <h2>Nnewi Campus</h2>
          <address>
            <span>Lasel Junction, No. 11 Godwin Chris Street, off Ukpor Road, by Nwafor Junction, Umudim, Nnewi</span>
            <a href="tel:+2348033130456">08033130456</a>
            <a href="tel:+2348121997970">08121997970</a>
            <a href="mailto:admin@petraacademy.co">admin@petraacademy.co</a>
            <span>@PetraAcademyAwka</span>
          </address>
        </div>
      </div>
      <div className="marketing-shell footer-bottom">
        <span>© {new Date().getFullYear()} Petra Academy. All rights reserved.</span>
        <span>Awka Campus · Nnewi Campus</span>
      </div>
    </footer>
  );
}
