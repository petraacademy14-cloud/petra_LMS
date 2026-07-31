import { redirect } from "next/navigation";
import { getViewer } from "@/lib/dal";

export default async function DashboardRoleGuard({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  if (viewer.membership.role === "TEACHER") redirect("/teacher");
  return children;
}
