import { redirect } from "next/navigation";
import { getViewer } from "@/lib/dal";

export default async function CommunicationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewer();
  if (viewer.membership.role === "TEACHER") {
    redirect("/teacher/communications");
  }
  return children;
}
