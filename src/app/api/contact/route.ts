import { NextRequest, NextResponse } from "next/server";

const campusRecipients = {
  awka: "awkaadmin@petraacademy.co",
  nnewi: "nnewiadmin@petraacademy.co",
} as const;

type Campus = keyof typeof campusRecipients;

type ContactPayload = {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  campus?: unknown;
  subject?: unknown;
  message?: unknown;
  website?: unknown;
};

function asTrimmedString(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: NextRequest) {
  let payload: ContactPayload;

  try {
    payload = (await request.json()) as ContactPayload;
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request." }, { status: 400 });
  }

  const website = asTrimmedString(payload.website, 200);
  if (website) {
    return NextResponse.json({ success: true });
  }

  const campus = asTrimmedString(payload.campus, 10) as Campus;
  if (!(campus in campusRecipients)) {
    return NextResponse.json({ success: false, message: "Please select a valid campus." }, { status: 400 });
  }

  const name = asTrimmedString(payload.name, 120);
  const email = asTrimmedString(payload.email, 254);
  const phone = asTrimmedString(payload.phone, 40);
  const subject = asTrimmedString(payload.subject, 160);
  const message = asTrimmedString(payload.message, 5000);

  if (name.length < 2 || !isValidEmail(email) || subject.length < 3 || message.length < 10) {
    return NextResponse.json({ success: false, message: "Please check the form fields and try again." }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not configured.");
    return NextResponse.json({ success: false, message: "Email delivery is temporarily unavailable." }, { status: 503 });
  }

  const campusName = campus === "awka" ? "Awka" : "Nnewi";
  const recipient = campusRecipients[campus];
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safePhone = escapeHtml(phone || "Not provided");
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replaceAll("\n", "<br />");

  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Petra Academy Website <enquiries@petraacademy.ng>",
      to: [recipient],
      reply_to: email,
      subject: `Website enquiry — ${campusName}: ${subject}`,
      text: [
        `Petra Academy website enquiry`,
        `Campus: ${campusName}`,
        `Name: ${name}`,
        `Email: ${email}`,
        `Phone: ${phone || "Not provided"}`,
        `Subject: ${subject}`,
        "",
        message,
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#222">
          <h2 style="color:#E32227">Petra Academy website enquiry</h2>
          <table style="border-collapse:collapse;width:100%;max-width:700px">
            <tr><td style="padding:8px;border:1px solid #ddd"><strong>Campus</strong></td><td style="padding:8px;border:1px solid #ddd">${campusName}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd"><strong>Name</strong></td><td style="padding:8px;border:1px solid #ddd">${safeName}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd"><strong>Email</strong></td><td style="padding:8px;border:1px solid #ddd">${safeEmail}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd"><strong>Phone</strong></td><td style="padding:8px;border:1px solid #ddd">${safePhone}</td></tr>
            <tr><td style="padding:8px;border:1px solid #ddd"><strong>Subject</strong></td><td style="padding:8px;border:1px solid #ddd">${safeSubject}</td></tr>
          </table>
          <h3 style="margin-top:24px">Message</h3>
          <p>${safeMessage}</p>
          <p style="margin-top:24px;color:#666;font-size:13px">Sent from the Contact Us form on petraacademy.ng.</p>
        </div>
      `,
    }),
    cache: "no-store",
  });

  const resendResult = (await resendResponse.json().catch(() => null)) as
    | { id?: string; message?: string; name?: string }
    | null;

  if (!resendResponse.ok) {
    console.error("Resend contact delivery failed.", {
      status: resendResponse.status,
      error: resendResult?.message || resendResult?.name || "Unknown Resend error",
    });
    return NextResponse.json({ success: false, message: "We could not send your enquiry just now. Please try again shortly." }, { status: 502 });
  }

  return NextResponse.json({ success: true, id: resendResult?.id ?? null });
}
