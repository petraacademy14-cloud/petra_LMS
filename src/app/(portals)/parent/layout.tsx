import { PortalShell } from "@/components/portal-shell";
import { requirePortalRole } from "@/lib/portal-auth";

export default async function ParentPortalLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requirePortalRole("PARENT");
  return (
    <PortalShell viewer={{ role: viewer.role, displayName: viewer.displayName, username: viewer.username }}>
      {children}
    </PortalShell>
  );
}
