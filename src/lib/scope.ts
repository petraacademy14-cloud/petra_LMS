import type { Role } from "@/generated/prisma/enums";

export function canAccessCampus(input: {
  role: Role;
  assignedCampusId: string | null;
  targetCampusId: string;
}) {
  if (input.role === "OWNER") return true;
  return (
    input.assignedCampusId !== null &&
    input.assignedCampusId === input.targetCampusId
  );
}
