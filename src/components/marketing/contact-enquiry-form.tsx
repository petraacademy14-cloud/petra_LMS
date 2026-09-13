"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, TriangleAlert } from "lucide-react";

const validCampuses = new Set(["awka", "nnewi"] as const);
type Campus = "awka" | "nnewi";

type Notice =
  | { kind: "success"; message: string }
  | { kind: "error"; message: string }
  | null;

export function ContactEnquiryForm() {
  const [notice, setNotice] = useState<Notice>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const campus = String(formData.get("campus") ?? "") as Campus;
    const website = String(formData.get("website") ?? "");

    if (website) {
      form.reset();
      return;
    }

    if (!validCampuses.has(campus)) {
      setNotice({ kind: "error", message: "Please select Awka or Nnewi campus and try again." });
      return;
    }

    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const subject = String(formData.get("subject") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();

    setSubmitting(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          phone,
          campus,
          subject,
          message,
          website,
        }),
      });

      const result = (await response.json().catch(() => null)) as
        | { success?: boolean; message?: string }
        | null;

      if (!response.ok || result?.success === false) {
        throw new Error(result?.message || `Contact API returned ${response.status}`);
      }

      form.reset();
      setNotice({
        kind: "success",
        message: "Your enquiry has been submitted. We’ll get back to you within a day.",
      });
    } catch (error) {
      console.error("Contact enquiry delivery failed.", error);
      setNotice({
        kind: "error",
        message: "We could not send your enquiry just now. Please try again shortly.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="marketing-form marketing-card">
      {notice && (
        <div
          className={notice.kind === "success" ? "success-banner" : "error-banner"}
          role={notice.kind === "error" ? "alert" : "status"}
        >
          {notice.kind === "success" ? <CheckCircle2 size={20} /> : <TriangleAlert size={20} />}
          {notice.message}
        </div>
      )}
      <label><span>Name *</span><input name="name" required minLength={2} maxLength={120} /></label>
      <label><span>Email address *</span><input name="email" required type="email" maxLength={254} /></label>
      <label><span>Phone number</span><input inputMode="tel" name="phone" maxLength={40} /></label>
      <label>
        <span>Preferred campus *</span>
        <select name="campus" required defaultValue="">
          <option value="" disabled>Select a campus</option>
          <option value="awka">Awka Campus</option>
          <option value="nnewi">Nnewi Campus</option>
        </select>
      </label>
      <label><span>Subject *</span><input name="subject" required minLength={3} maxLength={160} /></label>
      <label><span>Message *</span><textarea name="message" required minLength={10} maxLength={5000} rows={6} /></label>
      <label aria-hidden="true" style={{ display: "none" }}>
        <span>Website</span>
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <button className="button button-lg" type="submit" disabled={submitting}>
        {submitting ? "Sending…" : "Send enquiry"}
      </button>
      <p className="form-note">Your message is delivered securely to the selected campus. We do not display campus inbox addresses in the form.</p>
    </form>
  );
}
