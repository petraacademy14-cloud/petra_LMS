import Link from "next/link";

export default function NotFound() {
  return (
    <section className="marketing-section">
      <div className="marketing-shell" style={{ maxWidth: 720, textAlign: "center" }}>
        <span className="section-kicker">Page not found</span>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: "clamp(2.5rem, 7vw, 4.5rem)", marginBottom: 12 }}>We could not find that page.</h1>
        <p style={{ color: "#666b73", lineHeight: 1.7 }}>Return to the Petra Academy website or begin an admission application.</p>
        <div className="hero-actions" style={{ justifyContent: "center" }}>
          <Link className="button" href="/">Go home</Link>
          <Link className="button button-secondary" href="/apply">Apply now</Link>
        </div>
      </div>
    </section>
  );
}
