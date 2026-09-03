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

  const enquiry = result.data;
  const campusName = enquiry.campus === "awka" ? "Awka" : "Nnewi";
  const recipient = campusRecipients[enquiry.campus];
  const phone = enquiry.phone || "Not provided";

  try {
    const response = await fetch(`https://formsubmit.co/ajax/${recipient}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Referer: "https://www.petraacademy.co/contact",
      },
      body: JSON.stringify({
        name: plainTextLine(enquiry.name),
        email: plainTextLine(enquiry.email),
        phone: plainTextLine(phone),
        campus: `${campusName} Campus`,
        subject: plainTextLine(enquiry.subject),
        message: enquiry.message,
        _replyto: plainTextLine(enquiry.email),
        _subject: `Website enquiry — ${campusName}: ${plainTextLine(enquiry.subject)}`,
        _template: "table",
        _url: "https://www.petraacademy.co/contact",
      }),
      cache: "no-store",
    });

    const providerResult = await response.json().catch(() => null) as
      | { success?: boolean | string; message?: string }
      | null;
    const providerRejected = providerResult?.success === false || providerResult?.success === "false";

    if (!response.ok || providerRejected) {
      console.error("Contact enquiry delivery failed.", {
        status: response.status,
        providerMessage: providerResult?.message?.slice(0, 500),
      });
      redirect("/contact?status=failed#enquiry");
    }
  } catch (error) {
    console.error("Contact enquiry delivery could not reach FormSubmit.", error);
    redirect("/contact?status=failed#enquiry");
  }

  redirect("/contact?status=sent#enquiry");
}
