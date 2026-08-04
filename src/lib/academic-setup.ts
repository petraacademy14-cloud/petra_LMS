export const DEFAULT_CLASS_ARMS = ["A", "B"] as const;

export function makeAcademicCode(name: string, maxLength = 16) {
  const tokens = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const code = tokens
    .map((token) => (/^\d+$/.test(token) ? token : token.slice(0, 3)))
    .join("-")
    .slice(0, maxLength)
    .replace(/-+$/g, "");

  return code || "ITEM";
}
