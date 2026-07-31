import { PortalShell } from "@/components/portal-shell";
import { requirePortalRole } from "@/lib/portal-auth";

export default async function StudentPortalLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requirePortalRole("STUDENT");
  return (
    <PortalShell viewer={{ role: viewer.role, displayName: viewer.displayName, username: viewer.username }}>
      {children}
    </PortalShell>
  );
}
