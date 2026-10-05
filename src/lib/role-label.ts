export function roleLabel(role: string): string {
  if (role === "OWNER") return "Admin";
  if (role === "ADMIN") return "Campus Admin";
  return role.charAt(0) + role.slice(1).toLowerCase();
}
