"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

const campusRecipients = {
  awka: "awkaadmin@petraacademy.co",
  nnewi: "nnewiadmin@petraacademy.co",
} as const;

const enquirySchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40),
  campus: z.enum(["awka", "nnewi"]),
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(10).max(5_000),
  website: z.string().max(0),
});

function plainTextLine(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export async function sendContactEnquiry(formData: FormData) {
  const result = enquirySchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    campus: formData.get("campus"),
    subject: formData.get("subject"),
    message: formData.get("message"),
    website: formData.get("website") ?? "",
  });

  if (!result.success) {
    redirect("/contact?status=invalid#enquiry");
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_EMAIL_FROM ?? "Petra Academy Website <enquiries@petraacademy.co>";

  if (!apiKey) {
    console.error("Contact enquiry delivery is not configured: RESEND_API_KEY is missing.");
    redirect("/contact?status=unavailable#enquiry");
  }

  const enquiry = result.data;
  const campusName = enquiry.campus === "awka" ? "Awka" : "Nnewi";
  const recipient = campusRecipients[enquiry.campus];
  const phone = enquiry.phone || "Not provided";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [recipient],
      reply_to: enquiry.email,
      subject: `Website enquiry — ${campusName}: ${plainTextLine(enquiry.subject)}`,
      text: [
        "A new enquiry was submitted through the Petra Academy website.",
        "",
        `Campus: ${campusName}`,
        `Name: ${plainTextLine(enquiry.name)}`,
        `Email: ${plainTextLine(enquiry.email)}`,
        `Phone: ${plainTextLine(phone)}`,
        `Subject: ${plainTextLine(enquiry.subject)}`,
        "",
        "Message:",
        enquiry.message,
      ].join("\n"),
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const providerMessage = await response.text();
    console.error("Contact enquiry delivery failed.", {
      status: response.status,
      providerMessage: providerMessage.slice(0, 500),
    });
    redirect("/contact?status=failed#enquiry");
  }

  redirect("/contact?status=sent#enquiry");
}
