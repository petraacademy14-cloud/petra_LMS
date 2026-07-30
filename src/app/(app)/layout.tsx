import { AppShell } from "@/components/app-shell";
import { getViewer } from "@/lib/dal";
import { permissionsFor } from "@/lib/permissions";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const viewer = await getViewer();

  return (
    <AppShell
      permissions={permissionsFor(viewer.membership.role)}
      viewer={{
        name: viewer.user.name,
        email: viewer.user.email,
        role: viewer.membership.role,
        school: viewer.membership.school.name,
        campus: viewer.membership.campus?.name ?? null,
      }}
    >
      {children}
    </AppShell>
  );
}
