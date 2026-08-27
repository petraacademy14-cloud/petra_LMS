import { redirect } from "next/navigation";
import { getViewer } from "@/lib/dal";

export default async function StaffWorkspaceRouter() {
  const viewer = await getViewer();
  redirect(viewer.membership.role === "TEACHER" ? "/teacher" : "/dashboard");
}
